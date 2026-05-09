// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// 💡 步驟二：匯入 Vercel Analytics 元件
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] })

// 💡 網站轉發與 SEO 核心設定區
export const metadata: Metadata = {
  title: 'PETERPENN POON | 潘少君',
  description: '40年商業攝影底蘊 × 10載藝術紀實探索。以「攝影眼」洞見黑白光影的極致美學。',
  keywords: ['潘少君', 'Peterpenn Poon', '攝影', '黑白攝影', '攝影眼', '藝術紀實', '商業攝影', 'Photography'],
  metadataBase: new URL('https://peterpenn.com'),
  
  // 💡 設定網站圖示 (Favicon & iPhone Logo)
  icons: {
    icon: '/favicon.png',          // 瀏覽器分頁圖示
    shortcut: '/favicon.png',      // 捷徑圖示
    apple: '/logo.png',            // iPhone / iOS 桌面圖示 (Apple Touch Icon)
  },

  openGraph: {
    title: 'PETERPENN POON | 潘少君',
    description: '40年商業攝影底蘊 × 10載藝術紀實探索。以「攝影眼」洞見黑白光影的極致美學。',
    url: 'https://peterpenn.com',
    siteName: 'PETERPENN POON Gallery',
    images: [
      {
        url: '/logo.png', 
        width: 1024,
        height: 1024,
        alt: 'PETERPENN POON 攝影作品',
      },
    ],
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PETERPENN POON | 潘少君',
    description: '以「攝影眼」洞見黑白光影的極致美學。',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" className="scroll-smooth">
      <body className={inter.className}>
        {/* 這裡是網站的主要內容 */}
        {children}
        
        {/* 💡 步驟三：將分析器放在 body 的最後面，這樣就能追蹤全站流量了 */}
        <Analytics />
      </body>
    </html>
  )
}
