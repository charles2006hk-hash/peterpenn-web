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
import { Camera, LogOut, UploadCloud, Image as ImageIcon, BookOpen, Calendar, Settings, Plus, Trash2, User as UserIcon, Edit2, EyeOff, Eye, X } from "lucide-react";

// 動態載入 ReactQuill (支援 React 19 的新套件)，並關閉 SSR 防止 Next.js 編譯報錯
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
  const [categories, setCategories] = useState<string[]>(["Monochrome", "Street", "Commercial"]);
  const [newCategory, setNewCategory] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // === Gallery 狀態 (擴充 CRUD) ===
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

  // === News 狀態 (擴充 CRUD) ===
  const [newsList, setNewsList] = useState<any[]>([]);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsIsArchived, setNewsIsArchived] = useState(false);
  
  const [newsTitle, setNewsTitle] = useState("");
  const [newsDate, setNewsDate] = useState("");
  const [newsEndDate, setNewsEndDate] = useState("");
  const [newsType, setNewsType] = useState("Exhibition & Seminar");
  const [newsLocation, setNewsLocation] = useState("");
  const [newsDesc, setNewsDesc] = useState("");
  const [newsFile, setNewsFile] = useState<File | null>(null);
  const [newsPreviewUrl, setNewsPreviewUrl] = useState<string | null>(null);
  const [newsUploading, setNewsUploading] = useState(false);

  // === Teachings 狀態 (圖文編輯 CMS) ===
  const [teachTitle, setTeachTitle] = useState("");
  const [teachCategory, setTeachCategory] = useState("");
  const [teachTags, setTeachTags] = useState("");
  const [teachSeries, setTeachSeries] = useState("");
  const [teachChapter, setTeachChapter] = useState("");
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
      }
      const configSnap = await getDoc(doc(db, "settings", "config"));
      if (configSnap.exists()) {
        setCategories(configSnap.data().categories || []);
        if (configSnap.data().categories?.length > 0) {
          setCategory(configSnap.data().categories[0]);
          setTeachCategory(configSnap.data().categories[0]);
        }
      }
    };
    fetchSettings();
    return () => unsubscribe();
  }, []);

  // 根據 Tab 自動抓取列表
  useEffect(() => {
    if (activeTab === "news") fetchNewsList();
    if (activeTab === "gallery") fetchGalleryList();
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { alert("登入失敗"); }
  };

  // === 統一圖片選擇處理 ===
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "gallery" | "news" | "teachings") => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      if (type === "gallery") {
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
        const compressed = await imageCompression(profileFile, { maxSizeMB: 0.2 });
        const storageRef = ref(storage, `settings/profile_${Date.now()}`);
        await uploadBytesResumable(storageRef, compressed);
        finalImageUrl = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "settings", "profile"), { bio, imageUrl: finalImageUrl }, { merge: true });
      setProfileImageUrl(finalImageUrl);
      alert("個人簡介已更新");
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
  // === Gallery 展廳作品 CRUD 邏輯 ===
  // ==========================================
  const resetGalleryForm = () => {
    setEditingGalleryId(null);
    setTitle(""); setConcept(""); setFile(null); setPreviewUrl(null); setGalleryIsArchived(false); setProgress(0);
  };

  const handleGallerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert("請填寫作品名稱");
    if (!file && !editingGalleryId) return alert("請選擇圖片");
    setUploading(true);

    try {
      let finalImageUrl = previewUrl; // 預設使用原有的 URL (如果是編輯狀態)

      if (file) {
        const compressedFile = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1920, useWebWorker: true });
        const storageRef = ref(storage, `works/gallery_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);
        
        await new Promise((resolve, reject) => {
          uploadTask.on("state_changed", 
            (s) => setProgress((s.bytesTransferred/s.totalBytes)*100), 
            reject, 
            async () => {
              finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(null);
            }
          );
        });
      }

      const galleryData = {
        title, concept, category, imageUrl: finalImageUrl, isArchived: galleryIsArchived
      };

      if (editingGalleryId) {
        await updateDoc(doc(db, "works", editingGalleryId), galleryData);
        alert("作品更新成功！");
      } else {
        await addDoc(collection(db, "works"), { ...galleryData, createdAt: serverTimestamp() });
        alert("作品發佈成功！");
      }
      resetGalleryForm();
      fetchGalleryList();
    } catch (e) { alert("處理失敗"); } finally { setUploading(false); setProgress(0); }
  };

  const handleEditGallery = (item: any) => {
    setEditingGalleryId(item.id); setTitle(item.title); setConcept(item.concept || ""); setCategory(item.category); setGalleryIsArchived(item.isArchived || false); setPreviewUrl(item.imageUrl); setFile(null); setProgress(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteGallery = async (id: string) => {
    if (!confirm("確定要刪除這件作品嗎？此操作無法復原。")) return;
    try {
      await deleteDoc(doc(db, "works", id));
      alert("作品已刪除");
      if (editingGalleryId === id) resetGalleryForm();
      fetchGalleryList();
    } catch (error) { alert("刪除失敗"); }
  };

  const handleToggleArchiveGallery = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "works", id), { isArchived: !currentStatus });
      fetchGalleryList();
    } catch (error) { alert("狀態更新失敗"); }
  };

  // ==========================================
  // === News 動態 CRUD 邏輯 ===
  // ==========================================
  const resetNewsForm = () => {
    setEditingNewsId(null);
    setNewsTitle(""); setNewsDate(""); setNewsEndDate(""); setNewsLocation(""); setNewsDesc("");
    setNewsIsArchived(false); setNewsFile(null); setNewsPreviewUrl(null);
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsDate) return alert("請填寫標題與開始日期");
    setNewsUploading(true);
    try {
      let finalCoverImage = newsPreviewUrl;
      if (newsFile) {
        const compressedFile = await imageCompression(newsFile, { maxSizeMB: 0.2, maxWidthOrHeight: 1920, useWebWorker: true });
        const storageRef = ref(storage, `works/news_${Date.now()}`);
        await uploadBytesResumable(storageRef, compressedFile);
        finalCoverImage = await getDownloadURL(storageRef);
      }
      const newsData = { title: newsTitle, date: newsDate, endDate: newsEndDate, type: newsType, location: newsLocation, description: newsDesc, coverImage: finalCoverImage || "", isArchived: newsIsArchived };

      if (editingNewsId) {
        await updateDoc(doc(db, "news", editingNewsId), newsData);
        alert("動態更新成功！");
      } else {
        await addDoc(collection(db, "news"), { ...newsData, createdAt: serverTimestamp() });
        alert("動態發佈成功！");
      }
      resetNewsForm();
      fetchNewsList();
    } catch (e) { alert("處理失敗"); } finally { setNewsUploading(false); }
  };

  const handleEditNews = (item: any) => {
    setEditingNewsId(item.id); setNewsTitle(item.title); setNewsDate(item.date); setNewsEndDate(item.endDate || ""); setNewsType(item.type); setNewsLocation(item.location || ""); setNewsDesc(item.description || ""); setNewsIsArchived(item.isArchived || false); setNewsPreviewUrl(item.coverImage || null); setNewsFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("確定要刪除這筆動態嗎？")) return;
    try {
      await deleteDoc(doc(db, "news", id));
      alert("動態已刪除");
      if (editingNewsId === id) resetNewsForm();
      fetchNewsList();
    } catch (error) { alert("刪除失敗"); }
  };

  const handleToggleArchiveNews = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "news", id), { isArchived: !currentStatus });
      fetchNewsList();
    } catch (error) { alert("狀態更新失敗"); }
  };

  // === Teachings 上傳邏輯 (圖文編輯器) ===
  const handleTeachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachTitle || !teachContent) return alert("請填寫標題與文章內容");
    setTeachUploading(true);
    try {
      let coverImage = "";
      if (teachFile) {
        const compressedFile = await imageCompression(teachFile, { maxSizeMB: 0.2, maxWidthOrHeight: 1920, useWebWorker: true });
        const storageRef = ref(storage, `teachings/cover_${Date.now()}`);
        await uploadBytesResumable(storageRef, compressedFile);
        coverImage = await getDownloadURL(storageRef);
      }
      const tagsArray = teachTags.split(',').map(tag => tag.trim()).filter(tag => tag !== "");

      await addDoc(collection(db, "teachings"), {
        title: teachTitle, category: teachCategory, tags: tagsArray, seriesName: teachSeries, chapterIndex: teachChapter ? Number(teachChapter) : null, content: teachContent, coverImage: coverImage, createdAt: serverTimestamp(), isArchived: false
      });
      alert("教學文章發佈成功！");
      setTeachTitle(""); setTeachTags(""); setTeachSeries(""); setTeachChapter(""); setTeachContent(""); setTeachFile(null); setTeachPreviewUrl(null);
    } catch (error) { console.error(error); alert("發佈失敗"); } finally { setTeachUploading(false); }
  };

  // ==========================================
  // UI 渲染區塊
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
      {/* 側邊導航 */}
      <aside className="w-64 border-r border-zinc-800 p-8 flex flex-col justify-between hidden md:flex bg-black z-10 shrink-0">
        <div>
          <h1 className="font-serif text-lg tracking-[0.2em] mb-12 text-zinc-400 uppercase">Peter Penn<br/><span className="text-xs">Admin Panel</span></h1>
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
                <button onClick={handleSaveProfile} disabled={isSavingSettings} className="bg-white text-black px-8 py-3 text-xs tracking-widest hover:bg-zinc-200 transition-colors uppercase">{isSavingSettings ? "儲存中..." : "儲存個人資料"}</button>
              </div>
              <div className="flex flex-col items-center justify-center bg-zinc-900/30 border border-zinc-800 p-8">
                <div className="relative w-40 h-40 rounded-full overflow-hidden bg-black mb-6 border-2 border-zinc-800">
                  {profileImageUrl ? <Image src={profileImageUrl} alt="P" fill className="object-cover grayscale" /> : <UserIcon size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />}
                </div>
                <input type="file" onChange={(e)=>setProfileFile(e.target.files?.[0] || null)} className="text-xs text-zinc-500" />
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

        {/* === 模組：展廳作品 (CRUD 完整版) === */}
        {activeTab === "gallery" && (
          <div className="max-w-5xl mx-auto space-y-16">
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
                  {previewUrl ? <div className="relative w-full max-w-[280px] aspect-[3/4] bg-black shadow-2xl"><Image src={previewUrl} alt="Preview" fill className="object-cover grayscale hover:grayscale-0 transition-all" /></div> : <div className="text-zinc-600 flex flex-col items-center"><ImageIcon size={48} className="mb-4 opacity-20" /><span className="text-sm tracking-widest font-serif">選擇圖片預覽</span></div>}
                </div>
              </div>
            </section>

            {/* Gallery 歷史列表 */}
            <section className="border-t border-zinc-800 pt-16">
              <h3 className="text-xl font-serif tracking-widest uppercase mb-8">展廳作品清單 (Archive)</h3>
              <div className="space-y-4">
                {galleryList.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 border transition-colors ${item.isArchived ? 'bg-zinc-950 border-zinc-900 opacity-60 hover:opacity-100' : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/60'}`}>
                    <div className="flex items-center gap-6">
                      <div className="relative w-16 h-16 bg-black border border-zinc-800 shrink-0">
                        {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover grayscale" />}
                      </div>
                      <div className="font-serif">
                        <div className="flex items-center gap-3 mb-1">
                          {item.isArchived ? (
                            <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 tracking-widest uppercase flex items-center gap-1"><EyeOff size={10}/> 封存</span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 tracking-widest uppercase flex items-center gap-1"><Eye size={10}/> 展出中</span>
                          )}
                          <span className="text-xs text-zinc-500 uppercase">{item.category}</span>
                        </div>
                        <h4 className="text-base text-zinc-200 tracking-widest">{item.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleArchiveGallery(item.id, item.isArchived)} title={item.isArchived ? "重新展出" : "封存隱藏"} className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded transition-colors">{item.isArchived ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                      <button onClick={() => handleEditGallery(item)} title="編輯" className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteGallery(item.id)} title="刪除" className="p-2 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {galleryList.length === 0 && <div className="text-zinc-600 text-sm tracking-widest">目前無任何作品。</div>}
              </div>
            </section>
          </div>
        )}

        {/* === 模組：教學文章 (CMS) === */}
        {activeTab === "teachings" && (
          <div className="max-w-5xl mx-auto pb-20">
            <header className="mb-12 border-b border-zinc-800 pb-6">
              <h2 className="text-2xl font-serif tracking-widest uppercase">教學文章管理 (Teachings CMS)</h2>
              <p className="text-zinc-500 text-sm mt-2 tracking-widest">使用圖文編輯器撰寫深度文章，支援系列連載與分類標籤。</p>
            </header>
            <form onSubmit={handleTeachSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-widest">文章標題 (TITLE)</label>
                    <input type="text" value={teachTitle} onChange={(e)=>setTeachTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-widest">所屬系列 (選填)</label>
                      <input type="text" value={teachSeries} onChange={(e)=>setTeachSeries(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" placeholder="如：雋美黑白" />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-widest">章節序號 (選填)</label>
                      <input type="number" value={teachChapter} onChange={(e)=>setTeachChapter(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" placeholder="1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-widest">文章分類</label>
                      <select value={teachCategory} onChange={(e)=>setTeachCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-widest">標籤 Tags (用逗號分隔)</label>
                      <input type="text" value={teachTags} onChange={(e)=>setTeachTags(e.target.value)} placeholder="例如：街拍, 光影, Ricoh" className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-widest">封面圖片 (Cover)</label>
                  <div className="bg-zinc-900/50 border border-zinc-800 flex flex-col items-center justify-center p-4 h-[250px]">
                    {teachPreviewUrl ? (
                      <div className="relative w-full h-full"><Image src={teachPreviewUrl} alt="Cover" fill className="object-cover" /></div>
                    ) : (
                      <div className="text-zinc-600 flex flex-col items-center"><ImageIcon size={32} className="mb-2 opacity-20" /><span className="text-xs">選擇封面預覽</span></div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={(e)=>handleFileSelect(e,"teachings")} className="w-full text-xs text-zinc-400 file:mr-4 file:py-1 file:px-2 file:border-0 file:bg-zinc-800 file:text-white" required />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-widest">文章內容 (Content)</label>
                <div className="bg-white text-black h-[500px] overflow-hidden rounded-sm border border-zinc-800">
                  <ReactQuill 
                    theme="snow" 
                    value={teachContent} 
                    onChange={setTeachContent} 
                    className="h-[450px]"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                        [{'list': 'ordered'}, {'list': 'bullet'}],
                        ['link', 'image'],
                        ['clean']
                      ],
                    }}
                  />
                </div>
              </div>
              <button disabled={teachUploading} className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 hover:bg-zinc-200 uppercase tracking-widest transition-colors"><UploadCloud size={18} /> {teachUploading ? "發佈中..." : "正式發佈文章"}</button>
            </form>
          </div>
        )}

        {/* === 模組：最新動態 (CRUD 完整版) === */}
        {activeTab === "news" && (
          <div className="max-w-5xl mx-auto space-y-16">
            <section>
              <header className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-serif tracking-widest uppercase">{editingNewsId ? "編輯動態" : "發佈新動態"}</h2>
                  <p className="text-zinc-500 text-sm mt-2 tracking-widest">支援修改、刪除與封存 (隱藏不顯示於前台)。</p>
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
                    <div>
                      <label className="block text-xs tracking-widest text-zinc-500 mb-2">開始日期</label>
                      <input type="date" value={newsDate} onChange={(e) => setNewsDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none text-zinc-300 [color-scheme:dark]" required />
                    </div>
                    <div>
                      <label className="block text-xs tracking-widest text-zinc-500 mb-2">結束日期 (選填)</label>
                      <input type="date" value={newsEndDate} onChange={(e) => setNewsEndDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none text-zinc-300 [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-xs tracking-widest text-zinc-500 mb-2">活動類型</label>
                      <select value={newsType} onChange={(e) => setNewsType(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500">
                        <option value="Upcoming Seminar">講座 (Seminar)</option>
                        <option value="Exhibition">展覽 (Exhibition)</option>
                        <option value="Exhibition & Seminar">展覽與講座</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs tracking-widest text-zinc-500 mb-2">標題 (TITLE)</label>
                    <input type="text" value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" required />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest text-zinc-500 mb-2">地點 (LOCATION)</label>
                    <input type="text" value={newsLocation} onChange={(e) => setNewsLocation(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest text-zinc-500 mb-2">詳細描述 (支援換行)</label>
                    <textarea value={newsDesc} onChange={(e) => setNewsDesc(e.target.value)} rows={6} className="w-full bg-zinc-900 border border-zinc-800 p-3 outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest text-zinc-500 mb-2">更新海報 (選填)</label>
                    <input type="file" accept="image/*" onChange={(e)=>handleFileSelect(e,"news")} className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer" />
                  </div>
                  
                  <button disabled={newsUploading} className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 hover:bg-zinc-200 uppercase tracking-widest transition-colors">
                    <UploadCloud size={18} /> {newsUploading ? "處理中..." : (editingNewsId ? "更新動態" : "發佈動態")}
                  </button>
                </form>
                
                <div className="bg-zinc-900/50 border border-zinc-800 flex items-center justify-center p-6 min-h-[400px]">
                  {newsPreviewUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span className="text-xs text-zinc-500 mb-4 tracking-widest uppercase">海報預覽</span>
                      <div className="relative w-full max-h-[400px] aspect-[3/4] bg-black shadow-2xl"><Image src={newsPreviewUrl} alt="Preview" fill className="object-contain" /></div>
                    </div>
                  ) : (
                    <div className="text-zinc-600 flex flex-col items-center"><ImageIcon size={48} className="mb-4 opacity-20" /><span className="text-sm tracking-widest font-serif">無附圖</span></div>
                  )}
                </div>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-16">
              <h3 className="text-xl font-serif tracking-widest uppercase mb-8">歷史動態列表 (History)</h3>
              <div className="space-y-4">
                {newsList.map((item) => (
                  <div key={item.id} className={`flex flex-col md:flex-row md:items-center justify-between p-6 border transition-colors ${item.isArchived ? 'bg-zinc-950 border-zinc-900 opacity-60 hover:opacity-100' : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/60'}`}>
                    <div className="flex-1 font-serif">
                      <div className="flex items-center gap-3 mb-2">
                        {item.isArchived ? (
                          <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 tracking-widest uppercase flex items-center gap-1"><EyeOff size={10}/> 封存</span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-2 py-0.5 tracking-widest uppercase flex items-center gap-1"><Eye size={10}/> 顯示中</span>
                        )}
                        <span className="text-xs text-zinc-400 tracking-widest">{item.date} {item.endDate && `- ${item.endDate}`}</span>
                      </div>
                      <h4 className="text-lg text-zinc-200 tracking-widest">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-4 mt-6 md:mt-0">
                      <button onClick={() => handleToggleArchiveNews(item.id, item.isArchived)} title={item.isArchived ? "重新發佈" : "封存隱藏"} className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded transition-colors">{item.isArchived ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                      <button onClick={() => handleEditNews(item)} title="編輯" className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteNews(item.id)} title="刪除" className="p-2 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {newsList.length === 0 && <div className="text-zinc-600 text-sm tracking-widest">目前無任何歷史紀錄。</div>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}