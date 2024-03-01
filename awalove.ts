/**
 * index.ts
 *
 * function：LINE WEBHOOK サーバ
 **/

// import global interface
import { } from '../@types/globalsql';

// モジュール
import { config as dotenv } from 'dotenv'; // dotenv
import * as path from 'path'; // path
import express from 'express'; // express
import axios from 'axios'; // http通信用
import log4js from "log4js"; // ロガー
import helmet from 'helmet'; // セキュリティ対策
import sanitizeHtml from 'sanitize-html'; // サニタイズ用
import URLSafeBase64 from 'urlsafe-base64'; // urlsafe
import SQL from '../class/MySql0229'; // DB操作用
import Encrypto from '../class/Crypto0229'; // 暗号化用

// モジュール設定
dotenv({ path: path.join(__dirname, '../../keys/.env') });

// ロガー設定
log4js.configure({
  appenders: {
    out: { type: 'stdout' },
    system: { type: 'file', filename: '../logs/access.log' }
  },
  categories: {
    default: { appenders: ['out', 'system'], level: 'debug' }
  }
});
const logger: any = log4js.getLogger();

// 定数
const PAYSTATUS: string = 'CAPTURE'; // 決済モード
const DEV_FLG: boolean = false; // 開発フラグ
const DEFAULT_URL: string = process.env.DEFAULT_URL!; // サーバURL
const PORT: number = Number(process.env.PORT); // ポート番号
const DEF_HOST: string = process.env.DEF_HOST!; // ポート番号
const TOKEN: string = process.env.LINE_ACCESS_TOKEN!; // LINEアクセストークン
const FIXEDPRICE: number = 6000; // 商品代金
const LINE_DEFAULTURL: string = process.env.LINE_DEFAULTURL!; // サーバURL
const LINE_FRIEND_URL: string = process.env.LINE_FRIEND_URL!; // LINE友だち登録用

// 開発環境切り替え
let gmoConfigid: string; // 設定ID
let gmoShopid: string; // ショップID
let gmoShoppass: string; // ショップパスワード
let gmoPayRequestUrl: string; // 決済リクエストAPI

// 開発モード
if (DEV_FLG) {
  gmoConfigid = process.env.GMO_DEV_CONFIGID!; // 設定ID(開発用)
  gmoShopid = process.env.GMO_DEV_SHOPID!; // ショップID(開発用)
  gmoShoppass = process.env.GMO_DEV_SHOPPASS!; // ショップパスワード(開発用)
  gmoPayRequestUrl = process.env.GMO_DEV_PAY_REQUESTURL!; // 決済リクエストAPI(開発用)

} else {
  gmoConfigid = process.env.GMO_CONFIGID!; // 設定ID
  gmoShopid = process.env.GMO_SHOPID!; // ショップID
  gmoShoppass = process.env.GMO_SHOPPASS!; // ショップパスワード
  gmoPayRequestUrl = process.env.GMO_PAY_REQUESTURL!; // 決済リクエストAPI
}

// DB設定
const myDB: SQL = new SQL(
  process.env.SQL_HOST!, // ホスト名
  process.env.SQL_ADMINUSER!, // ユーザ名
  process.env.SQL_ADMINPASS!, // ユーザパスワード
  Number(process.env.SQLPORT), // ポート番号
  process.env.SQL_DBNAME!, // DB名
);

// express設定
const app: any = express(); // express
app.set('view engine', 'ejs'); // ejs設定
app.use(express.static(path.join(__dirname, 'public'))); // 静的ファイル設定
app.use(express.json()); // json設定
app.use(
  express.urlencoded({
    extended: true, // body parser使用
  })
);

// ヘルメットを使用する
app.use(helmet.frameguard({ action: 'sameorigin' }));

// top
app.get('/', (_: any, res: any) => {
  res.render('index');
});

// ニュース
app.get('/news/:id', (_: any, res: any) => {
  res.render('news');
});

// 特定商取引法
app.get('/commercial', (_: any, res: any) => {
  res.render('commercial');
});

// 会社概要
app.get('/company', (_: any, res: any) => {
  res.render('company');
});

// プライバシーポリシー
app.get('/privacy', (_: any, res: any) => {
  res.render('privacy');
});

