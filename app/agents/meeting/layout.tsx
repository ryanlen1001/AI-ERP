import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회의록 - AI 그룹웨어",
  description: "회의록 정리, 요약, 액션 아이템 추출",
};

export default function MeetingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
