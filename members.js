/**
 * 회원·권한 공통 모듈 (메인 · 관리자 · 각 업무 화면에서 함께 사용)
 *
 * 권한 등급: 마스터(master) > 관리자(admin) > 일반(member)
 * - 마스터: 모든 메뉴·관리 기능 사용, 메뉴 권한·등급 지정
 * - 관리자: 관리자 페이지 접근, 일반 회원 관리
 * - 일반: 메뉴 권한에서 허용된 메뉴만 사용
 * 서버가 없는 정적 앱이라 모든 정보는 이 브라우저의 localStorage에만 저장되며,
 * 같은 기기 안에서 역할을 구분하는 용도입니다. (실제 로그인·보안 기능 아님)
 */
(function () {
  "use strict";

  var PREFIX = "ai-groupware-";
  var MEMBERS_KEY = PREFIX + "members";
  var CURRENT_KEY = PREFIX + "current-member";
  var PERMS_KEY = PREFIX + "menu-permissions";
  var LOG_KEY = PREFIX + "admin-log";
  var LEGACY_PROFILE_KEY = PREFIX + "profile";

  // level이 높을수록 상위 등급
  var ROLES = [
    { id: "master", label: "마스터", level: 3 },
    { id: "admin", label: "관리자", level: 2 },
    { id: "member", label: "일반", level: 1 }
  ];
  var ALL_ROLES = ["master", "admin", "member"];

  // 메뉴별 기본 접근 등급 (마스터는 항상 접근 가능)
  var MENUS = [
    { id: "cost", label: "비용관리", href: "cost/cost.html", defaultRoles: ["master", "admin"] },
    { id: "sales", label: "프로젝트 관리", href: "sales/sales.html", defaultRoles: ALL_ROLES },
    { id: "meeting", label: "회의록", defaultRoles: ALL_ROLES },
    { id: "receipt", label: "전표관리", defaultRoles: ALL_ROLES },
    { id: "approval", label: "업무결재", defaultRoles: ALL_ROLES },
    { id: "finance", label: "재무관리", defaultRoles: ["master", "admin"] },
    { id: "document", label: "문서관리", defaultRoles: ALL_ROLES }
  ];
  // 관리자 페이지는 고정: 마스터·관리자만
  var ADMIN_PAGE_ROLES = ["master", "admin"];

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function seedMembers() {
    // 이전 버전의 '내 정보'(이름·직급)를 이어받아 첫 관리자로 만든다
    var legacy = readJSON(LEGACY_PROFILE_KEY, null) || { name: "김민철", title: "과장" };
    var now = Date.now();
    var list = [
      { id: "org-1", name: "대표", title: "대표", role: "admin" },
      { id: "org-2", name: legacy.name, title: legacy.title || "", role: "master" },
      { id: "org-3", name: "김철수", title: "팀장", role: "member" },
      { id: "org-4", name: "이영희", title: "대리", role: "member" },
      { id: "org-5", name: "박지훈", title: "사원", role: "member" },
      { id: "org-6", name: "최수진", title: "대리", role: "member" },
      { id: "org-7", name: "정대호", title: "사원", role: "member" },
      { id: "org-8", name: "한소희", title: "사원", role: "member" },
      { id: "org-9", name: "윤서준", title: "대리", role: "member" },
      { id: "org-10", name: "임도현", title: "사원", role: "member" }
    ].map(function (m) {
      m.active = true;
      m.createdAt = now;
      return m;
    });
    writeJSON(MEMBERS_KEY, list);
    if (localStorage.getItem(CURRENT_KEY) == null) localStorage.setItem(CURRENT_KEY, "org-2");
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    return list;
  }

  function getMembers() {
    var list = readJSON(MEMBERS_KEY, null);
    if (!Array.isArray(list) || !list.length) return seedMembers();
    return ensureMaster(list);
  }
  // 이전 버전(관리자/일반 2단계) 데이터: 마스터가 없으면 현재 사용자(관리자인 경우) 또는 첫 관리자를 마스터로 지정
  function ensureMaster(list) {
    var hasMaster = list.some(function (m) { return m.role === "master" && m.active !== false; });
    if (hasMaster) return list;
    var currentId = localStorage.getItem(CURRENT_KEY);
    var candidate = list.filter(function (m) { return m.id === currentId && m.role === "admin" && m.active !== false; })[0] ||
      list.filter(function (m) { return m.role === "admin" && m.active !== false; })[0] ||
      list.filter(function (m) { return m.active !== false; })[0];
    if (candidate) {
      candidate.role = "master";
      writeJSON(MEMBERS_KEY, list);
    }
    return list;
  }
  function saveMembers(list) {
    writeJSON(MEMBERS_KEY, list);
  }
  function findMember(id) {
    return getMembers().filter(function (m) { return m.id === id; })[0] || null;
  }
  function activeMembers() {
    return getMembers().filter(function (m) { return m.active !== false; });
  }
  function countRole(role, list) {
    return (list || getMembers()).filter(function (m) { return m.role === role && m.active !== false; }).length;
  }
  function roleLevel(role) {
    var r = ROLES.filter(function (x) { return x.id === role; })[0];
    return r ? r.level : 0;
  }

  function getCurrent() {
    var list = getMembers();
    var id = localStorage.getItem(CURRENT_KEY);
    var me = list.filter(function (m) { return m.id === id && m.active !== false; })[0];
    if (!me) {
      // 현재 사용자가 삭제·비활성화된 경우: 관리자 → 아무 활성 회원 순으로 대체
      me = list.filter(function (m) { return m.role === "master" && m.active !== false; })[0] ||
        list.filter(function (m) { return m.active !== false; })[0] || list[0];
      localStorage.setItem(CURRENT_KEY, me.id);
    }
    return me;
  }
  function setCurrent(id) {
    var m = findMember(id);
    if (!m || m.active === false) return false;
    localStorage.setItem(CURRENT_KEY, id);
    return true;
  }
  function isMaster(member) {
    var m = member || getCurrent();
    return !!m && m.role === "master";
  }
  // 관리자 페이지 접근 가능 여부 (마스터·관리자)
  function isManager(member) {
    var m = member || getCurrent();
    return !!m && ADMIN_PAGE_ROLES.indexOf(m.role) !== -1;
  }

  // { menuId: ["master", "admin", "member"] } — 마스터는 항상 포함
  function getPermissions() {
    var saved = readJSON(PERMS_KEY, {}) || {};
    var perms = {};
    MENUS.forEach(function (menu) {
      var v = saved[menu.id];
      var roles;
      if (Array.isArray(v)) roles = v.slice();
      else if (v === "all") roles = ALL_ROLES.slice(); // 이전 버전 값
      else if (v === "admin") roles = ["master", "admin"];
      else roles = menu.defaultRoles.slice();
      if (roles.indexOf("master") === -1) roles.unshift("master");
      perms[menu.id] = ALL_ROLES.filter(function (r) { return roles.indexOf(r) !== -1; });
    });
    return perms;
  }
  function savePermissions(perms) {
    writeJSON(PERMS_KEY, perms);
  }
  function canAccess(menuId, member) {
    var m = member || getCurrent();
    if (!m) return false;
    if (m.role === "master") return true;
    var roles = getPermissions()[menuId];
    return !roles || roles.indexOf(m.role) !== -1;
  }

  function log(action, detail) {
    var list = readJSON(LOG_KEY, []) || [];
    var me = getCurrent();
    list.unshift({ at: Date.now(), by: me ? me.name : "", action: action, detail: detail || "" });
    writeJSON(LOG_KEY, list.slice(0, 100));
  }
  function getLog() {
    return readJSON(LOG_KEY, []) || [];
  }

  function roleLabel(role) {
    var r = ROLES.filter(function (x) { return x.id === role; })[0];
    return r ? r.label : "일반";
  }

  // ---------- 전체 백업 / 복원 ----------
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function backup() {
    var dump = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key.indexOf(PREFIX) === 0) dump[key] = localStorage.getItem(key);
    }
    var blob = new Blob([JSON.stringify({ app: "ai-groupware", savedAt: new Date().toISOString(), data: dump }, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ai-groupware_백업_" + todayIso() + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  // onDone(errorMessage | null). 확인 후 덮어쓰고 새로고침한다.
  function restore(file, onDone) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed || parsed.app !== "ai-groupware" || typeof parsed.data !== "object") throw new Error("invalid");
        if (!confirm("백업 파일로 현재 데이터를 모두 덮어씁니다. 계속할까요?")) return onDone && onDone(null);
        Object.keys(parsed.data).forEach(function (key) {
          if (key.indexOf(PREFIX) === 0) localStorage.setItem(key, parsed.data[key]);
        });
        location.reload();
      } catch (e) {
        if (onDone) onDone("올바른 백업 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
  }

  // ---------- 화면 접근 제한 ----------
  // 권한이 없으면 화면을 안내문으로 바꾸고 false 반환 (페이지 스크립트는 즉시 종료해야 함)
  function guardPage(menuId, homeHref) {
    var allowed = menuId === "admin" ? isManager() : canAccess(menuId);
    if (allowed) return true;
    var me = getCurrent();
    var label = menuId === "admin" ? "관리자 페이지" : ((MENUS.filter(function (m) { return m.id === menuId; })[0] || {}).label || "이 화면");
    var allowedRoles = menuId === "admin" ? ADMIN_PAGE_ROLES : (getPermissions()[menuId] || ALL_ROLES);
    document.body.innerHTML =
      '<div class="access-denied">' +
      '<div class="access-denied-box">' +
      '<span class="access-denied-icon" aria-hidden="true">🔒</span>' +
      "<h1>접근 권한이 없습니다</h1>" +
      "<p></p>" +
      '<a class="btn-primary" href="' + homeHref + '">홈으로 돌아가기</a>' +
      "</div></div>";
    document.body.querySelector("p").textContent =
      label + "은(는) " + allowedRoles.map(roleLabel).join("·") + " 등급만 이용할 수 있습니다. 현재 사용자: " + me.name + " (" + roleLabel(me.role) + "). 권한이 필요하면 마스터에게 요청하세요.";
    document.title = "접근 제한 - AI 그룹웨어";
    return false;
  }

  window.GW = {
    PREFIX: PREFIX,
    ROLES: ROLES,
    ALL_ROLES: ALL_ROLES,
    MENUS: MENUS,
    ADMIN_PAGE_ROLES: ADMIN_PAGE_ROLES,
    getMembers: getMembers,
    saveMembers: saveMembers,
    findMember: findMember,
    activeMembers: activeMembers,
    countRole: countRole,
    roleLevel: roleLevel,
    getCurrent: getCurrent,
    setCurrent: setCurrent,
    isMaster: isMaster,
    isManager: isManager,
    roleLabel: roleLabel,
    getPermissions: getPermissions,
    savePermissions: savePermissions,
    canAccess: canAccess,
    log: log,
    getLog: getLog,
    backup: backup,
    restore: restore,
    guardPage: guardPage
  };
})();
