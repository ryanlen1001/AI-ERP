import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "문서관리 - AI 그룹웨어",
};

const QUEUE = [
  { id: "d1", title: "Q2 제안서 초안.docx", status: "urgent", meta: "오늘 공유", action: "열기" },
  { id: "d2", title: "고객사 NDA 템플릿", status: "wait", meta: "검토 요청", action: "검토" },
  { id: "d3", title: "온보딩 체크리스트", status: "normal", meta: "공통", action: "열기" },
  { id: "d4", title: "주간 회의록 3/10", status: "normal", meta: "아카이브", action: "열기" },
] as const;

export default function DocumentAgentPage() {
  return (
    <div className="agent-shell">
      <header className="agent-shell-header">
        <h1 className="agent-shell-title">문서관리</h1>
        <Link href="/" className="agent-shell-home">
          홈으로 돌아가기
        </Link>
      </header>
      <main className="agent-shell-body">
        <p className="agent-shell-desc">
          최근·우선 문서를 한곳에 모았습니다. 소규모 팀은 폴더보다 &apos;지금 필요한 문서&apos;부터 열어보세요.
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
