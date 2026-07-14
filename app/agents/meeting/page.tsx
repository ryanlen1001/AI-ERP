"use client";

import Link from "next/link";

const MOCK_MEETING_LIST = [
  { id: "m1", title: "Q2 제안서 검토 회의", customerName: "(주)테크솔루션", date: "2025-03-10" },
  { id: "m2", title: "3월 정기 점검 일정 협의", customerName: "글로벌트레이드", date: "2025-03-01" },
];

export default function MeetingAgentPage() {
  return (
    <div className="agent-page">
      <header className="agent-page-header">
        <h1 className="agent-page-title">회의록</h1>
        <Link href="/" className="agent-page-home-btn">
          홈으로 돌아가기
        </Link>
      </header>
      <main className="agent-page-body">
        <section className="meeting-list-section">
          <h2 className="meeting-list-title">회의 목록</h2>
          <div className="meeting-list">
            {MOCK_MEETING_LIST.map((m) => (
              <Link key={m.id} href={`/agents/meeting/${m.id}`} className="meeting-list-item">
                <div className="meeting-list-item-title">{m.title}</div>
                <div className="meeting-list-item-meta">
                  {m.customerName} · {m.date}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
