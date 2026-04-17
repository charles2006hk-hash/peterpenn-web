// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Camera, LogOut, UploadCloud, Image as ImageIcon, BookOpen, Calendar, Settings, Plus, Trash2, User as UserIcon, Edit2, EyeOff, Eye, X, Youtube } from "lucide-react";

// 動態載入 ReactQuill (支援 React 19)，關閉 SSR
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("teachings");
  
  // === 系統全域設置 (Settings) ===
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(["Monochrome", "Street", "Commercial"]);
  const [newCategory, setNewCategory] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // === Gallery 狀態 ===
  const [galleryList, setGalleryList] = useState<any[]>([]);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [galleryIsArchived, setGalleryIsArchived] = useState(false);
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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
        setCategory(configSnap.data().categories[0]);
        setTeachCategory(configSnap.data().categories[0]);
      }
    };
    fetchSettings();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === "news") fetchNewsList();
    if (activeTab === "gallery") fetchGalleryList();
    if (activeTab === "teachings") fetchTeachList();
  }, [activeTab]);

  const fetchNewsList = async () => {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setNewsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchGalleryList = async () => {
    const q = query(collection(db, "works"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setGalleryList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  // 統一圖片選擇處理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "gallery" | "news" | "teachings" | "profile") => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      if (type === "profile") {
        setProfileFile(selectedFile);
        if (profilePreviewUrl && profilePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(profilePreviewUrl);
        setProfilePreviewUrl(url);
      } else if (type === "gallery") {
        setFile(selectedFile);
        if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
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

  // === Gallery 邏輯 ===
  const resetGalleryForm = () => {
    setEditingGalleryId(null); setTitle(""); setConcept(""); setFile(null); setPreviewUrl(null); setGalleryIsArchived(false); setProgress(0);
  };

  const handleGallerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert("請填寫作品名稱");
    if (!file && !editingGalleryId) return alert("請選擇圖片");
    setUploading(true);
    try {
      let finalImageUrl = previewUrl;
      if (file) {
        const compressedFile = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1920, useWebWorker: true });
        const storageRef = ref(storage, `works/gallery_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);
        await new Promise((resolve, reject) => {
          uploadTask.on("state_changed", (s) => setProgress((s.bytesTransferred/s.totalBytes)*100), reject, async () => {
            finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(null);
          });
        });
      }
      const galleryData = { title, concept, category: category || categories[0], imageUrl: finalImageUrl, isArchived: galleryIsArchived };
      if (editingGalleryId) {
        await updateDoc(doc(db, "works", editingGalleryId), galleryData);
        alert("更新成功");
      } else {
        await addDoc(collection(db, "works"), { ...galleryData, createdAt: serverTimestamp() });
        alert("發佈成功");
      }
      resetGalleryForm(); fetchGalleryList();
    } catch (e) { alert("失敗"); } finally { setUploading(false); setProgress(0); }
  };

  const handleEditGallery = (item: any) => {
    setEditingGalleryId(item.id); setTitle(item.title); setConcept(item.concept || ""); setCategory(item.category); setGalleryIsArchived(item.isArchived || false); setPreviewUrl(item.imageUrl); setFile(null); setProgress(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === Teachings 邏輯 ===
  const resetTeachForm = () => {
    setEditingTeachId(null); setTeachTitle(""); setTeachTags(""); setTeachSeries(""); setTeachChapter(""); setTeachVideoUrl(""); setTeachContent(""); setTeachFile(null); setTeachPreviewUrl(null); setTeachIsArchived(false);
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
        <h1 className="text-2xl tracking-[0.2em] mb-8">System Login</h1>
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
      <aside className="w-64 border-r border-zinc-800 p-8 flex flex-col justify-between hidden md:flex bg-black z-10 shrink-0">
        <div>
          <h1 className="font-serif text-lg tracking-[0.2em] mb-12 text-zinc-400 uppercase">PETERPENN<br/><span className="text-xs">Admin Panel</span></h1>
          <nav className="space-y-4">
            <button onClick={() => setActiveTab("gallery")} className={`flex items-center gap-3 w-full text-left text-sm tracking-widest p-3 transition-colors ${activeTab === 'gallery' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><ImageIcon size={16} /> 展廳作品</button>
            <button onClick={() => setActiveTab("teachings")} className={`flex items-center gap-3 w-full text-left text-sm tracking-widest p-3 transition-colors ${activeTab === 'teachings' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><BookOpen size={16} /> 教學文章</button>
            <button onClick={() => setActiveTab("news")} className={`flex items-center gap-3 w-full text-left text-sm tracking-widest p-3 transition-colors ${activeTab === 'news' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><Calendar size={16} /> 最新動態</button>
            <button onClick={() => setActiveTab("settings")} className={`flex items-center gap-3 w-full text-left text-sm tracking-widest p-3 transition-colors ${activeTab === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}><Settings size={16} /> 系統設置</button>
          </nav>
        </div>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 text-sm text-zinc-500 hover:text-white transition-colors tracking-widest"><LogOut size={16} /> 安全登出</button>
      </aside>

      <main className="flex-1 p-8 md:p-16 h-screen overflow-y-auto relative">
        
        {/* === 模組：系統設置 === */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-16">
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

        {/* === 模組：展廳作品 === */}
        {activeTab === "gallery" && (
          <div className="max-w-5xl mx-auto space-y-16 pb-20">
            <section>
              <header className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-serif tracking-widest uppercase">{editingGalleryId ? "編輯作品" : "發佈新作品"}</h2>
                  <p className="text-zinc-500 text-sm mt-2 tracking-widest">支援作品資訊修改、刪除與封存。</p>
                </div>
                {editingGalleryId && (
                  <button onClick={resetGalleryForm} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-4 py-2 transition-colors uppercase"><X size={14}/> 取消編輯</button>
                )}
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <form onSubmit={handleGallerySubmit} className="space-y-6">
                  {editingGalleryId && (
                    <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4">
                      <span className="text-xs text-zinc-400 tracking-widest">前台展出狀態：</span>
                      <button type="button" onClick={() => setGalleryIsArchived(!galleryIsArchived)} className={`flex items-center gap-2 text-xs px-3 py-1 border transition-colors ${galleryIsArchived ? 'border-amber-500/50 text-amber-500 bg-amber-500/10' : 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'}`}>
                        {galleryIsArchived ? <><EyeOff size={14}/> 已封存 (隱藏)</> : <><Eye size={14}/> 展出中 (顯示)</>}
                      </button>
                    </div>
                  )}
                  <input type="text" placeholder="作品名稱 TITLE" value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" required />
                  <textarea placeholder="心法描述 CONCEPT (選填)" value={concept} onChange={(e)=>setConcept(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" rows={3} />
                  <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div>
                    <label className="block text-xs tracking-widest text-zinc-500 mb-2">{editingGalleryId ? "更新圖片 (不選則保留原圖)" : "選擇圖片"}</label>
                    <input type="file" accept="image/*" onChange={(e)=>handleFileSelect(e,"gallery")} className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer" />
                  </div>
                  <button disabled={uploading} className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 hover:bg-zinc-200 uppercase tracking-widest transition-colors"><UploadCloud size={18} /> {uploading ? `處理中... ${Math.round(progress)}%` : (editingGalleryId ? "更新作品" : "發佈作品")}</button>
                </form>
                <div className="bg-zinc-900/50 border border-zinc-800 flex items-center justify-center p-6 min-h-[400px]">
                  {/* 💡 Gallery 預覽改為 object-contain 防止砍頭砍尾 */}
                  {previewUrl ? <div className="relative w-full max-w-[280px] aspect-[3/4] bg-black shadow-2xl"><Image src={previewUrl} alt="Preview" fill className="object-contain" /></div> : <div className="text-zinc-600 flex flex-col items-center"><ImageIcon size={48} className="mb-4 opacity-20" /><span className="text-sm tracking-widest font-serif">選擇圖片預覽</span></div>}
                </div>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-16">
              <h3 className="text-xl font-serif tracking-widest uppercase mb-8">展廳作品清單</h3>
              <div className="space-y-4">
                {galleryList.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 border transition-colors ${item.isArchived ? 'bg-zinc-950 border-zinc-900 opacity-60 hover:opacity-100' : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/60'}`}>
                    <div className="flex items-center gap-6">
                      <div className="relative w-16 h-16 bg-black border border-zinc-800 shrink-0">
                        {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover grayscale" />}
                      </div>
                      <div className="font-serif">
                        <div className="flex items-center gap-3 mb-1">
                          {item.isArchived ? <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 uppercase">封存</span> : <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 uppercase">展出中</span>}
                          <span className="text-xs text-zinc-500 uppercase">{item.category}</span>
                        </div>
                        <h4 className="text-base text-zinc-200 tracking-widest">{item.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditGallery(item)} className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded transition-colors"><Edit2 size={16} /></button>
                      <button onClick={async () => {if(confirm("確定刪除?")){await deleteDoc(doc(db,"works",item.id)); fetchGalleryList();}}} className="p-2 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* === 模組：教學文章 CMS === */}
        {activeTab === "teachings" && (
          <div className="max-w-5xl mx-auto space-y-16 pb-20">
            <section>
              <header className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-serif tracking-widest uppercase">{editingTeachId ? "編輯文章" : "撰寫教學文章"}</h2>
                  <p className="text-zinc-500 text-sm mt-2 tracking-widest">大師筆記：透過文字、影像與視頻分享攝影心法。</p>
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
                    
                    <input type="text" placeholder="文章標題 TITLE" value={teachTitle} onChange={(e)=>setTeachTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" required />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="所屬系列 (如：雋美黑白)" value={teachSeries} onChange={(e)=>setTeachSeries(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                      <input type="number" placeholder="章節序號 (如：1)" value={teachChapter} onChange={(e)=>setTeachChapter(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-3">
                      <Youtube size={18} className="text-red-500 shrink-0" />
                      <input type="url" placeholder="YouTube 影片網址 (選填，如：採訪或教學視頻)" value={teachVideoUrl} onChange={(e)=>setTeachVideoUrl(e.target.value)} className="flex-1 bg-transparent outline-none text-zinc-300" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <select value={teachCategory} onChange={(e)=>setTeachCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="text" placeholder="標籤 (用逗號隔開)" value={teachTags} onChange={(e)=>setTeachTags(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs text-zinc-500 tracking-widest uppercase">封面圖片 (Cover)</label>
                    <div className="bg-zinc-900/50 border border-zinc-800 flex flex-col items-center justify-center p-4 h-[250px]">
                      {/* 💡 預覽改為 object-contain 防止砍頭砍尾 */}
                      {teachPreviewUrl ? (
                        <div className="relative w-full h-full"><Image src={teachPreviewUrl} alt="Cover" fill className="object-contain" /></div>
                      ) : (
                        <div className="text-zinc-600 flex flex-col items-center"><ImageIcon size={32} className="mb-2 opacity-20" /><span className="text-xs">選擇封面</span></div>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={(e)=>handleFileSelect(e,"teachings")} className="w-full text-xs text-zinc-500" />
                  </div>
                </div>

                <div className="bg-white text-black min-h-[500px] overflow-hidden rounded-sm">
                  <ReactQuill theme="snow" value={teachContent} onChange={setTeachContent} className="h-[450px]" />
                </div>

                <button disabled={teachUploading} className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 hover:bg-zinc-200 uppercase tracking-widest transition-colors font-bold">
                  <UploadCloud size={18} /> {teachUploading ? "上傳中..." : (editingTeachId ? "更新文章" : "正式發佈教學")}
                </button>
              </form>
            </section>

            <section className="border-t border-zinc-800 pt-16">
              <h3 className="text-xl font-serif tracking-widest uppercase mb-8">歷史教學列表</h3>
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
                          {item.videoUrl && <Youtube size={12} className="text-red-500" />}
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

        {/* === 模組：最新動態 (News) === */}
        {activeTab === "news" && (
          <div className="max-w-5xl mx-auto space-y-16 pb-20">
            <section>
              <header className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-serif tracking-widest uppercase">{editingNewsId ? "編輯動態" : "發佈新動態"}</h2>
                </div>
                {editingNewsId && (
                  <button onClick={resetNewsForm} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-4 py-2 transition-colors uppercase"><X size={14}/> 取消編輯</button>
                )}
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
                    <Youtube size={18} className="text-red-500 shrink-0" />
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
                  {/* 💡 News 預覽也改為 object-contain */}
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
                        {item.videoUrl && <Youtube size={12} className="text-red-500" />}
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
      </main>
    </div>
  );
}
