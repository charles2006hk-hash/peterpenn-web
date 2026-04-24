// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
        // 💡 建議挑選一張作品命名為 logo.png 放入 public 資料夾
        url: '/logo.png', 
        width: 1200,
        height: 1200,
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
      <body className={inter.className}>{children}</body>
    </html>
  )
}
