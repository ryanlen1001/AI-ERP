"use client";

import Script from "next/script";
import Link from "next/link";

const AGENTS = [
  { id: "meeting", icon: "📋", title: "회의록", desc: "회의록 정리, 요약, 액션 아이템 추출" },
  { id: "receipt", icon: "🧾", title: "전표관리", desc: "전표·지출 분류, 영수증 인식·정리" },
  { id: "approval", icon: "✓", title: "업무결재", desc: "결재 요청·승인·이력 조회" },
  { id: "sales", icon: "📊", title: "프로젝트 관리", desc: "영업 기회·고객·계약 관리" },
  { id: "finance", icon: "💰", title: "재무관리", desc: "예산·결산·재무 보고" },
  { id: "document", icon: "📄", title: "문서관리", desc: "문서 등록·검색·버전 관리" },
] as const;

const DEFAULT_WORK_INSTRUCTIONS = [
  { id: "w1", text: "주간 정기회의록 요약 및 액션 아이템 정리", type: "urgent" as const, dueDate: "2025-03-15", done: false, requester: "대표" },
  { id: "w2", text: "미처리 전표 분류 및 승인 요청", type: "urgent" as const, dueDate: "2025-03-16", done: false, requester: "김철수" },
  { id: "w3", text: "결재 대기 건 검토 및 승인/반려 처리", type: "normal" as const, dueDate: "2025-03-19", done: false, requester: "이영희" },
  { id: "w4", text: "고객 히스토리 최근 업데이트 내역 확인", type: "normal" as const, dueDate: "2025-03-21", done: false, requester: "박지훈" },
  { id: "w5", text: "팀 내부 메신저 미확인 메시지 확인", type: "normal" as const, dueDate: "2025-03-17", done: false, requester: "최수진" },
];

const DEFAULT_TODOS = [
  { id: "todo-1", text: "회의록 초안 작성", done: false, dueDate: "" },
  { id: "todo-2", text: "전표 검수 및 제출", done: false, dueDate: "" },
  { id: "todo-3", text: "결재 요청서 검토", done: false, dueDate: "" },
  { id: "todo-4", text: "고객사 자료 정리", done: false, dueDate: "" },
  { id: "todo-5", text: "주간 보고서 제출", done: false, dueDate: "" },
];

function formatWorkDue(dateStr: string) {
  if (!dateStr) return "";
  const part = dateStr.split("-");
  if (part.length >= 3) return `${parseInt(part[1], 10)}.${part[2]}`;
  return dateStr;
}

