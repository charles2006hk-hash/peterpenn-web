// src/app/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronDown, ArrowRight, Menu, X, Mail, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
  const [latestNews, setLatestNews] = useState<any>(null);
  const [latestTeaching, setLatestTeaching] = useState<any>(null);
  const [profile, setProfile] = useState({ bio: "載入大師簡介中...", imageUrl: "" });
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [activeNotifIndex, setActiveNotifIndex] = useState(0); 

  // 💡 表單狀態控制
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "profile"));
        if (snap.exists() && snap.data().bio) setProfile(snap.data() as any);
      } catch (error) { console.error(error); }
    };

    const fetchLatestContent = async () => {
      try {
        const qNews = query(collection(db, "news"), orderBy("date", "desc"), limit(5));
        const snapNews = await getDocs(qNews);
        const activeNews = snapNews.docs.map(d => d.data()).find(n => !n.isArchived);
        if (activeNews) setLatestNews(activeNews);

        const qTeach = query(collection(db, "teachings"), where("isArchived", "==", false), orderBy("createdAt", "desc"), limit(1));
        const snapTeach = await getDocs(qTeach);
        if (!snapTeach.empty) setLatestTeaching(snapTeach.docs[0].data());
      } catch (error) { console.error("載入最新內容失敗:", error); }
    };

    fetchSettings();
    fetchLatestContent();
  }, []);

  const notifications = useMemo(() => {
    const arr = [];
    if (latestNews) arr.push({ type: 'news', label: 'LATEST', text: `${latestNews.date.replace(/-/g, '.')} - ${latestNews.title}`, link: '/news' });
    if (latestTeaching) arr.push({ type: 'teaching', label: 'NEW RELEASE', text: latestTeaching.title, link: '/teachings' });
    return arr;
  }, [latestNews, latestTeaching]);

  useEffect(() => {
    if (notifications.length > 1) {
      const timer = setInterval(() => {
        setActiveNotifIndex((prev) => (prev + 1) % notifications.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [notifications.length]);

  // 💡 升級版非同步 (AJAX) 表單傳送邏輯：使用 JSON 格式
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSuccess(false);

    // 1. 將表單資料轉換為 JSON 物件
    const formData = new FormData(e.currentTarget);
    const object = Object.fromEntries(formData.entries());
    const json = JSON.stringify(object);

    try {
      // 2. 加上標準的 Headers，確保 Web3Forms 伺服器順利接收
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: json
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsSuccess(true);
        e.currentTarget.reset(); // 清空表單
        // 5秒後恢復按鈕狀態
        setTimeout(() => setIsSuccess(false), 5000);
      } else {
        alert("發送失敗：" + (data.message || "請稍後再試。"));
      }
    } catch (error) {
      console.error(error);
      alert("網路連線錯誤。如果您有使用擋廣告軟體 (Ad-blocker)，請先暫時關閉後再試一次。");
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="min-h-[4rem] w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            {notifications.length > 0 && (
              <motion.div key={activeNotifIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }} className="w-[90%] md:w-auto">
                <Link href={notifications[activeNotifIndex].link} className="group flex flex-row items-center gap-3 md:gap-5 border border-zinc-800/60 bg-zinc-900/20 backdrop-blur-sm px-4 py-3 md:px-6 hover:bg-zinc-800/40 hover:border-zinc-500 transition-all duration-700 mx-auto justify-center w-full">
                  <div className="flex items-center gap-2 md:gap-3 text-zinc-400 shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${notifications[activeNotifIndex].type === 'news' ? 'bg-white' : 'bg-amber-500'}`}></span>
                    <span className={`text-[9px] md:text-[10px] tracking-[0.2em] uppercase ${notifications[activeNotifIndex].type === 'teaching' && 'text-amber-500'}`}>{notifications[activeNotifIndex].label}</span>
                  </div>
                  <div className="w-[1px] h-4 bg-zinc-700"></div>
                  <span className="font-serif text-[10px] md:text-sm tracking-widest text-zinc-300 group-hover:text-white transition-colors truncate">{notifications[activeNotifIndex].text}</span>
                  <ArrowRight size={14} className="text-zinc-600 group-hover:text-white transition-colors hidden md:block shrink-0" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 2 }} className="absolute bottom-10 flex flex-col items-center animate-bounce cursor-pointer text-gray-600 hover:text-white transition-colors" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
          <ChevronDown size={20} strokeWidth={1} />
        </motion.div>
      </section>

      {/* 關於大師 */}
      <section id="about" className="relative z-10 min-h-screen flex items-center px-6 md:px-24 py-20 bg-gradient-to-b from-transparent to-zinc-950/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="w-full md:w-1/2 aspect-[3/4] relative bg-zinc-900 shadow-2xl overflow-hidden">
            {profile.imageUrl && <Image src={profile.imageUrl} alt="PETERPENN POON" fill draggable={false} onContextMenu={(e) => e.preventDefault()} className="object-cover grayscale hover:grayscale-0 transition-all duration-1000 select-none pointer-events-none" />}
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="w-full md:w-1/2 space-y-8 font-serif leading-loose">
            <h3 className="text-2xl md:text-3xl tracking-[0.1em]">Equipment is secondary,<br/>vision is primary.</h3>
            <div className="text-gray-400 space-y-6 text-sm tracking-wide text-justify whitespace-pre-wrap">{profile.bio}</div>
            <div className="pt-4 flex gap-6">
              <Link href="/gallery" className="inline-flex items-center gap-4 border-b border-zinc-700 pb-2 hover:border-white hover:gap-6 transition-all duration-500 text-xs md:text-sm tracking-widest text-zinc-300">
                進入線上展廳 <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* === 指導與聯絡表單 (升級 AJAX 版本) === */}
      <section id="contact" className="relative z-10 py-32 px-6 bg-black flex flex-col items-center border-t border-zinc-900">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl w-full text-center">
          <Mail size={32} className="mx-auto mb-6 opacity-30" strokeWidth={1} />
          <h2 className="font-serif text-3xl md:text-4xl tracking-[0.2em] mb-6">個人攝影指導與合作</h2>
          <p className="text-zinc-500 text-sm tracking-widest leading-loose mb-12 font-serif text-justify md:text-center">
            無論是探討黑白光影的心法，或是希望獲得潘老師 1-on-1 的個人攝影眼指導、作品點評與商業合作，歡迎透過下方表單或直接寄信聯繫。
          </p>
          
          {/* 💡 攔截預設跳轉，改用 onSubmit 執行非同步傳送 */}
          <form onSubmit={handleFormSubmit} className="space-y-6 text-left relative">
            <input type="hidden" name="access_key" value="9826665b-ab6c-4e5c-89b8-1d5b13dfe4fa" />
            <input type="hidden" name="subject" value="來自 PETERPENN POON 官網的新訊息" />
            
            {/* 已經不需要 redirect 標籤了，因為我們不跳轉頁面了 */}
            {/* <input type="hidden" name="redirect" value="https://peterpenn.com" /> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-[10px] tracking-[0.2em] text-zinc-500 mb-2 uppercase">您的稱呼 (Name)</label><input type="text" name="name" required disabled={isSubmitting} className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-sm outline-none focus:border-zinc-500 transition-colors disabled:opacity-50" /></div>
              <div><label className="block text-[10px] tracking-[0.2em] text-zinc-500 mb-2 uppercase">電子信箱 (Email)</label><input type="email" name="email" required disabled={isSubmitting} className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-sm outline-none focus:border-zinc-500 transition-colors disabled:opacity-50" /></div>
            </div>
            <div><label className="block text-[10px] tracking-[0.2em] text-zinc-500 mb-2 uppercase">詢問內容 (Message)</label><textarea name="message" rows={5} required disabled={isSubmitting} className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-sm outline-none focus:border-zinc-500 transition-colors disabled:opacity-50" placeholder="請簡述您的攝影經歷或希望獲得指導的方向..."></textarea></div>
            
            {/* 💡 動態按鈕狀態 */}
            <button 
              type="submit" 
              disabled={isSubmitting || isSuccess}
              className={`w-full py-4 font-serif tracking-widest text-sm transition-all duration-500 flex items-center justify-center gap-3 uppercase ${
                isSuccess ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 
                isSubmitting ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 
                'bg-white text-black hover:bg-zinc-300'
              }`}
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> 傳送中 Sending...</>
              ) : isSuccess ? (
                <><CheckCircle size={18} /> 訊息已成功送出 Message Sent</>
              ) : (
                "傳送訊息 Send Message"
              )}
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
