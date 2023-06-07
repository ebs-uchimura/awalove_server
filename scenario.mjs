/**
 * scenario.mjs
 *
 * function：シナリオ
 **/

// 数量セレクト生成
// シリアル番号(99)
const serialNumberFull = Array.from({ length: 99 }).map((_, k) => k);
// 数量リスト生成
const makeAmoutList = (nextId) => {
    return serialNumberFull.map((k) => ({
        answerId: `${k + 1}`, // 回答ID
        answerText: `${k + 1}`, // 回答テキスト
        nextFlowId: nextId.toString(), // 次のフローID
    }));
};

// 画像リスト生成
const makeImageList = (genre, nextId) => {
    // 開始番号
    let startNumber = 0;
    // ジャンル毎の数
    let baseNumber = 0;
    // 除外ID
    let removeIdArray = [];

    // ジャンルにより基数を分ける
    switch (genre) {
        // クラシック
        case "classic":
            startNumber = 0;
            baseNumber = 9;
            removeIdArray = ["1"];
            break;

        // キュート
        case "cute":
            startNumber = 9;
            baseNumber = 9;
            removeIdArray = ["5", "6", "7"];
            break;

        // エレガント
        case "elegant":
            startNumber = 18;
            baseNumber = 8;
            break;

        // ナイト
        case "night":
            startNumber = 26;
            baseNumber = 9;
            removeIdArray = ["5", "7"];
            break;
    }
    // シリアル番号
    let imgserialNumber = Array.from({ length: baseNumber }).map((_, k) => k);
    // 除外処理
    removeIdArray.forEach((val) => {
        let index = imgserialNumber.indexOf(val);
        imgserialNumber.splice(index, 1);
    });
    // オブジェクト返し
    let imageListArray = imgserialNumber.map((k) => ({
        answerId: `${k + 1}`, // 回答ID
        start: baseNumber, // ジャンル
        imageId: `${startNumber + k + 1}`, // 画像ID
        imageUrl: `${genre}/${("000" + (k + 1)).slice(-3)}.webp`, // 画像URL
        answerText: `${genre}${k + 1}`, // 回答テキスト
        nextFlowId: nextId.toString(), // 次のフローID
    }));
    // ジャンル選択に戻るボタン
    imageListArray.push({
        answerId: `${baseNumber - 1}`, // 回答ID
        start: baseNumber, // ジャンル
        imageId: "999", // 画像ID
        imageUrl: "", // 画像URL
        answerText: "ジャンル選択に戻る", // 回答テキスト
        nextFlowId: nextId.toString(), // 次のフローID
    });
    // 生成リスト返し
    return imageListArray;
};

// コンタクト時間生成
const makeContactList = (nextId) => {
    // nextIDを一時保存
    const tmpNextId = nextId.toString();

    return [
        {
            answerId: "1", // コンタクトID
            answerText: "メールでやりとりしたい", // メッセージ
            nextFlowId: tmpNextId, // 次のフローID
        },
        {
            answerId: "2", // コンタクトID
            answerText: "電話でやりとりしたい（午前中希望）", // メッセージ
            nextFlowId: tmpNextId, // 次のフローID
        },
        {
            answerId: "3", // コンタクトID
            answerText: "電話でやりとりしたい（12時〜14時希望）", // メッセージ
            nextFlowId: tmpNextId, // 次のフローID
        },
        {
            answerId: "4", // コンタクトID
            answerText: "電話でやりとりしたい（14時〜16時希望）", // メッセージ
            nextFlowId: tmpNextId, // 次のフローID
        },
        {
            answerId: "5", // コンタクトID
            answerText: "電話でやりとりしたい（16時〜18時希望）", // メッセージ
            nextFlowId: tmpNextId, // 次のフローID
        },
        {
            answerId: "6", // コンタクトID
            answerText: "電話でやりとりしたい（18時〜20時希望）", // メッセージ
            nextFlowId: tmpNextId, // 次のフローID
        },
    ];
};

