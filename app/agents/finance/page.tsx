import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "재무관리 - AI 그룹웨어",
};

const QUEUE = [
  { id: "f1", title: "이번 달 예산 대비 지출 현황", status: "urgent", meta: "마케팅 · 82%", action: "보기" },
  { id: "f2", title: "미정산 법인카드 3건", status: "wait", meta: "마감 D-2", action: "정산" },
  { id: "f3", title: "주간 현금흐름 메모", status: "normal", meta: "금요일", action: "작성" },
] as const;

export default function FinanceAgentPage() {
  return (
    <div className="agent-shell">
      <header className="agent-shell-header">
        <h1 className="agent-shell-title">재무관리</h1>
        <Link href="/" className="agent-shell-home">
          홈으로 돌아가기
        </Link>
      </header>
      <main className="agent-shell-body">
        <p className="agent-shell-desc">
          10인 미만 팀용 간단 재무 체크리스트입니다. 예산·정산·현금흐름만 먼저 확인하세요.
        </p>
        <ul className="agent-queue-list">
          {QUEUE.map((item) => (
            <li key={item.id} className="agent-queue-item">
              <span className={`agent-queue-badge ${item.status}`}>
                {item.status === "urgent" ? "긴급" : item.status === "wait" ? "대기" : "일반"}
              </span>
              <span className="agent-queue-title">{item.title}</span>
              <span className="agent-queue-meta">{item.meta}</span>
              <button type="button" className="agent-queue-action">
                {item.action}
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
