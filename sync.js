/**
 * 서버 동기화 (server.py로 실행할 때만 동작, 다른 스크립트보다 먼저 불러온다)
 *
 * - 페이지를 열 때 서버 데이터를 localStorage에 채워 넣고, 이후 localStorage 저장·삭제를 서버에 바로 반영한다.
 * - 각 화면 코드는 그대로 localStorage만 사용하면 된다.
 * - 다른 사람이 먼저 같은 데이터를 바꿨으면(버전 충돌) 덮어쓰지 않고 최신 내용으로 다시 불러온다.
 * - 서버 API가 없으면(파일로 직접 열거나 일반 정적 서버) 아무것도 하지 않는다.
 */
(function () {
  "use strict";

  var PREFIX = "ai-groupware-";
  // 기기(사람)마다 달라야 하는 값은 서버에 올리지 않음
  var LOCAL_ONLY = {
    "ai-groupware-current-member": true,
    "ai-groupware-calendar-open": true
  };
  var API = "/api/store";
  var POLL_MS = 20000;

  if (location.protocol === "file:") return;

  function request(method, url, body, headers) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, false);
    Object.keys(headers || {}).forEach(function (h) { xhr.setRequestHeader(h, headers[h]); });
    xhr.send(body == null ? null : body);
    return xhr;
  }
  function fetchStore() {
    try {
      var res = request("GET", API);
      if (res.status !== 200 || !/json/.test(res.getResponseHeader("Content-Type") || "")) return null;
      return JSON.parse(res.responseText);
    } catch (e) {
      return null;
    }
  }

  var server = fetchStore();
  if (!server) return;

  var proto = Storage.prototype;
  var rawSet = proto.setItem;
  var rawRemove = proto.removeItem;
  var versions = {};
  var stopped = false;

  function synced(key) {
    return typeof key === "string" && key.indexOf(PREFIX) === 0 && !LOCAL_ONLY[key];
  }
  function localSyncedKeys() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (synced(k)) keys.push(k);
    }
    return keys;
  }

  // ---------- 알림 띠 ----------
  var bar = null;
  function notice(message, actionLabel, action) {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", function () { notice(message, actionLabel, action); });
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.setAttribute("role", "status");
      bar.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;" +
        "display:flex;gap:12px;align-items:center;padding:10px 16px;border-radius:10px;" +
        "background:#1f2937;color:#fff;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.25);";
      document.body.appendChild(bar);
    }
    bar.textContent = message;
    if (actionLabel) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = actionLabel;
      btn.style.cssText = "border:0;border-radius:6px;padding:4px 10px;background:#fff;color:#111;font-weight:600;cursor:pointer;";
      btn.addEventListener("click", action);
      bar.appendChild(btn);
    }
  }
  function reload() { location.reload(); }

  // ---------- localStorage → 서버 ----------
  function push(key, value) {
    if (stopped) return;
    try {
      var res = request("PUT", API + "/" + encodeURIComponent(key), value, {
        "Content-Type": "text/plain;charset=utf-8",
        "X-Base-Version": String(versions[key] || 0)
      });
      if (res.status === 200) {
        versions[key] = JSON.parse(res.responseText).v;
        return;
      }
      if (res.status === 409) {
        stopped = true;
        alert("다른 사람이 먼저 이 데이터를 수정했습니다.\n최신 내용으로 다시 불러옵니다. 방금 입력한 내용은 한 번 더 입력해 주세요.");
        reload();
        return;
      }
      throw new Error("HTTP " + res.status);
    } catch (e) {
      notice("서버에 저장하지 못했습니다. 연결을 확인한 뒤 새로고침해 주세요.", "새로고침", reload);
    }
  }
  function remove(key) {
    if (stopped) return;
    try {
      request("DELETE", API + "/" + encodeURIComponent(key));
      delete versions[key];
    } catch (e) {
      notice("서버에서 삭제하지 못했습니다. 연결을 확인해 주세요.", "새로고침", reload);
    }
  }

  var serverKeys = Object.keys(server).filter(synced);
  var localKeys = localSyncedKeys();

  if (!serverKeys.length && localKeys.length &&
      confirm("서버에 아직 데이터가 없습니다.\n이 브라우저에 있던 데이터를 서버로 올려 함께 쓸까요?\n(취소하면 서버 기준의 빈 상태로 시작합니다)")) {
    localKeys.forEach(function (k) { push(k, localStorage.getItem(k)); });
  } else {
    localKeys.forEach(function (k) { if (!server[k]) rawRemove.call(localStorage, k); });
    serverKeys.forEach(function (k) {
      rawSet.call(localStorage, k, server[k].value);
      versions[k] = server[k].v;
    });
  }

  proto.setItem = function (key, value) {
    var str = String(value);
    var changed = this === localStorage && synced(key) && localStorage.getItem(key) !== str;
    rawSet.call(this, key, str);
    if (changed) push(key, str);
  };
  proto.removeItem = function (key) {
    var existed = this === localStorage && synced(key) && localStorage.getItem(key) !== null;
    rawRemove.call(this, key);
    if (existed) remove(key);
  };

  // ---------- 다른 사람의 변경 감지 ----------
  function checkRemote() {
    if (stopped || document.hidden) return;
    var latest = fetchStore();
    if (!latest) return;
    var keys = Object.keys(latest).filter(synced);
    var changed = keys.some(function (k) { return latest[k].v !== versions[k]; }) ||
      Object.keys(versions).some(function (k) { return !latest[k]; });
    if (changed) notice("다른 사람이 데이터를 변경했습니다.", "최신 내용 보기", reload);
  }
  setInterval(checkRemote, POLL_MS);
  document.addEventListener("visibilitychange", checkRemote);
})();
