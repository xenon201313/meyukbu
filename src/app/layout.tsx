import type { Metadata } from "next";
import localFont from "next/font/local";

import { SiteWatermark } from "@/components/site-watermark";

import "./globals.css";

const nanumBarunGothic = localFont({
  src: [
    {
      path: "../../node_modules/webfont-nanum/nanumbarungothic/v1/NanumBarunGothic-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/webfont-nanum/nanumbarungothic/v1/NanumBarunGothic-Bold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-nanum-barun-gothic",
  display: "swap",
  fallback: ["Malgun Gothic", "Apple SD Gothic Neo", "sans-serif"],
});

const siteUrl = process.env.APP_ORIGIN ?? "https://maple-resume.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "메력서 | 메이플 파티 구직용 캐릭터 이력서",
    template: "%s | 메력서",
  },
  description: "출처와 기준 시각을 확인할 수 있는 파티 구직 메력서를 만드세요.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "메력서",
    title: "메력서 | 한 장으로 증명하는 파티 구직 메력서",
    description: "출처와 기준 시각을 확인할 수 있는 파티 구직 메력서를 만드세요.",
    images: [
      {
        url: "/og-maple-resume.png",
        width: 1200,
        height: 630,
        alt: "MAPLE-RESUME 문서철 일러스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "메력서 | 한 장으로 증명하는 파티 구직 메력서",
    description: "출처와 기준 시각을 확인할 수 있는 파티 구직 메력서를 만드세요.",
    images: ["/og-maple-resume.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`h-full ${nanumBarunGothic.variable}`}>
      <body className="min-h-full antialiased">
        {children}
        <SiteWatermark />
      </body>
    </html>
  );
}