// サンプルデータ
const sampleDataList = [
    {
        flowId: "1",
        message:
            "泡ラヴァーズへの世界へようこそ！<br>3分ほどのカンタンな回答で、<br>商品のお届け先を指定できます。",
        answerType: "3",
        nextFlowId: "2",
    },
    {
        flowId: "2",
        tag: "new_or_not",
        message: "今回、泡ラヴァーズからの商品のお届けは初めてですか？",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "はじめて",
                nextFlowId: "3",
            },
            {
                answerId: "2",
                answerText: "以前このサイトから<br>頼んだことがある",
                nextFlowId: "26",
            },
        ],
    },
    {
        flowId: "3",
        tag: "reason",
        message: "この商品をどのように使いたいですか？",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "売上をあげたい",
                nextFlowId: "4",
            },
            {
                answerId: "2",
                answerText: "集客に使いたい",
                nextFlowId: "4",
            },
            {
                answerId: "3",
                answerText: "実物を見て見たい",
                nextFlowId: "4",
            },
            {
                answerId: "4",
                answerText: "その他",
                nextFlowId: "4",
            },
        ],
    },
    {
        flowId: "4",
        tag: "plan",
        message: "どちらのプランをご希望ですか？",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "3本で2,980円<br>（通常販売価格 6,600円）",
                nextFlowId: "5",
            },
            {
                answerId: "2",
                answerText: "5本で4,980円<br>（通常販売価格 11,000円）",
                nextFlowId: "5",
            },
        ],
    },
    {
        flowId: "5",
        tag: "quantity",
        message: "ご希望のプランは、何セット購入されますか？",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "1セット",
                nextFlowId: "6",
            },
            {
                answerId: "2",
                answerText: "2セット",
                nextFlowId: "6",
            },
            {
                answerId: "3",
                answerText: "3セット",
                nextFlowId: "6",
            },
        ],
    },
    {
        flowId: "6",
        tag: "shopname",
        message: "お届け先の店名を教えてください。",
        answerType: "2",
        nextFlowId: "7",
    },
    {
        flowId: "7",
        tag: "staffname",
        message: "担当スタッフのお名前を教えてください。",
        answerType: "2",
        nextFlowId: "8",
    },
    {
        flowId: "8",
        tag: "zipbool",
        message: "お届け先の郵便番号について",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "入力する",
                nextFlowId: "9",
            },
            {
                answerId: "2",
                answerText: "わからない",
                nextFlowId: "11",
            },
        ],
    },
    {
        flowId: "9",
        tag: "zipcode",
        message: "お届け先の郵便番号について<br>(例:890-0073)",
        answerType: "2",
        nextFlowId: "10",
    },
    {
        flowId: "10",
        tag: "zipaddress",
        message:
            "住所に続けてお届け先の番地（建物名・階数）を教えてください。<br>(例:宇宿2-23-3)",
        answerType: "2",
        answerString: "",
        nextFlowId: "15",
    },
    {
        flowId: "11",
        tag: "prefecture",
        message: "お届け先の都道府県を選択してください。",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "北海道",
                nextFlowId: "12",
            },
            {
                answerId: "2",
                answerText: "青森",
                nextFlowId: "12",
            },
            {
                answerId: "3",
                answerText: "岩手",
                nextFlowId: "12",
            },
            {
                answerId: "4",
                answerText: "秋田",
                nextFlowId: "12",
            },
            {
                answerId: "5",
                answerText: "宮城",
                nextFlowId: "12",
            },
            {
                answerId: "6",
                answerText: "山形",
                nextFlowId: "12",
            },
            {
                answerId: "7",
                answerText: "福島",
                nextFlowId: "12",
            },
            {
                answerId: "8",
                answerText: "茨城",
                nextFlowId: "12",
            },
            {
                answerId: "9",
                answerText: "栃木",
                nextFlowId: "12",
            },
            {
                answerId: "10",
                answerText: "群馬",
                nextFlowId: "12",
            },
            {
                answerId: "12",
                answerText: "埼玉",
                nextFlowId: "12",
            },
            {
                answerId: "12",
                answerText: "千葉",
                nextFlowId: "12",
            },
            {
                answerId: "13",
                answerText: "東京",
                nextFlowId: "12",
            },
            {
                answerId: "14",
                answerText: "神奈川",
                nextFlowId: "12",
            },
            {
                answerId: "15",
                answerText: "新潟",
                nextFlowId: "12",
            },
            {
                answerId: "16",
                answerText: "富山",
                nextFlowId: "12",
            },
            {
                answerId: "17",
                answerText: "石川",
                nextFlowId: "12",
            },
            {
                answerId: "18",
                answerText: "福井",
                nextFlowId: "12",
            },
            {
                answerId: "19",
                answerText: "山梨",
                nextFlowId: "12",
            },
            {
                answerId: "20",
                answerText: "長野",
                nextFlowId: "12",
            },
            {
                answerId: "21",
                answerText: "岐阜",
                nextFlowId: "12",
            },
            {
                answerId: "22",
                answerText: "静岡",
                nextFlowId: "12",
            },
            {
                answerId: "23",
                answerText: "愛知",
                nextFlowId: "12",
            },
            {
                answerId: "24",
                answerText: "三重",
                nextFlowId: "12",
            },
            {
                answerId: "25",
                answerText: "滋賀",
                nextFlowId: "12",
            },
            {
                answerId: "26",
                answerText: "京都",
                nextFlowId: "12",
            },
            {
                answerId: "27",
                answerText: "大阪",
                nextFlowId: "12",
            },
            {
                answerId: "28",
                answerText: "兵庫",
                nextFlowId: "12",
            },
            {
                answerId: "29",
                answerText: "奈良",
                nextFlowId: "12",
            },
            {
                answerId: "30",
                answerText: "和歌山",
                nextFlowId: "12",
            },
            {
                answerId: "31",
                answerText: "島根",
                nextFlowId: "12",
            },
            {
                answerId: "32",
                answerText: "鳥取",
                nextFlowId: "12",
            },
            {
                answerId: "33",
                answerText: "岡山",
                nextFlowId: "12",
            },
            {
                answerId: "34",
                answerText: "広島",
                nextFlowId: "12",
            },
            {
                answerId: "35",
                answerText: "山口",
                nextFlowId: "12",
            },
            {
                answerId: "36",
                answerText: "徳島",
                nextFlowId: "12",
            },
            {
                answerId: "37",
                answerText: "香川",
                nextFlowId: "12",
            },
            {
                answerId: "38",
                answerText: "愛媛",
                nextFlowId: "12",
            },
            {
                answerId: "39",
                answerText: "高知",
                nextFlowId: "12",
            },
            {
                answerId: "40",
                answerText: "福岡",
                nextFlowId: "12",
            },
            {
                answerId: "41",
                answerText: "佐賀",
                nextFlowId: "12",
            },
            {
                answerId: "42",
                answerText: "長崎",
                nextFlowId: "12",
            },
            {
                answerId: "43",
                answerText: "熊本",
                nextFlowId: "12",
            },
            {
                answerId: "44",
                answerText: "大分",
                nextFlowId: "12",
            },
            {
                answerId: "45",
                answerText: "宮崎",
                nextFlowId: "12",
            },
            {
                answerId: "46",
                answerText: "鹿児島",
                nextFlowId: "12",
            },
            {
                answerId: "47",
                answerText: "沖縄",
                nextFlowId: "12",
            },
        ],
    },
    {
        flowId: "12",
        tag: "city",
        message: "お届け先の市区町村を選択してください。",
        answerType: "1",
        answerList: [],
    },
    {
        flowId: "13",
        tag: "zip",
        message: "町名などを下記からご選択ください。",
        answerType: "1",
        answerList: [],
    },
    {
        flowId: "14",
        tag: "address",
        message:
            "お届け先の番地（建物名・階数）を教えてください。<br>(例:宇宿2-23-3)",
        answerType: "2",
        answerString: "",
        nextFlowId: "15",
    },
    {
        flowId: "15",
        message:
            "ありがとうございます。<br>ご希望のラベルに関する情報をお聞きします。",
        answerType: "3",
        nextFlowId: "16",
    },
    {
        flowId: "16",
        tag: "telephone",
        message: "お電話番号を教えてください。<br>(例:099-259-5511)",
        answerType: "2",
        nextFlowId: "17",
    },
    {
        flowId: "17",
        tag: "mailaddress",
        message: "メールアドレスを教えてください。<br>(例:info@suijinclub.com)",
        answerType: "2",
        nextFlowId: "18",
    },
    {
        flowId: "18",
        message:
            "ご回答ありがとうございます。今回お届けするスパークリングのラベルについてお聞きします。",
        answerType: "3",
        nextFlowId: "19",
    },
    {
        flowId: "19",
        tag: "label",
        message: "今回お届けするラベルについて教えてください。",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText:
                    "オススメのデザインに好きな内容を入れて、<br>すぐに使いたい。",
                nextFlowId: "20",
            },
            {
                answerId: "2",
                answerText: "オリジナルのデザインで長く使いたい。",
                nextFlowId: "31",
            },
        ],
    },
    {
        flowId: "20",
        tag: "choose",
        message: "好きなデザインの雰囲気は？",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "クラシック",
                nextFlowId: "21",
            },
            {
                answerId: "2",
                answerText: "キュート",
                nextFlowId: "22",
            },
            {
                answerId: "3",
                answerText: "エレガント",
                nextFlowId: "23",
            },
            {
                answerId: "4",
                answerText: "ナイト",
                nextFlowId: "24",
            },
        ],
    },
    {
        flowId: "21",
        tag: "template1",
        message:
            "『クラシック』ラベルのおススメのデザインです。<br>こちらよりデザイン・背景を選べます。",
        answerType: "4",
        imageList: makeImageList("classic", 25),
    },
    {
        flowId: "22",
        tag: "template2",
        message:
            "『キュート』ラベルのおススメのデザインです。<br>こちらよりデザイン・背景を選べます。",
        answerType: "4",
        imageList: makeImageList("cute", 25),
    },
    {
        flowId: "23",
        tag: "template3",
        message:
            "『エレガント』ラベルのおススメのデザインです。<br>こちらよりデザイン・背景を選べます。",
        answerType: "4",
        imageList: makeImageList("elegant", 25),
    },
    {
        flowId: "24",
        tag: "template4",
        message:
            "『ナイト』ラベルのおススメのデザインです。<br>こちらよりデザイン・背景を選べます。",
        answerType: "4",
        imageList: makeImageList("night", 25),
    },
    {
        flowId: "25",
        tag: "label_text",
        message:
            "「誕生日おめでとう／店名／その他添えたい言葉」など<br>ラベルに入れたい内容について全て教えてください。<br>（※お店のロゴなどを入れたい場合は『ロゴ』と入力します）",
        answerType: "2",
        nextFlowId: "33",
    },
    {
        flowId: "26",
        tag: "re_name",
        message:
            "ありがとうございます。<br>確認のため前回購入時の担当者名を教えてください。<br>(例:山田太郎)",
        answerType: "2",
        nextFlowId: "27",
    },
    {
        flowId: "27",
        tag: "re_telephone",
        message:
            "前回購入時のお電話番号を教えてください。<br>(例:099-259-5511)",
        answerType: "2",
        nextFlowId: "28",
    },
    {
        flowId: "28",
        tag: "confirm",
        message: "こちらの登録内容でよろしいですか？<br>（登録名・住所を表示）",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "はい",
                nextFlowId: "29",
            },
            {
                answerId: "2",
                answerText: "いいえ",
                nextFlowId: "27",
            },
        ],
    },
    {
        flowId: "29",
        tag: "resale",
        message:
            "今回は何本購入されますか？<br>（お申込み2回目以降の販売価格は1本2,200円（税込）となります。",
        answerType: "1",
        answerList: makeAmoutList(30),
    },
    {
        flowId: "30",
        tag: "re_label",
        message: "今回お作りするラベルについて",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "前回と同じがいい",
                nextFlowId: "33",
            },
            {
                answerId: "2",
                answerText: "新しく作りたい！",
                nextFlowId: "31",
            },
        ],
    },
    {
        flowId: "31",
        tag: "re_contact",
        message:
            "ご回答おつかれさまでした。<br>内容についてお客様担当のスタッフより、お電話またはメールにてご連絡を差しあげる場合、ご希望のご連絡方法を教えてください。",
        answerType: "1",
        answerList: makeContactList(32),
    },
    {
        flowId: "32",
        tag: "complete",
        message:
            "ありがとうございます。ご指定の方法でこちらからご連絡差し上げます。<br>次の画面でお申込内容をご確認ください。",
        answerType: "3",
        nextFlowId: "34",
    },
    {
        flowId: "33",
        tag: "confirmation",
        message: "ありがとうございます。次の画面でお申込内容をご確認ください。",
        answerType: "3",
        nextFlowId: "34",
    },
    {
        flowId: "34",
        tag: "detail",
        message: "",
        answerType: "1",
        answerList: [
            {
                answerId: "1",
                answerText: "はい",
                nextFlowId: "35",
            },
            {
                answerId: "2",
                answerText: "いいえ",
                nextFlowId: "1",
            },
        ],
    },
    {
        flowId: "35",
        tag: "final",
        message: "ご注文ありがとうございました。決済画面に移動します。",
        answerType: "5",
        url: "",
        nextFlowId: "x",
    },
];

// エクスポート
export { sampleDataList as default };
