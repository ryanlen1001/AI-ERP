import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "프로젝트 - AI 그룹웨어",
};

export default function ProjectAgentPage() {
  return (
    <div className="agent-shell">
      <header className="agent-shell-header">
        <h1 className="agent-shell-title">프로젝트</h1>
        <Link href="/" className="agent-shell-home">
          홈으로 돌아가기
        </Link>
      </header>
      <main className="agent-shell-body">
        <p className="agent-shell-desc">
          프로젝트·영업 관리는 통합 화면에서 다룹니다. 아래 버튼으로 이동하세요.
        </p>
        <Link href="/agents/sales" className="agent-shell-home" style={{ display: "inline-block" }}>
          프로젝트 관리로 이동
        </Link>
      </main>
    </div>
  );
}
