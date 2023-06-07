/**
 * server.js
 *
 * function：chat用サーバ
 **/

"use strict";

// 定数
const SERVERNAME = "shopifyServer"; // サーバ名
const DEFAULT_PORT = 3000; // ポート
const SHIPPING_FEE = 550; // 送料

// モジュール
import express from "express"; // express
import fetch from "node-fetch"; // fetch
import shopify from "shopify-buy"; // shopify
import { setTimeout } from "timers/promises"; // sleep
import cors from "cors"; // cors
import Crypto from "crypto"; // 暗号化
import * as dotenv from "dotenv"; // 環境変数用
import SQL from "./class/sql.js"; // sql
dotenv.config();

import scenarioData from "./scenario.mjs"; // シナリオ読み込み

// db
const myDB = new SQL(
    process.env.SQL_HOST, // ホスト名
    process.env.SQL_COMMONUSER, // ユーザ名
    process.env.SQL_COMMONPASS, // パスワード
    process.env.SQL_DBNAME // DB名
);

// 環境変数
const { SHOPIFY_HOST, SHOPIFY_TOKEN } = process.env;

// express設定
const app = express();

// cors設定
// ホワイトリスト
const whitelist = ["https://ebisu.love", "https://www.ebisu.love"];
// オプション
const corsOptions = {
    origin: (origin, callback) => {
        // ホワイトリスト設定
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
};
// cors使用
app.use(cors(corsOptions));

// json設定
app.use(express.json());
// body使用
app.use(express.urlencoded({ extended: false }));

// グローバル変数
// シナリオID
let globalScenarioId;
// 一時ユーザ検索格納用
let globalUserResult;
// 一時電話検索格納用
let globalPhoneResult;
// 再購入フラグ
let globalResaleFlg = false;
// 最終郵便番号配列
let globalFinalZipcodeArray = [];
// 最終配列
let globalFinalArray = [];
// 最終配列
let globalflowIdArray = [];

// 認証キー
const globalAuthenticationKey = process.env.AUTH_TOKEN;

// shopify設定
// shopifyコンフィグ
const shopifyConfig = {
    domain: SHOPIFY_HOST, // ドメイン
    storefrontAccessToken: SHOPIFY_TOKEN, // トークン
};

// LPメイン
app.get("/", (_, res) => {
    res.send("connected");
});

// 決済完了
app.get("/complete", (_, res) => {
    res.send("completed");
});

// エラー
app.get("/error", (_, res) => {
    res.send("error");
});

// iframeからの初期化リクエスト
app.post("/getinitjson", async (req, res) => {
    // ユーザ固有キー
    const userKey = getSecureRandom();
    // シナリオID
    globalScenarioId = req.body.id;

    try {
        // DBに仮登録
        await insertDB("draftorder", "userkey", userKey);
        console.log(
            `inital userkey insertion to order completed for ${userKey}.`
        );

        // 送付用データ
        const initialJsonData = {
            authkey: globalAuthenticationKey, // 認証キー
            tag: "initialize", // 初期タグ
            flowId: "1", // フローID
            session: userKey, // ユーザキー
        };
        // cors付与
        res.set({ "Access-Control-Allow-Origin": "*" });
        // 送付
        res.json(JSON.stringify(initialJsonData));
    } catch (e) {
        // error
        console.log(e);
    }
});

// json取得処理
app.post("/getjson", async (req, res) => {
    // 都道府県ID
    let tmpPrefectureId = 0;
    // エラー
    let tmpErr = "";
    // 市町村格納用
    let tmpCityArray = [];
    // 郵便番号格納用
    let tmpzipArray = [];
    // フローID
    const localFlowId = Number(req.body.flowId) - 1;
    // タグ
    const tag = req.body.tag ?? "";
    // ユーザキー
    const userKey = req.body.session;
    // 選択値
    const inputNo = Number(req.body.no) + 1;
    // 選択メッセージ
    const inputMessage = req.body.message ?? "";

    // シナリオID
    globalScenarioId = req.body.scenarioId;
    // タグ履歴
    globalflowIdArray.push(localFlowId);

    try {
        // DB登録
        switch (tag) {
            // 初期化
            case "initialize":
                break;

            // 初回確認
            case "new_or_not":
                // 初回アップデート
                await updateRecentDB(
                    "draftorder",
                    "initial",
                    inputNo,
                    "userkey",
                    userKey
                );
                // 注文アップデート
                await updateRecentDB(
                    "draftorder",
                    "fromchat",
                    1,
                    "userkey",
                    userKey
                );
                console.log(`initial update completed for ${userKey}.`);

                break;

            // 購入理由
            case "reason":
                // 購入理由アップデート
                await updateRecentDB(
                    "draftorder",
                    "reason",
                    inputMessage,
                    "userkey",
                    userKey
                );
                console.log(`reason update completed for ${userKey}.`);

                break;

            // 購入商品
            case "plan":
                // 購入商品アップデート
                await updateRecentDB(
                    "draftorder",
                    "product_id",
                    inputNo + 5,
                    "userkey",
                    userKey
                );
                console.log(`product_id update completed for ${userKey}.`);

                break;

            // 購入数量
            case "quantity":
                // 商品ID検索
                const tmpOrderResult = await selectRecentDB(
                    ["product_id"],
                    "draftorder",
                    "userkey",
                    userKey
                );

                // エラー
                if (tmpOrderResult == "error") {
                    tmpErr = "error";
                    console.log(`product_id search error`);
                    // 処理中断
                    break;
                } else {
                    console.log(`product_id search completed for ${userKey}.`);
                }

                // 商品価格検索
                const tmpPriceResult = await selectDB(
                    ["price"],
                    "product",
                    "id",
                    tmpOrderResult[0].product_id
                );

                // エラー
                if (tmpPriceResult == "error") {
                    tmpErr = "error";
                    console.log(`price search error`);
                    // 処理中断
                    break;
                } else {
                    console.log(
                        `price search completed for productid ${tmpOrderResult[0].product_id}.`
                    );
                }

                // 数量アップデート
                await updateRecentDB(
                    "draftorder",
                    "quantity",
                    inputNo,
                    "userkey",
                    userKey
                );
                console.log(`quantity update completed for ${userKey}.`);

                // 合計額計算
                const tmpTotalPrice =
                    tmpPriceResult[0].price * inputNo + SHIPPING_FEE;
                // 合計額アップデート
                await updateRecentDB(
                    "draftorder",
                    "totalprice",
                    tmpTotalPrice,
                    "userkey",
                    userKey
                );
                console.log(`totalprice update completed for ${userKey}.`);

                break;

            // 店舗名
            case "shopname":
                // 店舗名アップデート
                await updateRecentDB(
                    "draftorder",
                    "shopname",
                    inputMessage,
                    "userkey",
                    userKey
                );
                console.log(`shopname update completed for ${userKey}.`);

                break;

            // ユーザ名
            case "staffname":
                // ユーザ名アップデート
                await updateRecentDB(
                    "draftorder",
                    "username",
                    inputMessage,
                    "userkey",
                    userKey
                );
                console.log(`username update completed for ${userKey}.`);

                break;

            // 郵便番号確認
            case "zipbool":
                break;

            // *郵便番号入力モード
            // 郵便番号
            case "zipcode":
                // 郵便番号アップデート
                await updateRecentDB(
                    "draftorder",
                    "zipcode",
                    inputMessage.replace("-", ""),
                    "userkey",
                    userKey
                );
                console.log(`zipcode update completed for ${userKey}.`);

                break;

            // 住所
            case "zipaddress":
                // 住所から
                const resultArray = await extractFromAddress(inputMessage);
                // 都道府県
                const prefResult = await selectDB(
                    ["id"],
                    "prefecture",
                    "prefname",
                    resultArray[0]
                );

                // エラー
                if (prefResult == "error") {
                    tmpErr = "error";
                    console.log(`prefectureid search error`);
                    // 処理中断
                    break;
                } else {
                    console.log(
                        `prefectureid search completed for ${resultArray[0]}.`
                    );
                }

                // 都道府県アップデート
                await updateRecentDB(
                    "draftorder",
                    "prefecture_id",
                    prefResult[0].id,
                    "userkey",
                    userKey
                );
                console.log(`prefecture_id update completed for ${userKey}.`);
                // 市区町村アップデート
                await updateRecentDB(
                    "draftorder",
                    "city",
                    resultArray[1],
                    "userkey",
                    userKey
                );
                console.log(`city update completed for ${userKey}.`);
                // 番地以下アップデート
                await updateRecentDB(
                    "draftorder",
                    "address",
                    resultArray[2],
                    "userkey",
                    userKey
                );
                console.log(`address update completed for ${userKey}.`);

                break;

            // *住所選択モード
            // 都道府県選択
            case "prefecture":
                // 都道府県ID
                tmpPrefectureId = inputNo - 1;
                // 市町村選択時
                if (tmpPrefectureId > 0) {
                    // 市町村検索
                    const cityResult2 = await selectDB(
                        ["cityname"],
                        "city",
                        "prefecture_id",
                        tmpPrefectureId
                    );
                    console.log(
                        `cityname search completed for ${tmpPrefectureId}.`
                    );

                    // エラー
                    if (cityResult2 == "error") {
                        tmpErr = "error";
                        console.log(`cityname search error`);
                        // 処理中断
                        break;
                    }

                    // 市町村名格納
                    cityResult2.forEach((val) => {
                        tmpCityArray.push(val.cityname);
                    });
                    // 市町村セレクト生成
                    const cityList = tmpCityArray.map((k, idx) => ({
                        answerId: `${idx + 1}`, // 回答ID
                        answerText: k, // 回答メッセージ
                        nextFlowId: "13", // 次のフローID
                    }));
                    // 市町村格納
                    scenarioData[localFlowId].answerList = cityList;
                    // 都道府県アップデート
                    await updateRecentDB(
                        "draftorder",
                        "prefecture_id",
                        tmpPrefectureId,
                        "userkey",
                        userKey
                    );
                    console.log(
                        `prefecture_id update completed for ${userKey}.`
                    );
                }

                break;

            // 市区町村
            case "city":
                // 市区町村アップデート
                await updateRecentDB(
                    "draftorder",
                    "city",
                    inputMessage,
                    "userkey",
                    userKey
                );
                console.log(`city update completed for ${userKey}.`);
                // 都道府県検索
                const prefResult1 = await selectRecentDB(
                    ["prefecture_id"],
                    "draftorder",
                    "userkey",
                    userKey
                );
                console.log(`prefecture_id search completed for ${userKey}.`);

                // エラー
                if (prefResult1 == "error") {
                    tmpErr = "error";
                    console.log(`prefecture_id search error`);
                    // 処理中断
                    break;
                }

                // 郵便番号検索
                const cityResult1 = await selectDoubleDB(
                    ["address", "zipcode"],
                    "city",
                    "prefecture_id",
                    prefResult1[0].prefecture_id,
                    "cityname",
                    inputMessage
                );
                console.log(
                    `address search completed for prefectureid ${prefResult1[0].prefecture_id}.`
                );

                // エラー
                if (cityResult1 == "error") {
                    tmpErr = "error";
                    console.log(`address search error`);
                    // 処理中断
                    break;
                }

                // 郵便番号・住所連結文字列格納
                cityResult1.forEach((val) => {
                    tmpzipArray.push(`${val.zipcode}:${val.address}`);
                });

                // 郵便番号セレクト生成
                const zipList = tmpzipArray.map((k, idx) => ({
                    answerId: `${idx + 1}`, // 回答ID
                    answerText: k, // 回答メッセージ
                    nextFlowId: "14", // 次のフローID
                }));

                // 一時保存
                globalFinalZipcodeArray = zipList;

                // 格納
                scenarioData[localFlowId].answerList = zipList;

                break;

            // 郵便番号
            case "zip":
                // 一時データ
                const tmpZipcodeArray =
                    globalFinalZipcodeArray[inputNo - 2].answerText.split(":");
                // 郵便番号
                const tmpZip = tmpZipcodeArray[0];
                // 住所
                const tmpAddress = tmpZipcodeArray[1];
                // 郵便番号アップデート
                await updateRecentDB(
                    "draftorder",
                    "zipcode",
                    tmpZip,
                    "userkey",
                    userKey
                );
                console.log(`zipcode update completed for ${userKey}.`);
                // 都道府県検索
                const orderResult2 = await selectRecentDB(
                    ["city"],
                    "draftorder",
                    "userkey",
                    userKey
                );

                // エラー
                if (orderResult2 == "error") {
                    tmpErr = "error";
                    console.log(`city search error`);
                    // 処理中断
                    break;
                } else {
                    console.log(`city search completed for ${userKey}.`);
                }

                // 結果を連結
                const addressString = `${orderResult2[0].city}${tmpAddress}`;
                // 格納
                scenarioData[localFlowId].answerString = addressString;

                break;

            // 住所
            case "address":
                // データ再抽出
                const cityResult = await selectRecentDB(
                    ["city"],
                    "draftorder",
                    "userkey",
                    userKey
                );

                // エラー
                if (cityResult == "error") {
                    tmpErr = "error";
                    console.log(`city search error`);
                    // 処理中断
                    break;
                }

                console.log(`city search completed for ${userKey}.`);
                // 市町村除去
                const finalAddress = inputMessage.replace(
                    cityResult[0].city,
                    ""
                );
                // 住所アップデート
                await updateRecentDB(
                    "draftorder",
                    "address",
                    finalAddress,
                    "userkey",
                    userKey
                );
                console.log(`address update completed for ${userKey}.`);

                break;

            // 電話番号
            case "telephone":
                // 電話番号ハイフン除去
                const finalPhone = getLowerNumber(inputMessage);
                // 電話番号アップデート
                await updateRecentDB(
                    "draftorder",
                    "telephone",
                    finalPhone,
                    "userkey",
                    userKey
                );
                console.log(`telephone update completed for ${userKey}.`);

                break;

            // メールアドレス
            case "mailaddress":
                // メールアップデート
                await updateRecentDB(
                    "draftorder",
                    "mailaddress",
                    inputMessage,
                    "userkey",
                    userKey
                );
                console.log(`mailaddress update completed for ${userKey}.`);

                break;

            // ラベル制作確認
            case "label":
                break;

            // ラベルジャンル選択
            case "choose":
                break;

            // ラベルテンプレート確認
            // クラシック
            case "template1":
                // ラベルテンプレートアップデート
                await updateDB(
                    "draftorder",
                    "template_id",
                    inputNo,
                    "userkey",
                    userKey
                );
                console.log(`template_id update completed for ${userKey}.`);

                break;

            // キュート
            case "template2":
                // ラベルテンプレートアップデート
                await updateDB(
                    "draftorder",
                    "template_id",
                    9 + inputNo,
                    "userkey",
                    userKey
                );
                console.log(`template_id update completed for ${userKey}.`);

                break;

            // エレガント
            case "template3":
                // ラベルテンプレートアップデート
                await updateDB(
                    "draftorder",
                    "template_id",
                    18 + inputNo,
                    "userkey",
                    userKey
                );
                console.log(`template_id update completed for ${userKey}.`);

                break;

            // ナイト
            case "template4":
                // ラベルテンプレートアップデート
                await updateDB(
                    "draftorder",
                    "template_id",
                    26 + inputNo,
                    "userkey",
                    userKey
                );
                console.log(`template_id update completed for ${userKey}.`);

                break;

            // ラベル文字確認
            case "label_text":
                // ロゴなら
                if (inputMessage == "ロゴ") {
                    // ロゴ使用アップデート
                    await updateRecentDB(
                        "draftorder",
                        "uselogo",
                        1,
                        "userkey",
                        userKey
                    );
                    console.log(`uselogo update completed for ${userKey}.`);
                }
                // ラベル文字アップデート
                await updateRecentDB(
                    "draftorder",
                    "label_text",
                    inputMessage,
                    "userkey",
                    userKey
                );
                console.log(`label_text update completed for ${userKey}.`);

                break;

            // 連絡方法
            case "contact":
                // 連絡方法アップデート
                await updateRecentDB(
                    "draftorder",
                    "contact_id",
                    inputNo,
                    "userkey",
                    userKey
                );
                console.log(`contact_id update completed for ${userKey}.`);

                break;

            // * 再購入モード
            // 登録ユーザ名
            case "re_name":
                // データ再抽出
                const tmpUserResult = await selectDB(
                    ["id"],
                    "user",
                    "username",
                    inputMessage
                );

                // エラー
                if (tmpUserResult == "error") {
                    tmpErr = "error";
                    console.log(`user search error`);
                    // 処理中断
                    break;
                }

                // IDのみ配列
                globalUserResult = tmpUserResult.map((user) => user.id);
                console.log(
                    `user search from username completed for ${inputMessage}.`
                );

                break;

            // 登録電話番号
            case "re_telephone":
                // 電話番号ハイフン除去
                const tmpPhoneNumber = getLowerNumber(inputMessage);
                // データ再抽出
                globalPhoneResult = await selectDB(
                    ["id", "username", "address", "mailaddress"],
                    "user",
                    "telephone",
                    tmpPhoneNumber
                );

                // エラー
                if (globalPhoneResult == "error") {
                    tmpErr = "error";
                    console.log(`user search error`);
                    // 処理中断
                    break;
                }
                console.log(
                    `user search from phonenumber completed for ${tmpPhoneNumber}.`
                );

                // ID一致判定
                globalPhoneResult.forEach(async (phone) => {
                    // 一致したものを別配列に
                    if (globalUserResult.indexOf(phone.id) > -1) {
                        globalFinalArray.push(phone);
                    }
                    Promise.resolve();
                });
                // 格納
                scenarioData[
                    localFlowId
                ].message = `こちらの登録内容でよろしいですか？<br>名前:&emsp;${globalFinalArray[0].username}<br>住所:&emsp;${globalFinalArray[0].address}<br>メール:&emsp;${globalFinalArray[0].mailaddress}`;

                break;

            // 登録確認
            case "confirm":
                // はい
                if (inputNo == 1) {
                    // 再販売
                    globalResaleFlg = true;
                    // ユーザ情報転記
                    // ユーザ名
                    await updateRecentDB(
                        "draftorder",
                        "username",
                        globalFinalArray[0].username,
                        "userkey",
                        userKey
                    );
                    // 店舗名
                    await updateRecentDB(
                        "draftorder",
                        "shopname",
                        globalFinalArray[0].shopname,
                        "userkey",
                        userKey
                    );
                    // 郵便番号
                    await updateRecentDB(
                        "draftorder",
                        "zipcode",
                        globalFinalArray[0].zipcode,
                        "userkey",
                        userKey
                    );
                    // 都道府県ID
                    await updateRecentDB(
                        "draftorder",
                        "prefecture_id",
                        globalFinalArray[0].prefecture_id,
                        "userkey",
                        userKey
                    );
                    // 市区町村
                    await updateRecentDB(
                        "draftorder",
                        "city",
                        globalFinalArray[0].city,
                        "userkey",
                        userKey
                    );
                    // 番地
                    await updateRecentDB(
                        "draftorder",
                        "address",
                        globalFinalArray[0].address,
                        "userkey",
                        userKey
                    );
                    // 電話番号
                    await updateRecentDB(
                        "draftorder",
                        "telephone",
                        globalFinalArray[0].telephone,
                        "userkey",
                        userKey
                    );
                    // メールアドレス
                    await updateRecentDB(
                        "draftorder",
                        "mailaddress",
                        globalFinalArray[0].mailaddress,
                        "userkey",
                        userKey
                    );
                    console.log(`userdata update completed for ${userKey}.`);
                }

                break;

            // 購入内容
            case "resale":
                // 商品アップデート
                await updateRecentDB(
                    "draftorder",
                    "product_id",
                    8,
                    "userkey",
                    userKey
                );
                console.log(`product_id update completed for ${userKey}.`);
                // 商品検索
                const productResult1 = await selectDB(
                    ["price"],
                    "product",
                    "id",
                    8
                );

                // エラー
                if (productResult1 == "error") {
                    tmpErr = "error";
                    console.log(`price search error`);
                    // 処理中断
                    break;
                }
                console.log(`price search completed for productid 3.`);
                // 総額
                const totalPrice =
                    productResult1[0].price * (inputNo - 1) + SHIPPING_FEE;
                // 数量アップデート
                await updateRecentDB(
                    "draftorder",
                    "quantity",
                    inputNo - 1,
                    "userkey",
                    userKey
                );
                console.log(`quantity update completed for ${userKey}.`);

                // 総額アップデート
                await updateRecentDB(
                    "draftorder",
                    "totalPrice",
                    totalPrice,
                    "userkey",
                    userKey
                );
                console.log(`totalPrice update completed for ${userKey}.`);

                break;

            // ラベル内容
            case "re_label":
                break;

            // 完了コンタクト
            case "re_contact":
                // アップデート
                await updateRecentDB(
                    "draftorder",
                    "contact_id",
                    inputNo,
                    "userkey",
                    userKey
                );
                console.log(`contact_id update completed for ${userKey}.`);

                break;

            // 注文内容
            case "complete":
            case "confirmation":
                // データ再抽出
                const orderResult = await selectRecentDB(
                    ["product_id", "quantity", "totalprice"],
                    "draftorder",
                    "userkey",
                    userKey
                );

                // エラー
                if (orderResult == "error") {
                    tmpErr = "error";
                    console.log(`order search error`);
                    // 処理中断
                    break;
                }

                console.log(
                    `order search from userkey completed for ${userKey}.`
                );
                // 商品名
                const productnameResult = await selectDB(
                    ["productname"],
                    "product",
                    "id",
                    orderResult[0].product_id
                );

                // エラー
                if (productnameResult == "error") {
                    tmpErr = "error";
                    console.log(`product search error`);
                    // 処理中断
                    break;
                }
                console.log(
                    `product search from userkey completed for ${userKey}.`
                );

                // 確認メッセージ格納
                scenarioData[
                    localFlowId
                ].message = `こちらのご注文内容でよろしいですか？<br>（ご注文内容が違う場合は「いいえ」を押すと最初の画面に戻ります）<br>
        <br>商品名:&emsp;${productnameResult[0].productname}
        <br>数量:&emsp;${orderResult[0].quantity}
        <br>送料:&emsp;${SHIPPING_FEE}円（税込）
        <br>総額:&emsp;${orderResult[0].totalprice.toLocaleString()}円（税込）`;

                break;

            // 確認
            case "detail":
                // 注文用
                const orderColumns = [
                    "userkey",
                    "shopname",
                    "username",
                    "prefecture_id",
                    "city",
                    "address",
                    "zipcode",
                    "telephone",
                    "mailaddress",
                ];
                // ユーザ用
                const userColumns = [
                    "shopname",
                    "username",
                    "prefecture_id",
                    "city",
                    "address",
                    "zipcode",
                    "telephone",
                    "mailaddress",
                ];
                // 完了アップデート
                await updateRecentDB(
                    "draftorder",
                    "completed",
                    1,
                    "userkey",
                    userKey
                );
                console.log(`completed update completed for ${userKey}.`);

                // 再購入でなければ登録
                if (!globalResaleFlg) {
                    // ユーザ検索
                    const userResult = await selectRecentDB(
                        orderColumns,
                        "draftorder",
                        "userkey",
                        userKey
                    );

                    // エラー
                    if (userResult == "error") {
                        tmpErr = "error";
                        console.log(`user search error`);
                        // 処理中断
                        break;
                    }
                    console.log(`user search completed for ${userKey}.`);
                    // 検索結果
                    const resultBase = userResult[0];
                    // ハイフン無し電話番号
                    const tmpPhoneNumber = getLowerNumber(resultBase.telephone);
                    // 格納内容
                    const upateValues = [
                        resultBase.shopname,
                        resultBase.username,
                        resultBase.prefecture_id,
                        resultBase.city,
                        resultBase.address,
                        resultBase.zipcode,
                        tmpPhoneNumber,
                        resultBase.mailaddress,
                    ];
                    // ユーザ登録
                    const tmpReg = await insertDB(
                        "user",
                        userColumns,
                        upateValues
                    );
                    console.log("user insertion completed.");
                    // ユーザID更新
                    await updateRecentDB(
                        "draftorder",
                        "user_id",
                        tmpReg.insertId,
                        "userkey",
                        userKey
                    );
                    console.log(
                        `completed user_id of order update completed for ${userKey}.`
                    );
                }

                // データ再抽出
                const orderResult3 = await selectRecentDB(
                    ["prefecture_id", "product_id"],
                    "draftorder",
                    "userkey",
                    userKey
                );

                // エラー
                if (orderResult3 == "error") {
                    tmpErr = "error";
                    console.log(`prefecture_id search error`);
                    // 処理中断
                    break;
                }
                console.log(`prefecture_id search completed for ${userKey}.`);
                // 都道府県名検索
                const orderResult4 = await selectDB(
                    ["prefname"],
                    "prefecture",
                    "id",
                    orderResult3[0].prefecture_id
                );

                // エラー
                if (orderResult4 == "error") {
                    tmpErr = "error";
                    console.log(`prefname search error`);
                    // 処理中断
                    break;
                }
                console.log(
                    `prefname search completed for ${orderResult3[0].prefecture_id}.`
                );
                // 注文情報検索
                const orderResult5 = await selectRecentDB(
                    [
                        "address",
                        "city",
                        "username",
                        "zipcode",
                        "mailaddress",
                        "quantity",
                    ],
                    "draftorder",
                    "userkey",
                    userKey
                );

                // エラー
                if (orderResult5 == "error") {
                    tmpErr = "error";
                    console.log(`address search error`);
                    // 処理中断
                    break;
                }
                console.log(`address search completed for ${userKey}.`);
                // 検索結果
                const resultObj = orderResult5[0];

                // 商品検索
                const productId = orderResult3[0].product_id;
                // 検索結果
                const productResult = await selectDB(
                    ["productname", "price", "variant_id"],
                    "product",
                    "id",
                    productId
                );

                // エラー
                if (productResult == "error") {
                    tmpErr = "error";
                    console.log(`product search error`);
                    // 処理中断
                    break;
                }
                console.log(`product search completed for ${productId}.`);

                // 総額アップデート
                const totalprice =
                    productResult[0].price * resultObj.quantity + SHIPPING_FEE;
                // 更新
                await updateRecentDB(
                    "draftorder",
                    "totalprice",
                    totalprice,
                    "userkey",
                    userKey
                );
                console.log(`completed order update completed for ${userKey}.`);

                // 郵送先
                const shippingAddress = {
                    address1: resultObj.address, // 住所1
                    address2: null, // 住所2
                    city: resultObj.city, // 市町村
                    company: null, // 法人姓
                    country: "Japan", // 国籍
                    firstName: resultObj.username, // 名
                    lastName: resultObj.username, // 姓
                    phone: null, // 電話番号
                    province: orderResult4[0].prefname, // 地区
                    zip: resultObj.zipcode, // 郵便番号
                };

                // Shopifyに送信
                const tmpShopifyUrl = await sendShopify(
                    productResult[0].variant_id,
                    shippingAddress,
                    resultObj.mailaddress,
                    resultObj.quantity
                );
                // 格納
                scenarioData[localFlowId].url = tmpShopifyUrl;

                break;

            // 完了
            case "final":
                break;

            // エラー
            case "error":
                break;

            // 不要
            case "":
                break;

            // デフォルト
            default:
                console.log(`Sorry, we are out of ${tag}.`);

                break;
        }

        // 送付用データ
        const localJsonObj = {
            authkey: globalAuthenticationKey, // 認証キー
            usrkey: userKey, // ユーザキー
            scenarioId: globalScenarioId, // シナリオID
            dataList: scenarioData[localFlowId], // データリスト
            error: tmpErr,
        };

        // cors付与
        res.set({ "Access-Control-Allow-Origin": "*" });
        // 送付
        res.send(localJsonObj);
    } catch (e) {
        // error
        console.log(e);
    }
});

// formからの注文リクエスト
app.post("/formorder", async (req, res) => {
    try {
        let tmpTemplateId;
        let finalUseLogo;
        // cors付与
        res.set({ "Access-Control-Allow-Origin": "*" });
        // オリジナル
        const tmpOriginal = req.body.original;
        // ロゴ使用
        const tmpUseLogo = req.body.horns;

        // オリジナルならゼロ
        if (tmpOriginal == "true") {
            tmpTemplateId = 0;
        } else {
            // テンプレートID
            tmpTemplateId = req.body.template_id;
        }
        // ロゴ使用なら1
        if (tmpUseLogo == "true") {
            finalUseLogo = 1;
        } else {
            // ロゴ不使用なら0
            finalUseLogo = 0;
        }
        // ラベル文字列
        const tmpLabelText = req.body.label_text;
        // 店舗名
        const tmpShopName = req.body.shopname;
        // ユーザ名
        const tmpUserName = req.body.username;
        // メールアドレス
        const tmpMailAddress = req.body.email;
        // コンタクト
        const tmpContact = req.body.contact;
        // 郵便番号
        const tmpZipNumber = req.body.zip;
        // 市区町村
        const tmpCity = req.body.city;
        // 番地
        const tmpStreet = req.body.street;
        // コメント
        const tmpComment = req.body.comment;
        // 商品
        const tmpProduct = Number(req.body.product);
        // ユーザ固有キー
        const userKey = getSecureRandom();
        // 都道府県ID
        const prefId = Number(req.body.pref);
        // 都道府県名検索
        const prefResult = await selectDB(
            ["prefname"],
            "prefecture",
            "id",
            prefId
        );
        // 商品
        const simgleProduct = {
            id: 6, // 商品ID
            quantity: tmpProduct, // 数量
            total: 2980 * tmpProduct + SHIPPING_FEE, // 合計額
        };

        // エラー
        if (prefResult == "error") {
            throw new Error("prefecture search error.");
        }

        console.log(`prefname search completed for ${prefId}.`);
        // カラム
        const formColumns = [
            "userkey",
            "initial",
            "fromchat",
            "template_id",
            "label_text",
            "shopname",
            "username",
            "telephone",
            "mailaddress",
            "contact_id",
            "zipcode",
            "prefecture_id",
            "city",
            "address",
            "product_id",
            "quantity",
            "totalprice",
            "completed",
            "reason",
            "useLogo",
        ];
        // 電話番号
        const tmpTel = getLowerNumber(req.body.tel);
        // 値
        const formValues = [
            userKey,
            1,
            0,
            tmpTemplateId,
            tmpLabelText,
            tmpShopName,
            tmpUserName,
            tmpTel,
            tmpMailAddress,
            tmpContact,
            tmpZipNumber,
            prefId,
            tmpCity,
            tmpStreet,
            simgleProduct.id,
            simgleProduct.quantity,
            simgleProduct.total,
            1,
            tmpComment,
            finalUseLogo,
        ];
        // DBに仮登録
        await insertDB("draftorder", formColumns, formValues);
        console.log(`inital insertion to order completed for ${userKey}.`);
        // 登録カラム
        const formUserColumns = [
            "shopname",
            "username",
            "prefecture_id",
            "city",
            "address",
            "zipcode",
            "telephone",
            "mailaddress",
            "active",
        ];
        // 登録値
        const formUserValues = [
            tmpShopName,
            tmpUserName,
            prefId,
            tmpCity,
            tmpStreet,
            tmpZipNumber,
            tmpTel,
            tmpMailAddress,
            1,
        ];
        // ユーザ登録
        const userReg = await insertDB("user", formUserColumns, formUserValues);
        console.log("user insertion completed.");
        // ユーザID更新
        await updateRecentDB(
            "draftorder",
            "user_id",
            userReg.insertId,
            "userkey",
            userKey
        );
        console.log(
            `completed user_id of order update completed for ${userKey}.`
        );

        // 配送先
        const formShippingAddress = {
            address1: tmpStreet, // 住所1
            address2: null, // 住所2
            city: tmpCity, // 市町村
            company: null, // 法人姓
            country: "Japan", // 国籍
            firstName: tmpUserName, // 名
            lastName: tmpUserName, // 姓
            phone: null, // 電話番号
            province: prefResult[0].prefname, // 地区
            zip: tmpZipNumber, // 郵便番号
        };

        // Shopifyに送信
        const tmpShopifyUrl = await sendShopify(
            45115159806252,
            formShippingAddress,
            tmpMailAddress,
            simgleProduct.quantity
        );

        res.send({
            url: tmpShopifyUrl,
        });
    } catch (e) {
        // error
        console.log(e);
    }
});

// 3000番でLISTEN
app.listen(DEFAULT_PORT, () => {
    console.log(`${SERVERNAME} listening on port ${DEFAULT_PORT}`);
});

// Shopify処理
const sendShopify = async (variantId, shipaddress, usermail, amount) => {
    return new Promise(async (resolve, reject) => {
        try {
            // クライアント初期化
            const shopifyClient = shopify.buildClient(shopifyConfig, fetch);
            // 空のチェックアウト作成
            const checkout = await shopifyClient.checkout.create();
            // ID取得
            const checkoutToken = checkout.id;
            // variantID
            const finalVariantId = Buffer.from(
                `gid://shopify/ProductVariant/${variantId}`,
                "utf8"
            ).toString("base64");

            // 購入商品
            const lineItemsToAdd = [
                {
                    variantId: finalVariantId, // variantID
                    quantity: amount, // 数量
                },
            ];

            // チェックアウト更新処理
            const shopifyCheckout = shopifyClient.checkout;
            // 商品情報
            shopifyCheckout
                .addLineItems(checkoutToken, lineItemsToAdd)
                .then(() => {
                    // 送付先情報
                    shopifyCheckout
                        .updateShippingAddress(checkoutToken, shipaddress)
                        .then(async () => {
                            // 0.1秒ウェイト
                            await setTimeout(100);
                            // メール情報
                            shopifyCheckout
                                .updateEmail(checkoutToken, usermail)
                                .then(async (checkout) => {
                                    // 0.5秒ウェイト
                                    await setTimeout(500);
                                    // URLを返す
                                    resolve(checkout.webUrl);
                                });
                        });
                });
        } catch (e) {
            // error
            reject(e);
        }
    });
};

// 電話番号を半角ハイフンなしへ
const getLowerNumber = (str) => {
    // 電話番号半角&ハイフン除去
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 65248).replace(/-/g, "");
    });
};

