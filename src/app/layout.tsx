import type { Metadata } from "next";

import "./globals.css";

const siteUrl = process.env.APP_ORIGIN ?? "https://maple-resume.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "메력부 | 메이플 파티 구직용 캐릭터 이력서",
    template: "%s | 메력부",
  },
  description: "출처와 기준 시각을 확인할 수 있는 파티 구직 메력서를 만드세요.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "메력부",
    title: "메력부 | 한 장으로 증명하는 파티 구직 메력서",
    description: "출처와 기준 시각을 확인할 수 있는 파티 구직 메력서를 만드세요.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "다크 민트 톤의 메력부 캐릭터 프로필 일러스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "메력부 | 한 장으로 증명하는 파티 구직 메력서",
    description: "출처와 기준 시각을 확인할 수 있는 파티 구직 메력서를 만드세요.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-[#070b11] text-slate-50 antialiased">{children}</body>
    </html>
  );
}
