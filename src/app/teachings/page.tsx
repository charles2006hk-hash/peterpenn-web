// src/app/teachings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";

export default function TeachingsPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachings = async () => {
      try {
        // 抓取未封存的教學文章
        const q = query(collection(db, "teachings"), where("isArchived", "==", false), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setArticles(data);
      } catch (error) {
        console.error("載入教學失敗 (可能需要建立 Firebase 複合索引):", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachings();
  }, []);

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black">
      <div className="film-grain" /><div className="vignette" />

      <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-8 py-6 mix-blend-difference">
        <Link href="/" className="flex items-center gap-2 hover:text-zinc-400 transition-colors font-serif tracking-widest text-sm uppercase">
          <ArrowLeft size={16} /> Home
        </Link>
        <h1 className="font-serif text-xs md:text-sm tracking-[0.3em] uppercase text-zinc-500">Teachings</h1>
      </header>

      <section className="relative z-10 pt-32 pb-20 px-6 max-w-5xl mx-auto min-h-screen flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="w-full">
          <BookOpen size={32} className="mb-8 opacity-50 mx-auto" strokeWidth={1} />
          <h2 className="text-4xl md:text-5xl text-center mb-16 tracking-[0.2em] font-serif font-light uppercase">攝影眼</h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-700" size={32} /></div>
        ) : articles.length === 0 ? (
          <div className="text-zinc-500 font-serif tracking-widest">目前暫無文章。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {articles.map((article, index) => (
              <motion.div 
                key={article.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: index * 0.1 }}
                className="group flex flex-col bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/80 transition-all duration-500"
              >
                <Link href={`/teachings/${article.id}`} className="block relative w-full aspect-video overflow-hidden bg-zinc-950">
                  {article.coverImage ? (
                    <Image src={article.coverImage} alt={article.title} fill className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-800 text-xs tracking-widest uppercase">No Cover</div>
                  )}
                </Link>
                
                <div className="p-6 flex flex-col flex-grow font-serif">
                  <div className="text-[10px] text-zinc-500 tracking-[0.2em] mb-4 flex flex-wrap gap-2 uppercase">
                    <span className="border border-zinc-800 px-2 py-0.5">{article.category}</span>
                    {article.seriesName && <span className="border border-zinc-800 px-2 py-0.5">{article.seriesName} {article.chapterIndex && `Ch.${article.chapterIndex}`}</span>}
                  </div>
                  
                  <Link href={`/teachings/${article.id}`}>
                    <h3 className="text-xl text-zinc-200 tracking-widest leading-relaxed group-hover:text-white transition-colors mb-4 line-clamp-2">
                      {article.title}
                    </h3>
                  </Link>

                  <div className="mt-auto pt-6 flex flex-wrap gap-2">
                    {article.tags?.map((tag: string) => (
                      <span key={tag} className="text-zinc-600 text-[10px] tracking-widest uppercase">#{tag}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}