// GMO決済戻り先
app.post('/complete', async (req: any, res: any) => {
  try {
    // モード
    logger.info('complete mode');

    // 変数定義
    let tmpText: string = '';
    // 結果文字列
    let finalString: string = '';
    // BASE64デコード
    const base64EncodeUtf: Buffer = URLSafeBase64.decode(req.body.result);
    // デコード後文字列
    const decodedString: string = base64EncodeUtf.toString('utf8');

    // 不要文字列削除用
    const regex = /\"TranDate\":\"[0-9]{14}\"}}/;
    // 不要文字列削除用
    const regexwithreg = /\"Result\":\"(SUCCESS|FAIL)\"}}/;
    // カード登録判定用
    const successreg = /registcard/;

    // 結果正常
    if (successreg.test(decodedString)) {
      // 不要文字あり
      const resultwithreg = decodedString.match(regexwithreg);
      // マッチあり
      if (resultwithreg) {
        // TranDate:- 以降を削除
        finalString = decodedString.substring(0, Number(resultwithreg.index) + resultwithreg[0].length);

      } else {
        // そのまま
        finalString = decodedString;
      }

    } else {
      // 不要文字あり
      const result = decodedString.match(regex);
      // マッチあり
      if (result) {
        // Result:- 以降を削除
        finalString = decodedString.substring(0, Number(result.index) + result[0].length);

      } else {
        // そのまま
        finalString = decodedString;
      }
    }

    // JSONパース
    const resultData: any = JSON.parse(finalString);

    // 分岐
    switch (resultData.transactionresult.Result) {
      // 決済成功
      case 'PAYSUCCESS':
        // 決済ステータスが'AUTH'
        if (resultData.credit.Status == PAYSTATUS) {
          // 送付テキスト
          tmpText = 'ご注文ありがとうございました。×ボタンでページを閉じてください。';
          // ユーザキー
          const userKey: string = resultData.transactionresult.OrderID.split('-')[1];
          // ファイル名
          const transactionResult: string = await makeTransactionkeyDB(userKey);

          // エラー
          if (transactionResult != 'completed') {
            logger.error("transaction insertion error");
            //throw new Error('transaction insertion error');
          }
          break;
        }

      // 決済途中
      case 'PAYSTART':
        // 送付テキスト
        tmpText = '不正な操作です。一旦ページを閉じて開きなおしてください。';
        break;

      // 決済エラー
      case 'ERROR':
        // 送付テキスト
        tmpText = '決済エラーです。ページを閉じてください。';
        break;

      // それ以外
      default:
        logger.error(`Sorry, we are out of ${resultData.transactionresult.Result}.`);
    }

    // 画面描画
    res.render('complete', {
      text: tmpText, // 表示内容
    });

  } catch (e: unknown) {
    // エラー
    logger.error(e);
  }
});

// GMO決済戻り先
app.post('/cancel', async (_: any, res: any) => {
  // モード
  logger.info('cancel mode');

  // 画面描画
  res.render('cancel', {
    text: '処理を中断しました。ページを閉じてください。', // 表示内容
  });
});

