import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "업무결재 - AI 그룹웨어",
};

const QUEUE = [
  { id: "a1", title: "지출 결의서 (마케팅 광고비)", status: "urgent", meta: "이영희 · 오늘", action: "승인" },
  { id: "a2", title: "출장 여비 신청서", status: "wait", meta: "김철수 · +1일", action: "검토" },
  { id: "a3", title: "계약서 변경 요청", status: "wait", meta: "박지훈 · +2일", action: "검토" },
  { id: "a4", title: "법인카드 사용 내역 확인", status: "normal", meta: "최수진 · +3일", action: "확인" },
] as const;

export default function ApprovalAgentPage() {
  return (
    <div className="agent-shell">
      <header className="agent-shell-header">
        <h1 className="agent-shell-title">업무결재</h1>
        <Link href="/" className="agent-shell-home">
          홈으로 돌아가기
        </Link>
      </header>
      <main className="agent-shell-body">
        <p className="agent-shell-desc">
          소규모 팀용 대기열입니다. 긴급·대기 건만 모아 빠르게 승인/반려할 수 있습니다.
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
