// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

// 網頁全域 SEO 設定
export const metadata: Metadata = {
  title: "Peter Penn 潘少君 | 官方網站與線上展廳",
  description: "從事商業攝影逾四十載，專精珠寶首飾的光影雕琢。潘少君 (Peter Penn) 提倡不依賴器材，回歸光影本質，以獨特的「攝影眼」洞見黑白光影的極致美學。",
  keywords: ["Peter Penn", "潘少君", "香港攝影大師", "黑白攝影", "攝影眼", "紀實攝影", "珠寶攝影", "DCFever", "Sigma"],
  authors: [{ name: "Peter Penn" }],
  openGraph: {
    title: "Peter Penn 潘少君 | 攝影眼與黑白美學",
    description: "40年商業攝影底蘊 × 10載藝術紀實探索。探索潘少君老師的線上展廳與最新講座動態。",
    url: "https://peterpenn.com", // 未來換成你的正式網址
    siteName: "Peter Penn Official Gallery",
    locale: "zh_HK",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      {/* 套用平滑滾動與暗色主題背景，避免載入閃爍 */}
      <body className="antialiased bg-black text-white">
        {children}
      </body>
    </html>
  );
}