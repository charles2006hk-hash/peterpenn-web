// src/app/teachings/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";

// 💡 解析 YouTube ID 的魔法函數
const getYouTubeID = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function ArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!params.id) return;
      try {
        const docRef = doc(db, "teachings", params.id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArticle({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("無法載入內容:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [params.id]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500" size={32} /></div>;
  }

  if (!article) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-500 font-serif tracking-widest">找不到該內容。</div>;
  }

  const publishDate = article.createdAt?.toDate ? article.createdAt.toDate().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }) : "";

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black">
      <div className="film-grain" />

      {/* 頂部導航 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 py-6 mix-blend-difference bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/teachings" className="flex items-center gap-2 hover:text-zinc-400 transition-colors font-serif tracking-widest text-xs md:text-sm uppercase">
          <ArrowLeft size={16} /> Back
        </Link>
      </header>

      {/* 封面視覺 */}
      {article.coverImage && (
        <div className="relative w-full h-[50vh] md:h-[70vh] bg-zinc-900">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/50 to-transparent z-10" />
          <Image src={article.coverImage} alt={article.title} fill className="object-cover grayscale" priority />
        </div>
      )}

      {/* 文章內容區塊 */}
      <article className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-32 -mt-32 md:-mt-48">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="bg-[#0a0a0a] p-6 md:p-12 lg:p-16 border border-zinc-900 shadow-2xl">
          
          {/* 文章 Meta 資訊 */}
          <div className="text-[10px] md:text-xs text-zinc-500 tracking-[0.2em] mb-8 flex flex-wrap gap-4 uppercase font-serif">
            {publishDate && <span>{publishDate}</span>}
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-300">{article.category}</span>
            {article.seriesName && (
              <>
                <span className="text-zinc-700">|</span>
                <span className="border-b border-zinc-700">{article.seriesName} {article.chapterIndex && `Ch.${article.chapterIndex}`}</span>
              </>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif tracking-widest leading-normal md:leading-tight mb-12 text-zinc-100">
            {article.title}
          </h1>

          {/* 💡 YouTube 影音播放器 */}
          {article.videoUrl && getYouTubeID(article.videoUrl) && (
            <div className="mb-16 w-full aspect-video bg-black shadow-2xl border border-zinc-800">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${getYouTubeID(article.videoUrl)}`}
                title="YouTube Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}

          {/* 富文本內容渲染 */}
          <div 
            className="font-serif leading-loose tracking-wide text-zinc-300 text-sm md:text-base text-justify space-y-6
              [&>p]:mb-6 [&>h1]:text-2xl [&>h1]:text-white [&>h1]:mt-12 [&>h1]:mb-6
              [&>h2]:text-xl [&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4
              [&>h3]:text-lg [&>h3]:text-white [&>h3]:mt-8 [&>h3]:mb-4
              [&>img]:w-full [&>img]:h-auto [&>img]:my-12 [&>img]:border [&>img]:border-zinc-800 [&>img]:grayscale hover:[&>img]:grayscale-0 [&>img]:transition-all [&>img]:duration-700
              [&>blockquote]:border-l-2 [&>blockquote]:border-zinc-600 [&>blockquote]:pl-6 [&>blockquote]:italic [&>blockquote]:text-zinc-400 [&>blockquote]:my-8
              [&_a]:text-zinc-400 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-white
            "
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* 文章底部標籤 */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-20 pt-8 border-t border-zinc-900 flex flex-wrap gap-3">
              {article.tags.map((tag: string) => (
                <span key={tag} className="text-zinc-600 text-xs tracking-widest uppercase bg-zinc-900/50 px-3 py-1">#{tag}</span>
              ))}
            </div>
          )}

        </motion.div>
      </article>
    </main>
  );
}
