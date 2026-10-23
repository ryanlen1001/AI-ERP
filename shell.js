/**
 * 공통 앱 레이아웃 — 좌측 내비게이션 · 상단바 · 통합 검색(⌘K) · 알림
 *
 * 사용법: <body data-page="home|cost|sales|receipt|admin"> 안에 [data-shell-content] 요소를 두고
 *         members.js 다음에 이 스크립트를 로드하면, 해당 요소를 레이아웃 안으로 옮긴다.
 *         [data-shell-side-bottom] 요소가 있으면 사이드바 맨 아래(예: 홈의 일정 드롭다운)로 옮긴다.
 */
(function () {
  "use strict";

  var scriptSrc = (document.currentScript && document.currentScript.getAttribute("src")) || "shell.js";
  var ROOT = scriptSrc.replace(/shell\.js(\?.*)?$/, "");
  var PAGE = document.body.dataset.page || "";
  var me = GW.getCurrent();

  // ---------- 아이콘 (lucide 스타일 24px 스트로크) ----------
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v12a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2Z"/><circle cx="16" cy="15" r="1.2"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h4"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
    check: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'
  };
  function icon(name, cls) {
    return '<svg class="icon' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }
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

  // ---------- 메뉴 구성 ----------
  var NAV = [
    {
      group: null,
      items: [
        { id: "home", label: "홈", icon: "home", href: "index.html" },
        { id: "directory", label: "회원정보", icon: "user", href: "members/members.html" }
      ]
    },
    {
      group: "업무",
      items: (function () {
        var order = GW.getMenuOrder();
        return [
          { id: "sales", label: "프로젝트 관리", icon: "briefcase", href: "sales/sales.html" },
          { id: "cost", label: "비용관리", icon: "wallet", href: "cost/cost.html" },
          { id: "receipt", label: "전표관리", icon: "receipt", href: "receipt/receipt.html" }
        ].sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
      })()
    },
    {
      group: "준비 중",
      items: [
        { id: "meeting", label: "회의록", icon: "clipboard", soon: true },
        { id: "approval", label: "업무결재", icon: "check", soon: true },
        { id: "finance", label: "재무관리", icon: "chart", soon: true },
        { id: "document", label: "문서관리", icon: "folder", soon: true }
      ]
    },
    { group: "관리", managerOnly: true, items: [{ id: "admin", label: "관리자", icon: "shield", href: "admin/admin.html" }] }
  ];

  function navItemHtml(item) {
    var allowed = item.id === "home" || (item.id === "admin" ? GW.isManager(me) : GW.canAccess(item.id, me));
    var active = item.id === PAGE;
    var tag = "";
    if (!allowed) tag = '<span class="nav-tag">' + icon("lock", "icon-xs") + "</span>";
    else if (item.soon) tag = '<span class="nav-tag">준비 중</span>';
    if (allowed && item.href && !item.soon) {
      return '<a class="nav-item' + (active ? " is-active" : "") + '" data-menu="' + item.id + '" href="' + ROOT + item.href + '"' + (active ? ' aria-current="page"' : "") + ">" +
        icon(item.icon) + '<span class="nav-label">' + escapeHtml(item.label) + "</span>" + tag + "</a>";
    }
    var reason = !allowed ? "접근 권한이 없습니다" : "준비 중인 기능입니다";
    return '<button type="button" class="nav-item is-disabled" data-menu="' + item.id + '" data-reason="' + escapeHtml(item.label + ": " + reason) + '">' +
      icon(item.icon) + '<span class="nav-label">' + escapeHtml(item.label) + "</span>" + tag + "</button>";
  }

  function buildSidebar() {
    var groups = NAV.filter(function (g) { return !g.managerOnly || GW.isManager(me); }).map(function (g) {
      return '<div class="nav-group">' + (g.group ? '<span class="nav-group-label">' + escapeHtml(g.group) + "</span>" : "") +
        g.items.map(navItemHtml).join("") + "</div>";
    }).join("");
    var initial = (me.name || "?").charAt(0);
    // 맨 위 '내 정보' → 메뉴 → 맨 아래 화면별 영역 순서
    return '<aside class="side" id="app-side" aria-label="주 메뉴">' +
      '<a class="side-brand" href="' + ROOT + 'index.html"><span class="side-logo" aria-hidden="true">R</span><span class="side-brand-text">RYANLEN ERP</span></a>' +
      '<section class="side-me" aria-label="내 정보">' +
      '<span class="side-me-label">내 정보</span>' +
      '<button type="button" class="side-me-row side-me-trigger" id="side-profile" aria-haspopup="menu" aria-expanded="false"><span class="avatar">' + escapeHtml(initial) + "</span>" +
      '<span class="side-me-text"><span class="side-profile-name">' + escapeHtml(me.name) + "</span>" +
      '<span class="side-profile-role">' + escapeHtml(me.title || "") + "</span></span>" +
      icon("chevron", "icon-sm side-me-caret") + "</button>" +
      '<div class="side-me-meta"><span class="role-badge role-' + escapeHtml(me.role) + '">' + escapeHtml(GW.roleLabel(me.role)) + "</span>" +
      (GW.isManager(me) ? '<a class="side-me-admin" href="' + ROOT + 'admin/admin.html">관리자 페이지 →</a>' : "") +
      "</div>" +
      "</section>" +
      '<nav class="side-nav">' + groups + "</nav>" +
      '<div class="side-bottom" id="side-bottom"></div></aside>';
  }

  function buildTopbar() {
    var initial = (me.name || "?").charAt(0);
    return '<header class="topbar">' +
      '<button type="button" class="icon-btn topbar-menu" id="btn-side-toggle" aria-label="메뉴 열기">' + icon("menu") + "</button>" +
      '<button type="button" class="topbar-search" id="btn-palette">' + icon("search", "icon-sm") +
      '<span>메뉴, 프로젝트, 전표, 할 일을 검색하세요…</span><kbd>⌘K</kbd></button>' +
      '<div class="topbar-actions">' +
      '<div class="popover-wrap"><button type="button" class="icon-btn" id="btn-notify" aria-label="알림" aria-haspopup="true" aria-expanded="false">' + icon("bell") +
      '<span class="dot-badge" id="notify-badge" hidden></span></button>' +
      '<div class="popover notify-pop" id="notify-pop" hidden></div></div>' +
      '<button type="button" class="icon-btn" id="btn-messenger-open" aria-label="팀 메시지">' + icon("message") + "</button>" +
      '<button type="button" class="avatar avatar-btn" id="topbar-avatar" title="' + escapeHtml(me.name + " · " + GW.roleLabel(me.role)) + '">' + escapeHtml(initial) + "</button>" +
      "</div></header>";
  }

  // ---------- 레이아웃 조립 ----------
  var content = document.querySelector("[data-shell-content]");
  var layout = document.createElement("div");
  layout.className = "layout";
  layout.innerHTML = buildSidebar() + '<div class="layout-main">' + buildTopbar() + '<main class="layout-content" id="layout-content"></main></div>' +
    '<div class="side-scrim" id="side-scrim" hidden></div>';
  document.body.insertBefore(layout, document.body.firstChild);
  if (content) layout.querySelector("#layout-content").appendChild(content);
  var sideBottom = document.querySelector("[data-shell-side-bottom]");
  if (sideBottom) layout.querySelector("#side-bottom").appendChild(sideBottom);
  else layout.querySelector("#side-bottom").remove();

  // 공통 토스트가 없는 페이지를 위해 간단한 안내 표시
  function notice(text) {
    var toast = document.getElementById("app-toast");
    var textEl = document.getElementById("app-toast-text");
    if (!toast || !textEl) return;
    textEl.textContent = text;
    var action = document.getElementById("app-toast-action");
    if (action) action.hidden = true;
    toast.hidden = false;
    clearTimeout(notice.timer);
    notice.timer = setTimeout(function () { toast.hidden = true; }, 3000);
  }
  layout.querySelectorAll(".nav-item.is-disabled").forEach(function (btn) {
    btn.addEventListener("click", function () { notice(btn.dataset.reason); });
  });

  // ---------- 내 계정 메뉴 (이름 클릭): 내 정보 · 비밀번호 변경 · 로그아웃 ----------
  var PROFILE_FIELDS = ["phone", "email", "address", "emergency"];
  function profileKey(id) { return GW.PREFIX + "profile-" + id; }
  function getProfile(id) {
    try { return JSON.parse(localStorage.getItem(profileKey(id))) || {}; } catch (e) { return {}; }
  }
  GW.getProfile = getProfile;

  function makeDialog(id, html) {
    var old = document.getElementById(id);
    if (old) old.remove();
    var dlg = document.createElement("dialog");
    dlg.id = id;
    dlg.className = "gw-dialog";
    dlg.innerHTML = html;
    document.body.appendChild(dlg);
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { dlg.remove(); });
    return dlg;
  }
  function field(id, label, attrs) {
    return '<label class="modal-label" for="' + id + '">' + label + '</label><input class="modal-input" id="' + id + '" ' + (attrs || "") + ">";
  }

  // 회원정보 팝업: 이름·아이디·직급은 잠겨 있고, 본인만 연락처를 수정할 수 있다
  GW.openProfile = function (member, onSaved) {
    var mine = member.id === me.id;
    var p = getProfile(member.id);
    var dlg = makeDialog("gw-dlg-profile",
      '<form method="dialog" autocomplete="off">' +
      "<h3>" + (mine ? "내 정보" : escapeHtml(member.name) + "님의 정보") + "</h3>" +
      '<p class="gw-dialog-sub">' + (mine ? "이름·아이디·직급은 관리자가 관리하며 여기서 바꿀 수 없습니다." : "본인만 자기 정보를 수정할 수 있습니다.") + "</p>" +
      '<div class="gw-dialog-group">기본 정보 (변경할 수 없음)</div>' +
      field("gw-p-name", "이름", 'value="' + escapeHtml(member.name) + '" disabled') +
      field("gw-p-username", "아이디", "disabled") +
      field("gw-p-rank", "직급", 'value="' + escapeHtml(member.title || "") + '" disabled') +
      '<div class="gw-dialog-group">연락처</div>' +
      field("gw-p-phone", "휴대전화", 'type="tel" maxlength="20" placeholder="010-0000-0000" value="' + escapeHtml(p.phone || "") + '"' + (mine ? "" : " disabled")) +
      field("gw-p-email", "이메일", 'type="email" maxlength="80" placeholder="name@example.com" value="' + escapeHtml(p.email || "") + '"' + (mine ? "" : " disabled")) +
      field("gw-p-address", "주소", 'maxlength="120" value="' + escapeHtml(p.address || "") + '"' + (mine ? "" : " disabled")) +
      field("gw-p-emergency", "비상 연락처", 'maxlength="60" placeholder="관계·이름·전화번호" value="' + escapeHtml(p.emergency || "") + '"' + (mine ? "" : " disabled")) +
      '<p class="gw-dialog-error" role="alert"></p>' +
      '<div class="gw-dialog-footer"><button type="button" class="btn-secondary" data-close>' + (mine ? "취소" : "닫기") + "</button>" +
      (mine ? '<button type="submit" class="btn-primary">저장</button>' : "") + "</div></form>");
    fetch(mine ? "/api/me" : "/api/accounts").then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      var el = document.getElementById("gw-p-username");
      if (data && el) el.value = (mine ? data.username : (data[member.id] || {}).username) || "";
    }).catch(function () {});
    dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!mine) return;
      var v = {};
      PROFILE_FIELDS.forEach(function (f) { v[f] = dlg.querySelector("#gw-p-" + f).value.trim(); });
      var err = dlg.querySelector(".gw-dialog-error");
      if (v.phone && !/^[0-9+\-() ]{7,20}$/.test(v.phone)) { err.textContent = "전화번호는 숫자와 - + ( ) 만 입력할 수 있습니다."; return; }
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) { err.textContent = "이메일 형식이 올바르지 않습니다."; return; }
      v.updatedAt = Date.now();
      localStorage.setItem(profileKey(me.id), JSON.stringify(v));
      GW.log("회원정보 수정", me.name);
      dlg.close();
      notice("내 정보를 저장했습니다.");
      if (onSaved) onSaved();
    });
    dlg.showModal();
  };

  function openPassword() {
    var dlg = makeDialog("gw-dlg-password",
      '<form method="dialog" autocomplete="off">' +
      "<h3>비밀번호 변경</h3>" +
      '<p class="gw-dialog-sub">변경하면 다른 기기의 로그인은 모두 풀립니다.</p>' +
      field("gw-pw-current", "현재 비밀번호", 'type="password" autocomplete="current-password" required') +
      field("gw-pw-new", "새 비밀번호 (8자 이상)", 'type="password" autocomplete="new-password" required minlength="8"') +
      field("gw-pw-confirm", "새 비밀번호 확인", 'type="password" autocomplete="new-password" required') +
      '<p class="gw-dialog-error" role="alert"></p>' +
      '<div class="gw-dialog-footer"><button type="button" class="btn-secondary" data-close>취소</button><button type="submit" class="btn-primary">변경</button></div></form>');
    var err = dlg.querySelector(".gw-dialog-error");
    dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var next = dlg.querySelector("#gw-pw-new").value;
      if (next !== dlg.querySelector("#gw-pw-confirm").value) { err.textContent = "새 비밀번호 확인이 일치하지 않습니다."; return; }
      fetch("/api/password", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: dlg.querySelector("#gw-pw-current").value, password: next }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok) { err.textContent = res.data.error || "변경하지 못했습니다."; return; }
          dlg.close();
          notice("비밀번호를 변경했습니다.");
        })
        .catch(function () { err.textContent = "서버에 연결할 수 없습니다."; });
    });
    dlg.showModal();
  }

  function openLogout() {
    var dlg = makeDialog("gw-dlg-logout",
      '<form method="dialog"><h3>로그아웃</h3><p class="gw-dialog-sub">로그아웃하시겠습니까?</p>' +
      '<div class="gw-dialog-footer"><button type="button" class="btn-secondary" data-close>취소</button><button type="submit" class="btn-primary">로그아웃</button></div></form>');
    dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); GW.logout(); });
    dlg.showModal();
  }

  // 이름·아바타를 누르면 나타나는 메뉴
  var accountMenu = document.createElement("div");
  accountMenu.className = "gw-menu";
  accountMenu.setAttribute("role", "menu");
  accountMenu.hidden = true;
  accountMenu.innerHTML = '<button type="button" role="menuitem" data-act="profile">내 정보</button>' +
    '<button type="button" role="menuitem" data-act="password">비밀번호 변경</button>' +
    '<button type="button" role="menuitem" data-act="logout" class="is-danger">로그아웃</button>';
  document.body.appendChild(accountMenu);
  var menuAnchor = null;
  function closeAccountMenu() {
    accountMenu.hidden = true;
    if (menuAnchor) menuAnchor.setAttribute("aria-expanded", "false");
    menuAnchor = null;
  }
  function toggleAccountMenu(anchor) {
    if (menuAnchor === anchor) return closeAccountMenu();
    closeAccountMenu();
    menuAnchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
    var r = anchor.getBoundingClientRect();
    accountMenu.hidden = false;
    var w = accountMenu.offsetWidth;
    accountMenu.style.top = Math.round(r.bottom + 6) + "px";
    accountMenu.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - w - 8))) + "px";
    accountMenu.querySelector("button").focus();
  }
  accountMenu.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    closeAccountMenu();
    if (btn.dataset.act === "profile") GW.openProfile(me);
    else if (btn.dataset.act === "password") openPassword();
    else openLogout();
  });
  document.addEventListener("click", function (e) {
    if (!accountMenu.hidden && !accountMenu.contains(e.target) && !(menuAnchor && menuAnchor.contains(e.target))) closeAccountMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !accountMenu.hidden) { var a = menuAnchor; closeAccountMenu(); if (a) a.focus(); }
  });
  ["side-profile", "topbar-avatar"].forEach(function (id) {
    var el = document.getElementById(id);
    el.setAttribute("aria-haspopup", "menu");
    el.addEventListener("click", function () { toggleAccountMenu(el); });
  });

  // 메시지: 메인 화면이 아니면 메인으로 이동해서 열기
  if (PAGE !== "home") {
    document.getElementById("btn-messenger-open").addEventListener("click", function () {
      location.href = ROOT + "index.html?chat=1";
    });
  }

  // 모바일 사이드바
  var side = document.getElementById("app-side");
  var scrim = document.getElementById("side-scrim");
  function setSide(open) {
    side.classList.toggle("is-open", open);
    scrim.hidden = !open;
  }
  document.getElementById("btn-side-toggle").addEventListener("click", function () { setSide(!side.classList.contains("is-open")); });
  scrim.addEventListener("click", function () { setSide(false); });

  // ---------- 알림 ----------
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function collectNotifications() {
    var t = todayIso();
    var out = [];
    var todos = readJSON("ai-groupware-todos", []) || [];
    var works = readJSON("ai-groupware-work-instructions", []) || [];
    var open = todos.filter(function (x) { return !x.done; }).map(function (x) { return { text: x.text, due: x.dueDate, kind: "할 일" }; })
      .concat(works.filter(function (x) { return !x.done; }).map(function (x) { return { text: x.text, due: x.dueDate, kind: "업무", urgent: x.type === "urgent" }; }));
    open.forEach(function (x) {
      if (x.due && x.due < t) out.push({ tone: "danger", icon: "alert", title: "기한 지남 · " + x.kind, text: x.text, href: "index.html" });
      else if (x.due === t) out.push({ tone: "warning", icon: "clock", title: "오늘 마감 · " + x.kind, text: x.text, href: "index.html" });
      else if (x.urgent) out.push({ tone: "info", icon: "alert", title: "긴급 업무", text: x.text, href: "index.html" });
    });
    if (GW.canAccess("cost", me)) {
      var cost = readJSON("ai-groupware-cost-v1", null);
      if (cost && Array.isArray(cost.expenses)) {
        var noEv = cost.expenses.filter(function (e) { return e.evidence === "none"; }).length;
        if (noEv) out.push({ tone: "warning", icon: "receipt", title: "비용관리", text: "증빙 미수취 지출 " + noEv + "건", href: "cost/cost.html" });
        var unsettled = cost.expenses.filter(function (e) { return e.method === "personal" && !e.settled; }).length;
        if (unsettled) out.push({ tone: "info", icon: "wallet", title: "비용관리", text: "대표 개인결제 미정산 " + unsettled + "건", href: "cost/cost.html" });
      }
    }
    return out;
  }
  var notifyBtn = document.getElementById("btn-notify");
  var notifyPop = document.getElementById("notify-pop");
  var notifyBadge = document.getElementById("notify-badge");
  function renderNotifications() {
    var list = collectNotifications();
    notifyBadge.hidden = !list.length;
    notifyBadge.textContent = list.length > 9 ? "9+" : String(list.length);
    notifyPop.innerHTML = '<div class="popover-head">알림 <span class="count-pill">' + list.length + "</span></div>" +
      (list.length ? '<ul class="notify-list">' + list.slice(0, 12).map(function (n) {
        return '<li><a href="' + ROOT + n.href + '" class="notify-item"><span class="notify-icon tone-' + n.tone + '">' + icon(n.icon, "icon-sm") + "</span>" +
          '<span class="notify-body"><span class="notify-title">' + escapeHtml(n.title) + '</span><span class="notify-text">' + escapeHtml(n.text) + "</span></span></a></li>";
      }).join("") + "</ul>" : '<p class="popover-empty">새 알림이 없습니다.</p>');
  }
  function setNotify(open) {
    if (open) renderNotifications();
    notifyPop.hidden = !open;
    notifyBtn.setAttribute("aria-expanded", String(open));
  }
  notifyBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    setNotify(notifyPop.hidden);
  });
  document.addEventListener("click", function (e) {
    if (!notifyPop.hidden && !notifyPop.contains(e.target)) setNotify(false);
  });
  renderNotifications();
  // 다른 화면에서 데이터가 바뀌면(같은 브라우저의 다른 탭) 알림 갱신
  window.addEventListener("storage", renderNotifications);
  window.GWShell = { refreshNotifications: renderNotifications, icon: icon };

  // ---------- 통합 검색 (⌘K / Ctrl+K) ----------
  var palette = document.createElement("div");
  palette.className = "palette-overlay";
  palette.hidden = true;
  palette.innerHTML = '<div class="palette" role="dialog" aria-modal="true" aria-label="통합 검색">' +
    '<div class="palette-input-wrap">' + icon("search") +
    '<input type="text" class="palette-input" id="palette-input" placeholder="메뉴, 할 일, 업무 요청, 프로젝트, 전표, 지출 검색" autocomplete="off" aria-controls="palette-list">' +
    "<kbd>Esc</kbd></div>" +
    '<ul class="palette-list" id="palette-list" role="listbox"></ul></div>';
  document.body.appendChild(palette);
  var paletteInput = palette.querySelector("#palette-input");
  var paletteList = palette.querySelector("#palette-list");
  var paletteItems = [];
  var paletteIndex = 0;

  function searchSources(q) {
    var results = [];
    NAV.forEach(function (g) {
      g.items.forEach(function (item) {
        var allowed = item.id === "home" || (item.id === "admin" ? GW.isManager(me) : GW.canAccess(item.id, me));
        if (!allowed || item.soon || !item.href) return;
        if (!q || item.label.toLowerCase().indexOf(q) !== -1) results.push({ group: "메뉴", label: item.label, icon: item.icon, href: ROOT + item.href });
      });
    });
    if (!q) return results;
    var todos = readJSON("ai-groupware-todos", []) || [];
    var works = readJSON("ai-groupware-work-instructions", []) || [];
    todos.forEach(function (t) {
      if (String(t.text).toLowerCase().indexOf(q) !== -1) results.push({ group: "할 일", label: t.text, meta: t.done ? "완료" : (t.dueDate || ""), icon: "check", href: ROOT + "index.html?q=" + encodeURIComponent(t.text) });
    });
    works.forEach(function (w) {
      if ((w.text + " " + (w.requester || "")).toLowerCase().indexOf(q) !== -1) results.push({ group: "업무 요청", label: w.text, meta: w.requester || "", icon: "clipboard", href: ROOT + "index.html?q=" + encodeURIComponent(w.text) });
    });
    if (GW.canAccess("sales", me)) {
      (readJSON("ai-groupware-projects", []) || []).forEach(function (pj) {
        if ((pj.no + " " + pj.name + " " + pj.partner).toLowerCase().indexOf(q) !== -1) {
          results.push({ group: "프로젝트", label: pj.name, meta: pj.no + " · " + pj.partner, icon: "briefcase", href: ROOT + "sales/sales.html?q=" + encodeURIComponent(pj.no) });
        }
      });
    }
    if (GW.canAccess("receipt", me)) {
      (readJSON("ai-groupware-receipts", []) || []).forEach(function (v) {
        if ((v.no + " " + v.summary + " " + (v.partner || "")).toLowerCase().indexOf(q) !== -1) {
          results.push({ group: "전표", label: v.summary, meta: v.no + " · " + Number(v.amount).toLocaleString("ko-KR") + "원", icon: "receipt", href: ROOT + "receipt/receipt.html?q=" + encodeURIComponent(v.no) });
        }
      });
    }
    if (GW.canAccess("cost", me)) {
      var cost = readJSON("ai-groupware-cost-v1", null);
      ((cost && cost.expenses) || []).forEach(function (e) {
        if ((e.item + " " + (e.vendor || "") + " " + (e.memo || "")).toLowerCase().indexOf(q) !== -1) {
          results.push({ group: "지출", label: e.item, meta: e.date + " · " + Number(e.amount).toLocaleString("ko-KR") + "원", icon: "wallet", href: ROOT + "cost/cost.html?q=" + encodeURIComponent(e.item) });
        }
      });
    }
    return results.slice(0, 30);
  }
  function renderPalette() {
    var q = paletteInput.value.trim().toLowerCase();
    paletteItems = searchSources(q);
    paletteIndex = 0;
    if (!paletteItems.length) {
      paletteList.innerHTML = '<li class="palette-empty">검색 결과가 없습니다.</li>';
      return;
    }
    var lastGroup = "";
    paletteList.innerHTML = paletteItems.map(function (r, i) {
      var head = r.group !== lastGroup ? '<li class="palette-group" role="presentation">' + escapeHtml(r.group) + "</li>" : "";
      lastGroup = r.group;
      return head + '<li class="palette-item' + (i === 0 ? " is-active" : "") + '" role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '">' +
        icon(r.icon, "icon-sm") + '<span class="palette-label">' + escapeHtml(r.label) + "</span>" +
        (r.meta ? '<span class="palette-meta">' + escapeHtml(r.meta) + "</span>" : "") + "</li>";
    }).join("");
  }
  function movePalette(delta) {
    if (!paletteItems.length) return;
    paletteIndex = (paletteIndex + delta + paletteItems.length) % paletteItems.length;
    paletteList.querySelectorAll(".palette-item").forEach(function (el) {
      var on = Number(el.dataset.i) === paletteIndex;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-selected", String(on));
      if (on) el.scrollIntoView({ block: "nearest" });
    });
  }
  var paletteReturn = null;
  function openPalette() {
    paletteReturn = document.activeElement;
    palette.hidden = false;
    paletteInput.value = "";
    renderPalette();
    paletteInput.focus();
  }
  function closePalette() {
    palette.hidden = true;
    if (paletteReturn && document.contains(paletteReturn)) paletteReturn.focus();
  }
  document.getElementById("btn-palette").addEventListener("click", openPalette);
  paletteInput.addEventListener("input", renderPalette);
  paletteInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); movePalette(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); movePalette(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      var r = paletteItems[paletteIndex];
      if (r) location.href = r.href;
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closePalette();
    }
  });
  paletteList.addEventListener("click", function (e) {
    var el = e.target.closest(".palette-item");
    if (el) location.href = paletteItems[Number(el.dataset.i)].href;
  });
  palette.addEventListener("click", function (e) {
    if (e.target === palette) closePalette();
  });
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (palette.hidden) openPalette();
      else closePalette();
    } else if (e.key === "Escape" && !notifyPop.hidden) {
      setNotify(false);
      notifyBtn.focus();
    }
  });
})();
