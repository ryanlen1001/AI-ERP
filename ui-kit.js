/**
 * 목록형 업무 화면(프로젝트 관리 · 전표 관리) 공통 도구
 * 저장소 · 토스트(실행취소) · 모달(포커스 관리) · 페이지네이션 · 더보기 메뉴 · CSV 내보내기
 */
(function () {
  "use strict";

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      toast("저장에 실패했습니다. 브라우저 저장공간을 확인하세요.");
      return false;
    }
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return isoDate(new Date()); }
  function addDays(iso, days) {
    var d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + days);
    return isoDate(d);
  }
  function won(n) { return Math.round(n || 0).toLocaleString("ko-KR"); }
  function parseAmount(s) {
    var n = parseInt(String(s || "").replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }
  function bindAmountInput(input) {
    input.addEventListener("input", function () {
      var n = parseAmount(input.value);
      input.value = n ? n.toLocaleString("ko-KR") : "";
    });
  }

  // ---------- 토스트 ----------
  var toastTimer = null, toastUndo = null;
  function toast(text, undo) {
    var el = document.getElementById("app-toast");
    if (!el) return;
    document.getElementById("app-toast-text").textContent = text;
    var action = document.getElementById("app-toast-action");
    toastUndo = undo || null;
    action.hidden = !undo;
    action.textContent = "실행취소";
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
      toastUndo = null;
    }, undo ? 6000 : 3000);
  }
  document.addEventListener("click", function (e) {
    if (e.target.id !== "app-toast-action") return;
    if (toastUndo) toastUndo();
    toastUndo = null;
    document.getElementById("app-toast").hidden = true;
  });

  // ---------- 모달: 열 때 첫 입력으로 포커스, 닫을 때 원래 위치로, Tab 가두기, Esc 닫기 ----------
  var FOCUSABLE = 'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';
  var openStack = [];
  function openModal(overlay) {
    overlay._returnFocus = document.activeElement;
    overlay.hidden = false;
    openStack.push(overlay);
    var first = overlay.querySelector(".modal-body " + FOCUSABLE.split(", ").join(", .modal-body ")) || overlay.querySelector(FOCUSABLE);
    if (first) setTimeout(function () { first.focus(); }, 0);
  }
  function closeModal(overlay) {
    overlay.hidden = true;
    openStack = openStack.filter(function (o) { return o !== overlay; });
    if (overlay._returnFocus && document.contains(overlay._returnFocus)) overlay._returnFocus.focus();
  }
  // data-close 속성이 있는 버튼과 배경 클릭으로 닫기
  function wireModal(overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest("[data-close]")) closeModal(overlay);
    });
  }
  document.addEventListener("keydown", function (e) {
    var top = openStack[openStack.length - 1];
    if (!top) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal(top);
      return;
    }
    if (e.key !== "Tab") return;
    var items = Array.prototype.filter.call(top.querySelectorAll(FOCUSABLE), function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ---------- 페이지네이션 ----------
  // opts: { total, page, size, onPage(page), onSize(size) }
  function renderPager(host, opts) {
    var pages = Math.max(1, Math.ceil(opts.total / opts.size));
    var page = Math.min(Math.max(1, opts.page), pages);
    var nums = [];
    var from = Math.max(1, page - 2), to = Math.min(pages, from + 4);
    from = Math.max(1, to - 4);
    if (from > 1) nums.push(1, from > 2 ? "…" : null);
    for (var i = from; i <= to; i++) nums.push(i);
    if (to < pages) nums.push(to < pages - 1 ? "…" : null, pages);
    host.innerHTML =
      '<span class="pager-total">총 ' + opts.total.toLocaleString("ko-KR") + "건</span>" +
      '<div class="pager-pages">' +
      '<button type="button" class="pager-btn" data-page="' + (page - 1) + '" aria-label="이전 페이지"' + (page <= 1 ? " disabled" : "") + ">‹</button>" +
      nums.filter(function (n) { return n !== null; }).map(function (n) {
        if (n === "…") return '<span class="pager-gap">…</span>';
        return '<button type="button" class="pager-btn' + (n === page ? " is-active" : "") + '" data-page="' + n + '"' + (n === page ? ' aria-current="page"' : "") + ">" + n + "</button>";
      }).join("") +
      '<button type="button" class="pager-btn" data-page="' + (page + 1) + '" aria-label="다음 페이지"' + (page >= pages ? " disabled" : "") + ">›</button>" +
      "</div>" +
      '<select class="filter-select" aria-label="페이지당 개수">' + [10, 20, 50].map(function (n) {
        return '<option value="' + n + '"' + (n === opts.size ? " selected" : "") + ">" + n + "개씩 보기</option>";
      }).join("") + "</select>";
    host.querySelectorAll("[data-page]").forEach(function (b) {
      b.addEventListener("click", function () { opts.onPage(Number(b.dataset.page)); });
    });
    host.querySelector("select").addEventListener("change", function (e) { opts.onSize(Number(e.target.value)); });
    return page;
  }

  // ---------- 더보기(⋯) 메뉴 ----------
  function wireMenu(button, pop) {
    button.addEventListener("click", function (e) {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
      button.setAttribute("aria-expanded", String(!pop.hidden));
    });
    document.addEventListener("click", function (e) {
      if (!pop.hidden && !pop.contains(e.target)) {
        pop.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }
    });
    pop.addEventListener("click", function (e) {
      if (e.target.closest("button")) pop.hidden = true;
    });
  }

  // ---------- CSV (엑셀 한글 깨짐 방지 BOM 포함) ----------
  function downloadCsv(filename, header, rows) {
    var cell = function (v) {
      var s = String(v == null ? "" : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var text = "﻿" + [header].concat(rows).map(function (r) { return r.map(cell).join(","); }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  window.GWUI = {
    escapeHtml: escapeHtml,
    readJSON: readJSON,
    writeJSON: writeJSON,
    today: today,
    addDays: addDays,
    won: won,
    parseAmount: parseAmount,
    bindAmountInput: bindAmountInput,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    wireModal: wireModal,
    renderPager: renderPager,
    wireMenu: wireMenu,
    downloadCsv: downloadCsv
  };
})();
