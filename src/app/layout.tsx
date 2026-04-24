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
  openGraph: {
    title: 'PETERPENN POON | 潘少君',
    description: '40年商業攝影底蘊 × 10載藝術紀實探索。以「攝影眼」洞見黑白光影的極致美學。',
    url: 'https://peterpenn.com',
    siteName: 'PETERPENN POON Gallery',
    images: [
      {
        // 💡 稍後你可以挑選一張最具代表性的照片，命名為 og-image.jpg，放進專案的 public 資料夾裡
        url: '/og-image.jpg', 
        width: 1200,
        height: 630,
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
    images: ['/og-image.jpg'],
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
