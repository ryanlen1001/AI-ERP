import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "프로젝트 관리 - AI 그룹웨어",
  description: "영업 기회·고객·계약 관리",
};

export default function SalesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