// WEBHOOK
app.post('/webhook', async (req: any, _: any) => {
  // モード
  try {
    logger.info('webhook mode');
    // メッセージ
    let dataString: string = '';
    // 暗号化用+
    const pubCrypto: Encrypto = new Encrypto();
    // タイプ
    const eventtype: string = req.body.events[0].type ?? '';
    // LINEユーザID
    const userId: string = req.body.events[0].source.userId ?? '';
    // 返信トークン
    const replyToken: string = req.body.events[0].replyToken ?? '';

    // 返信トークンあり
    if (replyToken == '') {
      // 顧客検索エラー
      logger.fatal("no essential data error");
      throw new Error('no essential data error');
    }

    // フォローイベント
    if (eventtype == 'follow') {
      // 友だち追加メッセージ
      logger.info('follow mode');

      // 対象データ
      const secondUserSelectArgs: countargs = {
        table: 'lineuser', // テーブル
        columns: ['userid'], // カラム
        values: [userId], // 値
      }
      // ユーザ抽出
      const initialUserData: any = await myDB.countDB(secondUserSelectArgs);

      // 登録なし
      if (initialUserData == 0) {
        // ユーザ格納用
        const insertUserArgs: insertargs = {
          table: 'lineuser',
          columns: [
            'userid',
            'initial',
            'usable',
          ],
          values: [
            userId,
            1,
            1,
          ],
        }
        // ユーザDB格納
        const tmpUserReg: any = await myDB.insertDB(insertUserArgs);

        // エラー
        if (tmpUserReg !== 'error') {
          logger.info('initial insertion to lineuser completed.');
        }

      } else {
        logger.error('lineuser insertion error');
        // 対象データ
        const updateUserArgs: updateargs = {
          table: 'lineuser', // テーブル
          setcol: ['initial', 'usable'], // 遷移キー
          setval: [1, 1], // キー値
          selcol: 'userid', // 対象返信トークン
          selval: userId, // 返信トークン値
        }
        // 更新処理
        const upFirstLineUser: string | Object[] = await myDB.updateDB(updateUserArgs);

        // 完了
        if (upFirstLineUser !== 'error') {
          // 更新メッセージ
          logger.info('lineuser updated');

        } else {
          logger.info('initial insertion to lineuser completed.');
        }
      }

    } else if (eventtype == 'message') {
      // 通常メッセージ
      logger.info('message mode');

      // ユーザIDと返信トークンあり
      if (userId == '' || replyToken == '') {
        // 顧客検索エラー
        logger.fatal("no essential data error");
        throw new Error('no essential data error');
      }

      // メッセージ
      const messageStr: string = zen2han(req.body.events[0].message.text).toLowerCase() ?? '';

      // メッセージ内容により分岐
      switch (messageStr) {
        // 二回目以降
        case 'process:second':
          logger.info('second mode');

          // 対象データ
          const secondUserSelectArgs: selectargs = {
            table: 'lineuser', // テーブル
            columns: ['userid', 'usable'], // カラム
            values: [userId, 1], // 値
          }
          // ユーザ抽出
          const secondUserData: any = await myDB.selectDB(secondUserSelectArgs);

          // 登録あり
          if (secondUserData != 'error') {
            // 決済方法前メッセージ
            dataString = JSON.stringify({
              replyToken: replyToken, // 返信トークン
              messages: [
                {
                  type: "text",
                  text: `${secondUserData[0].shopname}さん、おかえりなさい。\n▼今回の決済方法をお選びください`,
                },
                {
                  type: "template",
                  altText: "お支払方法をお選びください",
                  template: {
                    type: "buttons",
                    title: "お支払方法をお選びください",
                    text: "お支払方法をお選びください",
                    actions: [
                      {
                        type: "message",
                        label: "クレジットカード",
                        text: "クレジットカード",
                      },
                      {
                        type: "message",
                        label: "代金引換",
                        text: "代金引換",
                      },
                    ],
                  },
                },
              ],
            });

          } else {
            // エラーメッセージ
            dataString = JSON.stringify({
              replyToken: replyToken, // 返信トークン
              messages: [
                {
                  type: "text",
                  text: `登録がありません。こちらから初回注文をお願いいたします。\n${DEFAULT_URL}`,
                },
              ],
            });
          }
          // メッセージ送付
          sendMessage(dataString);
          break;

        // 決済確認
        case 'クレジットカード':
        case '代金引換':
          logger.info('payment mode');

          // 支払方法ID
          let paymentid: string;

          if (messageStr == 'クレジットカード') {
            // 支払方法ID
            paymentid = '1';

          } else if (messageStr == '代金引換') {
            // 支払方法ID
            paymentid = '2';

          } else {
            // 支払方法ID
            paymentid = '';
          }

          // キーアップデート
          // 対象データ
          const tmpUserJoinArgs: joinargs = {
            table: 'lineuser',
            columns: ['userid', 'usable'],
            values: [userId, 1],
            jointable: 'transaction',
            joincolumns: ['usable'],
            joinvalues: [1],
            joinid1: 'id',
            joinid2: 'lineuser_id',
            spantable: 'transaction',
            spancol: 'created_at',
            span: 1,
            order: 'created_at',
            ordertable: 'transaction',
          }
          // 支払方法抽出
          const searchUserData: any = await myDB.selectJoinDB(tmpUserJoinArgs);

          // ヒットなし
          if (searchUserData == 'error') {
            // 顧客検索エラー
            logger.error("no data error");
            //throw new Error('nodata error');
          }

          // 対象トランザクションID
          const targetUserId = searchUserData[0].lineuser_id;
          // 対象トランザクションID
          const targetTransId = searchUserData[0].id;
          // ランダム文字列
          const transRandomkey = await pubCrypto.random(7);

          // 対象データ
          const updateTransArgs: updateargs = {
            table: 'transaction', // テーブル
            setcol: ['transkey', 'payment_id'], // 遷移キー
            setval: [transRandomkey, Number(paymentid)], // キー値
            selcol: 'id', // 対象返信トークン
            selval: targetTransId, // 返信トークン値
          }
          // 更新処理
          const upTransaction: string | Object[] = await myDB.updateDB(updateTransArgs);

          // 完了
          if (upTransaction != 'error') {
            // 更新メッセージ
            logger.info(`${replyToken} updated`);
          }

          // 0埋め暫定番号
          const zeropadTmpNo: string = String(targetUserId).padStart(7, '0');
          // 設定ID
          const configurationID: string = gmoConfigid;
          // ショップID
          const gmoShopID: string = gmoShopid;
          // 注文ID
          const gmoOrderID: string = `EB${zeropadTmpNo}-${transRandomkey}`;
          // ショップパスワード
          const shopPassword: string = gmoShoppass!;

          // 空欄
          if (paymentid == '') {
            // エラーメッセージ
            dataString = JSON.stringify({
              replyToken: replyToken, // 返信トークン
              messages: [
                {
                  type: "text",
                  text: "店舗名が空欄です。やり直してください。",
                },
              ],
            });

            // クレジットカード
          } else if (paymentid == '1') {
            // 最終URL
            const finalUrl: string = await publishPayUrl(
              gmoShopID, // ショップID
              shopPassword, // ショップパスワード
              configurationID, // 設定ID
              gmoOrderID, // 注文ID
              String(FIXEDPRICE), // 合計
              '0', // 税
              String(zeropadTmpNo), // 顧客番号
            );

            // 対象データ
            const finalUpdateTransArgs: updateargs = {
              table: 'transaction', // テーブル
              setcol: ['settlementurl'], // 遷移キー
              setval: [finalUrl], // キー値
              selcol: 'id', // 対象返信トークン
              selval: targetTransId, // 返信トークン値
            }
            // 更新処理
            const finalUpTransaction: string | Object[] = await myDB.updateDB(finalUpdateTransArgs);

            // 完了
            if (finalUpTransaction != 'error') {
              // 更新メッセージ
              logger.info(`${targetTransId} updated`);
            }

            // お礼メッセージ
            dataString = JSON.stringify({
              replyToken: replyToken, // 返信トークン
              messages: [
                {
                  type: "text",
                  text: `ご注文ありがとうございます。\n【クレジットカードでのお支払い】ですね。\nこちらのリンクを押してください。\n${finalUrl}`,
                },
              ],
            });

            // 代金引換
          } else if (paymentid == '2') {
            // お礼メッセージ
            dataString = JSON.stringify({
              replyToken: replyToken, // 返信トークン
              messages: [
                {
                  type: "text",
                  text: `ご注文ありがとうございます。\n【商品代引でのお支払い】ですね。\n商品到着までしばらくお待ちください。\n`,
                },
              ],
            });
          }
          // メッセージ送付
          sendMessage(dataString);
          break;

        // 決済確認
        default:
          logger.info('initial mode');

          // 対象データ
          const initUserCountArgs: countargs = {
            table: 'lineuser', // テーブル
            columns: ['userid', 'initial', 'usable'], // カラム
            values: [userId, 1, 1], // 値
          }
          // ユーザ抽出
          const firstUserCount: any = await myDB.countDB(initUserCountArgs);

          // 登録あり
          if (firstUserCount == 0) {
            // 更新メッセージ
            logger.error('no user data.');

            // 初回店名登録
          } else {
            // ラベル
            const initUserSelectArgs: selectargs = {
              table: 'lineuser', // テーブル
              columns: ['userid', 'initial', 'usable'], // カラム
              values: [userId, 1, 1], // 値
            }

            // ユーザ抽出
            const tmpUserData: any = await myDB.selectDB(initUserSelectArgs);

            // エラー
            if (tmpUserData === 'error') {
              logger.error("label search error");
              //throw new Error('label search error');
            }
            // 対象データ
            const updateUserArgs: updateargs = {
              table: 'lineuser', // テーブル
              setcol: ['shopname', 'initial'], // 遷移キー
              setval: [messageStr, 0], // キー値
              selcol: 'id', // 対象ユーザID
              selval: tmpUserData[0].id, // ユーザID値
            }
            // 更新処理
            const upLineUser: string | Object[] = await myDB.updateDB(updateUserArgs);

            // 完了
            if (upLineUser !== 'error') {
              // 更新メッセージ
              logger.info('lineuser updated');
            }

            // 対象データ
            const insertTransArgs: insertargs = {
              table: 'transaction',
              columns: [
                'lineuser_id',
                'usable',
              ],
              values: [
                tmpUserData[0].id,
                1,
              ],
            }
            // トランザクションDB格納
            const transReg: any = await myDB.insertDB(insertTransArgs);

            // エラー
            if (transReg == 'error') {
              logger.info('transaction insertion error');

            } else {
              logger.info('initial insertion to transaction completed.');
            }

            // 決済方法前メッセージ
            dataString = JSON.stringify({
              replyToken: replyToken, // 返信トークン
              messages: [
                {
                  type: "text",
                  text: "ご入力ありがとうございます。",
                },
                {
                  type: "template",
                  altText: "お支払方法をお選びください",
                  template: {
                    type: "buttons",
                    text: "お支払方法をお選びください",
                    actions: [
                      {
                        type: "message",
                        label: "クレジットカード",
                        text: "クレジットカード",
                      },
                      {
                        type: "message",
                        label: "代金引換",
                        text: "代金引換",
                      },
                    ],
                  },
                },
              ],
            });
            // メッセージ送付
            sendMessage(dataString);
          }
          break;
      }
    }

  } catch (e: unknown) {
    // エラー
    logger.error(e);
  }
});