// 住所から抽出
const extractFromAddress = async (address) => {
    return new Promise(async (resolve, reject) => {
        try {
            // 正規表現
            const rex =
                /(.{2,3}?[都道府県])((?:高市|静岡市|野々市|西村|西八代郡市|芳賀郡市|羽村|福岡市|神戸市|神崎郡市|相模原市|田村|熊本市|浜松市|武蔵村|横浜市|柴田郡村|杵島郡大町|東村|札幌市|新潟市|廿日市|広島市|川崎市|岡山市|大阪市|大町|大村|堺市|四日市|名古屋市中村|名古屋市|吉野郡下市|千葉市|十日町|北村|北九州市|余市郡余市|余市|佐波郡玉村|仙台市|京都市|中新川郡上市|さいたま市|.)?.*?[市区町村])(.*)/;
            // 結果
            const result = address.replace(rex, "$1,$2,$3");
            // カンマ区切りで配列を返す
            resolve(result.split(","));
        } catch (e) {
            //error
            reject(e);
        }
    });
};

// ランダム文字列生成
const getSecureRandom = () => {
    // バイナリで8byteのランダムな値を生成
    const buff = Crypto.randomBytes(8);
    // 16進数の文字列に変換
    const hex = buff.toString("hex");

    // integerに変換して返却
    return parseInt(hex, 16);
};

