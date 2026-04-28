// src/app/news/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Loader2, PlayCircle, Image as ImageIcon } from "lucide-react";

interface NewsEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: string;
  location: string;
  description: string;
  coverImage?: string; 
  // 💡 架構師新增：為了支援花絮影片與多圖
  videoUrl?: string;   // 用於存放 YouTube/Vimeo 的嵌入網址
  images?: string[];   // 用於存放多張花絮照片
}

export default function NewsPage() {
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const events = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NewsEvent[];
        
        // 依據 date 做二次排序 (由新到舊)
        setNewsEvents(events.sort((a, b) => b.date.localeCompare(a.date)));
      } catch (error) {
        console.error("無法載入動態:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black overflow-hidden">
      <div className="film-grain pointer-events-none" />
      <div className="vignette pointer-events-none" />

      <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-8 py-6 mix-blend-difference">
        <Link href="/" className="flex items-center gap-2 hover:text-zinc-400 transition-colors font-serif tracking-widest text-sm uppercase">
          <ArrowLeft size={16} /> Home
        </Link>
        <h1 className="font-serif text-xs md:text-sm tracking-[0.3em] uppercase text-zinc-500">News & Exhibitions</h1>
      </header>

      <section className="relative z-10 pt-32 pb-32 px-6 max-w-4xl mx-auto min-h-screen flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="mb-16 text-center">
          <Calendar size={32} className="mb-8 opacity-50 mx-auto" strokeWidth={1} />
          <h2 className="text-3xl md:text-4xl tracking-[0.2em] font-serif font-light">最新動態與花絮</h2>
        </motion.div>

        {loading ? (
           <div className="flex flex-col items-center justify-center text-zinc-500 mt-20">
             <Loader2 className="animate-spin mb-4" size={32} />
             <p className="tracking-widest text-sm font-serif">載入中...</p>
           </div>
        ) : newsEvents.length === 0 ? (
           <div className="text-zinc-500 font-serif tracking-widest mt-20">目前暫無最新動態。</div>
        ) : (
          <div className="relative border-l border-zinc-800 pl-6 md:pl-10 space-y-32 ml-2 md:ml-0 w-full">
            {newsEvents.map((event, index) => {
              const today = new Date().toISOString().split('T')[0];
              const isUpcoming = event.date >= today;
              const formattedDate = event.date.replace(/-/g, '.');
              const formattedEndDate = event.endDate ? ` - ${event.endDate.replace(/-/g, '.')}` : '';

              return (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="relative group"
                >
                  {/* 時間軸圓點 */}
                  <div className={`absolute -left-[33px] md:-left-[49px] top-1.5 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${isUpcoming ? 'bg-white' : 'bg-zinc-700'}`} />
                  
                  <div className="font-serif w-full">
                    {/* 日期與標籤 */}
                    <div className="flex flex-wrap items-baseline gap-4 mb-3">
                      <span className={`text-lg md:text-xl tracking-widest ${isUpcoming ? 'text-white' : 'text-zinc-500'}`}>
                        {formattedDate}{formattedEndDate}
                      </span>
                      <span className="text-[10px] tracking-widest uppercase border border-zinc-800 px-2 py-1 text-zinc-400">
                        {event.type}
                      </span>
                    </div>
                    
                    {/* 標題 */}
                    <h3 className="text-2xl md:text-3xl tracking-widest text-zinc-200 mt-4 mb-4 group-hover:text-white transition-colors leading-normal">
                      {event.title}
                    </h3>
                    
                    {/* 地點 */}
                    {event.location && (
                      <p className="text-sm text-zinc-500 tracking-widest leading-loose mb-6">
                        @ {event.location}
                      </p>
                    )}
                    
                    {/* 內文描述 */}
                    {event.description && (
                      <p className="text-sm text-zinc-400 tracking-wide leading-relaxed italic text-justify whitespace-pre-wrap mb-10 max-w-2xl">
                        {event.description}
                      </p>
                    )}
                    
                    {/* === 多媒體渲染區 === */}
                    <div className="flex flex-col gap-10">
                      
                      {/* 1. 影片嵌入區塊 (YouTube/Vimeo) */}
                      {event.videoUrl && (
                        <div className="relative w-full max-w-3xl aspect-video bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">
                          <iframe 
                            src={event.videoUrl} 
                            title={`${event.title} Video`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full"
                          />
                        </div>
                      )}

                      {/* 2. 主海報渲染區塊 */}
                      {event.coverImage && (
                        <div className="relative w-full max-w-xl aspect-[3/4] bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">
                          <Image 
                            src={event.coverImage} 
                            alt={event.title} 
                            fill 
                            className="object-cover hover:scale-[1.02] transition-transform duration-700" 
                          />
                        </div>
                      )}

                      {/* 3. 多圖活動花絮渲染區塊 (Grid 網格排列) */}
                      {event.images && event.images.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                          {event.images.map((img, idx) => (
                            <div key={idx} className="relative w-full aspect-[4/3] bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg group/img">
                              <Image 
                                src={img} 
                                alt={`Highlight ${idx + 1}`} 
                                fill 
                                className="object-cover grayscale group-hover/img:grayscale-0 hover:scale-105 transition-all duration-700" 
                              />
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