// フォームデータ受信
app.post('/form', async (req: any, res: any) => {
  // モード
  try {
    logger.info('form mode');

    // 都道府県番号
    let pref: number;

    // 受信データサニタイズ
    const shopname: string = sanitizeHtml(req.body.shopname); // 店舗名
    const tel: string = sanitizeHtml(req.body.tel); // 電話番号
    const email: string = sanitizeHtml(req.body.email); // メールアドレス
    const zip: string = sanitizeHtml(req.body.zip); // 〒番号
    const city: string = sanitizeHtml(req.body.city); // 市区町村
    const street: string = sanitizeHtml(req.body.street); // 番地
    const labeltext: string = sanitizeHtml(req.body.labeltext); // ラベル文字列
    const imgSelect: string = sanitizeHtml(req.body.imgSelect); // ラベルテンプレートID
    const original: number = (sanitizeHtml(req.body.original) == 'on') ? 1 : 0; // オリジナル
    const uselogo: number = (sanitizeHtml(req.body.uselogo) == 'on') ? 1 : 0; // ロゴ使用

    // 都道府県
    // 数値の場合
    if (!isNaN(req.body.pref)) {
      pref = Number(sanitizeHtml(req.body.pref));

    } else {
      // 数値でなければ0
      pref = 0;
    }

    // ラベル
    const labelSelectArgs: selectargs = {
      table: 'label', // テーブル
      columns: ['labelname', 'usable'], // カラム
      values: [imgSelect, 1], // 値
    }

    // ユーザ抽出
    const tmpLabelData: any = await myDB.selectDB(labelSelectArgs);

    // エラー
    if (tmpLabelData === 'error') {
      logger.error("label search error");
      //throw new Error('label search error');
    }

    // 対象データ
    const insertFormArgs: insertargs = {
      table: 'form',
      columns: [
        'label_id',
        'original',
        'labeltext',
        'uselogo',
        'shopname',
        'shoptel',
        'shopemail',
        'zipcode',
        'prefectuire_id',
        'city',
        'street',
        'usable',
      ],
      values: [
        tmpLabelData[0].id,
        original,
        labeltext,
        uselogo,
        shopname,
        tel,
        email,
        zip,
        pref,
        city,
        street,
        1,
      ],
    }
    // トランザクションDB格納
    const tmpReg: any = await myDB.insertDB(insertFormArgs);

    // エラー
    if (tmpReg == 'error') {
      logger.error('form insertion error');
      //throw new Error('form insertion error');

    } else {
      logger.info('initial insertion to form completed.');
    }

    // ライン友だち登録画面へリダイレクト
    res.redirect(LINE_FRIEND_URL);

  } catch (e: unknown) {
    // エラー
    logger.error(e);
  }
});

