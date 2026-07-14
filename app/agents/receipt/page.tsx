import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "전표관리 - AI 그룹웨어",
};

const QUEUE = [
  { id: "r1", title: "스타벅스 회의비 영수증", status: "urgent", meta: "미분류 · 오늘", action: "분류" },
  { id: "r2", title: "사무용품 구매 (다이소)", status: "wait", meta: "승인대기 · +1일", action: "요청" },
  { id: "r3", title: "택시비 (고객 미팅)", status: "wait", meta: "증빙필요 · +1일", action: "첨부" },
  { id: "r4", title: "클라우드 구독료", status: "normal", meta: "정기 · +5일", action: "확인" },
] as const;

export default function ReceiptAgentPage() {
  return (
    <div className="agent-shell">
      <header className="agent-shell-header">
        <h1 className="agent-shell-title">전표관리</h1>
        <Link href="/" className="agent-shell-home">
          홈으로 돌아가기
        </Link>
      </header>
      <main className="agent-shell-body">
        <p className="agent-shell-desc">
          오늘 처리할 전표·영수증만 모아둔 대기열입니다. 분류 → 승인요청 순으로 빠르게 처리하세요.
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
