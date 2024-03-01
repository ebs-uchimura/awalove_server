/**
 * validationmessage.js
 *
 * function： エラーメッセージ変更用
 **/

"use strict";

// 標準メッセージ変更
$(document).ready(function () {
  var elements = document.getElementsByTagName("INPUT");
  for (var i = 0; i < elements.length; i++) {
    elements[i].oninvalid = function (e) {
      e.target.setCustomValidity("");
      if (!e.target.validity.valid) {
        e.target.setCustomValidity("こちらの項目をご入力ください");
      }
    };
    elements[i].oninput = function (e) {
      e.target.setCustomValidity("");
    };
  }
})