export default function MainPage() {
  return (
    <>
      <div className="app">
        <aside className="sidebar sidebar-left">
          <div className="brand">
            <span className="brand-logo">Ryanlen</span>
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-label">내 정보</span>
            <div className="sidebar-user-row">
              <span className="sidebar-user-name">김민철 과장</span>
              <button type="button" className="sidebar-user-btn" id="btn-account-settings" title="내 계정 관리">계정관리</button>
              <button type="button" className="sidebar-user-btn sidebar-user-btn-logout" id="btn-logout" title="로그아웃">로그아웃</button>
            </div>
          </div>
          <div className="sidebar-calendar">
            <div className="sidebar-calendar-header">
              <button type="button" className="sidebar-calendar-prev" id="calendar-prev" title="이전 달">‹</button>
              <span className="sidebar-calendar-title" id="calendar-title"></span>
              <button type="button" className="sidebar-calendar-next" id="calendar-next" title="다음 달">›</button>
            </div>
            <div className="sidebar-calendar-weekdays">
              <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
            </div>
            <div className="sidebar-calendar-days" id="calendar-days"></div>
            <div className="sidebar-calendar-events" id="calendar-events"></div>
          </div>
        </aside>

        <main className="main">
          <header className="main-header">
            <div className="header-left">
              <span className="header-ssid">SSID: OFFICE-LAN-5G</span>
              <div className="header-search-wrap">
                <input type="search" className="header-search" id="global-search" placeholder="업무·할 일 검색  (/)" autoComplete="off" aria-label="검색" />
              </div>
            </div>
            <div className="header-right">
              <button type="button" className="header-inbox-btn" id="btn-focus-inbox" title="오늘 처리할 일 보기">
                인박스 <span className="header-inbox-count" id="inbox-count">0</span>
              </button>
              <span className="header-secure"><span className="secure-icon"></span> 보안 연결됨(에어갭 모드)</span>
            </div>
          </header>
          <div className="main-content">
            <section className="today-focus" id="today-focus" aria-label="오늘 포커스">
              <div className="today-focus-head">
                <h2 className="today-focus-title">오늘 포커스</h2>
                <span className="today-focus-hint">오늘·긴급·기한지남을 한곳에</span>
              </div>
              <div className="today-focus-chips" id="today-focus-chips" role="tablist">
                <button type="button" className="focus-chip is-active" data-focus="all">전체</button>
                <button type="button" className="focus-chip" data-focus="urgent">긴급 <span id="focus-urgent-count">0</span></button>
                <button type="button" className="focus-chip" data-focus="today">오늘 마감 <span id="focus-today-count">0</span></button>
                <button type="button" className="focus-chip" data-focus="overdue">기한 지남 <span id="focus-overdue-count">0</span></button>
                <button type="button" className="focus-chip" data-focus="mine">내 담당</button>
              </div>
              <ul className="today-focus-list" id="today-focus-list"></ul>
            </section>
            <div className="main-top-row">
              <section className="work-instructions">
                <div className="work-instructions-header">
                  <h2 className="work-instructions-title">업무 요청사항</h2>
                  <div className="work-header-actions">
                    <div className="list-filter-tabs" id="work-filter-tabs" role="tablist">
                      <button type="button" className="list-filter-tab is-active" data-filter="open">미완료</button>
                      <button type="button" className="list-filter-tab" data-filter="urgent">긴급</button>
                      <button type="button" className="list-filter-tab" data-filter="today">오늘</button>
                    </div>
                    <button type="button" className="work-instructions-confirm-btn" id="work-instructions-confirm-btn">확인</button>
                  </div>
                </div>
                <div className="work-instructions-list-header work-instructions-grid-cols">
                  <span className="work-instructions-h-num">번호</span>
                  <span className="work-instructions-h-type">유형</span>
                  <span className="work-instructions-h-text">요청내용</span>
                  <span className="work-instructions-h-date">처리목표일</span>
                  <span className="work-instructions-h-requester">요청자</span>
                </div>
                <ul className="work-instructions-list" id="work-instructions-list">
                  {DEFAULT_WORK_INSTRUCTIONS.filter((item) => !item.done).map((item, idx) => (
                    <li key={item.id} className="work-instructions-item work-instructions-grid-cols" data-id={item.id}>
                      <span className="work-instructions-num">{idx + 1}</span>
                      <span className={`work-instructions-type ${item.type}`}>{item.type === "urgent" ? "긴급" : "일반"}</span>
                      <span className="work-instructions-text">{item.text}</span>
                      <span className="work-instructions-date">{formatWorkDue(item.dueDate)}</span>
                      <span className="work-instructions-requester">{item.requester || "—"}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="todo-section">
                <div className="todo-header-row">
                  <h2 className="todo-title">To-do</h2>
                  <button type="button" className="todo-manage-btn" id="todo-manage-btn">관리</button>
                </div>
                <div className="todo-quick-add">
                  <input type="text" className="todo-quick-input" id="todo-quick-input" placeholder="할 일 빠른 추가 (Enter)" maxLength={50} aria-label="할 일 빠른 추가" />
                  <input type="date" className="todo-quick-date" id="todo-quick-date" title="목표일" />
                  <button type="button" className="todo-quick-add-btn" id="todo-quick-add-btn">추가</button>
                </div>
                <div className="todo-list-header todo-grid-cols">
                  <span className="todo-list-h-check">선택</span>
                  <span className="todo-list-h-label">할 일 내용</span>
                  <span className="todo-list-h-due">목표일</span>
                </div>
                <div className="todo-list-wrap">
                  <ul className="todo-list" id="todo-list">
                    {DEFAULT_TODOS.map((item) => (
                      <li key={item.id} className="todo-item todo-grid-cols" data-id={item.id}>
                        <span className="todo-item-check-cell">
                          <input type="checkbox" className="todo-check" id={item.id} defaultChecked={item.done} />
                        </span>
                        <label htmlFor={item.id} className="todo-label">{item.text}</label>
                        <span className="todo-item-due-cell">{item.dueDate || "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
            <section className="agent-cards" id="agent-cards">
              {AGENTS.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="agent-card"
                  data-agent={agent.id}
                >
                  <div className="agent-card-icon">{agent.icon}</div>
                  <h3 className="agent-card-title">{agent.title}</h3>
                  <p className="agent-card-desc">{agent.desc}</p>
                </Link>
              ))}
            </section>
          </div>
        </main>

        <aside className="sidebar sidebar-right messenger-panel">
          <div className="messenger-header">
            <h2 className="messenger-title">팀 내부 메신저</h2>
            <button type="button" className="messenger-org-btn" id="btn-messenger-org" title="조직도">조직도</button>
            <button type="button" className="messenger-toggle" id="btn-messenger-toggle" title="패널 접기">◀</button>
          </div>
          <div className="messenger-list" id="messenger-list">
            <div className="messenger-room active" data-room="team" data-participants="10">
              <span className="room-avatar">T</span>
              <div className="room-info">
                <span className="room-name">전체 팀</span>
                <span className="room-preview">안녕하세요, 오늘 회의...</span>
              </div>
              <span className="room-badge">3</span>
            </div>
            <div className="messenger-room" data-room="user2" data-participants="2">
              <span className="room-avatar">김</span>
              <div className="room-info">
                <span className="room-name">김철수</span>
                <span className="room-preview">전표 확인 부탁드립니다</span>
              </div>
            </div>
            <div className="messenger-room" data-room="user3" data-participants="2">
              <span className="room-avatar">이</span>
              <div className="room-info">
                <span className="room-name">이영희</span>
                <span className="room-preview">결재 승인해 주세요</span>
              </div>
              <span className="room-badge">1</span>
            </div>
          </div>
          <div className="messenger-chat" id="messenger-chat">
            <div className="chat-room-header">
              <span className="chat-room-title" id="chat-room-title">전체 팀</span>
              <span className="chat-room-count" id="chat-room-count">나 포함 10명</span>
            </div>
            <div className="chat-messages" id="chat-messages"></div>
            <div className="chat-input-wrap">
              <input type="text" className="chat-input" id="chat-input" placeholder="메시지를 입력하세요" />
              <button type="button" className="chat-send" id="chat-send">전송</button>
            </div>
          </div>
        </aside>
      </div>

      {/* 모달들: index.html과 동일한 마크업 유지하여 script.js 호환 */}
      <div className="modal-overlay" id="modal-work-instructions" hidden>
        <div className="modal todo-modal work-instructions-modal">
          <div className="modal-header">
            <h3>업무 요청사항 관리 (이용방법)</h3>
            <button type="button" className="modal-close" id="modal-work-instructions-close">&times;</button>
          </div>
          <div className="modal-body todo-modal-body">
            <div className="todo-modal-section">
              <label className="modal-label">전체 업무 요청사항 리스트</label>
              <p className="modal-desc">완료 체크, 처리 목표일, 요청자를 설정할 수 있습니다.</p>
              <ul className="todo-modal-list work-instructions-modal-list" id="work-instructions-modal-list"></ul>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" id="modal-work-instructions-cancel">취소</button>
            <button type="button" className="btn-primary" id="modal-work-instructions-confirm">확인</button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="modal-org" hidden>
        <div className="modal todo-modal org-modal">
          <div className="modal-header">
            <h3>조직도</h3>
            <button type="button" className="modal-close" id="modal-org-close">&times;</button>
          </div>
          <div className="modal-body todo-modal-body">
            <div className="todo-modal-section">
              <label className="modal-label">전체 조직 인원</label>
              <p className="modal-desc" id="org-modal-desc">채팅에 초대할 인원을 체크한 뒤 &apos;채팅 생성&apos;을 누르세요.</p>
              <ul className="org-member-list" id="org-member-list"></ul>
              <div className="org-modal-actions">
                <button type="button" className="btn-primary" id="org-create-group-btn">채팅 생성</button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" id="modal-org-cancel">취소</button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="modal-todo" hidden>
        <div className="modal todo-modal">
          <div className="modal-header">
            <h3>할 일 관리 (이용방법)</h3>
            <button type="button" className="modal-close" id="modal-todo-close">&times;</button>
          </div>
          <div className="modal-body todo-modal-body">
            <div className="todo-modal-section">
              <label className="modal-label">전체 할일 리스트</label>
              <div className="todo-modal-toolbar">
                <button type="button" className="todo-modal-select-all-btn" id="todo-modal-select-all-btn">전체선택</button>
                <button type="button" className="todo-modal-batch-del-btn" id="todo-modal-batch-del-btn">일괄삭제</button>
              </div>
              <ul className="todo-modal-list" id="todo-modal-list"></ul>
            </div>
            <div className="todo-modal-section">
              <label className="modal-label">할 일 추가 *</label>
              <div className="todo-modal-add-wrap">
                <input type="text" className="modal-input todo-modal-input" id="todo-modal-input" placeholder="할 일 내용" maxLength={50} />
                <input type="date" className="modal-input todo-modal-date-input" id="todo-modal-date" title="목표일자" />
                <button type="button" className="btn-primary todo-modal-add-btn" id="todo-modal-add-btn">추가</button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" id="modal-todo-cancel">취소</button>
            <button type="button" className="btn-primary" id="modal-todo-confirm">확인</button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="modal-calendar-event" hidden>
        <div className="modal">
          <div className="modal-header">
            <h3 id="modal-calendar-event-title">일정 등록</h3>
            <button type="button" className="modal-close" id="modal-calendar-event-close">&times;</button>
          </div>
          <input type="hidden" id="calendar-event-edit-index" value="-1" />
          <div className="modal-body">
            <label className="modal-label">날짜</label>
            <p className="calendar-event-date-display" id="calendar-event-date-display"></p>
            <input type="hidden" id="calendar-event-date-value" />
            <label className="modal-label">시작 시간</label>
            <div className="calendar-event-time-row">
              <select className="modal-select calendar-event-time-select" id="calendar-event-start-hour"></select>
              <span className="calendar-event-time-unit">시</span>
              <select className="modal-select calendar-event-time-select" id="calendar-event-start-minute"></select>
              <span className="calendar-event-time-unit">분</span>
            </div>
            <label className="modal-label">종료 시간</label>
            <div className="calendar-event-time-row">
              <select className="modal-select calendar-event-time-select" id="calendar-event-end-hour"></select>
              <span className="calendar-event-time-unit">시</span>
              <select className="modal-select calendar-event-time-select" id="calendar-event-end-minute"></select>
              <span className="calendar-event-time-unit">분</span>
            </div>
            <label className="modal-label">일정 제목</label>
            <input type="text" className="modal-input" id="calendar-event-title" placeholder="일정 내용을 입력하세요" maxLength={100} />
            <label className="modal-label">일정 반영 인원</label>
            <div className="calendar-event-members-row">
              <button type="button" className="btn-secondary" id="calendar-event-org-btn">조직도</button>
              <span className="calendar-event-members-display" id="calendar-event-members-display">선택된 인원 없음</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-danger calendar-event-mode-edit" id="modal-calendar-event-delete" style={{ display: "none" }}>삭제</button>
            <button type="button" className="btn-secondary" id="modal-calendar-event-cancel">취소</button>
            <button type="button" className="btn-primary calendar-event-mode-add" id="modal-calendar-event-save">저장</button>
            <button type="button" className="btn-primary calendar-event-mode-edit" id="modal-calendar-event-update" style={{ display: "none" }}>수정</button>
          </div>
        </div>
      </div>
      <Script src="/script.js" strategy="afterInteractive" />
    </>
  );
}
