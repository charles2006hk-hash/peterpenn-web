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
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    if (!selectedAlbum || photos.length === 0 || !scrollContainerRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveIndex(Number(entry.target.getAttribute("data-index")));
      });
    }, { root: scrollContainerRef.current, threshold: 0.6 });
    const elements = scrollContainerRef.current.querySelectorAll(".photo-item");
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selectedAlbum, photos]);

  useEffect(() => {
    document.body.style.overflow = selectedLightboxPhoto ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedLightboxPhoto]);

  return (
    // 💡 防盜第一關：整個 main 區塊封鎖滑鼠右鍵與長按選單
    <main 
      onContextMenu={(e) => e.preventDefault()} 
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      className="relative min-h-screen w-full bg-[#0a0a0a] text-white selection:bg-white selection:text-black overflow-hidden"
    >
      <div className="film-grain pointer-events-none" />

      {/* 頂部導航 */}
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
        
        {!loadingAlbums && albums.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto max-w-[50%] md:max-w-full pb-2 no-scrollbar pointer-events-auto">
            {albums.map((album) => (
              <button key={album.id} onClick={() => handleSelectAlbum(album)} className="relative group shrink-0">
                <div className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden transition-all duration-500 border-2 ${
                  selectedAlbum?.id === album.id ? 'border-white scale-110 grayscale-0' : 'border-zinc-800 grayscale hover:grayscale-0 hover:border-zinc-500'
                }`}>
                  {/* 💡 防盜：禁止拖曳圖片 */}
                  {album.coverImage ? <Image draggable={false} src={album.coverImage} alt="Album" fill className="object-cover pointer-events-none" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><FolderOpen size={12}/></div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* === 視圖 A：Gallery 首頁 === */}
      {!selectedAlbum && (
        <section className="relative z-10 h-screen w-full">
          {loadingAlbums ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500" size={32} /></div>
          ) : (
            <div className="flex items-center h-full overflow-x-auto snap-x snap-mandatory px-[15vw] gap-[20vw] no-scrollbar" style={{ scrollbarWidth: 'none' }}>
              {albums.map((album, index) => (
                <div key={album.id} className="relative flex flex-col items-center justify-center shrink-0 w-[80vw] md:w-[400px] snap-center">
                  <div className="absolute top-[-20%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08)_0%,_rgba(0,0,0,0)_60%)] pointer-events-none z-0" />
                  <div className="absolute bottom-[100%] w-[1px] h-[50vh] bg-gradient-to-t from-zinc-500 to-transparent z-0 opacity-50" />

                  <motion.div animate={{ y: [0, -15, 0], rotate: [-0.5, 0.5, -0.5] }} transition={{ duration: 6 + (index % 3), repeat: Infinity, ease: "easeInOut" }} className="relative z-10 w-full cursor-pointer group" onClick={() => handleSelectAlbum(album)}>
                    <div className="relative w-full aspect-[3/4] bg-zinc-900 shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center">
                      {/* 💡 防盜設定 */}
                      {album.coverImage ? (
                        <Image draggable={false} src={album.coverImage} alt={album.title} fill className="object-contain grayscale group-hover:grayscale-0 transition-all duration-[1500ms] pointer-events-none" />
                      ) : (<FolderOpen size={48} className="text-zinc-800"/>)}
                    </div>
                    <div className="absolute -bottom-24 left-0 w-full text-center font-serif opacity-80 group-hover:opacity-100 transition-opacity duration-700">
                      <h2 className="text-2xl tracking-[0.2em] text-white mb-2 uppercase">{album.title}</h2>
                      <span className="text-[10px] text-zinc-500 tracking-[0.4em] uppercase">Enter Collection</span>
                    </div>
                  </motion.div>
                </div>
              ))}
              <div className="shrink-0 w-[10vw]" />
            </div>
          )}
        </section>
      )}

      {/* === 視圖 B：系列內部相片 === */}
      {selectedAlbum && (
        <section className="relative z-10 h-screen w-full">
          {loadingPhotos ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500" size={32} /></div>
          ) : photos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-serif">
               <p className="tracking-widest mb-4">此系列尚無照片。</p>
               <button onClick={() => setSelectedAlbum(null)} className="text-xs uppercase border border-zinc-800 px-4 py-2 hover:bg-white hover:text-black transition-all">返回列表</button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory px-[15vw] gap-[8vw] md:gap-[10vw] no-scrollbar" style={{ scrollbarWidth: 'none' }} ref={scrollContainerRef}>
              {photos.map((photo, index) => (
                <div key={photo.id} data-index={index} className="photo-item relative flex flex-col items-center justify-center shrink-0 w-[85vw] md:w-[70vw] max-w-[1000px] h-[60vh] md:h-[75vh] snap-center cursor-zoom-in" onClick={() => setSelectedLightboxPhoto(photo)}>
                  <div className={`relative h-full w-full transition-all duration-700 ease-out flex justify-center items-center ${activeIndex === index ? 'grayscale-0 opacity-100 scale-100 shadow-[0_40px_100px_rgba(0,0,0,0.9)]' : 'grayscale opacity-20 scale-90'}`}>
                    {/* 💡 防盜設定 */}
                    <Image draggable={false} src={photo.imageUrl} alt="P" fill className="object-contain pointer-events-none" priority={index < 3} />
                  </div>
                </div>
              ))}
              <div className="shrink-0 w-[10vw] md:w-[20vw]" />
            </motion.div>
          )}

          {/* 💡 修復：加強對比、加入毛玻璃背板，讓描述文字清晰可見 */}
          {selectedAlbum && photos.length > 0 && (
            <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 w-[90vw] md:w-auto max-w-2xl text-center font-serif pointer-events-none z-40 bg-black/40 md:bg-transparent backdrop-blur-md md:backdrop-blur-none p-4 rounded-xl border border-zinc-800/50 md:border-none">
               <h2 className="text-lg md:text-xl tracking-[0.2em] text-white mb-2 uppercase drop-shadow-lg">{selectedAlbum.title}</h2>
               {selectedAlbum.description && (
                 <p className="text-[11px] md:text-xs tracking-[0.1em] text-zinc-300 drop-shadow-md leading-relaxed">
                   {selectedAlbum.description}
                 </p>
               )}
            </div>
          )}
        </section>
      )}

      {/* 💡 燈箱防盜 */}
      <AnimatePresence>
        {selectedLightboxPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/98 backdrop-blur-xl cursor-zoom-out" onClick={() => setSelectedLightboxPhoto(null)}>
            <button className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-[110]"><X size={32} strokeWidth={1} /></button>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative w-full max-w-6xl h-[80vh] px-4">
              <Image draggable={false} src={selectedLightboxPhoto.imageUrl} alt="Selected" fill className="object-contain pointer-events-none" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
