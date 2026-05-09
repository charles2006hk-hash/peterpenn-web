// src/app/news/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Loader2, MapPin } from "lucide-react";

interface NewsEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: string;
  location: string;
  description: string;
  coverImage?: string; 
  videoUrl?: string;   
  images?: string[];   
}

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/(?:vimeo\.com\/)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
};

// 💡 架構師升級版：自動輪播模組 (2.5秒 + 滑鼠/觸控暫停)
const AutoCarousel = ({ images }: { images: string[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false); // 💡 新增：控制是否暫停輪播

  // 1. 監聽哪一張照片在正中央
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveIndex(Number(entry.target.getAttribute('data-index')));
        }
      });
    }, { root: containerRef.current, threshold: 0.6 });

    const elements = containerRef.current.querySelectorAll('.carousel-item');
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [images]);

  // 2. 自動輪播邏輯 (改為 2.5 秒)
  useEffect(() => {
    // 💡 如果 isPaused 為 true (滑鼠停留或手指按住)，就直接 return 不設定計時器
    if (isPaused) return;

    const interval = setInterval(() => {
      if (!containerRef.current) return;
      const maxIndex = images.length - 1;
      const nextIndex = activeIndex >= maxIndex ? 0 : activeIndex + 1;
      
      const elements = containerRef.current.querySelectorAll('.carousel-item');
      const nextElement = elements[nextIndex] as HTMLElement;
      
      if (nextElement) {
        const container = containerRef.current;
        container.scrollTo({
          left: nextElement.offsetLeft - container.offsetLeft - (container.clientWidth - nextElement.clientWidth) / 2,
          behavior: 'smooth'
        });
      }
    }, 2500); // 💡 速度升級：2500毫秒 = 2.5秒
    
    return () => clearInterval(interval);
  }, [activeIndex, images.length, isPaused]); // 加入 isPaused 作為依賴

  if (!images || images.length === 0) return null;

  return (
    <div 
      className="relative w-full overflow-hidden py-10 md:py-16"
      // 💡 電腦版：滑鼠移入暫停，移出恢復
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      // 💡 iPhone 手機版：手指碰觸時暫停，手指離開後延遲 1 秒再恢復 (保護滑動體驗)
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 1000)}
    >
      <div 
        ref={containerRef} 
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar w-full md:max-w-3xl items-center" 
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((img, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={idx}
              data-index={idx}
              className={`carousel-item relative w-[75vw] md:w-[65%] shrink-0 aspect-[4/3] bg-zinc-900 border border-zinc-800 shadow-lg snap-center transition-all duration-[1000ms] ease-out origin-center ${
                isActive ? 'scale-[1.15] opacity-100 z-10 shadow-2xl' : 'scale-90 opacity-30 z-0'
              }`}
            >
              <img 
                src={img} 
                alt={`Highlight ${idx + 1}`} 
                className="w-full h-full object-cover" 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
                  <div className={`absolute -left-[33px] md:-left-[49px] top-1.5 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${isUpcoming ? 'bg-white' : 'bg-zinc-700'}`} />
                  
                  <div className="font-serif w-full max-w-[100vw]">
                    <div className="flex flex-wrap items-baseline gap-4 mb-3">
                      <span className={`text-lg md:text-xl tracking-widest ${isUpcoming ? 'text-white' : 'text-zinc-500'}`}>
                        {formattedDate}{formattedEndDate}
                      </span>
                      <span className="text-[10px] tracking-widest uppercase border border-zinc-800 px-2 py-1 text-zinc-400">
                        {event.type}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl tracking-widest text-zinc-200 mt-4 mb-4 group-hover:text-white transition-colors leading-normal max-w-3xl">
                      {event.title}
                    </h3>
                    
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500 tracking-widest mb-6">
                        <MapPin size={16} className="shrink-0" />
                        <span>{event.location.replace(/^@\s*/, '')}</span>
                      </div>
                    )}
                    
                    {event.description && (
                      <p className="text-sm text-zinc-400 tracking-wide leading-relaxed italic text-justify whitespace-pre-wrap mb-10 max-w-2xl">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex flex-col gap-10">
                      
                      {event.videoUrl && (
                        <div className="relative w-full max-w-3xl aspect-video bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">
                          <iframe 
                            src={getEmbedUrl(event.videoUrl)} 
                            title={`${event.title} Video`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full border-0"
                          />
                        </div>
                      )}

                      {event.coverImage && !event.videoUrl && (
                        <div className="relative w-full max-w-3xl border border-zinc-800 overflow-hidden shadow-2xl bg-zinc-900">
                          <img 
                            src={event.coverImage} 
                            alt={event.title} 
                            className="w-full h-auto object-contain hover:scale-[1.02] transition-transform duration-700" 
                          />
                        </div>
                      )}

                      {/* 💡 使用全新的自動輪播模組 */}
                      <AutoCarousel images={event.images || []} />

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
