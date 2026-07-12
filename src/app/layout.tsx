import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "메력부 | 메이플 파티 구직용 캐릭터 이력서",
  description: "출처와 기준 시각을 확인할 수 있는 파티 구직 메력서를 만드세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-[#fffdf8] text-stone-950 antialiased">{children}</body>
    </html>
  );
}
