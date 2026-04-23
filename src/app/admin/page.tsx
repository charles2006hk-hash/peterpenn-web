// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, where, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Camera, LogOut, UploadCloud, Image as ImageIcon, BookOpen, Calendar, Settings, Plus, Trash2, User as UserIcon, Edit2, EyeOff, Eye, X, Video, Play, Folder, Images, Save } from "lucide-react";

// 動態載入 ReactQuill，關閉 SSR
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("gallery");
  
  // === 系統全域設置 (Settings) ===
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(["Monochrome", "Street", "Commercial"]);
  const [newCategory, setNewCategory] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // === 📸 Gallery 2.0 (分層架構) 狀態 ===
  const [albums, setAlbums] = useState<any[]>([]);
  const [currentAlbum, setCurrentAlbum] = useState<any | null>(null); // 當前進入的系列
  const [albumPhotos, setAlbumPhotos] = useState<any[]>([]);
  
  // 建立/編輯系列表單
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");
  const [albumCategory, setAlbumCategory] = useState("");
  const [albumCoverUrl, setAlbumCoverUrl] = useState<string | null>(null);
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null);
  const [albumIsArchived, setAlbumIsArchived] = useState(false);
  const [isSavingAlbum, setIsSavingAlbum] = useState(false);

  // 批量上傳狀態
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");

  // === News 狀態 ===
  const [newsList, setNewsList] = useState<any[]>([]);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsIsArchived, setNewsIsArchived] = useState(false);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsDate, setNewsDate] = useState("");
  const [newsEndDate, setNewsEndDate] = useState("");
  const [newsType, setNewsType] = useState("Exhibition & Seminar");
  const [newsLocation, setNewsLocation] = useState("");
  const [newsDesc, setNewsDesc] = useState("");
  const [newsVideoUrl, setNewsVideoUrl] = useState("");
  const [newsFile, setNewsFile] = useState<File | null>(null);
  const [newsPreviewUrl, setNewsPreviewUrl] = useState<string | null>(null);
  const [newsUploading, setNewsUploading] = useState(false);

  // === Teachings 狀態 ===
  const [teachList, setTeachList] = useState<any[]>([]);
  const [editingTeachId, setEditingTeachId] = useState<string | null>(null);
  const [teachIsArchived, setTeachIsArchived] = useState(false);
  const [teachTitle, setTeachTitle] = useState("");
  const [teachCategory, setTeachCategory] = useState("");
  const [teachTags, setTeachTags] = useState("");
  const [teachSeries, setTeachSeries] = useState("");
  const [teachChapter, setTeachChapter] = useState("");
  const [teachVideoUrl, setTeachVideoUrl] = useState("");
  const [teachContent, setTeachContent] = useState("");
  const [teachFile, setTeachFile] = useState<File | null>(null);
  const [teachPreviewUrl, setTeachPreviewUrl] = useState<string | null>(null);
  const [teachUploading, setTeachUploading] = useState(false);

  // 💡 自動萃取歷史紀錄中的「所有系列」與「所有標籤」
  const existingSeries = Array.from(new Set(teachList.map(t => t.seriesName).filter(Boolean)));
  const existingTags = Array.from(new Set(teachList.flatMap(t => t.tags || []))).filter(Boolean);

  // === 初始化載入 ===
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    const fetchSettings = async () => {
      const profileSnap = await getDoc(doc(db, "settings", "profile"));
      if (profileSnap.exists()) {
        setBio(profileSnap.data().bio || "");
        setProfileImageUrl(profileSnap.data().imageUrl || "");
        setProfilePreviewUrl(profileSnap.data().imageUrl || "");
      }
      const configSnap = await getDoc(doc(db, "settings", "config"));
      if (configSnap.exists() && configSnap.data().categories?.length > 0) {
        setCategories(configSnap.data().categories);
        setAlbumCategory(configSnap.data().categories[0]);
        setTeachCategory(configSnap.data().categories[0]);
      }
    };
    fetchSettings();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === "news") fetchNewsList();
    if (activeTab === "teachings") fetchTeachList();
    if (activeTab === "gallery") fetchAlbums(); // 💡 載入系列清單
  }, [activeTab]);

  const fetchNewsList = async () => {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setNewsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchTeachList = async () => {
    const q = query(collection(db, "teachings"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setTeachList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { alert("登入失敗"); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      if (type === "profile") {
        setProfileFile(selectedFile);
        if (profilePreviewUrl && profilePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(profilePreviewUrl);
        setProfilePreviewUrl(url);
      } else if (type === "album") { // 💡 Gallery 2.0
        setAlbumCoverFile(selectedFile);
        if (albumCoverUrl && albumCoverUrl.startsWith('blob:')) URL.revokeObjectURL(albumCoverUrl);
        setAlbumCoverUrl(url);
      } else if (type === "news") {
        setNewsFile(selectedFile);
        if (newsPreviewUrl && newsPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(newsPreviewUrl);
        setNewsPreviewUrl(url);
      } else {
        setTeachFile(selectedFile);
        if (teachPreviewUrl && teachPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(teachPreviewUrl);
        setTeachPreviewUrl(url);
      }
    }
  };

  // === Settings 邏輯 ===
  const handleSaveProfile = async () => {
    setIsSavingSettings(true);
    try {
      let finalImageUrl = profileImageUrl;
      if (profileFile) {
        const compressed = await imageCompression(profileFile, { maxSizeMB: 0.2, maxWidthOrHeight: 1080 });
        const storageRef = ref(storage, `settings/profile_${Date.now()}`);
        await uploadBytesResumable(storageRef, compressed);
        finalImageUrl = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "settings", "profile"), { bio, imageUrl: finalImageUrl }, { merge: true });
      setProfileImageUrl(finalImageUrl);
      setProfileFile(null);
      alert("個人簡介與照片已更新！");
    } catch (e) { alert("更新失敗"); }
    setIsSavingSettings(false);
  };

  const addCategory = async () => {
    if (!newCategory) return;
    await setDoc(doc(db, "settings", "config"), { categories: arrayUnion(newCategory) }, { merge: true });
    setCategories([...categories, newCategory]);
    setNewCategory("");
  };

  const removeCategory = async (cat: string) => {
    await setDoc(doc(db, "settings", "config"), { categories: arrayRemove(cat) }, { merge: true });
    setCategories(categories.filter(c => c !== cat));
  };


  // ==========================================
  // 📸 Gallery 2.0 核心邏輯 (系列與相片管理)
  // ==========================================
  const fetchAlbums = async () => {
    const q = query(collection(db, "albums"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setAlbums(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchPhotos = async (albumId: string) => {
    // 前台需要依照 order 排序，這裡也依照 order 排序顯示
    const q = query(collection(db, "photos"), where("albumId", "==", albumId), orderBy("order", "asc"));
    const snap = await getDocs(q);
    setAlbumPhotos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const resetAlbumForm = () => {
    setEditingAlbumId(null); setAlbumTitle(""); setAlbumDesc(""); setAlbumCoverUrl(null); setAlbumCoverFile(null); setAlbumIsArchived(false);
  };

  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumTitle) return alert("請填寫系列名稱");
    setIsSavingAlbum(true);
    try {
      let finalCover = albumCoverUrl;
      // 封面圖壓縮 (200KB以下)
      if (albumCoverFile) {
        const compressed = await imageCompression(albumCoverFile, { maxSizeMB: 0.2, maxWidthOrHeight: 1920 });
        const sRef = ref(storage, `albums/cover_${Date.now()}`);
        await uploadBytesResumable(sRef, compressed);
        finalCover = await getDownloadURL(sRef);
      }
      const data = { title: albumTitle, description: albumDesc, category: albumCategory || categories[0], coverImage: finalCover || "", isArchived: albumIsArchived };
      
      if (editingAlbumId) {
        await updateDoc(doc(db, "albums", editingAlbumId), data);
        alert("系列更新成功");
      } else {
        await addDoc(collection(db, "albums"), { ...data, createdAt: serverTimestamp() });
        alert("系列建立成功，現在可以點擊進入上傳相片！");
      }
      resetAlbumForm(); fetchAlbums();
    } catch (e) { console.error(e); alert("失敗"); } finally { setIsSavingAlbum(false); }
  };

  const handleEditAlbum = (a: any) => {
    setEditingAlbumId(a.id); setAlbumTitle(a.title); setAlbumDesc(a.description || ""); setAlbumCategory(a.category); setAlbumCoverUrl(a.coverImage); setAlbumIsArchived(a.isArchived || false); setAlbumCoverFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAlbum = async (id: string) => {
    if(!confirm("刪除系列將無法復原，確認刪除？(請先手動刪除系列內的照片)")) return;
    await deleteDoc(doc(db, "albums", id));
    fetchAlbums();
  };

  // 💡 批量上傳相片
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !currentAlbum) return;
    setBatchUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        setBatchProgress(`處理中... 第 ${i + 1} 張 / 共 ${files.length} 張`);
        const file = files[i];
        // 強制無損壓縮，控制在 200KB 左右，最大邊長 1920px
        const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1920, useWebWorker: true });
        const sRef = ref(storage, `photos/${currentAlbum.id}/${Date.now()}_${i}`);
        await uploadBytesResumable(sRef, compressed);
        const url = await getDownloadURL(sRef);

        // 存入 photos 集合，預設 order 為當前陣列長度 + i
        await addDoc(collection(db, "photos"), {
          albumId: currentAlbum.id,
          imageUrl: url,
          order: albumPhotos.length + i,
          createdAt: serverTimestamp()
        });
      }
      alert(`成功上傳 ${files.length} 張相片！`);
      fetchPhotos(currentAlbum.id); // 重新抓取該系列的相片
    } catch (err) {
      console.error(err); alert("部分上傳發生錯誤，請檢查網路連線。");
    } finally {
      setBatchUploading(false); setBatchProgress("");
    }
  };

  const handleUpdatePhotoOrder = async (photoId: string, newOrder: number) => {
    await updateDoc(doc(db, "photos", photoId), { order: newOrder });
    fetchPhotos(currentAlbum!.id); // 重新抓取以更新排序
  };

  const handleDeletePhoto = async (photoId: string) => {
    if(!confirm("確定刪除此相片？")) return;
    await deleteDoc(doc(db, "photos", photoId));
    fetchPhotos(currentAlbum!.id);
  };


  // === Teachings 邏輯 ===
  const resetTeachForm = () => {
    setEditingTeachId(null); setTeachTitle(""); setTeachTags(""); setTeachSeries(""); setTeachChapter(""); setTeachVideoUrl(""); setTeachContent(""); setTeachFile(null); setTeachPreviewUrl(null); setTeachIsArchived(false);
  };

  const handleQuickAddTag = (tag: string) => {
    const currentTags = teachTags.split(',').map(t => t.trim()).filter(Boolean);
    if (!currentTags.includes(tag)) {
      setTeachTags(currentTags.length > 0 ? `${currentTags.join(', ')}, ${tag}` : tag);
    }
  };

  const handleTeachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachTitle || !teachContent) return alert("請填寫標題與內容");
    setTeachUploading(true);
    try {
      let finalCover = teachPreviewUrl;
      if (teachFile) {
        const comp = await imageCompression(teachFile, { maxSizeMB: 0.2, maxWidthOrHeight: 1920 });
        const refS = ref(storage, `teachings/cov_${Date.now()}`);
        await uploadBytesResumable(refS, comp);
        finalCover = await getDownloadURL(refS);
      }
      const tArr = teachTags.split(',').map(t=>t.trim()).filter(t=>t!=="");
      const data = { title: teachTitle, category: teachCategory || categories[0], tags: tArr, seriesName: teachSeries, chapterIndex: teachChapter ? Number(teachChapter) : null, videoUrl: teachVideoUrl, content: teachContent, coverImage: finalCover || "", isArchived: teachIsArchived };
      
      if (editingTeachId) {
        await updateDoc(doc(db, "teachings", editingTeachId), data);
        alert("更新成功");
      } else {
        await addDoc(collection(db, "teachings"), { ...data, createdAt: serverTimestamp() });
        alert("發佈成功");
      }
      resetTeachForm(); fetchTeachList();
    } catch (e) { alert("失敗"); } finally { setTeachUploading(false); }
  };

  const handleEditTeach = (item: any) => {
    setEditingTeachId(item.id); setTeachTitle(item.title); setTeachCategory(item.category); setTeachTags(item.tags?.join(", ") || ""); setTeachSeries(item.seriesName || ""); setTeachChapter(item.chapterIndex?.toString() || ""); setTeachVideoUrl(item.videoUrl || ""); setTeachContent(item.content); setTeachPreviewUrl(item.coverImage || null); setTeachIsArchived(item.isArchived || false); setTeachFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === News 邏輯 ===
  const resetNewsForm = () => {
    setEditingNewsId(null); setNewsTitle(""); setNewsDate(""); setNewsEndDate(""); setNewsLocation(""); setNewsDesc(""); setNewsVideoUrl(""); setNewsIsArchived(false); setNewsFile(null); setNewsPreviewUrl(null);
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsDate) return alert("請填寫標題與開始日期");
    setNewsUploading(true);
    try {
      let finalCoverImage = newsPreviewUrl;
      if (newsFile) {
        const compressedFile = await imageCompression(newsFile, { maxSizeMB: 0.2, maxWidthOrHeight: 1920 });
        const storageRef = ref(storage, `works/news_${Date.now()}`);
        await uploadBytesResumable(storageRef, compressedFile);
        finalCoverImage = await getDownloadURL(storageRef);
      }
      const newsData = { title: newsTitle, date: newsDate, endDate: newsEndDate, type: newsType, location: newsLocation, description: newsDesc, videoUrl: newsVideoUrl, coverImage: finalCoverImage || "", isArchived: newsIsArchived };

      if (editingNewsId) await updateDoc(doc(db, "news", editingNewsId), newsData);
      else await addDoc(collection(db, "news"), { ...newsData, createdAt: serverTimestamp() });
      
      alert("儲存成功");
      resetNewsForm(); fetchNewsList();
    } catch (e) { alert("失敗"); } finally { setNewsUploading(false); }
  };

  const handleEditNews = (item: any) => {
    setEditingNewsId(item.id); setNewsTitle(item.title); setNewsDate(item.date); setNewsEndDate(item.endDate || ""); setNewsType(item.type); setNewsLocation(item.location || ""); setNewsDesc(item.description || ""); setNewsVideoUrl(item.videoUrl || ""); setNewsIsArchived(item.isArchived || false); setNewsPreviewUrl(item.coverImage || null); setNewsFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // UI 渲染
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-serif">
        <Camera size={48} className="mb-8 opacity-70" strokeWidth={1} />
        <h1 className="text-2xl tracking-[0.2em] mb-8 uppercase font-light">System Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-6 w-80">
          <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="bg-transparent border-b border-zinc-700 pb-2 outline-none focus:border-white transition-colors" required />
          <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="bg-transparent border-b border-zinc-700 pb-2 outline-none focus:border-white transition-colors" required />
          <button className="border border-zinc-700 py-3 hover:bg-white hover:text-black transition-colors text-sm uppercase tracking-widest mt-4">Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex overflow-hidden">
      {/* 側邊選單 */}
      <aside className="w-64 border-r border-zinc-800 p-8 flex flex-col justify-between hidden md:flex bg-black z-10 shrink-0">
        <div>
          <h1 className="font-serif text-lg tracking-[0.2em] mb-12 text-zinc-400 uppercase">PETERPENN<br/><span className="text-xs">Admin Panel</span></h1>
          <nav className="space-y-4">
            {/* 💡 點擊 Gallery 時重置 currentAlbum，回到系列列表 */}
            <button onClick={() => {setActiveTab("gallery"); setCurrentAlbum(null);}} className={`flex items-center gap-3 w-full text-left text-sm tracking-widest p-3 transition-colors ${activeTab === 'gallery' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><ImageIcon size={16} /> 展廳 2.0</button>
            <button onClick={() => setActiveTab("teachings")} className={`flex items-center gap-3 w-full text-left text-sm tracking-widest p-3 transition-colors ${activeTab === 'teachings' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><BookOpen size={16} /> 媒體與教學</button>
            <button onClick={() => setActiveTab("news")} className={`flex items-center gap-3 w-full text-left text-sm tracking-widest p-3 transition-colors ${activeTab === 'news' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><Calendar size={16} /> 最新動態</button>
            <button onClick={() => setActiveTab("settings")} className={`flex items-center gap-3 w-full text-left text-sm tracking-widest p-3 transition-colors ${activeTab === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><Settings size={16} /> 系統設置</button>
          </nav>
        </div>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 text-sm text-zinc-500 hover:text-white transition-colors tracking-widest"><LogOut size={16} /> 安全登出</button>
      </aside>

      <main className="flex-1 p-8 md:p-16 h-screen overflow-y-auto relative">
        
        {/* ==========================================
            📸 模組：Gallery 2.0 (分層架構管理) 
            ========================================== */}
        {activeTab === "gallery" && (
          <div className="max-w-6xl mx-auto space-y-16 pb-20">
            
            {/* 視圖 A：管理單一系列內的相片 */}
            {currentAlbum ? (
              <section>
                <header className="mb-12 border-b border-zinc-800 pb-6 flex items-center justify-between">
                  <div>
                    <button onClick={() => setCurrentAlbum(null)} className="text-zinc-500 hover:text-white text-xs tracking-widest uppercase mb-4 flex items-center gap-2 transition-colors"><X size={14}/> 返回系列列表</button>
                    <h2 className="text-2xl font-serif tracking-widest uppercase flex items-center gap-4">
                      <Folder size={24} className="text-zinc-600"/> 系列：{currentAlbum.title}
                    </h2>
                  </div>
                  
                  {/* 💡 批量上傳區塊 */}
                  <div className="relative">
                    <input type="file" multiple accept="image/*" onChange={handleBatchUpload} disabled={batchUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    <button disabled={batchUploading} className="flex items-center gap-2 bg-white text-black px-6 py-3 font-bold tracking-widest text-sm uppercase hover:bg-zinc-300 transition-colors">
                      <Images size={16} /> {batchUploading ? batchProgress : "批量上傳相片 (多選)"}
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {albumPhotos.length === 0 && !batchUploading && <p className="col-span-full text-zinc-500 tracking-widest font-serif text-center py-20">此系列尚無照片，請點擊右上角批量上傳。</p>}
                  
                  {albumPhotos.map((photo) => (
                    <div key={photo.id} className="bg-zinc-900 border border-zinc-800 flex flex-col">
                      <div className="relative w-full aspect-square bg-black border-b border-zinc-800">
                        <Image src={photo.imageUrl} alt="Photo" fill className="object-contain" />
                      </div>
                      <div className="p-3 flex items-center justify-between gap-4">
                        <div className="flex flex-col flex-1">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">排序號 (愈小越前)</label>
                          <div className="flex items-center gap-2">
                            <input type="number" defaultValue={photo.order} onBlur={(e) => handleUpdatePhotoOrder(photo.id, Number(e.target.value))} className="w-16 bg-zinc-950 border border-zinc-700 p-1 text-center text-xs outline-none" />
                            <Save size={12} className="text-zinc-600" />
                          </div>
                        </div>
                        <button onClick={() => handleDeletePhoto(photo.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              /* 視圖 B：系列 (Album) 總覽與新增 */
              <>
                <section>
                  <header className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl font-serif tracking-widest uppercase">{editingAlbumId ? "編輯系列資訊" : "建立新系列 (Album)"}</h2>
                      <p className="text-zinc-500 text-sm mt-2 tracking-widest font-serif italic">Gallery 2.0：請先建立系列，再點擊進入批量上傳照片。</p>
                    </div>
                    {editingAlbumId && (
                      <button onClick={resetAlbumForm} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-4 py-2 transition-colors uppercase"><X size={14}/> 取消編輯</button>
                    )}
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <form onSubmit={handleAlbumSubmit} className="space-y-6">
                      {editingAlbumId && (
                        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4">
                          <span className="text-xs text-zinc-400 tracking-widest">前台展出狀態：</span>
                          <button type="button" onClick={() => setAlbumIsArchived(!albumIsArchived)} className={`flex items-center gap-2 text-xs px-3 py-1 border transition-colors ${albumIsArchived ? 'border-amber-500/50 text-amber-500 bg-amber-500/10' : 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'}`}>
                            {albumIsArchived ? <><EyeOff size={14}/> 已封存 (隱藏)</> : <><Eye size={14}/> 展出中 (顯示)</>}
                          </button>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="系列名稱 TITLE (如：雋美黑白)" value={albumTitle} onChange={(e)=>setAlbumTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" required />
                        <select value={albumCategory} onChange={(e)=>setAlbumCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      
                      <textarea placeholder="系列心法描述 CONCEPT (選填)" value={albumDesc} onChange={(e)=>setAlbumDesc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" rows={3} />
                      
                      <div>
                        <label className="block text-xs tracking-widest text-zinc-500 mb-2">{editingAlbumId ? "更新系列封面 (不選則保留原圖)" : "選擇系列封面縮圖"}</label>
                        <input type="file" accept="image/*" onChange={(e)=>handleFileSelect(e,"album")} className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer" />
                      </div>

                      <button disabled={isSavingAlbum} className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 hover:bg-zinc-200 uppercase tracking-widest transition-colors font-bold"><UploadCloud size={18} /> {isSavingAlbum ? `處理中...` : (editingAlbumId ? "更新系列" : "建立系列")}</button>
                    </form>

                    <div className="bg-zinc-900/50 border border-zinc-800 flex items-center justify-center p-6 min-h-[300px]">
                      {albumCoverUrl ? <div className="relative w-full max-w-[280px] aspect-[4/3] bg-black shadow-2xl border border-zinc-700"><Image src={albumCoverUrl} alt="Preview" fill className="object-contain" /></div> : <div className="text-zinc-600 flex flex-col items-center"><ImageIcon size={48} className="mb-4 opacity-20" /><span className="text-sm tracking-widest font-serif">封面預覽區</span></div>}
                    </div>
                  </div>
                </section>

                <section className="border-t border-zinc-800 pt-16">
                  <h3 className="text-xl font-serif tracking-widest uppercase mb-8">展廳系列清單 (點擊進入上傳照片)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {albums.length === 0 && <div className="text-zinc-600 tracking-widest">目前無任何系列。</div>}
                    {albums.map((album) => (
                      <div key={album.id} className={`flex items-center justify-between p-4 border transition-colors ${album.isArchived ? 'bg-zinc-950 border-zinc-900 opacity-60' : 'bg-zinc-900/30 border-zinc-800'}`}>
                        <div className="flex items-center gap-4 cursor-pointer group flex-1" onClick={() => { setCurrentAlbum(album); fetchPhotos(album.id); }}>
                          <div className="relative w-20 h-16 bg-black border border-zinc-800 shrink-0 overflow-hidden">
                            {album.coverImage ? <Image src={album.coverImage} alt={album.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" /> : <Folder className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-700" />}
                          </div>
                          <div className="font-serif">
                            <div className="flex items-center gap-2 mb-1">
                              {album.isArchived ? <span className="bg-zinc-800 text-zinc-500 text-[10px] px-1.5 py-0.5">封存</span> : <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-1.5 py-0.5">展出中</span>}
                              <span className="text-[10px] text-zinc-500 uppercase">{album.category}</span>
                            </div>
                            <h4 className="text-sm md:text-base text-zinc-200 tracking-widest group-hover:text-white transition-colors">{album.title}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-4">
                          <button onClick={() => handleEditAlbum(album)} className="p-2 text-zinc-500 hover:text-white bg-zinc-800/50 rounded"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteAlbum(album.id)} className="p-2 text-zinc-500 hover:text-red-500 bg-zinc-800/50 rounded"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* ==========================================
            📝 模組：媒體與教學 (Teachings / Media) 
            ========================================== */}
        {activeTab === "teachings" && (
          <div className="max-w-5xl mx-auto space-y-16 pb-20">
            <section>
              <header className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-serif tracking-widest uppercase">{editingTeachId ? "編輯內容" : "發佈專欄或影音"}</h2>
                  <p className="text-zinc-500 text-sm mt-2 tracking-widest font-serif italic">大師筆記：支援 YouTube 媒體嵌入與高階圖文排版。</p>
                </div>
                {editingTeachId && (
                  <button onClick={resetTeachForm} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-4 py-2 transition-colors uppercase"><X size={14}/> 取消編輯</button>
                )}
              </header>

              <form onSubmit={handleTeachSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    {editingTeachId && (
                      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4">
                        <span className="text-xs text-zinc-400 tracking-widest">顯示狀態：</span>
                        <button type="button" onClick={() => setTeachIsArchived(!teachIsArchived)} className={`flex items-center gap-2 text-xs px-3 py-1 border transition-colors ${teachIsArchived ? 'border-amber-500/50 text-amber-500 bg-amber-500/10' : 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'}`}>
                          {teachIsArchived ? <><EyeOff size={14}/> 封存</> : <><Eye size={14}/> 發佈中</>}
                        </button>
                      </div>
                    )}
                    
                    <input type="text" placeholder="標題 TITLE" value={teachTitle} onChange={(e)=>setTeachTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" required />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" list="series-options" placeholder="所屬系列 (點擊下拉選單)" value={teachSeries} onChange={(e)=>setTeachSeries(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                      <datalist id="series-options">{existingSeries.map(s => <option key={s as string} value={s as string} />)}</datalist>
                      <input type="number" placeholder="章節序號 (如：1)" value={teachChapter} onChange={(e)=>setTeachChapter(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-3">
                      <Video size={18} className="text-red-500 shrink-0" />
                      <input type="url" placeholder="YouTube 影片網址 (選填，直接貼上即可)" value={teachVideoUrl} onChange={(e)=>setTeachVideoUrl(e.target.value)} className="flex-1 bg-transparent outline-none text-zinc-300" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <select value={teachCategory} onChange={(e)=>setTeachCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div>
                        <input type="text" placeholder="標籤 (用逗號隔開)" value={teachTags} onChange={(e)=>setTeachTags(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                        {existingTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="text-[10px] text-zinc-500 tracking-widest mt-1">常用：</span>
                            {existingTags.map(tag => (
                              <button key={tag as string} type="button" onClick={() => handleQuickAddTag(tag as string)} className="text-[10px] border border-zinc-700 px-2 py-0.5 text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors">+{tag as string}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs text-zinc-500 tracking-widest uppercase">文章封面圖片 (Cover)</label>
                    <div className="bg-zinc-900/50 border border-zinc-800 flex flex-col items-center justify-center p-4 h-[250px]">
                      {teachPreviewUrl ? <div className="relative w-full h-full"><Image src={teachPreviewUrl} alt="Cover" fill className="object-contain" /></div> : <div className="text-zinc-600 flex flex-col items-center"><ImageIcon size={32} className="mb-2 opacity-20" /><span className="text-xs">選擇封面</span></div>}
                    </div>
                    <input type="file" accept="image/*" onChange={(e)=>handleFileSelect(e,"teachings")} className="w-full text-xs text-zinc-500" />
                  </div>
                </div>

                <div className="bg-white text-black min-h-[500px] overflow-hidden rounded-sm">
                  <ReactQuill theme="snow" value={teachContent} onChange={setTeachContent} className="h-[450px]" modules={{ toolbar: [ [{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike', 'blockquote'], [{'list': 'ordered'}, {'list': 'bullet'}], [{ 'align': [] }], [{ 'color': [] }, { 'background': [] }], ['link', 'image', 'video'], ['clean'] ] }} />
                </div>

                <button disabled={teachUploading} className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 hover:bg-zinc-200 uppercase tracking-widest transition-colors font-bold">
                  <UploadCloud size={18} /> {teachUploading ? "上傳中..." : (editingTeachId ? "更新內容" : "正式發佈")}
                </button>
              </form>
            </section>

            <section className="border-t border-zinc-800 pt-16">
              <h3 className="text-xl font-serif tracking-widest uppercase mb-8">歷史媒體與教學列表</h3>
              <div className="space-y-4">
                {teachList.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 border transition-colors ${item.isArchived ? 'bg-zinc-950 border-zinc-900 opacity-60' : 'bg-zinc-900/30 border-zinc-800'}`}>
                    <div className="flex items-center gap-6">
                      <div className="relative w-16 h-12 bg-black border border-zinc-800 shrink-0">
                        {item.coverImage && <Image src={item.coverImage} alt="P" fill className="object-cover" />}
                      </div>
                      <div className="font-serif">
                        <div className="flex items-center gap-3 mb-1">
                          {item.isArchived ? <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5">封存</span> : <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5">發佈中</span>}
                          {item.videoUrl && <Play size={12} className="text-red-500" />}
                          <span className="text-xs text-zinc-500 uppercase">{item.category}</span>
                        </div>
                        <h4 className="text-base text-zinc-200 tracking-widest">{item.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditTeach(item)} className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded"><Edit2 size={16} /></button>
                      <button onClick={async () => {if(confirm("確定刪除?")){await deleteDoc(doc(db,"teachings",item.id)); fetchTeachList();}}} className="p-2 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* === 模組：最新動態 === */}
        {activeTab === "news" && (
          <div className="max-w-5xl mx-auto space-y-16 pb-20">
            <section>
              <header className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
                <div><h2 className="text-2xl font-serif tracking-widest uppercase">{editingNewsId ? "編輯動態" : "發佈新動態"}</h2></div>
                {editingNewsId && (<button onClick={resetNewsForm} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-4 py-2 transition-colors uppercase"><X size={14}/> 取消編輯</button>)}
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <form onSubmit={handleNewsSubmit} className="space-y-6">
                  {editingNewsId && (
                    <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4">
                      <span className="text-xs text-zinc-400 tracking-widest">前台顯示狀態：</span>
                      <button type="button" onClick={() => setNewsIsArchived(!newsIsArchived)} className={`flex items-center gap-2 text-xs px-3 py-1 border transition-colors ${newsIsArchived ? 'border-amber-500/50 text-amber-500 bg-amber-500/10' : 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'}`}>
                        {newsIsArchived ? <><EyeOff size={14}/> 已封存 (隱藏)</> : <><Eye size={14}/> 發佈中 (顯示)</>}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="date" value={newsDate} onChange={(e) => setNewsDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none text-zinc-300 [color-scheme:dark]" required />
                    <input type="date" value={newsEndDate} onChange={(e) => setNewsEndDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none text-zinc-300 [color-scheme:dark]" />
                    <select value={newsType} onChange={(e) => setNewsType(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500">
                      <option value="Upcoming Seminar">講座 (Seminar)</option>
                      <option value="Exhibition">展覽 (Exhibition)</option>
                      <option value="Exhibition & Seminar">展覽與講座</option>
                    </select>
                  </div>
                  <input type="text" placeholder="標題 TITLE" value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" required />
                  <input type="text" placeholder="地點 LOCATION" value={newsLocation} onChange={(e) => setNewsLocation(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                  
                  <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-3">
                    <Video size={18} className="text-red-500 shrink-0" />
                    <input type="url" placeholder="YouTube 影片網址 (選填)" value={newsVideoUrl} onChange={(e)=>setNewsVideoUrl(e.target.value)} className="flex-1 bg-transparent outline-none text-zinc-300" />
                  </div>

                  <textarea placeholder="詳細描述" value={newsDesc} onChange={(e) => setNewsDesc(e.target.value)} rows={4} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                  <div>
                    <label className="block text-xs tracking-widest text-zinc-500 mb-2">宣傳海報 (選填)</label>
                    <input type="file" accept="image/*" onChange={(e)=>handleFileSelect(e,"news")} className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer" />
                  </div>
                  <button disabled={newsUploading} className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 hover:bg-zinc-200 uppercase tracking-widest transition-colors"><UploadCloud size={18} /> {newsUploading ? "處理中..." : (editingNewsId ? "更新動態" : "發佈動態")}</button>
                </form>
                
                <div className="bg-zinc-900/50 border border-zinc-800 flex items-center justify-center p-6 min-h-[400px]">
                  {newsPreviewUrl ? (
                    <div className="relative w-full max-h-[400px] aspect-[3/4] bg-black shadow-2xl"><Image src={newsPreviewUrl} alt="Preview" fill className="object-contain" /></div>
                  ) : (
                    <div className="text-zinc-600 flex flex-col items-center"><ImageIcon size={48} className="mb-4 opacity-20" /><span className="text-sm tracking-widest font-serif">無附圖</span></div>
                  )}
                </div>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-16">
              <h3 className="text-xl font-serif tracking-widest uppercase mb-8">歷史動態列表</h3>
              <div className="space-y-4">
                {newsList.map((item) => (
                  <div key={item.id} className={`flex flex-col md:flex-row md:items-center justify-between p-6 border transition-colors ${item.isArchived ? 'bg-zinc-950 border-zinc-900 opacity-60' : 'bg-zinc-900/30 border-zinc-800'}`}>
                    <div className="flex-1 font-serif">
                      <div className="flex items-center gap-3 mb-2">
                        {item.isArchived ? <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5">封存</span> : <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5">顯示中</span>}
                        {item.videoUrl && <Play size={12} className="text-red-500" />}
                        <span className="text-xs text-zinc-400">{item.date} {item.endDate && `- ${item.endDate}`}</span>
                      </div>
                      <h4 className="text-lg text-zinc-200 tracking-widest">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-4 mt-6 md:mt-0">
                      <button onClick={() => handleEditNews(item)} className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded"><Edit2 size={16} /></button>
                      <button onClick={async () => {if(confirm("確定刪除?")){await deleteDoc(doc(db,"news",item.id)); fetchNewsList();}}} className="p-2 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* === 模組：系統設置 === */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-16 pb-20">
            <header className="border-b border-zinc-800 pb-6"><h2 className="text-2xl font-serif tracking-widest uppercase">系統全域設置 (Settings)</h2></header>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-zinc-500 text-xs tracking-[0.2em] uppercase flex items-center gap-2"><UserIcon size={14}/> 個人形象與簡介</h3>
                <textarea value={bio} onChange={(e)=>setBio(e.target.value)} rows={8} className="w-full bg-zinc-900 border border-zinc-800 p-4 outline-none text-sm leading-relaxed" placeholder="輸入首頁的關於大師簡介..." />
                <button onClick={handleSaveProfile} disabled={isSavingSettings} className="bg-white text-black px-8 py-4 text-xs tracking-widest hover:bg-zinc-200 transition-colors uppercase w-full font-bold">
                  {isSavingSettings ? "上傳並儲存中..." : "儲存大師簡介與照片"}
                </button>
              </div>
              <div className="flex flex-col items-center justify-center bg-zinc-900/30 border border-zinc-800 p-8">
                <div className="relative w-48 h-48 rounded-full overflow-hidden bg-black mb-6 border-2 border-zinc-800 shadow-2xl">
                  {profilePreviewUrl ? (
                    <Image src={profilePreviewUrl} alt="Portrait" fill className="object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                  ) : (
                    <UserIcon size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={(e)=>handleFileSelect(e, "profile")} className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-zinc-800 file:text-white cursor-pointer" />
              </div>
            </section>
            <section className="space-y-6 pt-8 border-t border-zinc-900">
              <h3 className="text-zinc-500 text-xs tracking-[0.2em] uppercase flex items-center gap-2"><Settings size={14}/> 作品類別管理 (Categories)</h3>
              <div className="flex gap-4 max-w-md">
                <input type="text" value={newCategory} onChange={(e)=>setNewCategory(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 p-3 text-sm" placeholder="新增類別名稱..." />
                <button onClick={addCategory} className="bg-zinc-800 px-6 py-3 text-xs hover:bg-zinc-700 transition-colors"><Plus size={16}/></button>
              </div>
              <div className="flex flex-wrap gap-3">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs tracking-widest">
                    {cat}
                    <button onClick={()=>removeCategory(cat)} className="text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