// Mysql Query
// * select
// select from database
const selectDB = async (field, table, column, value) => {
    return new Promise(async (resolve, reject) => {
        try {
            // query
            await myDB.doInquiry("SELECT DISTINCT ?? FROM ?? WHERE ?? IN (?)", [
                field,
                table,
                column,
                value,
            ]);
            // resolve
            resolve(myDB.getValue);
        } catch (e) {
            // error
            reject(e);
        }
    });
};

// select on multiple condition
const selectDoubleDB = async (
    field,
    table,
    column1,
    value1,
    column2,
    value2
) => {
    return new Promise(async (resolve, reject) => {
        try {
            // query
            await myDB.doInquiry(
                "SELECT ?? FROM ?? WHERE ?? IN (?) AND ?? IN (?)",
                [field, table, column1, value1, column2, value2]
            );
            // resolve
            resolve(myDB.getValue);
        } catch (e) {
            // error
            reject(e);
        }
    });
};

// select on multiple condition
const selectRecentDB = async (field, table, column, value) => {
    return new Promise(async (resolve, reject) => {
        try {
            // query
            await myDB.doInquiry(
                "SELECT ?? FROM ?? WHERE ?? IN (?) AND ?? > date(current_timestamp - interval 3 day);",
                [field, table, column, value, "created_at"]
            );
            // resolve
            resolve(myDB.getValue);
        } catch (e) {
            // error
            reject(e);
        }
    });
};

