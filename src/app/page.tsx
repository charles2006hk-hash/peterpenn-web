// src/app/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ChevronDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
  const [latestNews, setLatestNews] = useState<any>(null);
  const [profile, setProfile] = useState({ bio: "", imageUrl: "" });

  useEffect(() => {
    // 1. 從 Firestore 抓取「系統設置」中的個人簡介與頭像
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "profile"));
        if (snap.exists()) {
          setProfile(snap.data() as any);
        }
      } catch (error) {
        console.error("載入個人設定失敗:", error);
      }
    };

    // 2. 從 Firestore 抓取日期最新的一筆動態 (並過濾掉已封存的)
    const fetchLatestNews = async () => {
      try {
        const q = query(
          collection(db, "news"), 
          where("isArchived", "==", false), 
          orderBy("date", "desc"), 
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setLatestNews(snapshot.docs[0].data());
        }
      } catch (error) {
        console.error("載入最新動態失敗 (請確認 Firebase Console 是否提示需要建立索引):", error);
      }
    };

    fetchSettings();
    fetchLatestNews();
  }, []);

  return (
    <main className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-hidden">
      
      <div className="film-grain" />
      <div className="darkroom-light"><div className="w-[100vw] h-[100vw] bg-white/5 rounded-full blur-[120px] animate-breathe" /></div>
      <div className="vignette" />

      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-8 py-6 mix-blend-difference">
        <Link href="/admin" title="System Login">
          <h1 className="font-serif text-xl md:text-2xl tracking-widest uppercase hover:text-zinc-500 transition-colors duration-700 cursor-pointer">
            Peter Penn
          </h1>
        </Link>
        <nav className="space-x-8 text-xs md:text-sm tracking-widest hidden md:block">
          <Link href="#about" className="hover:text-gray-400 transition-colors">大師 (About)</Link>
          <Link href="/gallery" className="hover:text-gray-400 transition-colors">展廳 (Gallery)</Link>
          <Link href="/teachings" className="hover:text-gray-400 transition-colors">攝影眼 (Teachings)</Link>
          <Link href="/news" className="hover:text-gray-400 transition-colors">動態 (News)</Link>
        </nav>
      </header>

      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} className="mb-8 opacity-70">
          <Camera size={56} strokeWidth={1} />
        </motion.div>
        
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }} className="font-serif text-5xl md:text-8xl tracking-[0.2em] font-light mb-6 drop-shadow-2xl">
          潘少君
        </motion.h2>
        
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} className="text-gray-300 tracking-[0.15em] max-w-2xl leading-loose text-sm md:text-base mb-12">
          40年商業攝影底蘊 × 10載藝術紀實探索<br />
          以「攝影眼」洞見黑白光影的極致美學
        </motion.p>

        {/* 動態通知列聯動 (如果有資料才顯示) */}
        {latestNews && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.2 }}>
            <Link href="/news" className="group flex flex-col md:flex-row items-center gap-4 md:gap-6 border border-zinc-800/60 bg-zinc-900/20 backdrop-blur-sm px-6 py-3 hover:bg-zinc-800/40 hover:border-zinc-500 transition-all duration-700">
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <span className="text-[10px] tracking-[0.2em] uppercase">Latest</span>
              </div>
              <div className="w-[1px] h-4 bg-zinc-700 hidden md:block"></div>
              <span className="font-serif text-xs md:text-sm tracking-widest text-zinc-300 group-hover:text-white transition-colors">
                {latestNews.date.replace(/-/g, '.')} - {latestNews.title}
              </span>
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-white transition-colors hidden md:block" />
            </Link>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 2 }} className="absolute bottom-10 flex flex-col items-center animate-bounce cursor-pointer text-gray-600 hover:text-white transition-colors" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="text-[10px] tracking-widest uppercase mb-2">Scroll</span>
          <ChevronDown size={20} strokeWidth={1} />
        </motion.div>
      </section>

      {/* 關於大師 (與後台 Settings 聯動) */}
      <section id="about" className="relative z-10 min-h-screen flex items-center px-8 md:px-24 py-20 bg-gradient-to-b from-transparent to-zinc-950/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 1 }} className="w-full md:w-1/2 aspect-[3/4] relative bg-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden group">
            {profile.imageUrl ? (
              <Image 
                src={profile.imageUrl} 
                alt="Peter Penn" 
                fill 
                className="object-cover grayscale hover:grayscale-0 transition-all duration-1000" 
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-sm tracking-widest border border-zinc-800">
                [此處置放 潘老師 形象照]
              </div>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 1 }} className="w-full md:w-1/2 space-y-8 font-serif leading-loose">
            <h3 className="text-3xl tracking-[0.1em]">Equipment is secondary,<br/>vision is primary.</h3>
            
            {/* 使用 whitespace-pre-wrap 完美呈現後台輸入的換行符號 */}
            <div className="text-gray-400 space-y-6 text-sm tracking-wide text-justify whitespace-pre-wrap">
              {profile.bio || (
                <>
                  <p>從事商業攝影逾四十載，專精於珠寶首飾的光影雕琢。近年，潘少君 (Peter Penn) 將鏡頭轉向世界，足跡遍及歐亞，深入探索旅遊與藝術攝影。</p>
                  <p>他在 DCFever 的「雋美黑白」專欄中提倡，拍攝黑白並非門檻高，而是需要透過欣賞與潛移默化，培養出獨特的「攝影眼」。不依賴器材的華麗，而是回歸光影與本質的對話。</p>
                </>
              )}
            </div>
            
            <div className="pt-4">
              <Link href="/gallery" className="inline-flex items-center gap-4 border-b border-zinc-700 pb-2 hover:border-white hover:gap-6 transition-all duration-500 text-sm tracking-widest text-zinc-300">
                進入線上展廳 <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 text-center py-10 text-[10px] text-zinc-600 tracking-[0.2em] uppercase bg-zinc-950 flex justify-center items-center border-t border-zinc-900/50">
        <span>© {new Date().getFullYear()} Peter Penn. Crafted with Vision</span>
      </footer>
    </main>
  );
}