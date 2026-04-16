// src/app/gallery/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, X } from "lucide-react";

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

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const q = query(collection(db, "works"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedWorks = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Work[];
        
        setWorks(fetchedWorks);
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
  }, [selectedWork]);

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black overflow-hidden">
      <div className="film-grain" />

      <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-8 py-6 mix-blend-difference">
        <Link href="/" className="flex items-center gap-2 hover:text-gray-400 transition-colors font-serif tracking-widest text-sm uppercase">
          <ArrowLeft size={16} /> 回首頁 (Home)
        </Link>
        <h1 className="font-serif text-xs md:text-sm tracking-[0.3em] uppercase text-zinc-500">Peter Penn Exhibition</h1>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p className="tracking-widest text-sm font-serif">佈展中 (Curating...)</p>
        </div>
      ) : (
        <div className="flex items-center h-screen overflow-x-auto overflow-y-hidden snap-x snap-mandatory px-[15vw] gap-[20vw] pb-10" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {works.map((work, index) => (
            <div key={work.id} className="relative flex flex-col items-center justify-center shrink-0 w-[80vw] md:w-[400px] snap-center">
              <div className="absolute top-[-20%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08)_0%,_rgba(0,0,0,0)_60%)] pointer-events-none z-0" />
              <div className="absolute bottom-[100%] w-[1px] h-[50vh] bg-gradient-to-t from-zinc-500 to-transparent z-0 opacity-50" />

              <motion.div
                animate={{ y: [0, -15, 0], rotate: [-0.5, 0.5, -0.5] }}
                transition={{ duration: 6 + (index % 3), repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-full cursor-zoom-in"
                onClick={() => setSelectedWork(work)}
              >
                <div className="relative w-full aspect-[3/4] bg-zinc-900 shadow-[0_30px_60px_rgba(0,0,0,0.9)] group">
                  <Image
                    src={work.imageUrl}
                    alt={work.title}
                    fill
                    sizes="(max-width: 768px) 80vw, 400px"
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-[1500ms] ease-out"
                    priority={index < 3}
                  />
                </div>
                <div className="absolute -bottom-24 left-0 w-full text-center font-serif opacity-80 group-hover:opacity-100 transition-opacity duration-700">
                  <h2 className="text-xl tracking-[0.15em] text-white mb-2">{work.title}</h2>
                </div>
              </motion.div>
            </div>
          ))}
          <div className="shrink-0 w-[10vw]" />
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
            {/* 關閉按鈕 */}
            <button className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors z-[110]">
              <X size={32} strokeWidth={1} />
            </button>

            {/* 放大圖片 (使用 object-contain 確保完整顯示，不裁切) */}
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full max-w-5xl h-[70vh] md:h-[80vh] px-4"
              onClick={(e) => e.stopPropagation()} // 防止點擊圖片時關閉
            >
              <Image
                src={selectedWork.imageUrl}
                alt={selectedWork.title}
                fill
                quality={100} // 最高畫質
                className="object-contain"
              />
            </motion.div>

            {/* 燈箱底部文字解說 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 text-center font-serif px-6 max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl tracking-[0.2em] text-white mb-4">{selectedWork.title}</h2>
              {selectedWork.concept && (
                <p className="text-sm text-zinc-400 tracking-widest leading-loose italic">
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