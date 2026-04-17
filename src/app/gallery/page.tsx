// src/app/gallery/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, X, Image as ImageIcon } from "lucide-react";

interface Work {
  id: string;
  title: string;
  concept: string;
  category: string;
  imageUrl: string;
}

export default function GalleryPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  
  // 分類過濾狀態
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const q = query(collection(db, "works"), where("isArchived", "==", false), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedWorks = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Work[];
        
        setWorks(fetchedWorks);

        const uniqueCategories = Array.from(new Set(fetchedWorks.map(item => item.category))).filter(Boolean);
        setCategories(["All", ...uniqueCategories]);
      } catch (error) {
        console.error("無法載入作品:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, []);

  // 鎖定背景滾動 (當燈箱打開時)
  useEffect(() => {
    if (selectedWork) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedWork]);

  const filteredWorks = activeCategory === "All" ? works : works.filter(w => w.category === activeCategory);

  return (
    // 💡 父層加上 w-full 確保不會被無限撐開
    <main className="relative min-h-screen w-full bg-[#0a0a0a] text-white selection:bg-white selection:text-black overflow-hidden">
      <div className="film-grain" />

      {/* 頂部導航 */}
      <header className="absolute top-0 left-0 right-0 z-50 flex flex-col md:flex-row justify-between items-center w-full px-6 md:px-8 py-6 mix-blend-difference gap-4 pointer-events-none">
        <Link href="/" className="flex items-center gap-2 hover:text-gray-400 transition-colors font-serif tracking-widest text-xs md:text-sm uppercase pointer-events-auto">
          <ArrowLeft size={16} /> Home
        </Link>
        <h1 className="font-serif text-xs md:text-sm tracking-[0.3em] uppercase text-zinc-500">Virtual Gallery</h1>
        
        {/* 分類過濾選單 */}
        {!loading && categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 pointer-events-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`font-serif text-[10px] md:text-xs tracking-widest uppercase pb-1 border-b transition-colors duration-500 ${
                  activeCategory === cat ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {cat === "All" ? "全部" : cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p className="tracking-widest text-sm font-serif">佈展中 (Curating...)</p>
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-screen text-zinc-500 font-serif tracking-widest">
          <p>此分類暫無作品。</p>
        </div>
      ) : (
        /* 💡 修正核心：加上 w-full 與 max-w-full，強迫它在螢幕內產生橫向滾動條 */
        /* 同時微調 gap，讓下一張照片「微微露出邊緣」，引導視覺 */
        <motion.div 
          layout 
          className="flex items-center h-screen w-full max-w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory px-[15vw] gap-[8vw] md:gap-[10vw] pb-10" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence>
            {filteredWorks.map((work, index) => (
              <motion.div 
                key={work.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative flex flex-col items-center justify-center shrink-0 w-[75vw] md:w-[400px] snap-center"
              >
                <div className="absolute top-[-20%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08)_0%,_rgba(0,0,0,0)_60%)] pointer-events-none z-0" />
                <div className="absolute bottom-[100%] w-[1px] h-[50vh] bg-gradient-to-t from-zinc-500 to-transparent z-0 opacity-50" />

                <motion.div
                  animate={{ y: [0, -15, 0], rotate: [-0.5, 0.5, -0.5] }}
                  transition={{ duration: 6 + (index % 3), repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-full cursor-zoom-in"
                  onClick={() => setSelectedWork(work)}
                >
                  <div className="relative w-full aspect-[3/4] bg-zinc-900 shadow-[0_30px_60px_rgba(0,0,0,0.9)] group overflow-hidden">
                    <Image
                      src={work.imageUrl}
                      alt={work.title}
                      fill
                      sizes="(max-width: 768px) 80vw, 400px"
                      className="object-cover transition-all duration-[1500ms] ease-out grayscale-0 md:grayscale md:group-hover:grayscale-0 md:group-hover:scale-105"
                      priority={index < 3}
                    />
                  </div>
                  <div className="absolute -bottom-24 left-0 w-full text-center font-serif opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                    <h2 className="text-lg md:text-xl tracking-[0.15em] text-white mb-2">{work.title}</h2>
                    <span className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase border border-zinc-800 px-2 py-1">{work.category}</span>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="shrink-0 w-[10vw]" />
        </motion.div>
      )}

      {/* 💡 新增：橫向滑動提示動畫 (Swipe to Explore) */}
      {!loading && filteredWorks.length > 1 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-zinc-500 flex items-center gap-4 animate-pulse pointer-events-none z-50">
          <span className="text-[10px] tracking-[0.3em] uppercase font-serif">Swipe to Explore</span>
          <ArrowRight size={14} className="opacity-70" />
        </div>
      )}

      {/* 沉浸式燈箱 (Lightbox) */}
      <AnimatePresence>
        {selectedWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl cursor-zoom-out"
            onClick={() => setSelectedWork(null)}
          >
            <button className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors z-[110]">
              <X size={32} strokeWidth={1} />
            </button>

            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full max-w-5xl h-[60vh] md:h-[80vh] px-4 mt-8 md:mt-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedWork.imageUrl}
                alt={selectedWork.title}
                fill
                quality={100}
                className="object-contain"
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 md:mt-12 text-center font-serif px-6 max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                 <span className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase border border-zinc-800 px-2 py-0.5">{selectedWork.category}</span>
              </div>
              <h2 className="text-xl md:text-2xl tracking-[0.2em] text-white mb-4">{selectedWork.title}</h2>
              {selectedWork.concept && (
                <p className="text-xs md:text-sm text-zinc-400 tracking-widest leading-loose italic whitespace-pre-wrap">
                  「{selectedWork.concept}」
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