// エラーハンドラー(500)
app.use((err: any, _: any, res: any, next: any) => {
  if (err.name === 'TypeError') {
    res.status(500).render('error', { title: '500', message: 'forbidden' });

  } else {
    next(err);
  }
});

// エラーハンドラー(それ以外)
app.all('*', (req: any, res: any) => {
  if (req.path == '/403') {
    res.status(403).render('403', {});

  } else {
    res.status(404).render('404', {});
  }
});

// 3001番待機
app.listen(PORT, () => {
  console.log(`awalove server listening at ${DEF_HOST}:${PORT}`);
});

// メッセージ送付
const sendMessage = async (dtString: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      // post送信
      axios.post(LINE_DEFAULTURL, dtString, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json', // Content-type
          Authorization: 'Bearer ' + TOKEN, // 認証トークン
        } // ヘッダ

      }).then((response: any) => {
        // 対象データ
        const targetData = response.data.LinkUrl;

        // 受信データ
        if (targetData != 'error') {
          // リンクURL返し
          resolve(targetData);

        } else {
          // エラー返し
          reject('error');
        }

        // 完了
        resolve();
      });

    } catch (e: unknown) {
      // エラー
      logger.error(e);
      reject('error');
    }
  });
}

// メッセージ整形
const zen2han = (input: string): string => {
  return input.replace(/[！-～]/g,
    input => {
      return String.fromCharCode(input.charCodeAt(0) - 0xFEE0);
    }
  );
}
// post送信
const httpsPost = async (hostname: string, data: any, flg: boolean): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 対象データ
      let targetData: any;

      // post送信
      axios.post(hostname, data, {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        } // ヘッダ

      }).then((response: any) => {

        // 戻り値あり
        if (flg) {
          // 対象データ
          targetData = response.data.LinkUrl;

          // 受信データ
          if (targetData != 'error') {
            // リンクURL返し
            resolve(targetData);

          } else {
            // エラー返し
            reject('error');
          }
        }

      }).catch((err: unknown) => {
        // エラー
        logger.error(err);
      });

    } catch (e: unknown) {
      // エラー
      logger.error(e);
      reject('error');
    }
  });
}

