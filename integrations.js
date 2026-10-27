/**
 * 공휴일(한국천문연구원 특일 정보)과 거래처 사업자 상태(국세청) 연동.
 * 인증키는 서버에만 있고, 화면은 /api/holidays · /api/business/status 를 호출한다.
 * members.js 다음, shell.js 앞에 로드한다.
 */
(function () {
  "use strict";

  var holidays = {};
  var configured = null;
  var loadError = "";

  function pad(n) { return String(n).padStart(2, "0"); }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayIso() { return isoDate(new Date()); }
  function parseIso(iso) {
    var part = String(iso || "").split("-");
    if (part.length < 3) return null;
    var d = new Date(Number(part[0]), Number(part[1]) - 1, Number(part[2]), 12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  function addDays(iso, n) {
    var d = parseIso(iso);
    if (!d) return "";
    d.setDate(d.getDate() + n);
    return isoDate(d);
  }
  function weekday(iso) {
    var d = parseIso(iso);
    return d ? d.getDay() : -1;
  }
  function isWeekend(iso) {
    var day = weekday(iso);
    return day === 0 || day === 6;
  }
  function holidayName(iso) { return holidays[iso] || ""; }
  function isHoliday(iso) { return !!holidays[iso]; }
  function isOff(iso) { return isWeekend(iso) || isHoliday(iso); }

  function previousBusinessDay(iso) {
    var cursor = iso;
    for (var i = 0; i < 21; i++) {
      cursor = addDays(cursor, -1);
      if (cursor && !isOff(cursor)) return cursor;
    }
    return iso;
  }
  function nextBusinessDay(iso) {
    var cursor = iso;
    for (var i = 0; i < 21; i++) {
      cursor = addDays(cursor, 1);
      if (cursor && !isOff(cursor)) return cursor;
    }
    return iso;
  }
  function addBusinessDays(iso, n) {
    var cursor = iso;
    var left = n;
    var guard = 0;
    while (left > 0 && guard < 80) {
      cursor = addDays(cursor, 1);
      guard++;
      if (cursor && !isOff(cursor)) left--;
    }
    return cursor;
  }
  function monthEndBusinessDay(iso) {
    var d = parseIso(iso);
    if (!d) return "";
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12, 0, 0, 0);
    var end = isoDate(last);
    return isOff(end) ? nextBusinessDay(end) : end;
  }

  // 쉬는 날에는 마감 알림을 내지 않는다.
  // 마감일이 주말·공휴일이면 그 전 영업일에 eve(휴무 전 마감)가 된다.
  function dueState(due) {
    if (!due) return "";
    var today = todayIso();
    if (isOff(today)) return "";
    if (due < today) return "overdue";
    if (due === today) return "today";
    if (isOff(due) && previousBusinessDay(due) === today) return "eve";
    return "";
  }

  // 프로젝트 목록의 '지남' 표시. 마감일이 들어 있는 연휴 동안에는 아직 지나지 않은 것으로 본다.
  function isLate(due) {
    if (!due) return false;
    var today = todayIso();
    if (due >= today) return false;
    if (isOff(today) && due > previousBusinessDay(today)) return false;
    return true;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function bizBadge(status, label) {
    if (status === "01") return '<span class="biz-badge is-ok">계속</span>';
    if (status === "02" || status === "03") return '<span class="biz-badge is-bad">' + escapeHtml(label || (status === "02" ? "휴업" : "폐업")) + "</span>";
    return "";
  }
  function digits(s) { return String(s || "").replace(/\D/g, ""); }
  function formatBiz(s) {
    var d = digits(s).slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 5) return d.slice(0, 3) + "-" + d.slice(3);
    return d.slice(0, 3) + "-" + d.slice(3, 5) + "-" + d.slice(5);
  }
  function applyBiz(data, rec) {
    data.bizNo = rec ? rec.bizNo : "";
    data.bizStatus = rec ? rec.bizStatus : "";
    data.bizStatusName = rec ? rec.bizStatusName : "";
    data.bizTaxType = rec ? rec.bizTaxType : "";
    data.bizEnd = rec ? (rec.bizEnd || "") : "";
    data.bizCheckedAt = rec ? (rec.bizCheckedAt || "") : "";
    return data;
  }

  function markConfigured(value) {
    configured = value;
    document.dispatchEvent(new CustomEvent("gw-integrations"));
  }
  function loadIntegrationStatus() {
    return fetch("/api/integrations", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && typeof data.configured === "boolean") markConfigured(data.configured);
      })
      .catch(function () {});
  }
  function loadHolidays() {
    var year = new Date().getFullYear();
    return fetch("/api/holidays?from=" + (year - 1) + "&to=" + (year + 1), { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        holidays = {};
        if (data && Array.isArray(data.days)) {
          data.days.forEach(function (day) {
            if (day && day.date) holidays[day.date] = day.name || "공휴일";
          });
          if (typeof data.configured === "boolean") configured = data.configured;
          loadError = data.error || "";
        }
        document.dispatchEvent(new CustomEvent("gw-holidays"));
        document.dispatchEvent(new CustomEvent("gw-integrations"));
      })
      .catch(function () {});
  }

  function lookupBusiness(bNo) {
    return fetch("/api/business/status", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ b_no: digits(bNo) })
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data || {} }; });
    });
  }

  function saveKey(key) {
    return fetch("/api/integrations/key", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key })
    }).then(function (res) {
      return res.json().then(function (data) {
        var saved = { ok: res.ok, data: data || {} };
        if (saved.ok) {
          markConfigured(true);
          loadHolidays();
        }
        return saved;
      });
    });
  }

  function markDateInput(input) {
    if (!input || input.type !== "date") return;
    var off = !!input.value && isOff(input.value);
    input.classList.toggle("is-offday", off);
    var name = holidayName(input.value);
    if (name) input.title = name;
    else if (isWeekend(input.value)) input.title = "주말";
    else input.removeAttribute("title");
  }

  document.addEventListener("change", function (e) { markDateInput(e.target); });
  document.addEventListener("gw-holidays", function () {
    document.querySelectorAll('input[type="date"]').forEach(markDateInput);
  });

  function mountBiz(opts) {
    var host = opts.mount;
    if (!host) return null;
    host.classList.add("biz-check");
    host.innerHTML =
      '<span class="biz-check-label">사업자등록번호</span>' +
      '<span class="biz-check-row">' +
      '<input type="text" class="modal-input biz-no" inputmode="numeric" maxlength="12" placeholder="000-00-00000" autocomplete="off" aria-label="사업자등록번호">' +
      '<button type="button" class="btn-secondary biz-go">조회</button>' +
      "</span>" +
      '<p class="biz-result" hidden></p>';
    var input = host.querySelector(".biz-no");
    var button = host.querySelector(".biz-go");
    var result = host.querySelector(".biz-result");
    var current = null;

    function message(text, tone, verdict) {
      result.hidden = !text && !verdict;
      result.className = "biz-result is-" + (tone || "info");
      result.replaceChildren();
      if (verdict) {
        var mark = document.createElement("span");
        mark.className = "biz-verdict is-" + (verdict === "정상" ? "ok" : "bad");
        mark.textContent = verdict;
        result.appendChild(mark);
      }
      if (text) {
        var rest = document.createElement("span");
        rest.textContent = text;
        result.appendChild(rest);
      }
    }
    function bizDetail(statusName, taxType, endDate) {
      var text = statusName || "국세청에 없는 사업자등록번호";
      if (taxType) text += " · " + taxType;
      if (endDate) text += " · 폐업일 " + endDate;
      return text;
    }
    function verdictOf(statusCode) {
      return statusCode === "01" ? "정상" : "비정상";
    }
    function applyResult(data) {
      current = {
        bizNo: data.b_no,
        bizStatus: data.statusCode || "",
        bizStatusName: data.status || (data.statusCode ? "" : "미확인"),
        bizTaxType: data.taxType || "",
        bizEnd: data.endDate || "",
        bizCheckedAt: todayIso()
      };
      var tone = data.statusCode === "01" ? "ok" : "bad";
      var text = bizDetail(data.status, data.taxType, data.endDate);
      var peers = opts.peers ? opts.peers() : [];
      var same = null;
      peers.forEach(function (peer) {
        if (!same && peer.bizNo && digits(peer.bizNo) === data.b_no && peer.name && peer.name !== opts.nameInput.value.trim()) same = peer;
      });
      if (same && opts.nameInput) {
        text += " · 기존 거래처명 " + same.name;
        if (!opts.nameInput.value.trim() || window.confirm("이 사업자번호는 '" + same.name + "'(으)로 등록되어 있습니다. 그 이름으로 맞출까요?")) {
          opts.nameInput.value = same.name;
        }
      }
      message(text, tone, verdictOf(data.statusCode));
    }
    function fail(res) {
      var text = (res && res.data && res.data.error) || "조회에 실패했습니다.";
      if (res && res.data && res.data.configured === false) {
        markConfigured(false);
        text = window.GW && GW.isMaster && GW.isMaster()
          ? "화면 위 인증키를 한 번만 저장하면, 이후 조회는 그 키로 자동 처리됩니다."
          : "마스터가 인증키를 한 번 저장하면 조회할 수 있습니다.";
      }
      message(text, "bad");
    }
    function run() {
      var no = digits(input.value);
      if (no.length !== 10) { current = null; message("사업자등록번호 10자리를 입력하세요.", "bad"); return; }
      button.disabled = true;
      lookupBusiness(no).then(function (res) {
        button.disabled = false;
        if (!res.ok) { current = null; fail(res); return; }
        applyResult(res.data);
      }).catch(function () {
        button.disabled = false;
        current = null;
        message("서버에 연결할 수 없습니다. 공유 서버(server.py)로 실행 중인지 확인하세요.", "bad");
      });
    }
    input.addEventListener("input", function () {
      var formatted = formatBiz(input.value);
      if (input.value !== formatted) input.value = formatted;
      current = null;
    });
    button.addEventListener("click", run);

    return {
      fill: function (rec) {
        if (rec && rec.bizNo) {
          current = {
            bizNo: digits(rec.bizNo),
            bizStatus: rec.bizStatus || "",
            bizStatusName: rec.bizStatusName || "",
            bizTaxType: rec.bizTaxType || "",
            bizEnd: rec.bizEnd || "",
            bizCheckedAt: rec.bizCheckedAt || ""
          };
          input.value = formatBiz(current.bizNo);
          var tone = current.bizStatus === "01" ? "ok" : current.bizStatus ? "bad" : "info";
          message(bizDetail(current.bizStatusName || "저장된 조회", current.bizTaxType, current.bizEnd), tone, verdictOf(current.bizStatus));
        } else {
          current = null;
          input.value = "";
          message("", "info");
        }
      },
      confirm: function (done) {
        var no = digits(input.value);
        if (!no) { done(null); return; }
        if (no.length !== 10) { message("사업자등록번호 10자리를 입력하세요.", "bad"); done(false); return; }
        var finish = function (rec) {
          if (rec && rec.bizStatus !== "01") {
            var why = rec.bizStatusName || "계속사업자가 아닌 번호";
            if (!window.confirm(why + "입니다. 그대로 저장할까요?")) { done(false); return; }
          }
          done(rec);
        };
        if (current && current.bizNo === no) { finish(current); return; }
        button.disabled = true;
        lookupBusiness(no).then(function (res) {
          button.disabled = false;
          if (!res.ok) { fail(res); done(false); return; }
          applyResult(res.data);
          finish(current);
        }).catch(function () {
          button.disabled = false;
          message("서버에 연결할 수 없습니다.", "bad");
          done(false);
        });
      }
    };
  }

  if (!window.GW) window.GW = {};
  GW.todayIso = todayIso;
  GW.addDays = addDays;
  GW.isWeekend = isWeekend;
  GW.isHoliday = isHoliday;
  GW.isOff = isOff;
  GW.holidayName = holidayName;
  GW.previousBusinessDay = previousBusinessDay;
  GW.nextBusinessDay = nextBusinessDay;
  GW.addBusinessDays = addBusinessDays;
  GW.monthEndBusinessDay = monthEndBusinessDay;
  GW.dueState = dueState;
  GW.isLate = isLate;
  GW.bizBadge = bizBadge;
  GW.applyBiz = applyBiz;
  GW.mountBiz = mountBiz;
  GW.reloadHolidays = loadHolidays;
  GW.saveIntegrationKey = saveKey;
  GW.holidayMeta = function () { return { configured: configured, error: loadError, ready: configured !== null }; };

  loadIntegrationStatus();
  loadHolidays();
})();
