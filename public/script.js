(function () {
  "use strict";

  // ---------- Agent 추가 (동적 카드 + 사이드바 메뉴) ----------
  const agentCardsEl = document.getElementById("agent-cards");
  const cardAddAgent = document.getElementById("card-add-agent");
  const agentListEl = document.getElementById("agent-list");
  const modal = document.getElementById("modal-add-agent");
  const modalClose = document.getElementById("modal-close");
  const modalCancel = document.getElementById("modal-cancel");
  const modalSubmit = document.getElementById("modal-submit");
  const newAgentName = document.getElementById("new-agent-name");
  const newAgentDesc = document.getElementById("new-agent-desc");
  const newAgentCategory = document.getElementById("new-agent-category");

  let customAgents = JSON.parse(localStorage.getItem("ai-groupware-custom-agents") || "[]");

  function renderCustomAgents() {
    if (!agentCardsEl) return;
    customAgents.forEach(function (agent) {
      addAgentCard(agent);
      addAgentMenuItem(agent);
    });
  }

  function addAgentCard(agent) {
    var card = document.createElement("article");
    card.className = "agent-card";
    card.dataset.agent = agent.id;
    card.innerHTML =
      '<div class="agent-card-icon">' + (agent.icon || "◆") + "</div>" +
      "<h3 class=\"agent-card-title\">" + escapeHtml(agent.name) + "</h3>" +
      "<p class=\"agent-card-desc\">" + escapeHtml(agent.desc) + "</p>";
    card.addEventListener("click", function () {
      openAgent(agent.id);
    });
    if (!agentCardsEl) return;
    if (cardAddAgent) agentCardsEl.insertBefore(card, cardAddAgent);
    else agentCardsEl.appendChild(card);
  }

  function addAgentMenuItem(agent) {
    if (!agentListEl) return;
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "#";
    a.className = "menu-item";
    a.dataset.agent = agent.id;
    a.textContent = agent.name;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      openAgent(agent.id);
    });
    li.appendChild(a);
    agentListEl.appendChild(li);
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function openAddModal() {
    newAgentName.value = "";
    newAgentDesc.value = "";
    newAgentCategory.value = "업무";
    modal.hidden = false;
    newAgentName.focus();
  }

  function closeModal() {
    modal.hidden = true;
  }

  function submitNewAgent() {
    var name = newAgentName.value.trim();
    var desc = newAgentDesc.value.trim();
    var category = newAgentCategory.value;
    if (!name) {
      newAgentName.focus();
      return;
    }
    var agent = {
      id: "custom-" + Date.now(),
      name: name,
      desc: desc || "사용자 정의 에이전트",
      category: category,
      icon: "◆",
    };
    customAgents.push(agent);
    localStorage.setItem("ai-groupware-custom-agents", JSON.stringify(customAgents));
    addAgentCard(agent);
    addAgentMenuItem(agent);
    closeModal();
  }

  function openAgent(agentId) {
    if (!agentId) return;
    var url = agentId === "sales" ? "sales/sales.html" : "agent.html?agent=" + encodeURIComponent(agentId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (cardAddAgent) cardAddAgent.addEventListener("click", openAddModal);
  if (modal) {
    if (modalClose) modalClose.addEventListener("click", closeModal);
    if (modalCancel) modalCancel.addEventListener("click", closeModal);
    if (modalSubmit) modalSubmit.addEventListener("click", submitNewAgent);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });
  }

  renderCustomAgents();

  var CURRENT_USER = "김민철";
  var SEED_VERSION = "v3-focus-inbox";
  var uiState = { searchQuery: "", workFilter: "open", focusFilter: "all" };

  function isoOffset(days) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function todayIso() { return isoOffset(0); }
  function dueState(dueDate) {
    if (!dueDate) return "";
    var t = todayIso();
    if (dueDate < t) return "overdue";
    if (dueDate === t) return "today";
    return "";
  }
  function matchesSearch(text, query) {
    if (!query) return true;
    return String(text || "").toLowerCase().indexOf(query.toLowerCase()) !== -1;
  }
  function formatDueDisplay(dueDate) {
    if (!dueDate) return "—";
    var part = dueDate.split("-");
    if (part.length >= 3) return parseInt(part[1], 10) + "." + part[2];
    return dueDate;
  }
  if (localStorage.getItem("ai-groupware-seed-ver") !== SEED_VERSION) {
    localStorage.removeItem("ai-groupware-todos");
    localStorage.removeItem("ai-groupware-work-instructions");
    localStorage.setItem("ai-groupware-seed-ver", SEED_VERSION);
  }

  // ---------- To-do (단일 데이터 + 메인 목록 + 팝업) ----------
  var todoListEl = document.getElementById("todo-list");
  var todoManageBtn = document.getElementById("todo-manage-btn");
  var modalTodo = document.getElementById("modal-todo");
  var modalTodoClose = document.getElementById("modal-todo-close");
  var modalTodoCancel = document.getElementById("modal-todo-cancel");
  var modalTodoConfirm = document.getElementById("modal-todo-confirm");
  var todoModalList = document.getElementById("todo-modal-list");
  var todoModalInput = document.getElementById("todo-modal-input");
  var todoModalDate = document.getElementById("todo-modal-date");
  var todoModalAddBtn = document.getElementById("todo-modal-add-btn");
  var todoModalSelectAllBtn = document.getElementById("todo-modal-select-all-btn");
  var todoModalBatchDelBtn = document.getElementById("todo-modal-batch-del-btn");
  var todoQuickInput = document.getElementById("todo-quick-input");
  var todoQuickDate = document.getElementById("todo-quick-date");
  var todoQuickAddBtn = document.getElementById("todo-quick-add-btn");

  var todoData = JSON.parse(localStorage.getItem("ai-groupware-todos") || "[]");
  if (todoData.length === 0) {
    todoData = [
      { id: "todo-1", text: "회의록 초안 작성", done: false, dueDate: isoOffset(0), assignee: CURRENT_USER },
      { id: "todo-2", text: "전표 검수 및 제출", done: false, dueDate: isoOffset(1), assignee: CURRENT_USER },
      { id: "todo-3", text: "결재 요청서 검토", done: false, dueDate: isoOffset(-1), assignee: CURRENT_USER },
      { id: "todo-4", text: "고객사 자료 정리", done: false, dueDate: isoOffset(3), assignee: CURRENT_USER },
      { id: "todo-5", text: "주간 보고서 제출", done: false, dueDate: isoOffset(2), assignee: CURRENT_USER },
    ];
    saveTodos();
  }
  todoData.forEach(function (item) {
    if (item.dueDate === undefined) item.dueDate = "";
    if (item.assignee === undefined) item.assignee = CURRENT_USER;
  });

  function saveTodos() {
    localStorage.setItem("ai-groupware-todos", JSON.stringify(todoData));
  }

  function renderMainTodoList() {
    if (!todoListEl) return;
    todoListEl.innerHTML = "";
    todoData.forEach(function (item) {
      var li = document.createElement("li");
      var state = dueState(item.dueDate);
      li.className = "todo-item todo-grid-cols" + (item.done ? " is-done" : "") + (state ? " is-" + state : "");
      li.dataset.id = item.id;
      if (!matchesSearch(item.text, uiState.searchQuery)) li.classList.add("is-filtered-out");
      li.innerHTML =
        '<span class="todo-item-check-cell"><input type="checkbox" class="todo-check" id="' + item.id + '" ' + (item.done ? "checked" : "") + "></span>" +
        '<label for="' + item.id + '" class="todo-label">' + escapeHtml(item.text) + "</label>" +
        '<span class="todo-item-due-cell">' + escapeHtml(formatDueDisplay(item.dueDate)) + "</span>";
      todoListEl.appendChild(li);
    });
    todoListEl.querySelectorAll(".todo-check").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.id;
        var li = cb.closest(".todo-item");
        if (li) li.classList.toggle("is-done", cb.checked);
        var item = todoData.find(function (t) { return t.id === id; });
        if (item) {
          item.done = cb.checked;
          saveTodos();
          refreshEfficiencyUI();
        }
      });
    });
  }

  function renderModalTodoList() {
    if (!todoModalList) return;
    todoModalList.innerHTML = "";
    todoData.forEach(function (item) {
      var li = document.createElement("li");
      li.dataset.id = item.id;
      var dueVal = item.dueDate || "";
      li.innerHTML =
        '<input type="checkbox" class="todo-select-cb" id="sel-' + item.id + '" data-id="' + item.id + '">' +
        '<input type="checkbox" class="todo-check" id="modal-' + item.id + '" ' + (item.done ? "checked" : "") + ">" +
        '<label for="modal-' + item.id + '" class="todo-label">' + escapeHtml(item.text) + "</label>" +
        '<input type="date" class="todo-due-date" data-id="' + item.id + '" value="' + dueVal + '" title="목표일자">' +
        '<button type="button" class="todo-modal-del-btn" data-id="' + item.id + '">삭제</button>';
      todoModalList.appendChild(li);
    });
    todoModalList.querySelectorAll(".todo-check").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.id.replace("modal-", "");
        var item = todoData.find(function (t) {
          return t.id === id;
        });
        if (item) {
          item.done = cb.checked;
          saveTodos();
          renderMainTodoList();
          refreshEfficiencyUI();
        }
      });
    });
    todoModalList.querySelectorAll(".todo-due-date").forEach(function (input) {
      input.addEventListener("change", function () {
        var id = input.dataset.id;
        var item = todoData.find(function (t) {
          return t.id === id;
        });
        if (item) {
          item.dueDate = input.value || "";
          saveTodos();
          renderMainTodoList();
          refreshEfficiencyUI();
        }
      });
    });
    todoModalList.querySelectorAll(".todo-modal-del-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
        var id = btn.dataset.id;
        todoData = todoData.filter(function (t) {
          return t.id !== id;
        });
        saveTodos();
        renderModalTodoList();
        renderMainTodoList();
        refreshEfficiencyUI();
      });
    });
  }

  function openTodoModal() {
    if (modalTodo) {
      modalTodo.hidden = false;
      if (todoModalInput) todoModalInput.value = "";
      if (todoModalDate) todoModalDate.value = "";
      renderModalTodoList();
      if (todoModalInput) todoModalInput.focus();
    }
  }

  function closeTodoModal() {
    if (modalTodo) modalTodo.hidden = true;
  }

  renderMainTodoList();

  if (todoManageBtn) todoManageBtn.addEventListener("click", openTodoModal);
  if (modalTodoClose) modalTodoClose.addEventListener("click", closeTodoModal);
  if (modalTodoCancel) modalTodoCancel.addEventListener("click", closeTodoModal);
  if (modalTodoConfirm) modalTodoConfirm.addEventListener("click", closeTodoModal);
  if (modalTodo) {
    modalTodo.addEventListener("click", function (e) {
      if (e.target === modalTodo) closeTodoModal();
    });
  }

  if (todoModalAddBtn && todoModalInput) {
    function addTodoInModal() {
      var text = todoModalInput.value.trim();
      if (!text) return;
      var id = "todo-" + Date.now();
      var due = (todoModalDate && todoModalDate.value) || "";
      todoData.push({ id: id, text: text, done: false, dueDate: due, assignee: CURRENT_USER });
      saveTodos();
      todoModalInput.value = "";
      if (todoModalDate) todoModalDate.value = "";
      renderModalTodoList();
      renderMainTodoList();
      refreshEfficiencyUI();
    }
    todoModalAddBtn.addEventListener("click", addTodoInModal);
    todoModalInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addTodoInModal();
      }
    });
  }

  if (todoModalSelectAllBtn && todoModalList) {
    todoModalSelectAllBtn.addEventListener("click", function () {
      var all = todoModalList.querySelectorAll(".todo-select-cb");
      var anyUnchecked = Array.prototype.some.call(all, function (cb) {
        return !cb.checked;
      });
      all.forEach(function (cb) {
        cb.checked = anyUnchecked;
      });
    });
  }
  if (todoModalBatchDelBtn && todoModalList) {
    todoModalBatchDelBtn.addEventListener("click", function () {
      var checked = todoModalList.querySelectorAll(".todo-select-cb:checked");
      if (checked.length === 0) return;
      var ids = Array.prototype.map.call(checked, function (cb) {
        return cb.dataset.id;
      });
      todoData = todoData.filter(function (t) {
        return ids.indexOf(t.id) === -1;
      });
      saveTodos();
      renderModalTodoList();
      renderMainTodoList();
      refreshEfficiencyUI();
    });
  }

  // ---------- Agent 카드 클릭 (Next.js 메인에서는 Link 사용, 정적 index.html에서는 아래 동작) ----------
  document.querySelectorAll(".agent-card:not(.agent-card-add)").forEach(function (card) {
    if (card.tagName === "A") return;
    card.addEventListener("click", function () {
      var agentId = card.dataset.agent;
      openAgent(agentId);
    });
  });

  // ---------- 업무 요청사항 (데이터 + 메인 목록 + 관리 팝업) ----------
  var workInstructionsListEl = document.getElementById("work-instructions-list");
  var workConfirmBtn = document.getElementById("work-instructions-confirm-btn");
  var modalWork = document.getElementById("modal-work-instructions");
  var modalWorkClose = document.getElementById("modal-work-instructions-close");
  var modalWorkCancel = document.getElementById("modal-work-instructions-cancel");
  var modalWorkConfirm = document.getElementById("modal-work-instructions-confirm");
  var workModalListEl = document.getElementById("work-instructions-modal-list");

  var workInstructionsData = JSON.parse(localStorage.getItem("ai-groupware-work-instructions") || "[]");
  if (workInstructionsData.length === 0) {
    workInstructionsData = [
      { id: "w1", text: "주간 정기회의록 요약 및 액션 아이템 정리", type: "urgent", dueDate: isoOffset(0), done: false, requester: "대표", assignee: CURRENT_USER },
      { id: "w2", text: "미처리 전표 분류 및 승인 요청", type: "urgent", dueDate: isoOffset(1), done: false, requester: "김철수", assignee: CURRENT_USER },
      { id: "w3", text: "결재 대기 건 검토 및 승인/반려 처리", type: "normal", dueDate: isoOffset(-1), done: false, requester: "이영희", assignee: CURRENT_USER },
      { id: "w4", text: "고객 히스토리 최근 업데이트 내역 확인", type: "normal", dueDate: isoOffset(4), done: false, requester: "박지훈", assignee: "김철수" },
      { id: "w5", text: "팀 내부 메신저 미확인 메시지 확인", type: "normal", dueDate: isoOffset(2), done: false, requester: "최수진", assignee: CURRENT_USER },
    ];
    saveWorkInstructions();
  }
  workInstructionsData.forEach(function (item) {
    if (item.dueDate === undefined) item.dueDate = "";
    if (item.type === undefined) item.type = "normal";
    if (item.requester === undefined) item.requester = "";
    if (item.assignee === undefined) item.assignee = CURRENT_USER;
  });

  function formatWorkDue(s) {
    if (!s) return "";
    var part = s.split("-");
    if (part.length >= 3) return parseInt(part[1], 10) + "." + part[2];
    return s;
  }

  function saveWorkInstructions() {
    localStorage.setItem("ai-groupware-work-instructions", JSON.stringify(workInstructionsData));
  }

  function renderMainWorkList() {
    if (!workInstructionsListEl) return;
    workInstructionsListEl.innerHTML = "";
    var num = 0;
    workInstructionsData.forEach(function (item) {
      if (item.done && uiState.workFilter !== "all") return;
      if (uiState.workFilter === "urgent" && item.type !== "urgent") return;
      if (uiState.workFilter === "today" && dueState(item.dueDate) !== "today") return;
      if (uiState.workFilter === "open" && item.done) return;
      if (!matchesSearch(item.text + " " + (item.requester || ""), uiState.searchQuery)) return;
      num++;
      var li = document.createElement("li");
      var state = dueState(item.dueDate);
      li.className = "work-instructions-item work-instructions-grid-cols" + (state ? " is-" + state : "");
      li.dataset.id = item.id;
      var typeClass = item.type === "urgent" ? "urgent" : "normal";
      var typeLabel = item.type === "urgent" ? "긴급" : "일반";
      var dateStr = formatWorkDue(item.dueDate);
      var requesterStr = item.requester ? escapeHtml(item.requester) : "—";
      li.innerHTML =
        "<span class=\"work-instructions-num\">" + num + "</span>" +
        "<span class=\"work-instructions-type " + typeClass + "\">" + typeLabel + "</span>" +
        "<span class=\"work-instructions-text\">" + escapeHtml(item.text) + "</span>" +
        "<span class=\"work-instructions-date\">" + escapeHtml(dateStr) + "</span>" +
        "<span class=\"work-instructions-requester\">" + requesterStr + "</span>";
      workInstructionsListEl.appendChild(li);
    });
    if (num === 0) {
      var empty = document.createElement("li");
      empty.className = "work-instructions-item";
      empty.style.cssText = "display:block;padding:20px;text-align:center;color:#9ca3af;font-size:13px;";
      empty.textContent = "조건에 맞는 요청이 없습니다.";
      workInstructionsListEl.appendChild(empty);
    }
  }

  function renderWorkModalList() {
    if (!workModalListEl) return;
    workModalListEl.innerHTML = "";
    workInstructionsData.forEach(function (item) {
      var li = document.createElement("li");
      li.dataset.id = item.id;
      var typeClass = item.type === "urgent" ? "urgent" : "normal";
      var typeLabel = item.type === "urgent" ? "긴급" : "일반";
      var req = item.requester || "";
      li.innerHTML =
        '<input type="checkbox" class="todo-check work-modal-done" id="work-done-' + item.id + '" ' + (item.done ? "checked" : "") + ' data-id="' + item.id + '">' +
        '<span class="work-type-badge ' + typeClass + '">' + typeLabel + "</span>" +
        '<label for="work-done-' + item.id + '" class="work-modal-text">' + escapeHtml(item.text) + "</label>" +
        '<input type="date" class="work-modal-due" data-id="' + item.id + '" value="' + (item.dueDate || "") + '" title="처리 목표일">' +
        '<input type="text" class="work-modal-requester" data-id="' + item.id + '" value="' + escapeHtml(req) + '" placeholder="요청자" title="요청자" maxlength="20">';
      workModalListEl.appendChild(li);
    });
    workModalListEl.querySelectorAll(".work-modal-done").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.dataset.id;
        var item = workInstructionsData.find(function (w) { return w.id === id; });
        if (item) {
          item.done = cb.checked;
          saveWorkInstructions();
          renderMainWorkList();
          refreshEfficiencyUI();
        }
      });
    });
    workModalListEl.querySelectorAll(".work-modal-due").forEach(function (input) {
      input.addEventListener("change", function () {
        var id = input.dataset.id;
        var item = workInstructionsData.find(function (w) { return w.id === id; });
        if (item) {
          item.dueDate = input.value || "";
          saveWorkInstructions();
          renderMainWorkList();
          refreshEfficiencyUI();
        }
      });
    });
    workModalListEl.querySelectorAll(".work-modal-requester").forEach(function (input) {
      input.addEventListener("change", function () {
        var id = input.dataset.id;
        var item = workInstructionsData.find(function (w) { return w.id === id; });
        if (item) {
          item.requester = input.value.trim() || "";
          saveWorkInstructions();
          renderMainWorkList();
          refreshEfficiencyUI();
        }
      });
      input.addEventListener("blur", function () {
        var id = input.dataset.id;
        var item = workInstructionsData.find(function (w) { return w.id === id; });
        if (item) {
          item.requester = input.value.trim() || "";
          saveWorkInstructions();
          renderMainWorkList();
          refreshEfficiencyUI();
        }
      });
    });
  }

  function openWorkModal() {
    if (modalWork) {
      modalWork.hidden = false;
      renderWorkModalList();
    }
  }

  function closeWorkModal() {
    if (modalWork) modalWork.hidden = true;
  }

  renderMainWorkList();

  if (workConfirmBtn) workConfirmBtn.addEventListener("click", openWorkModal);
  if (modalWorkClose) modalWorkClose.addEventListener("click", closeWorkModal);
  if (modalWorkCancel) modalWorkCancel.addEventListener("click", closeWorkModal);
  if (modalWorkConfirm) modalWorkConfirm.addEventListener("click", closeWorkModal);
  if (modalWork) {
    modalWork.addEventListener("click", function (e) {
      if (e.target === modalWork) closeWorkModal();
    });
  }

  // ---------- 좌측 스케줄 달력 ----------
  var calendarTitleEl = document.getElementById("calendar-title");
  var calendarDaysEl = document.getElementById("calendar-days");
  var calendarPrevBtn = document.getElementById("calendar-prev");
  var calendarNextBtn = document.getElementById("calendar-next");

  var calendarCurrent = new Date();
  calendarCurrent.setDate(1);
  var todayForCalendar = new Date();
  var calendarSelectedDate = todayForCalendar.getFullYear() + "-" + String(todayForCalendar.getMonth() + 1).padStart(2, "0") + "-" + String(todayForCalendar.getDate()).padStart(2, "0");
  var calendarEventsEl = document.getElementById("calendar-events");
  var CALENDAR_EVENTS_KEY = "ai-groupware-calendar-events";
  var calendarEvents = (function () {
    try {
      var s = localStorage.getItem(CALENDAR_EVENTS_KEY);
      if (s) {
        var parsed = JSON.parse(s);
        normalizeCalendarEvents(parsed);
        return parsed;
      }
    } catch (e) {}
    var today = new Date();
    var key = function (dt) {
      var yy = dt.getFullYear(), mm = dt.getMonth(), dd = dt.getDate();
      return yy + "-" + String(mm + 1).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
    };
    var d0 = new Date(today.getTime());
    var d1 = new Date(today.getTime()); d1.setDate(d1.getDate() + 1);
    var d2 = new Date(today.getTime()); d2.setDate(d2.getDate() + 2);
    return {
      [key(d0)]: [{ startTime: "09:00", endTime: "10:00", title: "팀 주간 회의" }, { startTime: "14:00", endTime: "15:00", title: "클라이언트 미팅" }],
      [key(d1)]: [{ startTime: "10:30", endTime: "11:30", title: "업무 결재 검토" }],
      [key(d2)]: [{ startTime: "11:00", endTime: "12:00", title: "교육 세션" }, { startTime: "15:00", endTime: "16:00", title: "1:1 면담" }]
    };
  })();
  function normalizeCalendarEvents(eventsMap) {
    Object.keys(eventsMap || {}).forEach(function (dateKey) {
      (eventsMap[dateKey] || []).forEach(function (ev) {
        if (ev.startTime === undefined) ev.startTime = ev.time || "00:00";
        if (ev.endTime === undefined) ev.endTime = ev.time || "01:00";
      });
    });
  }
  function saveCalendarEvents() {
    try { localStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(calendarEvents)); } catch (e) {}
  }
  function dateKey(y, m, d) {
    return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  function renderCalendarEvents(dateStr) {
    if (!calendarEventsEl) return;
    if (!dateStr) {
      calendarEventsEl.innerHTML = "";
      calendarEventsEl.hidden = true;
      return;
    }
    var list = calendarEvents[dateStr];
    if (!list || list.length === 0) {
      calendarEventsEl.innerHTML = "<p class=\"calendar-events-empty\">등록된 일정이 없습니다.</p>";
      calendarEventsEl.hidden = false;
      return;
    }
    var start = function (ev) { return ev.startTime || ev.time || ""; };
    var withIndex = (calendarEvents[dateStr] || []).map(function (ev, idx) { return { ev: ev, idx: idx }; });
    withIndex.sort(function (a, b) { return start(a.ev).localeCompare(start(b.ev)); });
    calendarEventsEl.innerHTML = "<ul class=\"calendar-events-list\">" +
      withIndex.map(function (item) {
        var ev = item.ev;
        var s = ev.startTime || ev.time || "", e = ev.endTime || s;
        var timeStr = s + "~" + e;
        var att = ev.attendees && ev.attendees.length ? " <span class=\"calendar-event-attendees\">(" + escapeHtml(ev.attendees.join(", ")) + ")</span>" : "";
        return "<li class=\"calendar-event-item\" data-date=\"" + escapeHtml(dateStr) + "\" data-event-index=\"" + item.idx + "\" tabindex=\"0\"><span class=\"calendar-event-time\">" + escapeHtml(timeStr) + "</span> " + escapeHtml(ev.title || "") + att + "</li>";
      }).join("") +
      "</ul>";
    calendarEventsEl.hidden = false;
  }
  function selectCalendarDate(dateStr) {
    calendarSelectedDate = dateStr;
    renderCalendarEvents(dateStr);
  }
  var calendarEventSelectedMembers = [];
  function fillCalendarEventTimeSelects() {
    var hourOpts = [];
    for (var h = 0; h < 24; h++) hourOpts.push("<option value=\"" + (h < 10 ? "0" + h : "" + h) + "\">" + (h < 10 ? "0" + h : "" + h) + "</option>");
    var minOpts = ["00", "10", "20", "30", "40", "50"].map(function (m) { return "<option value=\"" + m + "\">" + m + "</option>"; });
    var startHour = document.getElementById("calendar-event-start-hour");
    var startMin = document.getElementById("calendar-event-start-minute");
    var endHour = document.getElementById("calendar-event-end-hour");
    var endMin = document.getElementById("calendar-event-end-minute");
    if (startHour && !startHour.options.length) {
      startHour.innerHTML = hourOpts.join("");
      if (startMin) startMin.innerHTML = minOpts.join("");
      if (endHour) endHour.innerHTML = hourOpts.join("");
      if (endMin) endMin.innerHTML = minOpts.join("");
    }
  }
  function getCalendarEventTimeFromSelects(prefix) {
    var h = document.getElementById("calendar-event-" + prefix + "-hour");
    var m = document.getElementById("calendar-event-" + prefix + "-minute");
    var hour = (h && h.value) || "09";
    var min = (m && m.value) || "00";
    return (hour.length === 1 ? "0" + hour : hour) + ":" + (min.length === 1 ? "0" + min : min);
  }
  function syncEndTimeFromStart() {
    var sh = document.getElementById("calendar-event-start-hour");
    var sm = document.getElementById("calendar-event-start-minute");
    var eh = document.getElementById("calendar-event-end-hour");
    var em = document.getElementById("calendar-event-end-minute");
    if (!sh || !sm || !eh || !em) return;
    var h = parseInt(sh.value, 10) || 0;
    var m = (sm.value || "00");
    h = (h + 1) % 24;
    var endHour = h < 10 ? "0" + h : "" + h;
    eh.value = endHour;
    em.value = m;
  }
  function setCalendarEventTimeSelects(startHHmm, endHHmm) {
    var parse = function (s) {
      var parts = (s || "09:00").split(":");
      return { hour: parts[0] || "09", minute: (parts[1] !== undefined ? (parts[1].length === 1 ? "0" + parts[1] : parts[1]) : "00").replace(/\D/g, "").slice(0, 2) };
    };
    var roundMin = function (m) {
      var n = parseInt(m, 10) || 0;
      if (n <= 5) return "00";
      if (n <= 15) return "10";
      if (n <= 25) return "20";
      if (n <= 35) return "30";
      if (n <= 45) return "40";
      return "50";
    };
    var s = parse(startHHmm);
    s.minute = roundMin(s.minute);
    var e = parse(endHHmm);
    e.minute = roundMin(e.minute);
    var sh = document.getElementById("calendar-event-start-hour");
    var sm = document.getElementById("calendar-event-start-minute");
    var eh = document.getElementById("calendar-event-end-hour");
    var em = document.getElementById("calendar-event-end-minute");
    if (sh) sh.value = s.hour.length === 1 ? "0" + s.hour : s.hour;
    if (sm) sm.value = s.minute;
    if (eh) eh.value = e.hour.length === 1 ? "0" + e.hour : e.hour;
    if (em) em.value = e.minute;
  }
  function setCalendarEventModalMode(isEdit) {
    var titleEl = document.getElementById("modal-calendar-event-title");
    var saveBtn = document.querySelector("#modal-calendar-event-save");
    var updateBtn = document.getElementById("modal-calendar-event-update");
    var deleteBtn = document.getElementById("modal-calendar-event-delete");
    if (titleEl) titleEl.textContent = isEdit ? "일정 수정" : "일정 등록";
    if (saveBtn) saveBtn.style.display = isEdit ? "none" : "";
    if (updateBtn) updateBtn.style.display = isEdit ? "" : "none";
    if (deleteBtn) deleteBtn.style.display = isEdit ? "" : "none";
  }
  function openCalendarEventModal(dateStr, eventIndex) {
    var modal = document.getElementById("modal-calendar-event");
    var dateDisplay = document.getElementById("calendar-event-date-display");
    var dateValue = document.getElementById("calendar-event-date-value");
    var editIndexInput = document.getElementById("calendar-event-edit-index");
    if (!modal || !dateDisplay || !dateValue) return;
    var parts = dateStr.split("-");
    if (parts.length !== 3) return;
    fillCalendarEventTimeSelects();
    dateValue.value = dateStr;
    dateDisplay.textContent = parts[0] + "년 " + parseInt(parts[1], 10) + "월 " + parseInt(parts[2], 10) + "일";
    var isEdit = eventIndex != null && eventIndex >= 0 && calendarEvents[dateStr] && calendarEvents[dateStr][eventIndex];
    if (editIndexInput) editIndexInput.value = isEdit ? String(eventIndex) : "-1";
    setCalendarEventModalMode(!!isEdit);
    if (isEdit) {
      var ev = calendarEvents[dateStr][eventIndex];
      setCalendarEventTimeSelects(ev.startTime || ev.time || "09:00", ev.endTime || "10:00");
      document.getElementById("calendar-event-title").value = ev.title || "";
      calendarEventSelectedMembers = (ev.attendees && ev.attendees.length) ? ev.attendees.slice() : [];
      var membersDisplay = document.getElementById("calendar-event-members-display");
      if (membersDisplay) membersDisplay.textContent = calendarEventSelectedMembers.length ? calendarEventSelectedMembers.join(", ") : "선택된 인원 없음";
    } else {
      setCalendarEventTimeSelects("09:00", "10:00");
      document.getElementById("calendar-event-title").value = "";
      calendarEventSelectedMembers = [];
      var membersDisplay = document.getElementById("calendar-event-members-display");
      if (membersDisplay) membersDisplay.textContent = "선택된 인원 없음";
    }
    modal.hidden = false;
  }
  function closeCalendarEventModal() {
    var modal = document.getElementById("modal-calendar-event");
    if (modal) modal.hidden = true;
  }
  function saveCalendarEventFromModal() {
    var dateStr = document.getElementById("calendar-event-date-value").value;
    var startTime = getCalendarEventTimeFromSelects("start");
    var endTime = getCalendarEventTimeFromSelects("end");
    var title = (document.getElementById("calendar-event-title") || {}).value.trim();
    if (!dateStr) return;
    if (!title) { alert("일정 제목을 입력해주세요."); return; }
    if (!calendarEvents[dateStr]) calendarEvents[dateStr] = [];
    calendarEvents[dateStr].push({
      startTime: startTime,
      endTime: endTime,
      title: title,
      attendees: calendarEventSelectedMembers && calendarEventSelectedMembers.length ? calendarEventSelectedMembers.slice() : []
    });
    saveCalendarEvents();
    calendarSelectedDate = dateStr;
    renderCalendarEvents(dateStr);
    closeCalendarEventModal();
  }
  function updateCalendarEventFromModal() {
    var dateStr = document.getElementById("calendar-event-date-value").value;
    var editIndexInput = document.getElementById("calendar-event-edit-index");
    var eventIndex = editIndexInput ? parseInt(editIndexInput.value, 10) : -1;
    if (!dateStr || eventIndex < 0 || !calendarEvents[dateStr] || !calendarEvents[dateStr][eventIndex]) return;
    var title = (document.getElementById("calendar-event-title") || {}).value.trim();
    if (!title) { alert("일정 제목을 입력해주세요."); return; }
    calendarEvents[dateStr][eventIndex] = {
      startTime: getCalendarEventTimeFromSelects("start"),
      endTime: getCalendarEventTimeFromSelects("end"),
      title: title,
      attendees: calendarEventSelectedMembers && calendarEventSelectedMembers.length ? calendarEventSelectedMembers.slice() : []
    };
    saveCalendarEvents();
    calendarSelectedDate = dateStr;
    renderCalendarEvents(dateStr);
    closeCalendarEventModal();
  }
  function deleteCalendarEventFromModal() {
    var dateStr = document.getElementById("calendar-event-date-value").value;
    var editIndexInput = document.getElementById("calendar-event-edit-index");
    var eventIndex = editIndexInput ? parseInt(editIndexInput.value, 10) : -1;
    if (!dateStr || eventIndex < 0 || !calendarEvents[dateStr] || !calendarEvents[dateStr][eventIndex]) return;
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    calendarEvents[dateStr].splice(eventIndex, 1);
    saveCalendarEvents();
    calendarSelectedDate = dateStr;
    renderCalendarEvents(dateStr);
    closeCalendarEventModal();
  }

  function renderCalendar() {
    if (!calendarTitleEl || !calendarDaysEl) return;
    var y = calendarCurrent.getFullYear();
    var m = calendarCurrent.getMonth();
    calendarTitleEl.textContent = y + "년 " + (m + 1) + "월";

    var first = new Date(y, m, 1);
    var last = new Date(y, m + 1, 0);
    var firstDay = first.getDay();
    var lastDate = last.getDate();
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var cells = [];
    var startEmpty = firstDay;
    var prevMonth = new Date(y, m, 0);
    var prevLastDate = prevMonth.getDate();
    var prevY = prevMonth.getFullYear(), prevM = prevMonth.getMonth();
    for (var i = 0; i < startEmpty; i++) {
      var d = prevLastDate - startEmpty + 1 + i;
      cells.push({ day: d, other: true, dateKey: dateKey(prevY, prevM, d) });
    }
    for (var d = 1; d <= lastDate; d++) {
      cells.push({ day: d, other: false, dateKey: dateKey(y, m, d) });
    }
    var remaining = 42 - cells.length;
    var nextMonth = new Date(y, m + 2, 0);
    var nextY = nextMonth.getFullYear(), nextM = nextMonth.getMonth();
    for (var i = 0; i < remaining; i++) {
      cells.push({ day: i + 1, other: true, dateKey: dateKey(nextY, nextM, i + 1) });
    }

    calendarDaysEl.innerHTML = "";
    cells.forEach(function (cell, index) {
      var span = document.createElement("span");
      span.className = "day-cell";
      if (cell.other) span.classList.add("other-month");
      var dayOfWeek = index % 7;
      if (dayOfWeek === 0 || dayOfWeek === 6) span.classList.add("weekend");
      if (!cell.other && y === today.getFullYear() && m === today.getMonth() && cell.day === today.getDate()) {
        span.classList.add("today");
      }
      if (calendarSelectedDate === cell.dateKey) span.classList.add("selected");
      span.dataset.date = cell.dateKey;
      span.textContent = cell.day;
      span.addEventListener("click", function () {
        var dateStr = this.dataset.date;
        selectCalendarDate(dateStr);
        document.querySelectorAll(".sidebar-calendar-days .day-cell.selected").forEach(function (c) { c.classList.remove("selected"); });
        this.classList.add("selected");
        openCalendarEventModal(dateStr);
      });
      calendarDaysEl.appendChild(span);
    });
  }

  if (calendarPrevBtn) {
    calendarPrevBtn.addEventListener("click", function () {
      calendarCurrent.setMonth(calendarCurrent.getMonth() - 1);
      renderCalendar();
    });
  }
  if (calendarNextBtn) {
    calendarNextBtn.addEventListener("click", function () {
      calendarCurrent.setMonth(calendarCurrent.getMonth() + 1);
      renderCalendar();
    });
  }
  renderCalendar();
  renderCalendarEvents(calendarSelectedDate);

  (function () {
    var modal = document.getElementById("modal-calendar-event");
    var btnClose = document.getElementById("modal-calendar-event-close");
    var btnCancel = document.getElementById("modal-calendar-event-cancel");
    var btnSave = document.getElementById("modal-calendar-event-save");
    var btnUpdate = document.getElementById("modal-calendar-event-update");
    var btnDelete = document.getElementById("modal-calendar-event-delete");
    var startHourSel = document.getElementById("calendar-event-start-hour");
    var startMinSel = document.getElementById("calendar-event-start-minute");
    if (btnClose) btnClose.addEventListener("click", closeCalendarEventModal);
    if (btnCancel) btnCancel.addEventListener("click", closeCalendarEventModal);
    if (btnSave) btnSave.addEventListener("click", saveCalendarEventFromModal);
    if (btnUpdate) btnUpdate.addEventListener("click", updateCalendarEventFromModal);
    if (btnDelete) btnDelete.addEventListener("click", deleteCalendarEventFromModal);
    if (startHourSel) startHourSel.addEventListener("change", syncEndTimeFromStart);
    if (startMinSel) startMinSel.addEventListener("change", syncEndTimeFromStart);
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeCalendarEventModal();
      });
    }
    if (calendarEventsEl) {
      calendarEventsEl.addEventListener("click", function (e) {
        var li = e.target.closest(".calendar-event-item");
        if (!li) return;
        var dateStr = li.getAttribute("data-date");
        var idx = li.getAttribute("data-event-index");
        if (dateStr != null && idx != null) openCalendarEventModal(dateStr, parseInt(idx, 10));
      });
    }
  })();

  // ---------- 우측 메신저 ----------
  var messengerPanel = document.querySelector(".sidebar-right");
  var btnMessengerToggle = document.getElementById("btn-messenger-toggle");
  var chatRoomTitle = document.getElementById("chat-room-title");
  var chatMessages = document.getElementById("chat-messages");
  var chatInput = document.getElementById("chat-input");
  var chatSend = document.getElementById("chat-send");

  if (btnMessengerToggle) {
    btnMessengerToggle.addEventListener("click", function () {
      messengerPanel.classList.toggle("collapsed");
      this.title = messengerPanel.classList.contains("collapsed") ? "패널 펼치기" : "패널 접기";
      this.textContent = messengerPanel.classList.contains("collapsed") ? "▶" : "◀";
    });
  }

  var messengerListEl = document.getElementById("messenger-list");
  var currentRoomId = "team";

  var defaultChatHistory = {
    team: [
      { sender: "김철수", text: "오늘 오후 3시 회의 잡을까요?", time: "14:20", isSelf: false },
      { sender: "나", text: "네, 괜찮습니다.", time: "14:22", isSelf: true },
      { sender: "이영희", text: "안녕하세요, 오늘 회의 자료 공유드립니다.", time: "14:25", isSelf: false },
    ],
    user2: [
      { sender: "김철수", text: "전표 확인 부탁드립니다", time: "14:10", isSelf: false },
    ],
    user3: [
      { sender: "이영희", text: "결재 승인해 주세요", time: "14:15", isSelf: false },
    ],
  };
  var chatHistory = JSON.parse(localStorage.getItem("ai-groupware-chat-history") || "{}");
  ["team", "user2", "user3"].forEach(function (rid) {
    if (!chatHistory[rid]) chatHistory[rid] = defaultChatHistory[rid].slice();
  });

  function saveChatHistory() {
    localStorage.setItem("ai-groupware-chat-history", JSON.stringify(chatHistory));
  }

  function renderChatMessages(roomId) {
    if (!chatMessages) return;
    chatMessages.innerHTML = "";
    var list = chatHistory[roomId];
    if (!list) list = [];
    if (list.length === 0) {
      var placeholder = document.createElement("div");
      placeholder.className = "chat-placeholder";
      placeholder.textContent = "새로운 채팅입니다. 내용을 입력해주세요";
      chatMessages.appendChild(placeholder);
      return;
    }
    list.forEach(function (m) {
      var div = document.createElement("div");
      div.className = m.isSelf ? "chat-msg self" : "chat-msg other";
      div.innerHTML =
        "<span class=\"msg-sender\">" + escapeHtml(m.sender) + "</span>" +
        "<span class=\"msg-text\">" + escapeHtml(m.text) + "</span>" +
        "<span class=\"msg-time\">" + escapeHtml(m.time) + "</span>";
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  var chatRoomCountEl = document.getElementById("chat-room-count");
  function selectMessengerRoom(roomEl) {
    if (!roomEl) return;
    var roomId = roomEl.dataset.room;
    if (!roomId) return;
    currentRoomId = roomId;
      document.querySelectorAll(".messenger-room").forEach(function (r) {
        r.classList.remove("active");
      });
    roomEl.classList.add("active");
    var name = roomEl.querySelector(".room-name");
    var participants = roomEl.dataset.participants || "0";
      if (name && chatRoomTitle) chatRoomTitle.textContent = name.textContent;
    if (chatRoomCountEl) chatRoomCountEl.textContent = "나 포함 " + participants + "명";
    renderChatMessages(currentRoomId);
  }
  if (messengerListEl) {
    messengerListEl.addEventListener("click", function (e) {
      var room = e.target.closest(".messenger-room");
      if (room) selectMessengerRoom(room);
    });
  }
  renderChatMessages(currentRoomId);

  // ---------- 조직도 (전체 인원 리스트 + 채팅 생성) ----------
  var orgMembers = [
    { id: "org-1", name: "대표", role: "대표" },
    { id: "org-2", name: "김민철", role: "과장" },
    { id: "org-3", name: "김철수", role: "팀장" },
    { id: "org-4", name: "이영희", role: "대리" },
    { id: "org-5", name: "박지훈", role: "사원" },
    { id: "org-6", name: "최수진", role: "대리" },
    { id: "org-7", name: "정대호", role: "사원" },
    { id: "org-8", name: "한소희", role: "사원" },
    { id: "org-9", name: "윤서준", role: "대리" },
    { id: "org-10", name: "임도현", role: "사원" },
  ];
  var modalOrg = document.getElementById("modal-org");
  var modalOrgClose = document.getElementById("modal-org-close");
  var modalOrgCancel = document.getElementById("modal-org-cancel");
  var orgMemberListEl = document.getElementById("org-member-list");
  var orgCreateGroupBtn = document.getElementById("org-create-group-btn");
  var orgModalDescEl = document.getElementById("org-modal-desc");
  var btnMessengerOrg = document.getElementById("btn-messenger-org");
  var orgModalContext = "messenger";
  var ORG_MODAL_DESC_MESSENGER = "채팅에 초대할 인원을 체크한 뒤 '채팅 생성'을 누르세요. 체크한 인원 모두가 채팅방에 초대됩니다.";
  var ORG_MODAL_DESC_CALENDAR = "일정에 반영할 인원을 체크한 뒤 '선택 완료'를 누르세요.";

  function renderOrgList() {
    if (!orgMemberListEl) return;
    orgMemberListEl.innerHTML = "";
    orgMembers.forEach(function (m) {
      var li = document.createElement("li");
      li.innerHTML =
        '<input type="checkbox" class="org-member-cb" id="' + m.id + '" data-id="' + m.id + '" data-name="' + escapeHtml(m.name) + '">' +
        '<label for="' + m.id + '" class="org-member-name">' + escapeHtml(m.name) + '</label>' +
        '<span class="org-member-role">' + escapeHtml(m.role || "") + "</span>";
      orgMemberListEl.appendChild(li);
    });
  }

  function openOrgModal(fromCalendarEvent) {
    if (modalOrg) {
      orgModalContext = fromCalendarEvent ? "calendarEvent" : "messenger";
      renderOrgList();
      if (orgModalContext === "calendarEvent") {
        if (orgModalDescEl) orgModalDescEl.textContent = ORG_MODAL_DESC_CALENDAR;
        if (orgCreateGroupBtn) orgCreateGroupBtn.textContent = "선택 완료";
        if (typeof calendarEventSelectedMembers !== "undefined" && calendarEventSelectedMembers.length) {
          orgMemberListEl.querySelectorAll(".org-member-cb").forEach(function (cb) {
            if (calendarEventSelectedMembers.indexOf(cb.dataset.name) !== -1) cb.checked = true;
          });
        }
      } else {
        if (orgModalDescEl) orgModalDescEl.textContent = ORG_MODAL_DESC_MESSENGER;
        if (orgCreateGroupBtn) orgCreateGroupBtn.textContent = "채팅 생성";
      }
      modalOrg.hidden = false;
    }
  }

  function closeOrgModal() {
    if (modalOrg) modalOrg.hidden = true;
    if (orgModalDescEl) orgModalDescEl.textContent = ORG_MODAL_DESC_MESSENGER;
    if (orgCreateGroupBtn) orgCreateGroupBtn.textContent = "채팅 생성";
    orgModalContext = "messenger";
  }

  function confirmOrgSelectionForCalendarEvent() {
    var checked = orgMemberListEl.querySelectorAll(".org-member-cb:checked");
    var names = Array.prototype.map.call(checked, function (cb) { return cb.dataset.name; });
    if (typeof calendarEventSelectedMembers !== "undefined") calendarEventSelectedMembers = names;
    var displayEl = document.getElementById("calendar-event-members-display");
    if (displayEl) displayEl.textContent = names.length ? names.join(", ") : "선택된 인원 없음";
    closeOrgModal();
    orgMemberListEl.querySelectorAll(".org-member-cb:checked").forEach(function (cb) { cb.checked = false; });
  }

  function createGroupChat() {
    var checked = orgMemberListEl.querySelectorAll(".org-member-cb:checked");
    if (checked.length === 0) return;
    var names = Array.prototype.map.call(checked, function (cb) {
      return cb.dataset.name;
    });
    var roomName = names.length <= 3 ? names.join(", ") : names.slice(0, 2).join(", ") + " 외 " + (names.length - 2) + "명";
    var roomId = "group-" + Date.now();
    var firstChar = names[0] ? names[0].charAt(0) : "G";
    var roomEl = document.createElement("div");
    var participantCount = names.length + 1;
    roomEl.className = "messenger-room";
    roomEl.dataset.room = roomId;
    roomEl.dataset.participants = participantCount;
    roomEl.innerHTML =
      '<span class="room-avatar">' + firstChar + "</span>" +
      '<div class="room-info">' +
      '<span class="room-name">' + escapeHtml(roomName) + "</span>" +
      '<span class="room-preview">채팅방이 생성되었습니다. 체크한 인원이 초대되었습니다.</span>' +
      "</div>";
    if (!chatHistory[roomId]) chatHistory[roomId] = [];
    saveChatHistory();
    messengerListEl.insertBefore(roomEl, messengerListEl.firstChild);
    selectMessengerRoom(roomEl);
    closeOrgModal();
    orgMemberListEl.querySelectorAll(".org-member-cb:checked").forEach(function (cb) {
      cb.checked = false;
    });
  }

  if (btnMessengerOrg) btnMessengerOrg.addEventListener("click", function () { openOrgModal(false); });
  if (modalOrgClose) modalOrgClose.addEventListener("click", closeOrgModal);
  if (modalOrgCancel) modalOrgCancel.addEventListener("click", closeOrgModal);
  if (orgCreateGroupBtn) {
    orgCreateGroupBtn.addEventListener("click", function () {
      if (orgModalContext === "calendarEvent") {
        confirmOrgSelectionForCalendarEvent();
      } else {
        createGroupChat();
      }
    });
  }
  var calendarEventOrgBtn = document.getElementById("calendar-event-org-btn");
  if (calendarEventOrgBtn) calendarEventOrgBtn.addEventListener("click", function () { openOrgModal(true); });
  if (modalOrg) {
    modalOrg.addEventListener("click", function (e) {
      if (e.target === modalOrg) closeOrgModal();
    });
  }

  function sendMessage() {
    var text = (chatInput && chatInput.value.trim()) || "";
    if (!text) return;
    var timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    if (!chatHistory[currentRoomId]) chatHistory[currentRoomId] = [];
    chatHistory[currentRoomId].push({ sender: "나", text: text, time: timeStr, isSelf: true });
    saveChatHistory();
    renderChatMessages(currentRoomId);
    chatInput.value = "";
  }
  if (chatSend) chatSend.addEventListener("click", sendMessage);
  if (chatInput) {
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // ---------- Slack Inbox / Asana My Tasks 효율 UI ----------
  function collectFocusItems() {
    var items = [];
    workInstructionsData.forEach(function (w) {
      if (w.done) return;
      items.push({
        id: w.id,
        kind: "work",
        text: w.text,
        type: w.type,
        dueDate: w.dueDate || "",
        assignee: w.assignee || "",
        done: !!w.done,
      });
    });
    todoData.forEach(function (t) {
      if (t.done) return;
      items.push({
        id: t.id,
        kind: "todo",
        text: t.text,
        type: "normal",
        dueDate: t.dueDate || "",
        assignee: t.assignee || CURRENT_USER,
        done: !!t.done,
      });
    });
    return items;
  }

  function filterFocusItems(items, focus) {
    return items.filter(function (item) {
      if (!matchesSearch(item.text, uiState.searchQuery)) return false;
      if (focus === "urgent") return item.kind === "work" && item.type === "urgent";
      if (focus === "today") return dueState(item.dueDate) === "today";
      if (focus === "overdue") return dueState(item.dueDate) === "overdue";
      if (focus === "mine") return !item.assignee || item.assignee === CURRENT_USER;
      return true;
    }).sort(function (a, b) {
      var rank = function (it) {
        var s = dueState(it.dueDate);
        if (it.type === "urgent") return 0;
        if (s === "overdue") return 1;
        if (s === "today") return 2;
        return 3;
      };
      var ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return String(a.dueDate).localeCompare(String(b.dueDate));
    });
  }

  function refreshEfficiencyUI() {
    var all = collectFocusItems();
    var urgentCount = all.filter(function (i) { return i.kind === "work" && i.type === "urgent"; }).length;
    var todayCount = all.filter(function (i) { return dueState(i.dueDate) === "today"; }).length;
    var overdueCount = all.filter(function (i) { return dueState(i.dueDate) === "overdue"; }).length;
    var inboxCount = urgentCount + todayCount + overdueCount;

    var elUrgent = document.getElementById("focus-urgent-count");
    var elToday = document.getElementById("focus-today-count");
    var elOverdue = document.getElementById("focus-overdue-count");
    var elInbox = document.getElementById("inbox-count");
    if (elUrgent) elUrgent.textContent = String(urgentCount);
    if (elToday) elToday.textContent = String(todayCount);
    if (elOverdue) elOverdue.textContent = String(overdueCount);
    if (elInbox) elInbox.textContent = String(inboxCount);

    var listEl = document.getElementById("today-focus-list");
    if (!listEl) return;
    var filtered = filterFocusItems(all, uiState.focusFilter).slice(0, 8);
    listEl.innerHTML = "";
    if (filtered.length === 0) {
      listEl.innerHTML = '<li class="today-focus-empty">처리할 항목이 없습니다. 잘하고 있어요.</li>';
      return;
    }
    filtered.forEach(function (item) {
      var li = document.createElement("li");
      var state = dueState(item.dueDate);
      li.className = "today-focus-item" + (item.done ? " is-done" : "");
      li.dataset.id = item.id;
      li.dataset.kind = item.kind;
      var kindLabel = item.kind === "work" ? "요청" : "할일";
      var kindClass = "today-focus-kind is-" + item.kind + (item.type === "urgent" ? " urgent" : "");
      var metaClass = "today-focus-meta" + (state ? " is-" + state : "");
      li.innerHTML =
        '<span class="' + kindClass + '">' + kindLabel + "</span>" +
        '<span class="today-focus-text">' + escapeHtml(item.text) + "</span>" +
        '<span class="' + metaClass + '">' + escapeHtml(formatDueDisplay(item.dueDate)) + "</span>" +
        '<button type="button" class="agent-queue-action focus-complete-btn" data-id="' + item.id + '" data-kind="' + item.kind + '">완료</button>';
      listEl.appendChild(li);
    });
    listEl.querySelectorAll(".focus-complete-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        var kind = btn.dataset.kind;
        if (kind === "work") {
          var w = workInstructionsData.find(function (x) { return x.id === id; });
          if (w) w.done = true;
          saveWorkInstructions();
          renderMainWorkList();
        } else {
          var t = todoData.find(function (x) { return x.id === id; });
          if (t) t.done = true;
          saveTodos();
          renderMainTodoList();
        }
        refreshEfficiencyUI();
      });
    });
    listEl.querySelectorAll(".today-focus-item").forEach(function (row) {
      row.addEventListener("click", function (e) {
        if (e.target.closest(".focus-complete-btn")) return;
        if (row.dataset.kind === "work") {
          var section = document.querySelector(".work-instructions");
          if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          var todoSec = document.querySelector(".todo-section");
          if (todoSec) todoSec.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  function addTodoQuick() {
    var text = (todoQuickInput && todoQuickInput.value.trim()) || "";
    if (!text) {
      if (todoQuickInput) todoQuickInput.focus();
      return;
    }
    todoData.unshift({
      id: "todo-" + Date.now(),
      text: text,
      done: false,
      dueDate: (todoQuickDate && todoQuickDate.value) || todayIso(),
      assignee: CURRENT_USER,
    });
    saveTodos();
    if (todoQuickInput) todoQuickInput.value = "";
    renderMainTodoList();
    refreshEfficiencyUI();
  }
  if (todoQuickAddBtn) todoQuickAddBtn.addEventListener("click", addTodoQuick);
  if (todoQuickInput) {
    todoQuickInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addTodoQuick();
      }
    });
  }
  if (todoQuickDate && !todoQuickDate.value) todoQuickDate.value = todayIso();

  var workFilterTabs = document.getElementById("work-filter-tabs");
  if (workFilterTabs) {
    workFilterTabs.querySelectorAll(".list-filter-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        workFilterTabs.querySelectorAll(".list-filter-tab").forEach(function (t) { t.classList.remove("is-active"); });
        tab.classList.add("is-active");
        uiState.workFilter = tab.dataset.filter || "open";
        renderMainWorkList();
      });
    });
  }

  var focusChips = document.getElementById("today-focus-chips");
  if (focusChips) {
    focusChips.querySelectorAll(".focus-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        focusChips.querySelectorAll(".focus-chip").forEach(function (c) { c.classList.remove("is-active"); });
        chip.classList.add("is-active");
        uiState.focusFilter = chip.dataset.focus || "all";
        refreshEfficiencyUI();
      });
    });
  }

  var globalSearch = document.getElementById("global-search");
  if (globalSearch) {
    globalSearch.addEventListener("input", function () {
      uiState.searchQuery = globalSearch.value.trim();
      renderMainWorkList();
      renderMainTodoList();
      refreshEfficiencyUI();
    });
  }

  var inboxBtn = document.getElementById("btn-focus-inbox");
  if (inboxBtn) {
    inboxBtn.addEventListener("click", function () {
      var focus = document.getElementById("today-focus");
      if (focusChips) {
        focusChips.querySelectorAll(".focus-chip").forEach(function (c) { c.classList.remove("is-active"); });
        var overdueChip = focusChips.querySelector('[data-focus="overdue"]');
        var todayChip = focusChips.querySelector('[data-focus="today"]');
        var target = (document.getElementById("focus-overdue-count") && Number(document.getElementById("focus-overdue-count").textContent) > 0)
          ? overdueChip
          : todayChip;
        if (target) {
          target.classList.add("is-active");
          uiState.focusFilter = target.dataset.focus || "today";
        } else {
          uiState.focusFilter = "all";
        }
        refreshEfficiencyUI();
      }
      if (focus) focus.scrollIntoView({ behavior: "smooth", block: "start" });
      inboxBtn.classList.add("is-active");
      setTimeout(function () { inboxBtn.classList.remove("is-active"); }, 800);
    });
  }

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable);
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay:not([hidden])").forEach(function (m) { m.hidden = true; });
      return;
    }
    if (typing) return;
    if (e.key === "/") {
      e.preventDefault();
      if (globalSearch) globalSearch.focus();
    } else if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      if (todoQuickInput) todoQuickInput.focus();
    }
  });

  renderMainWorkList();
  renderMainTodoList();
  refreshEfficiencyUI();
})();