// URL発行
const publishPayUrl = (shopid: string, shoppass: string, confid: string, orderid: string, amount: string, tax: string, customerno: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 決済url発行
      const requesturl: string = gmoPayRequestUrl;

      // 送付JSON
      const param: any = {
        geturlparam: {
          ShopID: shopid, // ショップID
          ShopPass: shoppass, // ショップパスワード
        },
        configid: confid, // 設定ID
        transaction: {
          OrderID: orderid, // 注文ID
          Amount: amount, // 利用金額
          Tax: tax, // 税送料
          RetUrl: `${DEFAULT_URL}/cancel`, // 戻り先URL
          CompleteUrl: `${DEFAULT_URL}/complete`, // 完了時戻り先URL
          NotifyMailaddress: process.env.GMO_MAILADDRESS, // 決済完了通知先メールアドレス
          ExpireDays: '7', // 取引有効日数
          ResultSkipFlag: '1', // 結果画面スキップフラグ
        },
        credit: {
          JobCd: PAYSTATUS, // 決済モード
          TdFlag: 2, // 本人認証サービス利用フラグ
          MemberID: customerno, // 顧客番号
          SecCodeRequiredFlag: '1', // セキュリティコード必須フラグ
          RegistMemberID: customerno, // 登録用顧客番号
          CardMaxCnt: '5', // 最大カード登録枚数
        }
      }

      // 送信
      const paymentUrl: string = await httpsPost(requesturl, JSON.stringify(param), true);

      // エラーでなければ
      if (paymentUrl != 'error') {
        // 値返し
        resolve(paymentUrl);
      }

    } catch (e: unknown) {
      // エラー型
      logger.error(e);
      reject('error');
    }
  });
}

// 設定ファイル作成
const makeTransactionkeyDB = async (key: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 対象データ
      const updateTransArgs: updateargs = {
        table: 'transaction', // テーブル
        setcol: ['paid'], // 遷移先URL
        setval: [1], // 遷移先URL値
        selcol: 'transkey', // 対象ID
        selval: key, // 対象ID値
      }
      // DBアップデート
      const transactionDel: string | Object[] = await myDB.updateDB(updateTransArgs);

      // 完了
      if (transactionDel !== 'error') {
        // 更新メッセージ
        resolve('completed');
        logger.info('transkey updated');

      } else {
        reject('error');
        logger.info('initial insertion to transaction completed.');
      }

    } catch (e: unknown) {
      // エラー
      logger.error(e);
      reject('error');
    }
  });
}