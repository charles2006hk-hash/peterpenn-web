// src/app/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronDown, ArrowRight, Menu, X, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
  const [latestNews, setLatestNews] = useState<any>(null);
  const [latestTeaching, setLatestTeaching] = useState<any>(null); // 💡 新增：最新教學
  const [profile, setProfile] = useState({ bio: "載入大師簡介中...", imageUrl: "" });
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [activeNotifIndex, setActiveNotifIndex] = useState(0); // 💡 控制輪播索引

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "profile"));
        if (snap.exists() && snap.data().bio) setProfile(snap.data() as any);
      } catch (error) { console.error(error); }
    };

    const fetchLatestContent = async () => {
      try {
        // 抓最新動態
        const qNews = query(collection(db, "news"), orderBy("date", "desc"), limit(5));
        const snapNews = await getDocs(qNews);
        const activeNews = snapNews.docs.map(d => d.data()).find(n => !n.isArchived);
        if (activeNews) setLatestNews(activeNews);

        // 💡 抓最新教學
        const qTeach = query(collection(db, "teachings"), where("isArchived", "==", false), orderBy("createdAt", "desc"), limit(1));
        const snapTeach = await getDocs(qTeach);
        if (!snapTeach.empty) setLatestTeaching(snapTeach.docs[0].data());

      } catch (error) { console.error("載入最新內容失敗:", error); }
    };

    fetchSettings();
    fetchLatestContent();
  }, []);

  // 💡 建立輪播通知陣列
  const notifications = useMemo(() => {
    const arr = [];
    if (latestNews) arr.push({ type: 'news', label: 'LATEST', text: `${latestNews.date.replace(/-/g, '.')} - ${latestNews.title}`, link: '/news' });
    if (latestTeaching) arr.push({ type: 'teaching', label: 'NEW RELEASE', text: latestTeaching.title, link: '/teachings' });
    return arr;
  }, [latestNews, latestTeaching]);

  // 💡 每 4 秒自動切換通知
  useEffect(() => {
    if (notifications.length > 1) {
      const timer = setInterval(() => {
        setActiveNotifIndex((prev) => (prev + 1) % notifications.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [notifications.length]);

  return (
    <main className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-hidden">
      <div className="film-grain" />
      <div className="darkroom-light"><div className="w-[100vw] h-[100vw] bg-white/5 rounded-full blur-[120px] animate-breathe" /></div>
      <div className="vignette" />

      {/* 導航列 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 md:px-8 py-6 mix-blend-difference">
        <Link href="/admin" title="System Login" className="z-50">
          <h1 className="font-serif text-lg md:text-2xl tracking-[0.2em] uppercase hover:text-zinc-500 transition-colors duration-700">
            PETERPENN POON
          </h1>
        </Link>
        <nav className="space-x-8 text-xs md:text-sm tracking-widest hidden md:block">
          <Link href="#about" className="hover:text-gray-400 transition-colors">大師 (About)</Link>
          <Link href="/gallery" className="hover:text-gray-400 transition-colors">展廳 (Gallery)</Link>
          <Link href="/teachings" className="hover:text-gray-400 transition-colors">攝影眼 (Teachings)</Link>
          <Link href="/news" className="hover:text-gray-400 transition-colors">動態 (News)</Link>
          <Link href="#contact" className="hover:text-gray-400 transition-colors">聯絡 (Contact)</Link>
        </nav>
        <button className="md:hidden z-50 p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 z-40 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center space-y-8 font-serif text-xl tracking-[0.3em] uppercase">
            <Link href="#about" onClick={() => setIsMenuOpen(false)} className="hover:text-zinc-500 transition-colors">大師 About</Link>
            <Link href="/gallery" onClick={() => setIsMenuOpen(false)} className="hover:text-zinc-500 transition-colors">展廳 Gallery</Link>
            <Link href="/teachings" onClick={() => setIsMenuOpen(false)} className="hover:text-zinc-500 transition-colors">攝影眼 Teachings</Link>
            <Link href="/news" onClick={() => setIsMenuOpen(false)} className="hover:text-zinc-500 transition-colors">動態 News</Link>
            <Link href="#contact" onClick={() => setIsMenuOpen(false)} className="hover:text-zinc-500 transition-colors text-zinc-400">指導 Contact</Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 首屏 Hero */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} className="mb-8 opacity-70">
          <Camera size={48} strokeWidth={1} className="md:w-14 md:h-14" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }} className="font-serif text-4xl md:text-8xl tracking-[0.2em] font-light mb-6 drop-shadow-2xl">
          潘少君
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} className="text-gray-300 tracking-[0.15em] max-w-2xl leading-loose text-xs md:text-base mb-12">
          40年商業攝影底蘊 × 10載藝術紀實探索<br />
          以「攝影眼」洞見黑白光影的極致美學
        </motion.p>

        {/* 💡 會呼吸的動態輪播按鈕 */}
        <div className="h-16 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {notifications.length > 0 && (
              <motion.div 
                key={activeNotifIndex} // Key 改變會觸發重繪動畫
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
              >
                <Link href={notifications[activeNotifIndex].link} className="group flex flex-col md:flex-row items-center gap-3 md:gap-6 border border-zinc-800/60 bg-zinc-900/20 backdrop-blur-sm px-6 py-3 hover:bg-zinc-800/40 hover:border-zinc-500 transition-all duration-700">
                  <div className="flex items-center gap-3 text-zinc-400">
                    {/* 依照類型變換指示燈顏色 */}
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${notifications[activeNotifIndex].type === 'news' ? 'bg-white' : 'bg-amber-500'}`}></span>
                    <span className={`text-[10px] tracking-[0.2em] uppercase ${notifications[activeNotifIndex].type === 'teaching' && 'text-amber-500'}`}>
                      {notifications[activeNotifIndex].label}
                    </span>
                  </div>
                  <div className="w-[1px] h-4 bg-zinc-700 hidden md:block"></div>
                  <span className="font-serif text-xs md:text-sm tracking-widest text-zinc-300 group-hover:text-white transition-colors max-w-[200px] md:max-w-md truncate">
                    {notifications[activeNotifIndex].text}
                  </span>
                  <ArrowRight size={14} className="text-zinc-600 group-hover:text-white transition-colors hidden md:block" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 2 }} className="absolute bottom-10 flex flex-col items-center animate-bounce cursor-pointer text-gray-600 hover:text-white transition-colors" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
          <ChevronDown size={20} strokeWidth={1} />
        </motion.div>
      </section>

      {/* === 關於大師 === */}
      <section id="about" className="relative z-10 min-h-screen flex items-center px-6 md:px-24 py-20 bg-gradient-to-b from-transparent to-zinc-950/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="w-full md:w-1/2 aspect-[3/4] relative bg-zinc-900 shadow-2xl overflow-hidden">
            {profile.imageUrl && <Image src={profile.imageUrl} alt="PETERPENN POON" fill className="object-cover grayscale hover:grayscale-0 transition-all duration-1000" />}
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="w-full md:w-1/2 space-y-8 font-serif leading-loose">
            <h3 className="text-2xl md:text-3xl tracking-[0.1em]">Equipment is secondary,<br/>vision is primary.</h3>
            <div className="text-gray-400 space-y-6 text-sm tracking-wide text-justify whitespace-pre-wrap">
              {profile.bio}
            </div>
            <div className="pt-4 flex gap-6">
              <Link href="/gallery" className="inline-flex items-center gap-4 border-b border-zinc-700 pb-2 hover:border-white hover:gap-6 transition-all duration-500 text-xs md:text-sm tracking-widest text-zinc-300">
                進入線上展廳 <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* === 指導與聯絡表單 (Contact) === */}
      <section id="contact" className="relative z-10 py-32 px-6 bg-black flex flex-col items-center border-t border-zinc-900">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl w-full text-center">
          <Mail size={32} className="mx-auto mb-6 opacity-30" strokeWidth={1} />
          <h2 className="font-serif text-3xl md:text-4xl tracking-[0.2em] mb-6">個人攝影指導與合作</h2>
          <p className="text-zinc-500 text-sm tracking-widest leading-loose mb-12 font-serif text-justify md:text-center">
            無論是探討黑白光影的心法，或是希望獲得潘老師 1-on-1 的個人攝影眼指導、作品點評與商業合作，歡迎透過下方表單或直接寄信聯繫。
          </p>
          
          <form action="https://api.web3forms.com/submit" method="POST" className="space-y-6 text-left">
            <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE" />
            <input type="hidden" name="subject" value="來自 PETERPENN POON 官網的新訊息" />
            <input type="hidden" name="redirect" value="https://peterpenn.com" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-zinc-500 mb-2 uppercase">您的稱呼 (Name)</label>
                <input type="text" name="name" required className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-sm outline-none focus:border-zinc-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-zinc-500 mb-2 uppercase">電子信箱 (Email)</label>
                <input type="email" name="email" required className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-sm outline-none focus:border-zinc-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] text-zinc-500 mb-2 uppercase">詢問內容 (Message)</label>
              <textarea name="message" rows={5} required className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-sm outline-none focus:border-zinc-500 transition-colors" placeholder="請簡述您的攝影經歷或希望獲得指導的方向..."></textarea>
            </div>
            <button type="submit" className="w-full bg-white text-black py-4 font-serif tracking-widest text-sm hover:bg-zinc-300 transition-colors uppercase">
              傳送訊息 Send Message
            </button>
          </form>
        </motion.div>
      </section>

      <footer className="relative z-10 text-center py-10 text-[10px] text-zinc-600 tracking-[0.2em] uppercase bg-zinc-950 border-t border-zinc-900/50">
        <span>© {new Date().getFullYear()} PETERPENN POON. Crafted with Vision</span>
      </footer>
    </main>
  );
}
