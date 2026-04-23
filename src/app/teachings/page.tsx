// src/app/teachings/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, PlaySquare, Layers, FolderOpen } from "lucide-react";

export default function TeachingsPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeachings = async () => {
      try {
        const q = query(collection(db, "teachings"), where("isArchived", "==", false), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setArticles(data);
      } catch (error) {
        console.error("載入教學失敗:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachings();
  }, []);

  // 💡 智慧分組邏輯：將有 seriesName 的文章打包成「系列資料夾」
  const groupedItems = useMemo(() => {
    const map = new Map();
    const singles: any[] = [];

    articles.forEach(article => {
      if (article.seriesName) {
        if (!map.has(article.seriesName)) {
          map.set(article.seriesName, {
            isSeries: true,
            id: `series-${article.seriesName}`,
            title: article.seriesName,
            seriesName: article.seriesName,
            coverImage: article.coverImage,
            category: article.category,
            tags: article.tags,
            count: 1,
            createdAt: article.createdAt // 保留最新發佈時間用於排序
          });
        } else {
          map.get(article.seriesName).count += 1;
        }
      } else {
        singles.push({ isSeries: false, ...article });
      }
    });

    // 將單篇與系列合併，並依據最新時間排序
    return [...singles, ...Array.from(map.values())].sort((a, b) => b.createdAt - a.createdAt);
  }, [articles]);

  // 💡 選取系列時，篩選出該系列的文章並依照章節序號 (chapterIndex) 排序
  const seriesArticles = useMemo(() => {
    if (!selectedSeries) return [];
    return articles
      .filter(a => a.seriesName === selectedSeries)
      .sort((a, b) => (a.chapterIndex ?? 999) - (b.chapterIndex ?? 999));
  }, [articles, selectedSeries]);

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black">
      <div className="film-grain" /><div className="vignette" />

      <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 md:px-8 py-6 mix-blend-difference">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 hover:text-gray-400 transition-colors font-serif tracking-widest text-xs md:text-sm uppercase">
            <ArrowLeft size={16} /> Home
          </Link>
          {selectedSeries && (
            <button onClick={() => setSelectedSeries(null)} className="text-zinc-500 hover:text-white transition-colors font-serif tracking-widest text-xs md:text-sm uppercase flex items-center gap-2">
              <FolderOpen size={14}/> Back to All
            </button>
          )}
        </div>
        <h1 className="font-serif text-xs md:text-sm tracking-[0.3em] uppercase text-zinc-500 hidden md:block">Media & Teachings</h1>
      </header>

      <section className="relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto min-h-screen flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="w-full text-center mb-16">
          <h2 className="text-3xl md:text-5xl tracking-[0.2em] font-serif font-light uppercase mb-6">
            {selectedSeries ? `系列：${selectedSeries}` : "專欄與影音"}
          </h2>
          <p className="text-zinc-500 text-sm tracking-widest leading-loose">
            {selectedSeries ? "大師系列連載與深度解析" : "大師的攝影心法、媒體專訪與紀實探索"}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-700" size={32} /></div>
        ) : articles.length === 0 ? (
          <div className="text-zinc-500 font-serif tracking-widest">目前暫無內容。</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={selectedSeries ? "series-view" : "all-view"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full"
            >
              {/* === 渲染列表 === */}
              {(selectedSeries ? seriesArticles : groupedItems).map((item, index) => (
                <div key={item.id} className="group flex flex-col bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/80 transition-all duration-500 cursor-pointer h-full">
                  
                  {/* 判斷是「系列資料夾」還是「單篇文章」來決定點擊行為 */}
                  {item.isSeries ? (
                    <div onClick={() => setSelectedSeries(item.seriesName)} className="block relative w-full aspect-video overflow-hidden bg-zinc-950">
                      {item.coverImage ? (
                        <Image src={item.coverImage} alt={item.title} fill className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-800 text-xs tracking-widest uppercase"><Layers size={32}/></div>
                      )}
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center group-hover:bg-black/30 transition-colors duration-500">
                        <Layers size={32} className="text-white/80 mb-2 drop-shadow-2xl" strokeWidth={1} />
                        <span className="text-[10px] tracking-[0.2em] uppercase border border-white/50 px-3 py-1 bg-black/40 backdrop-blur-sm">共 {item.count} 篇</span>
                      </div>
                    </div>
                  ) : (
                    <Link href={`/teachings/${item.id}`} className="block relative w-full aspect-video overflow-hidden bg-zinc-950">
                      {item.coverImage ? (
                        <Image src={item.coverImage} alt={item.title} fill className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-800 text-xs tracking-widest uppercase">No Cover</div>
                      )}
                      {item.videoUrl && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-transparent transition-colors duration-500">
                          <PlaySquare size={48} className="text-white/80 drop-shadow-2xl" strokeWidth={1} />
                        </div>
                      )}
                    </Link>
                  )}
                  
                  {/* 卡片文字區塊 */}
                  <div className="p-6 flex flex-col flex-grow font-serif">
                    <div className="text-[10px] text-zinc-500 tracking-[0.2em] mb-4 flex flex-wrap gap-2 uppercase">
                      <span className="border border-zinc-800 px-2 py-0.5">{item.category}</span>
                      {item.isSeries && <span className="text-amber-500/80 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">系列主題</span>}
                      {item.chapterIndex && <span className="border border-zinc-800 px-2 py-0.5">Ch.{item.chapterIndex}</span>}
                    </div>
                    
                    {item.isSeries ? (
                      <h3 onClick={() => setSelectedSeries(item.seriesName)} className="text-lg md:text-xl text-zinc-200 tracking-widest leading-relaxed group-hover:text-white transition-colors mb-4">
                        {item.title}
                      </h3>
                    ) : (
                      <Link href={`/teachings/${item.id}`}>
                        <h3 className="text-lg md:text-xl text-zinc-200 tracking-widest leading-relaxed group-hover:text-white transition-colors mb-4 line-clamp-2">
                          {item.title}
                        </h3>
                      </Link>
                    )}

                    <div className="mt-auto pt-6 flex flex-wrap gap-2">
                      {item.tags?.map((tag: string) => (
                        <span key={tag} className="text-zinc-600 text-[10px] tracking-widest uppercase">#{tag}</span>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </section>
    </main>
  );
}