// * insert
// insert into database
const insertDB = async (table, columns, values) => {
    return new Promise(async (resolve, reject) => {
        try {
            // query
            await myDB.doInquiry("INSERT INTO ??(??) VALUES (?)", [
                table,
                columns,
                values,
            ]);
            // resolve
            resolve(myDB.getValue);
        } catch (e) {
            // error
            reject(e);
        }
    });
};

// * update
// update data
const updateDB = async (table, setcol, setval, selcol, selval) => {
    return new Promise(async (resolve, reject) => {
        try {
            // query
            await myDB.doInquiry("UPDATE ?? SET ?? = ? WHERE ?? = ?", [
                table,
                setcol,
                setval,
                selcol,
                selval,
            ]);
            // resolve
            resolve();
        } catch (e) {
            // error
            reject(e);
        }
    });
};

// update recent data
const updateRecentDB = async (table, setcol, setval, selcol, selval) => {
    return new Promise(async (resolve, reject) => {
        try {
            // query
            await myDB.doInquiry(
                "UPDATE ?? SET ?? = ? WHERE ?? IN (?) AND ?? > date(current_timestamp - interval 3 day)",
                [table, setcol, setval, selcol, selval, "created_at"]
            );
            // resolve
            resolve();
        } catch (e) {
            // error
            reject(e);
        }
    });
};
