// src/app/gallery/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, X, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react";

export default function GalleryPage() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<any | null>(null);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const thumbScrollRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const q = query(collection(db, "albums"), where("isArchived", "==", false), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setAlbums(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { console.error(error); } finally { setLoadingAlbums(false); }
    };
    fetchAlbums();
  }, []);

  const handleSelectAlbum = async (album: any) => {
    setSelectedAlbum(album); setLoadingPhotos(true); setActiveIndex(0); setPhotos([]); 
    try {
      const q = query(collection(db, "photos"), where("albumId", "==", album.id), orderBy("order", "asc"));
      const snap = await getDocs(q);
      if (snap.empty) {
        const fallbackQ = query(collection(db, "photos"), where("albumId", "==", album.id));
        const fallbackSnap = await getDocs(fallbackQ);
        setPhotos(fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setPhotos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      const emergencyQ = query(collection(db, "photos"), where("albumId", "==", album.id));
      const emergencySnap = await getDocs(emergencyQ);
      setPhotos(emergencySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } finally { setLoadingPhotos(false); }
  };

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveIndex(Number(entry.target.getAttribute("data-index")));
      });
    }, { root: scrollContainerRef.current, threshold: 0.6 });
    const elements = scrollContainerRef.current.querySelectorAll(".photo-item");
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selectedAlbum, photos, albums]);

  useEffect(() => {
    if (activeThumbRef.current && thumbScrollRef.current) {
      activeThumbRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeIndex, selectedAlbum]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollBy({ left: e.deltaY > 0 ? 500 : -500, behavior: "smooth" });
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [selectedAlbum, photos, albums]);

  const handleArrowScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = window.innerWidth * 0.6;
    scrollContainerRef.current.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: "smooth" });
  };

  const scrollToPhoto = (index: number) => {
    if (!scrollContainerRef.current) return;
    const elements = scrollContainerRef.current.querySelectorAll(".photo-item");
    if (elements[index]) elements[index].scrollIntoView({ behavior: 'smooth', inline: 'center' });
  };

  useEffect(() => {
    document.body.style.overflow = selectedLightboxPhoto ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedLightboxPhoto]);

  return (
    <main 
      onContextMenu={(e) => e.preventDefault()} 
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      className="relative min-h-screen w-full bg-[#0a0a0a] text-white selection:bg-white selection:text-black overflow-hidden"
    >
      <div className="film-grain pointer-events-none" />

      {/* === 1. 頂部導航與「系列縮圖」回歸 === */}
      <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 md:px-8 py-6 mix-blend-difference pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
          <Link href="/" className="flex items-center gap-2 hover:text-gray-400 transition-colors font-serif tracking-widest text-xs md:text-sm uppercase">
            <ArrowLeft size={16} /> Home
          </Link>
          {selectedAlbum && (
            <button onClick={() => setSelectedAlbum(null)} className="text-zinc-500 hover:text-white transition-colors font-serif tracking-widest text-xs md:text-sm uppercase flex items-center gap-2">
              <FolderOpen size={14}/> Back to Albums
            </button>
          )}
        </div>
        
        {/* 💡 修復 1：右上角快速導航縮圖 (系列 Album 縮圖) 加回來了 */}
        {!loadingAlbums && albums.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto max-w-[50%] md:max-w-full pb-2 no-scrollbar pointer-events-auto">
            {albums.map((album) => (
              <button key={album.id} onClick={() => handleSelectAlbum(album)} className="relative group shrink-0">
                <div className={`relative w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden transition-all duration-500 border-2 ${
                  selectedAlbum?.id === album.id ? 'border-white scale-110 grayscale-0' : 'border-zinc-800 grayscale hover:grayscale-0 hover:border-zinc-500'
                }`}>
                  {album.coverImage ? <Image draggable={false} src={album.coverImage} alt="Album" fill className="object-cover pointer-events-none" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><FolderOpen size={12}/></div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* === 動態縮圖跟隨列 (Photo 縮圖) === */}
      <AnimatePresence>
        {selectedAlbum && photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            ref={thumbScrollRef}
            // 💡 修復 2：稍微往下放一點點，避免跟頂部 Header 太擠
            className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 w-auto max-w-[85vw] md:max-w-[60vw] overflow-x-auto no-scrollbar z-40 flex items-center gap-3 px-10 py-2 mask-edges pointer-events-auto"
          >
            {photos.map((photo, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={photo.id}
                  ref={isActive ? activeThumbRef : null}
                  onClick={() => scrollToPhoto(index)}
                  className={`relative h-10 w-10 md:h-12 md:w-12 flex-shrink-0 cursor-pointer transition-all duration-500 rounded-sm overflow-hidden ${
                    isActive ? 'scale-110 opacity-100 border border-white/50' : 'scale-90 opacity-30 hover:opacity-80 border border-transparent grayscale hover:grayscale-0'
                  }`}
                >
                  <Image src={photo.imageUrl} alt="thumbnail" fill className="object-cover pointer-events-none" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 左右導航按鈕 */}
      {!loadingAlbums && (!selectedAlbum ? albums.length > 1 : photos.length > 1) && (
        <>
          <button onClick={() => handleArrowScroll('left')} className="absolute left-0 top-0 bottom-0 w-24 z-40 hidden md:flex items-center justify-start pl-4 opacity-0 hover:opacity-100 hover:bg-gradient-to-r from-black/50 to-transparent transition-all duration-500 text-white/50 hover:text-white pointer-events-auto">
            <ChevronLeft size={48} strokeWidth={1} />
          </button>
          <button onClick={() => handleArrowScroll('right')} className="absolute right-0 top-0 bottom-0 w-24 z-40 hidden md:flex items-center justify-end pr-4 opacity-0 hover:opacity-100 hover:bg-gradient-to-l from-black/50 to-transparent transition-all duration-500 text-white/50 hover:text-white pointer-events-auto">
            <ChevronRight size={48} strokeWidth={1} />
          </button>
        </>
      )}

      {/* === 視圖 A：Gallery 首頁 === */}
      {!selectedAlbum && (
        <section className="relative z-10 h-screen w-full flex items-center">
          {loadingAlbums ? (
            <div className="w-full flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500" size={32} /></div>
          ) : (
            <div ref={scrollContainerRef} className="flex items-center h-full w-full overflow-x-auto snap-x snap-mandatory px-[15vw] gap-[20vw] no-scrollbar overscroll-x-none" style={{ scrollbarWidth: 'none' }}>
              {albums.map((album, index) => (
                <div key={album.id} data-index={index} className="photo-item relative flex flex-col items-center justify-center shrink-0 w-[80vw] md:w-[400px] snap-center">
                  <div className="absolute top-[-20%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08)_0%,_rgba(0,0,0,0)_60%)] pointer-events-none z-0" />
                  <div className="absolute bottom-[100%] w-[1px] h-[50vh] bg-gradient-to-t from-zinc-500 to-transparent z-0 opacity-50" />

                  <motion.div animate={{ y: [0, -15, 0], rotate: [-0.5, 0.5, -0.5] }} transition={{ duration: 6 + (index % 3), repeat: Infinity, ease: "easeInOut" }} className="relative z-10 w-full cursor-pointer group" onClick={() => handleSelectAlbum(album)}>
  
                  {/* 邊框也會跟著連動亮起 */}
                  <div className={`relative w-full aspect-[3/4] bg-zinc-900 shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center border transition-colors duration-700 ${activeIndex === index ? 'border-zinc-500' : 'border-zinc-800 group-hover:border-zinc-500'}`}>
                    
                    {album.coverImage ? (
                      <Image 
                        draggable={false} 
                        src={album.coverImage} 
                        alt={album.title} 
                        fill 
                        // 💡 關鍵魔法：如果在中央 (activeIndex === index) 就顯示彩色並稍微放大，否則保持黑白等待滑鼠 hover
                        className={`object-contain transition-all duration-[1500ms] pointer-events-none ${
                          activeIndex === index 
                            ? 'grayscale-0 scale-105' 
                            : 'grayscale scale-100 group-hover:grayscale-0 group-hover:scale-105'
                        }`} 
                      />
                    ) : (<FolderOpen size={48} className="text-zinc-800"/>)}
                  </div>
                
                  {/* 下方的文字也會在滑動到中央時自動亮起 */}
                  <div className={`absolute -bottom-24 left-0 w-full text-center font-serif transition-opacity duration-700 ${activeIndex === index ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>
                    <h2 className="text-2xl tracking-[0.2em] text-white mb-2 uppercase">{album.title}</h2>
                    <span className="text-[10px] text-zinc-500 tracking-[0.4em] uppercase">Enter Collection</span>
                  </div>

                  </motion.div>
                </div>
              ))}
              <div className="shrink-0 w-[10vw]" />
            </div>
          )}
          
          {/* 首頁進度指示器 */}
          {!loadingAlbums && albums.length > 1 && (
            <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-40 pointer-events-none">
              <div className="text-[10px] font-serif tracking-[0.4em] text-white mb-3 flex items-center">
                {String(activeIndex + 1).padStart(2, '0')} <span className="text-zinc-700 mx-3">/</span> {String(albums.length).padStart(2, '0')}
              </div>
              <div className="w-32 h-[1px] bg-zinc-800 relative overflow-hidden">
                <motion.div className="absolute top-0 left-0 h-full bg-white" animate={{ width: `${((activeIndex + 1) / albums.length) * 100}%` }} transition={{ duration: 0.5, ease: "easeInOut" }} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* === 視圖 B：系列內部相片 === */}
      {selectedAlbum && (
        <section className="relative z-10 h-screen w-full flex flex-col justify-center">
          {loadingPhotos ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500" size={32} /></div>
          ) : photos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-serif">
               <p className="tracking-widest mb-4">此系列尚無照片。</p>
               <button onClick={() => setSelectedAlbum(null)} className="text-xs uppercase border border-zinc-800 px-4 py-2 hover:bg-white hover:text-black transition-all pointer-events-auto">返回列表</button>
            </div>
          ) : (
            // 💡 修復 2：加上 pt-24 pb-20 增加上下內距，把照片往下推，避免被縮圖遮住
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory px-[15vw] gap-[8vw] md:gap-[10vw] no-scrollbar overscroll-x-none pt-28 pb-20" style={{ scrollbarWidth: 'none' }} ref={scrollContainerRef}>
              {photos.map((photo, index) => (
                <div key={photo.id} data-index={index} className="photo-item relative flex flex-col items-center justify-center shrink-0 w-[85vw] md:w-[70vw] max-w-[1000px] h-full snap-center cursor-zoom-in" onClick={() => setSelectedLightboxPhoto(photo)}>
                  
                  <div className={`relative transition-all duration-700 ease-out flex justify-center items-center ${activeIndex === index ? 'opacity-100 scale-100' : 'opacity-30 scale-90 grayscale'}`}>
                    
                    {/* 💡 修復 3：改用 inline-flex 讓容器「緊貼」圖片邊緣 */}
                    <div className="relative inline-flex max-w-full max-h-full shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
                      {/* 放棄 Image fill，改用原生的 img，確保容器與圖片一樣大 */}
                      <img 
                        draggable={false} 
                        src={photo.imageUrl} 
                        alt="Photo" 
                        className="max-h-[60vh] md:max-h-[70vh] w-auto object-contain pointer-events-none" 
                      />
                      
                      {/* 💡 畫廊印章：現在會完美緊貼在「相片本身」的右下角，且顏色是鮮豔的紅！ */}
                      {activeIndex === index && (
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 0.85 }} 
                          transition={{ delay: 0.5 }}
                          // 移除了 grayscale，保留原本紅印章顏色，加上 drop-shadow 讓它在黑白圖上更明顯
                          className="absolute bottom-2 right-2 md:bottom-4 md:right-4 w-6 md:w-10 pointer-events-none select-none drop-shadow-md"
                        >
                          <img src="/logo.png" alt="Stamp" className="w-full h-auto" />
                        </motion.div>
                      )}
                    </div>

                  </div>
                </div>
              ))}
              <div className="shrink-0 w-[10vw] md:w-[20vw]" />
            </motion.div>
          )}

          {/* 相片進度指示器與標題 */}
          {selectedAlbum && photos.length > 0 && (
            <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 w-full flex flex-col items-center z-40 pointer-events-none">
              <div className="bg-black/30 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none px-6 py-2 rounded-xl text-center">
                <h2 className="text-sm md:text-lg tracking-[0.2em] text-white mb-1 uppercase font-serif drop-shadow-lg">{selectedAlbum.title}</h2>
                {selectedAlbum.description && (
                  <p className="text-[10px] md:text-xs tracking-[0.1em] text-zinc-400 font-serif drop-shadow-md line-clamp-1 max-w-[80vw]">
                    {selectedAlbum.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* === 💡 燈箱防盜 (放大觀看時同步修復) === */}
      <AnimatePresence>
        {selectedLightboxPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/98 backdrop-blur-xl cursor-zoom-out" onClick={() => setSelectedLightboxPhoto(null)}>
            <button className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-[110]"><X size={32} strokeWidth={1} /></button>
            
            {/* 一樣使用緊貼容器 */}
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative inline-flex max-w-[95vw] max-h-[85vh] px-4">
              
              <img 
                draggable={false} 
                src={selectedLightboxPhoto.imageUrl} 
                alt="Selected" 
                className="max-w-full max-h-[85vh] w-auto object-contain pointer-events-none shadow-2xl" 
              />
              
              {/* 燈箱紅色印章 */}
              <div className="absolute bottom-6 right-6 w-10 md:w-14 opacity-90 pointer-events-none select-none drop-shadow-lg">
                <img src="/logo.png" alt="Stamp" className="w-full h-auto" />
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
