/**
 * form.js
 *
 * function： 注文フォーム用
 **/

"use strict";

// サーバaddress
const globalUpdateServerUrl = "https://ebisu.love";

// 本体
(function ($) {
    $(function () {
        // データレイヤー初期化
        window.dataLayer = window.dataLayer || [];
        // フラグ
        let standardFlg = false;
        let popFlg = false;
        let luxuryFlg = false;
        let coolFlg = false;
        let naturalFlg = false;
        // スクロール幅
        let scrollHeight;
        // 画面高さ
        const windowHeight = $(window).height();

        // モバイル
        const ismobile = detectUA();

        // モバイル
        if (ismobile) {
            scrollHeight = -50;

        } else {
            scrollHeight = -110;
        }

        // 初期は表示
        $(".labelarea").show();
        // それ以外は非表示
        $(".standard").hide();
        $(".pop").hide();
        $(".luxury").hide();
        $(".cool").hide();
        $(".natural").hide();

        // 注文
        $(".order_link").click(function () {
            // スロー遷移
            const target = $(".dummy").offset().top - 100;
            $("html,body").animate({ scrollTop: target }, "slow");
            return false;
        });

        // チェックボタン全解除
        $('input[name="original"]').prop("checked", false);

        // standard
        $(".standard-label").click(function (e) {
            if (!standardFlg) {
                $(".standard").show(100);
                $(".standard").get(0).scrollIntoView(true);
                window.scrollBy({
                    top: scrollHeight,
                    left: 0,
                    behavior: "smooth",
                });
            } else {
                $(".standard").hide();
            }
            standardFlg = !standardFlg;
        });

        // pop
        $(".pop-label").click(function (e) {
            if (!popFlg) {
                $(".pop").show(100);
                $(".pop").get(0).scrollIntoView(true);
                window.scrollBy({
                    top: scrollHeight,
                    left: 0,
                    behavior: "smooth",
                });
            } else {
                $(".pop").hide();
            }
            popFlg = !popFlg;
        });

        // luxury
        $(".luxury-label").click(function (e) {
            if (!luxuryFlg) {
                $(".luxury").show(100);
                $(".luxury").get(0).scrollIntoView(true);
                window.scrollBy({
                    top: scrollHeight,
                    left: 0,
                    behavior: "smooth",
                });
            } else {
                $(".luxury").hide();
            }
            luxuryFlg = !luxuryFlg;
        });

        // cool
        $(".cool-label").click(function (e) {
            if (!coolFlg) {
                $(".cool").show(100);
                $(".cool").get(0).scrollIntoView(true);
                window.scrollBy({
                    top: scrollHeight,
                    left: 0,
                    behavior: "smooth",
                });
            } else {
                $(".cool").hide();
            }
            coolFlg = !coolFlg;
        });

        // natural
        $(".natural-label").click(function (e) {
            if (!naturalFlg) {
                $(".natural").show(100);
                $(".natural").get(0).scrollIntoView(true);
                window.scrollBy({
                    top: scrollHeight,
                    left: 0,
                    behavior: "smooth",
                });
            } else {
                $(".natural").hide();
            }
            naturalFlg = !naturalFlg;
        });

        // form上部座標
        const objTop = $('.order').offset().top;
        $(window).on('scroll', function () {
            scroll = $(window).scrollTop();
            if (scroll >= objTop - windowHeight) {
                $('.fixed_btn').css('display', 'none');
            } else {
                $('.fixed_btn').css('display', 'fixed');
            }
        });

        // ラベル選択
        $('input[name="imgSelect"]:radio').change(function () {
            console.log('imgSelect');
            dataLayer.push({
                event: 'label_change'
            });
        });

        // テキストボックス変更
        $('#labeltext').change(function () {
            console.log('labeltext');
            dataLayer.push({
                event: 'labeltext_change'
            });
        });

        // 店名
        $('#shopname').change(function () {
            console.log('shopname');
            dataLayer.push({
                event: 'shopname_change'
            });
        });

        // 店舗の電話番号
        $('#tel').change(function () {
            console.log('tel');
            dataLayer.push({
                event: 'tel_change'
            });
        });

        // メールアドレス
        $('#email').change(function () {
            console.log('email');
            dataLayer.push({
                event: 'email_change'
            });
        });

        // 郵便番号
        $('#zip').change(function () {
            console.log('zip');
            dataLayer.push({
                event: 'zip_change'
            });
        });

        // 市区町村
        $('#city').change(function () {
            console.log('city');
            dataLayer.push({
                event: 'city_change'
            });
        });

        // 番地
        $('#street').change(function () {
            console.log('street');
            dataLayer.push({
                event: 'street_change'
            });
        });

        // 送信確認
        $("#orderform").submit(function () {
            if (window.confirm('入力内容を確認して問題なければOKを押してください')) {
                return true;
            } else {
                return false;
            }
        });
    });
})(window.jQuery);


const detectUA = () => {
    // ユーザエージェント
    const ua = navigator.userAgent.toLowerCase();
    // iPhone
    const isiPhone = (ua.indexOf('iphone') > -1);
    // Android
    const isAndroid = (ua.indexOf('android') > -1) && (ua.indexOf('mobile') > -1);

    // 使用例
    if (isiPhone || isAndroid) {
        return true;
    } else {
        return false;
    }
}
