"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

type ScriptLine = { speaker: string; timestamp: string; text: string };

const MOCK_MEETINGS: Record<
  string,
  {
    customerId: string;
    customerName: string;
    title: string;
    script: ScriptLine[];
    aiSummary: string;
    todos: { id: string; text: string; done: boolean }[];
  }
> = {
  m1: {
    customerId: "C-001",
    customerName: "(주)테크솔루션",
    title: "Q2 제안서 검토 회의",
    script: [
      { speaker: "직원 A", timestamp: "10:00", text: "안녕하세요. 오늘 Q2 제안서 검토 회의 진행하겠습니다." },
      { speaker: "고객 B", timestamp: "10:01", text: "네, 잘 부탁드립니다. 신규 모듈 도입 일정부터 논의해보죠." },
      { speaker: "직원 A", timestamp: "10:03", text: "4월 초 요구사항 정리본 공유 예정입니다. 예산 범위는 어느 정도로 생각하시나요?" },
      { speaker: "고객 B", timestamp: "10:05", text: "1억 2천만 원 내외로 검토 중입니다. 다음 주 내 제안서 초안 전달 부탁드립니다." },
      { speaker: "직원 A", timestamp: "10:07", text: "알겠습니다. 3월 15일까지 초안 제출하겠습니다." },
    ],
    aiSummary:
      "Q2 신규 모듈 도입 관련 일정·예산 범위 합의. 다음 주 내 제안서 초안 전달 예정. 예산 1억 2천만 원 내외 검토 중.",
    todos: [
      { id: "t1", text: "요구사항 정리본 4월 초 공유", done: false },
      { id: "t2", text: "제안서 초안 3/15까지 제출", done: false },
      { id: "t3", text: "예산 범위 최종 확정 검토", done: false },
    ],
  },
  m2: {
    customerId: "C-002",
    customerName: "글로벌트레이드",
    title: "3월 정기 점검 일정 협의",
    script: [
      { speaker: "직원 A", timestamp: "14:00", text: "3월 정기 점검 일정 협의하겠습니다." },
      { speaker: "고객 B", timestamp: "14:02", text: "3/20 방문 점검으로 확정하면 됩니다. 담당자 2명 동행 부탁드립니다." },
      { speaker: "직원 A", timestamp: "14:04", text: "네, 3/20 방문 점검 확정하겠습니다. 2명 동행 일정 잡겠습니다." },
    ],
    aiSummary: "3월 20일 정기 점검 일정 확정. 2명 동행.",
    todos: [
      { id: "t1", text: "3/20 방문 점검 일정 확정", done: true },
      { id: "t2", text: "동행 2명 일정 배정", done: false },
    ],
  },
};

export default function MeetingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const meeting = id ? MOCK_MEETINGS[id] ?? null : null;

  const [todos, setTodos] = useState(meeting?.todos ?? []);

  useEffect(() => {
    if (meeting?.todos) setTodos(meeting.todos);
  }, [id, meeting?.todos]);

  const toggleTodo = (todoId: string) => {
    setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)));
  };

  if (!meeting) {
    return (
      <div className="agent-page">
        <header className="agent-page-header">
          <h1 className="agent-page-title">회의록</h1>
          <Link href="/agents/meeting" className="agent-page-home-btn">
            목록으로
          </Link>
        </header>
        <main className="agent-page-body">
          <p className="meeting-detail-empty">회의를 찾을 수 없습니다.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="agent-page">
      <header className="agent-page-header">
        <div className="meeting-header-left">
          <h1 className="agent-page-title">회의록 상세</h1>
          <span className="meeting-customer-badge">
            {meeting.customerName} (ID: {meeting.customerId})
          </span>
        </div>
        <Link href="/agents/meeting" className="agent-page-home-btn">
          목록으로
        </Link>
      </header>
      <main className="meeting-detail-body">
        <div className="meeting-detail-layout">
          <section className="meeting-script-panel">
            <h2 className="meeting-panel-title">스크립트</h2>
            <div className="meeting-script-list">
              {meeting.script.map((line, i) => (
                <div
                  key={i}
                  className={`meeting-script-bubble ${line.speaker.includes("직원") ? "meeting-script-speaker-a" : "meeting-script-speaker-b"}`}
                >
                  <div className="meeting-script-meta">
                    <span className="meeting-script-timestamp">{line.timestamp}</span>
                    <span className="meeting-script-speaker">{line.speaker}</span>
                  </div>
                  <p className="meeting-script-text">{line.text}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="meeting-ai-panel">
            <div className="meeting-ai-section">
              <h2 className="meeting-panel-title">AI 핵심 요약</h2>
              <p className="meeting-ai-summary">{meeting.aiSummary}</p>
            </div>
            <div className="meeting-ai-section">
              <h2 className="meeting-panel-title">할 일 (To-do)</h2>
              <ul className="meeting-todo-list">
                {todos.map((todo) => (
                  <li key={todo.id} className="meeting-todo-item">
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => toggleTodo(todo.id)}
                      id={todo.id}
                    />
                    <label htmlFor={todo.id} className={todo.done ? "meeting-todo-done" : ""}>
                      {todo.text}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
