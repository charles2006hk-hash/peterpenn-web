// src/app/teachings/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

// 模擬教學文章資料 (可替換為實際 DCFever 連結)
const articles = [
  { id: 1, title: "雋美黑白：攝影眼的培養與觀察", date: "2023.10", platform: "DCFever", link: "#" },
  { id: 2, title: "不依賴器材：回歸光影與本質的對話", date: "2023.05", platform: "DCFever", link: "#" },
  { id: 3, title: "暗房思維與現代 Lightroom 的對立與統一", date: "2022.11", platform: "Photography Magazine", link: "#" },
  { id: 4, title: "街頭紀實：如何在混亂中尋找秩序的切片", date: "2021.08", platform: "DCFever", link: "#" },
];

export default function TeachingsPage() {
  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black">
      <div className="film-grain" />
      <div className="vignette" />

      <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-8 py-6 mix-blend-difference">
        <Link href="/" className="flex items-center gap-2 hover:text-zinc-400 transition-colors font-serif tracking-widest text-sm uppercase">
          <ArrowLeft size={16} /> Home
        </Link>
        <h1 className="font-serif text-xs md:text-sm tracking-[0.3em] uppercase text-zinc-500">Teachings & Philosophy</h1>
      </header>

      <section className="relative z-10 pt-32 pb-20 px-6 max-w-4xl mx-auto min-h-screen flex flex-col justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <BookOpen size={32} className="mb-8 opacity-50 mx-auto" strokeWidth={1} />
          <h2 className="text-4xl md:text-5xl text-center mb-16 tracking-[0.2em] font-serif font-light">攝影眼 (The Eye)</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.3 }}
          className="space-y-10 text-zinc-400 leading-loose text-sm md:text-base tracking-widest font-serif text-justify border-l border-zinc-800 pl-8 mb-20"
        >
          <p>「攝影不只是按下快門，而是你如何看待這個世界。」</p>
          <p>拍攝黑白並非門檻高，而是需要透過欣賞與潛移默化，培養出獨特的「攝影眼」。抽離了色彩的干擾，我們被迫直視畫面的骨架：光影的切割、幾何的呼應、以及人物當下的情緒張力。</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6 }}>
          <h3 className="text-xl tracking-[0.2em] font-serif mb-8 border-b border-zinc-800 pb-4">精選專欄與教學</h3>
          <div className="flex flex-col gap-6">
            {articles.map((article, index) => (
              <a 
                key={article.id} 
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col md:flex-row md:items-center justify-between p-6 bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/50 transition-all duration-500 cursor-pointer"
              >
                <div className="font-serif">
                  <h4 className="text-lg text-zinc-200 tracking-widest group-hover:text-white transition-colors">{article.title}</h4>
                  <div className="text-xs text-zinc-500 tracking-widest mt-2 flex items-center gap-4">
                    <span>{article.date}</span>
                    <span className="uppercase border border-zinc-700 px-2 py-0.5">{article.platform}</span>
                  </div>
                </div>
                <ExternalLink size={18} className="text-zinc-600 group-hover:text-white transition-colors mt-4 md:mt-0" />
              </a>
            ))}
          </div>
        </motion.div>
      </section>
    </main>
  );
}