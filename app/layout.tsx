import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles.css";
import "../agent.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "AI 그룹웨어 - 메인",
  description: "AI 그룹웨어 메인 화면",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
