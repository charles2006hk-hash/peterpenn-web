// src/app/gallery/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, X, FolderOpen } from "lucide-react";

export default function GalleryPage() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<any | null>(null);
  
  // 💡 中央觸發特效的核心狀態：記錄哪一張照片正在螢幕「正中央」
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. 初始化抓取所有「未封存」的系列 (Albums)
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const q = query(collection(db, "albums"), where("isArchived", "==", false), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const fetchedAlbums = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlbums(fetchedAlbums);
      } catch (error) {
        console.error("載入系列失敗:", error);
      } finally {
        setLoadingAlbums(false);
      }
    };
    fetchAlbums();
  }, []);

  // 2. 當點擊系列時，抓取該系列的所有相片 (Photos)
  const handleSelectAlbum = async (album: any) => {
    setSelectedAlbum(album);
    setLoadingPhotos(true);
    setActiveIndex(0); // 重置中央索引
    try {
      const q = query(collection(db, "photos"), where("albumId", "==", album.id), orderBy("order", "asc"));
      const snap = await getDocs(q);
      setPhotos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("載入相片失敗:", error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // 💡 3. 神奇的魔法：交叉觀察器 (追蹤哪張照片在中央)
  useEffect(() => {
    if (!selectedAlbum || photos.length === 0 || !scrollContainerRef.current) return;

    // 設定觀察器，當元素進入螢幕中央 60% 區域時觸發
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setActiveIndex(index);
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.6, // 元素必須有 60% 在畫面中才會觸發 (確保只有最中間的那張會亮起)
      }
    );

    // 綁定所有照片元素
    const elements = scrollContainerRef.current.querySelectorAll(".photo-item");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selectedAlbum, photos]);

  // 鎖定背景滾動 (防燈箱穿透)
  useEffect(() => {
    document.body.style.overflow = selectedLightboxPhoto ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedLightboxPhoto]);

  return (
    <main className="relative min-h-screen w-full bg-[#0a0a0a] text-white selection:bg-white selection:text-black overflow-hidden">
      <div className="film-grain" />

      {/* === 頂部導航與右上角縮圖列表 === */}
      <header className="absolute top-0 left-0 right-0 z-50 flex flex-col md:flex-row justify-between items-start md:items-center w-full px-6 md:px-8 py-6 mix-blend-difference gap-6 pointer-events-none">
        
        {/* 左側：返回與標題 */}
        <div className="flex items-center gap-6 pointer-events-auto">
          <Link href="/" className="flex items-center gap-2 hover:text-gray-400 transition-colors font-serif tracking-widest text-xs md:text-sm uppercase">
            <ArrowLeft size={16} /> Home
          </Link>
          <div className="hidden md:block w-[1px] h-4 bg-zinc-700"></div>
          <h1 className="font-serif text-xs md:text-sm tracking-[0.3em] uppercase text-zinc-500 hidden md:block">
            {selectedAlbum ? selectedAlbum.title : "Virtual Gallery"}
          </h1>
        </div>
        
        {/* 右側：系列縮圖導航列 */}
        {!loadingAlbums && albums.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto max-w-full pb-2 no-scrollbar pointer-events-auto">
            {albums.map((album) => (
              <button
                key={album.id}
                onClick={() => handleSelectAlbum(album)}
                title={album.title}
                className="relative group shrink-0"
              >
                <div className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden transition-all duration-500 border-2 ${
                  selectedAlbum?.id === album.id ? 'border-white scale-110 grayscale-0' : 'border-zinc-800 grayscale hover:grayscale-0 hover:border-zinc-500'
                }`}>
                  {album.coverImage ? (
                    <Image src={album.coverImage} alt={album.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><FolderOpen size={14} className="text-zinc-600"/></div>
                  )}
                </div>
                {/* 滑鼠懸停顯示系列名稱 */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                  <span className="bg-black/80 text-[10px] text-zinc-300 tracking-widest uppercase px-2 py-1 backdrop-blur-sm border border-zinc-800 rounded">
                    {album.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* === 視圖 A：尚未選擇系列時，顯示大首頁目錄 === */}
      {!selectedAlbum && (
        <section className="relative z-10 h-screen flex flex-col items-center justify-center px-6">
          {loadingAlbums ? (
             <Loader2 className="animate-spin text-zinc-500" size={32} />
          ) : albums.length === 0 ? (
             <p className="text-zinc-600 font-serif tracking-widest">展廳佈置中...</p>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-serif tracking-[0.3em] font-light uppercase mb-8">線上展區</h2>
              <p className="text-zinc-500 text-sm tracking-widest leading-loose mb-12">請點擊上方縮圖，或選擇下方系列進入大師的黑白與彩色視界。</p>
              <div className="flex flex-wrap justify-center gap-6">
                {albums.map(album => (
                   <button onClick={() => handleSelectAlbum(album)} key={album.id} className="group relative w-48 aspect-square overflow-hidden bg-zinc-900 border border-zinc-800">
                     {album.coverImage && <Image src={album.coverImage} alt={album.title} fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />}
                     <div className="absolute inset-0 bg-black/60 group-hover:bg-black/20 transition-colors duration-700 flex items-center justify-center">
                        <span className="text-white font-serif tracking-widest text-sm uppercase px-4 text-center">{album.title}</span>
                     </div>
                   </button>
                ))}
              </div>
            </motion.div>
          )}
        </section>
      )}

      {/* === 視圖 B：進入系列，顯示相片長廊 === */}
      {selectedAlbum && (
        <>
          {loadingPhotos ? (
            <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="tracking-widest text-sm font-serif">調取系列相片中...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-screen text-zinc-500 font-serif tracking-widest">
              <p>此系列尚無照片。</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="flex items-center h-screen w-full max-w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory px-[15vw] gap-[8vw] md:gap-[10vw] pb-10" 
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              ref={scrollContainerRef} // 綁定觀察器
            >
              {photos.map((photo, index) => (
                <div 
                  key={photo.id}
                  data-index={index}
                  className="photo-item relative flex flex-col items-center justify-center shrink-0 w-[75vw] md:w-auto h-[60vh] md:h-[75vh] snap-center cursor-zoom-in"
                  onClick={() => setSelectedLightboxPhoto(photo)}
                >
                  {/* 💡 動態樣式：當這張照片是 activeIndex (在中央) 時，變成彩色、透明度100%、尺寸100% */}
                  <div className={`relative h-full w-full transition-all duration-700 ease-out flex justify-center items-center ${
                    activeIndex === index ? 'grayscale-0 opacity-100 scale-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)]' : 'grayscale opacity-30 scale-95'
                  }`}>
                    {/* 💡 完美比例：不寫死寬度，使用 object-contain 讓直橫幅都能完美呈現 */}
                    <Image
                      src={photo.imageUrl}
                      alt={`Photo ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 90vw, 70vw"
                      className="object-contain drop-shadow-2xl"
                      priority={index < 3}
                    />
                  </div>
                </div>
              ))}
              {/* 結尾留白 */}
              <div className="shrink-0 w-[10vw] md:w-[20vw]" />
            </motion.div>
          )}

          {/* 橫向滑動提示 */}
          {!loadingPhotos && photos.length > 1 && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-500 flex flex-col items-center animate-pulse pointer-events-none z-40">
              <span className="text-[10px] tracking-[0.3em] uppercase font-serif mb-2">Swipe Gallery</span>
              <div className="flex items-center gap-2 opacity-50">
                <ArrowLeft size={12} /><ArrowRight size={12} />
              </div>
            </div>
          )}
        </>
      )}

      {/* === 沉浸式燈箱 (Lightbox) === */}
      <AnimatePresence>
        {selectedLightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/98 backdrop-blur-xl cursor-zoom-out"
            onClick={() => setSelectedLightboxPhoto(null)}
          >
            <button className="absolute top-6 right-6 md:top-8 md:right-8 text-zinc-500 hover:text-white transition-colors z-[110]">
              <X size={32} strokeWidth={1} />
            </button>

            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full max-w-6xl h-[80vh] px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedLightboxPhoto.imageUrl}
                alt="Selected"
                fill
                quality={100}
                className="object-contain"
              />
            </motion.div>

            {/* 燈箱底部說明 (使用系列資訊) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-center font-serif px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] text-zinc-500 tracking-[0.3em] uppercase border border-zinc-800 px-3 py-1 bg-zinc-950">
                {selectedAlbum?.title}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
