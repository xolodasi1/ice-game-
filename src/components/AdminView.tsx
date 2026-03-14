import React, { useState, useEffect, FormEvent } from 'react';
import { User, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '../firebase';
import * as firebaseService from '../services/firebaseService';
import { LogOut, Save, Loader2, Download, Eye, Settings, Plus, Edit3, Trash2, AlertCircle, CheckCircle2, UploadCloud, X, BarChart2, Smartphone, Monitor, Users, MessageSquare, ThumbsUp, TrendingUp, Bell, BellRing, Check, Trash, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface AdminViewProps {
  user: User;
}

import { Game } from '../types';

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteAvatar: string;
  vkUrl: string;
  telegramUrl: string;
  youtubeUrl: string;
  discordUrl?: string;
  adminEmails?: string[];
}

interface Comment {
  id: string;
  gameId: string;
  authorName: string;
  text: string;
  createdAt: number;
  likedBy?: string[];
}

interface AppNotification {
  id: string;
  type: 'new_comment' | 'new_bug_report';
  message: string;
  gameId?: string;
  gameTitle?: string;
  authorName?: string;
  read: boolean;
  createdAt: number;
}

export default function AdminView({ user }: AdminViewProps) {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'games' | 'settings' | 'admins' | 'comments' | 'stats'>('games');
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'ice_game',
    siteDescription: 'Каталог инди-игр и проектов',
    siteAvatar: '',
    vkUrl: '',
    telegramUrl: '',
    youtubeUrl: '',
    adminEmails: ['xolodtop889@gmail.com']
  });
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [changelog, setChangelog] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentSort, setCommentSort] = useState<'newest' | 'popular'>('newest');
  const [gameSort, setGameSort] = useState<'newest' | 'popularity' | 'downloads' | 'views'>('newest');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState<AppNotification | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (editingGame) {
      setChangelog(editingGame.changelog || '');
    } else {
      setChangelog('');
    }
  }, [editingGame]);

  const sortedComments = [...comments].sort((a, b) => {
    if (commentSort === 'popular') {
      const aLikes = (a.likedBy || []).length;
      const bLikes = (b.likedBy || []).length;
      if (aLikes !== bLikes) {
        return bLikes - aLikes;
      }
    }
    return b.createdAt - a.createdAt;
  });

  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
    const unsubscribeGames = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching games:", error);
      setMessage({ type: 'error', text: 'Ошибка доступа. Убедитесь, что вы администратор.' });
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'games');
      }
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      let currentAdminEmails = ['xolodtop889@gmail.com'];
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        
        // Handle migration from old string to array
        if (data.adminEmail && !data.adminEmails) {
          data.adminEmails = [data.adminEmail];
          delete data.adminEmail;
        }
        
        setSettings(prev => ({ ...prev, ...data }));
        if (data.adminEmails && Array.isArray(data.adminEmails)) {
          currentAdminEmails = data.adminEmails;
        }
      }
      
      if (user.email && (currentAdminEmails.includes(user.email) || user.email === 'xolodtop889@gmail.com')) {
        setIsAdminUser(true);
      } else {
        setIsAdminUser(false);
      }
    });

    const qComments = query(collection(db, 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribeComments = onSnapshot(qComments, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
    });

    const qNotifications = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      
      // Check for new unread notifications to show toast
      const prevUnreadIds = notifications.filter(n => !n.read).map(n => n.id);
      const newUnread = notificationsData.find(n => !n.read && !prevUnreadIds.includes(n.id));
      
      if (newUnread && !loading) {
        setToast(newUnread);
      }
      
      setNotifications(notificationsData);
    });

    return () => {
      unsubscribeGames();
      unsubscribeSettings();
      unsubscribeComments();
      unsubscribeNotifications();
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleClearNotifications = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };
  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Введите корректный email' });
      return;
    }
    
    const currentAdmins = settings.adminEmails || ['xolodtop889@gmail.com'];
    if (currentAdmins.includes(newAdminEmail)) {
      setMessage({ type: 'error', text: 'Этот пользователь уже является администратором' });
      return;
    }

    const updatedAdmins = [...currentAdmins, newAdminEmail];
    const updatedSettings = { ...settings, adminEmails: updatedAdmins };
    
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), updatedSettings);
      setSettings(updatedSettings);
      setNewAdminEmail('');
      setMessage({ type: 'success', text: 'Администратор добавлен!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Ошибка: ' + err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveAdmin = async (emailToRemove: string) => {
    if (emailToRemove === 'xolodtop889@gmail.com') return;
    if (!window.confirm(`Удалить администратора ${emailToRemove}?`)) return;

    const currentAdmins = settings.adminEmails || ['xolodtop889@gmail.com'];
    const updatedAdmins = currentAdmins.filter(email => email !== emailToRemove);
    const updatedSettings = { ...settings, adminEmails: updatedAdmins };

    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), updatedSettings);
      setSettings(updatedSettings);
      setMessage({ type: 'success', text: 'Администратор удален!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Ошибка: ' + err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'settings', 'general'), settings);
      setMessage({ type: 'success', text: 'Настройки сайта сохранены!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Save settings error:", err);
      setMessage({ type: 'error', text: 'Ошибка при сохранении настроек: ' + err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'Пользователь не авторизован.' });
      return;
    }
    if (!editingGame) return;
    if (!editingGame.title || (!editingGame.fileUrl && !file) || !editingGame.fileName) {
      setMessage({ type: 'error', text: 'Заполните название, укажите файл или ссылку на него и его имя.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    
    try {
      const isNew = !editingGame.id;
      
      let fileUrl = editingGame.fileUrl || '';
      let finalFileSize = editingGame.fileSize || 0;

      if (file) {
        setUploading(true);
        const storageRef = ref(storage, `games/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise((resolve, reject) => {
          (uploadTask.on as any)('state_changed', 
            (snapshot: any) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            reject, 
            resolve
          );
        });
        
        fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
        finalFileSize = file.size;
        setUploading(false);
      }

      const gameData: any = {
        title: editingGame.title,
        description: editingGame.description || '',
        version: editingGame.version || '1.0.0',
        fileUrl: fileUrl,
        fileSize: finalFileSize,
        changelog: changelog || editingGame.changelog || '',
        fileName: editingGame.fileName || 'game.zip',
        releaseNotes: editingGame.releaseNotes || '',
        views: isNew ? 0 : editingGame.views,
        downloads: isNew ? 0 : editingGame.downloads,
        createdAt: isNew ? Date.now() : editingGame.createdAt,
        authorUid: user.uid,
        platform: editingGame.platform || 'pc',
        likedBy: isNew ? [] : (editingGame.likedBy || []),
        dislikedBy: isNew ? [] : (editingGame.dislikedBy || []),
        screenshots: editingGame.screenshots || [],
        systemRequirements: editingGame.systemRequirements || {
          os: '',
          cpu: '',
          ram: '',
          gpu: '',
          storage: ''
        },
        androidSystemRequirements: editingGame.androidSystemRequirements || {
          os: '',
          ram: '',
          storage: ''
        },
        versions: editingGame.versions || [],
        trailerUrl: editingGame.trailerUrl || '',
        genre: editingGame.genre || '',
        tags: editingGame.tags || []
      };

      if (editingGame.logoUrl) gameData.logoUrl = editingGame.logoUrl;
      if (editingGame.previewUrl) gameData.previewUrl = editingGame.previewUrl;

      if (isNew) {
        await firebaseService.addGame(gameData);
      } else {
        await firebaseService.updateGame(editingGame.id, gameData);
      }
      
      setMessage({ type: 'success', text: 'Игра успешно сохранена!' });
      setIsModalOpen(false);
      setFile(null);
      setChangelog('');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: 'error', text: 'Ошибка при сохранении: ' + err.message });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту игру?')) return;
    try {
      await deleteDoc(doc(db, 'games', id));
      setMessage({ type: 'success', text: 'Игра удалена.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Delete error:", err);
      setMessage({ type: 'error', text: 'Ошибка при удалении: ' + err.message });
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) return;
    try {
      await deleteDoc(doc(db, 'comments', id));
      setMessage({ type: 'success', text: 'Комментарий удален.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Delete comment error:", err);
      setMessage({ type: 'error', text: 'Ошибка при удалении: ' + err.message });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Сразу показываем имя файла, чтобы было видно, что он выбран
    setEditingGame(prev => ({ ...prev, fileName: file.name }));

    const storageRef = ref(storage, `games/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadProgress(0);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        setMessage({ 
          type: 'error', 
          text: 'Ошибка загрузки: ' + error.message + '. Возможно, вам нужно включить Storage в Firebase Console и разрешить запись в правилах (Storage -> Rules).' 
        });
        setUploadProgress(null);
        setEditingGame(prev => ({ ...prev, fileName: undefined })); // Сбрасываем имя при ошибке
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setEditingGame(prev => ({ ...prev, fileUrl: downloadURL }));
        setUploadProgress(null);
      }
    );
    
    // Сбрасываем значение input, чтобы можно было выбрать тот же файл еще раз
    e.target.value = '';
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (loading || isAdminUser === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isAdminUser === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-4">
        <div className="bg-slate-900 border border-red-500/20 p-8 rounded-3xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Доступ запрещен</h1>
          <p className="text-slate-400 mb-8">
            Ваш аккаунт ({user.email}) не имеет прав администратора.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
            >
              На главную
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col md:flex-row relative overflow-hidden">
      {/* Graphical Enhancements */}
      <div className="scanline" />
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />
      
      {/* Sidebar */}
      <aside className="w-full md:w-72 md:min-h-screen border-b md:border-b-0 md:border-r border-white/5 glass-panel flex flex-col shrink-0 z-10">
        <div className="p-6 border-b border-white/5 flex justify-between items-center md:block">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
              <Settings className="w-6 h-6 text-[#00F0FF]" />
              {settings.siteName} <span className="text-[#00F0FF]">Admin</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px] md:max-w-full">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="md:hidden p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            title="Выйти"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex md:flex-col p-2 md:p-4 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('games')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-3 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap relative group ${
              activeTab === 'games' 
                ? 'text-[#00F0FF]' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {activeTab === 'games' && <motion.div layoutId="activeTabAdmin" className="absolute inset-0 bg-[#00F0FF]/10 border-r-2 border-[#00F0FF]" />}
            <BarChart2 className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline md:inline relative z-10">Управление играми</span>
            <span className="sm:hidden relative z-10">Игры</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-3 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap relative group ${
              activeTab === 'settings' 
                ? 'text-[#00F0FF]' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {activeTab === 'settings' && <motion.div layoutId="activeTabAdmin" className="absolute inset-0 bg-[#00F0FF]/10 border-r-2 border-[#00F0FF]" />}
            <Settings className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline md:inline relative z-10">Настройки сайта</span>
            <span className="sm:hidden relative z-10">Настройки</span>
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-3 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap relative group ${
              activeTab === 'admins' 
                ? 'text-[#00F0FF]' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {activeTab === 'admins' && <motion.div layoutId="activeTabAdmin" className="absolute inset-0 bg-[#00F0FF]/10 border-r-2 border-[#00F0FF]" />}
            <Users className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline md:inline relative z-10">Администраторы</span>
            <span className="sm:hidden relative z-10">Админы</span>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-3 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap relative group ${
              activeTab === 'comments' 
                ? 'text-[#00F0FF]' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {activeTab === 'comments' && <motion.div layoutId="activeTabAdmin" className="absolute inset-0 bg-[#00F0FF]/10 border-r-2 border-[#00F0FF]" />}
            <MessageSquare className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline md:inline relative z-10">Комментарии</span>
            <span className="sm:hidden relative z-10">Комменты</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-3 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap relative group ${
              activeTab === 'stats' 
                ? 'text-[#00F0FF]' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {activeTab === 'stats' && <motion.div layoutId="activeTabAdmin" className="absolute inset-0 bg-[#00F0FF]/10 border-r-2 border-[#00F0FF]" />}
            <TrendingUp className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline md:inline relative z-10">Топы и Статистика</span>
            <span className="sm:hidden relative z-10">Топы</span>
          </button>
        </nav>
          
          <div className="relative md:w-full">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all relative group ${
                showNotifications 
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <div className="relative">
                {unreadCount > 0 ? <BellRing className={`w-5 h-5 ${showNotifications ? '' : 'animate-bounce'}`} /> : <Bell className="w-5 h-5" />}
                {unreadCount > 0 && !showNotifications && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950"></span>
                )}
              </div>
              <span className="hidden sm:inline md:inline font-bold">Уведомления</span>
              <span className="sm:hidden font-bold">Увед.</span>
              {unreadCount > 0 && (
                <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${showNotifications ? 'bg-slate-950 text-cyan-400' : 'bg-red-500 text-white'}`}>
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 md:left-full md:bottom-0 md:ml-4 mb-4 md:mb-0 w-80 sm:w-96 bg-slate-900/90 border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-2xl"
                >
                  <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-black text-white text-sm uppercase tracking-widest">Центр уведомлений</h3>
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleClearNotifications}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-black uppercase tracking-widest bg-cyan-500/10 px-2 py-1 rounded-lg transition-colors"
                      >
                        Прочитать все
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                          <Bell className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">У вас пока нет уведомлений</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {notifications.map(n => (
                          <motion.div 
                            layout
                            key={n.id} 
                            onClick={() => {
                              handleMarkAsRead(n.id);
                              setActiveTab('comments');
                              setShowNotifications(false);
                            }}
                            className={`p-5 cursor-pointer transition-all hover:bg-white/5 group relative ${!n.read ? 'bg-cyan-500/[0.03]' : ''}`}
                          >
                            <div className="flex gap-4">
                              <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center border transition-all ${
                                !n.read 
                                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                                  : 'bg-slate-800 border-white/5 text-slate-500'
                              }`}>
                                <MessageSquare className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <p className={`text-sm leading-snug ${!n.read ? 'text-white font-bold' : 'text-slate-400 font-medium'}`}>
                                    {n.message}
                                  </p>
                                  <button 
                                    onClick={(e) => handleDeleteNotification(e, n.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                    {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                  {!n.read && (
                                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 bg-slate-950/30 border-t border-white/5 text-center">
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Всего уведомлений: {notifications.length}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        <div className="hidden md:block p-4 border-t border-cyan-500/10 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-12 relative w-full z-10">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="fixed top-6 right-6 z-[100] w-80 glass-panel border border-[#00F0FF]/30 shadow-[0_0_30px_rgba(0,240,255,0.2)] p-4 backdrop-blur-xl overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#00F0FF]"></div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#00F0FF]/20 rounded-lg flex items-center justify-center text-[#00F0FF] shrink-0">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-[10px] font-black text-[#00F0FF] uppercase tracking-widest">Системное уведомление</h4>
                    <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-white font-bold leading-snug mb-2">{toast.message}</p>
                  <button 
                    onClick={() => {
                      handleMarkAsRead(toast.id);
                      setActiveTab('comments');
                      setToast(null);
                    }}
                    className="text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:underline"
                  >
                    Посмотреть
                  </button>
                </div>
              </div>
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 bg-cyan-500/30"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-5xl mx-auto">
          
          {message && (
            <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 border ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {activeTab === 'games' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic text-glitch" data-text="Ваши игры">Ваши <span className="text-[#00F0FF]">игры</span></h1>
                  <p className="text-zinc-500 font-medium">Управляйте каталогом игр и отслеживайте статистику.</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => window.open('/', '_blank')}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                  >
                    На сайт
                  </button>
                  <button
                    onClick={() => {
                      setEditingGame({});
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-zinc-950 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить игру
                  </button>
                </div>
              </div>

              <div className="flex justify-end mb-6">
                <select
                  value={gameSort}
                  onChange={(e) => setGameSort(e.target.value as any)}
                  className="bg-zinc-900 border border-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg focus:outline-none focus:border-[#00F0FF] transition-all"
                >
                  <option value="newest">Сначала новые</option>
                  <option value="popularity">По популярности</option>
                  <option value="downloads">По скачиваниям</option>
                  <option value="views">По просмотрам</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...games].sort((a, b) => {
                  if (gameSort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
                  if (gameSort === 'popularity') {
                    const scoreA = (a.downloads || 0) * 5 + (a.views || 0);
                    const scoreB = (b.downloads || 0) * 5 + (b.views || 0);
                    return scoreB - scoreA;
                  }
                  if (gameSort === 'downloads') return (b.downloads || 0) - (a.downloads || 0);
                  if (gameSort === 'views') return (b.views || 0) - (a.views || 0);
                  return 0;
                }).map((game, index) => (
                  <motion.div 
                    key={game.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bento-card p-6 flex flex-col group hover:border-[#00F0FF]/40 transition-all relative overflow-hidden rounded-2xl"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#00F0FF] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#00F0FF]/0 via-[#00F0FF]/5 to-[#00F0FF]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">{game.title}</h3>
                      <div className="flex gap-1 text-[#00F0FF]">
                        {(game.platform === 'pc' || game.platform === 'both') && <Monitor className="w-4 h-4" />}
                        {(game.platform === 'android' || game.platform === 'both') && <Smartphone className="w-4 h-4" />}
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-[#00F0FF] mb-4 uppercase tracking-widest">v{game.version}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
                          <Download className="w-3 h-3" /> Скачивания
                        </div>
                        <div className="text-xl font-black text-white">{game.downloads}</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
                          <Eye className="w-3 h-3" /> Просмотры
                        </div>
                        <div className="text-xl font-black text-white">{game.views}</div>
                      </div>
                    </div>

                    <div className="mt-auto flex gap-2">
                      <button
                        onClick={() => {
                          setEditingGame(game);
                          setIsModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        <Edit3 className="w-4 h-4" /> Редактировать
                      </button>
                      <button
                        onClick={() => handleDelete(game.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {games.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                    У вас пока нет добавленных игр.
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Настройки сайта</h1>
                  <p className="text-slate-400">Измените название, описание и ссылки на соцсети.</p>
                </div>
                <button
                  onClick={() => window.open('/', '_blank')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors border border-white/10"
                >
                  На сайт
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6 bg-slate-900 border border-cyan-500/10 rounded-3xl p-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Основное</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Название сайта</label>
                    <input
                      type="text"
                      required
                      value={settings.siteName}
                      onChange={e => setSettings({...settings, siteName: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Описание сайта</label>
                    <textarea
                      required
                      rows={3}
                      value={settings.siteDescription}
                      onChange={e => setSettings({...settings, siteDescription: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Ссылка на аватарку / логотип сайта</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={settings.siteAvatar}
                      onChange={e => setSettings({...settings, siteAvatar: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Социальные сети</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">ВКонтакте (ссылка)</label>
                    <input
                      type="url"
                      placeholder="https://vk.com/..."
                      value={settings.vkUrl}
                      onChange={e => setSettings({...settings, vkUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Telegram (ссылка)</label>
                    <input
                      type="url"
                      placeholder="https://t.me/..."
                      value={settings.telegramUrl}
                      onChange={e => setSettings({...settings, telegramUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">YouTube (ссылка)</label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/..."
                      value={settings.youtubeUrl}
                      onChange={e => setSettings({...settings, youtubeUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Discord (ссылка)</label>
                    <input
                      type="url"
                      placeholder="https://discord.gg/..."
                      value={settings.discordUrl || ''}
                      onChange={e => setSettings({...settings, discordUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {savingSettings ? 'Сохранение...' : 'Сохранить настройки'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Администраторы</h1>
                  <p className="text-slate-400">Управление пользователями, имеющими доступ к админ-панели.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-cyan-500/10 rounded-3xl p-8 mb-6">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 mb-4">Добавить администратора</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  />
                  <button
                    onClick={handleAddAdmin}
                    disabled={!newAdminEmail || savingSettings}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 border border-cyan-500/10 rounded-3xl p-8">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 mb-4">Список администраторов</h3>
                <div className="space-y-3">
                  {(settings.adminEmails || ['xolodtop889@gmail.com']).map(email => (
                    <div key={email} className="flex items-center justify-between bg-slate-950 border border-white/5 p-4 rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-white font-medium break-all">{email}</span>
                        <div className="flex gap-2">
                          {email === 'xolodtop889@gmail.com' && (
                            <span className="text-xs font-bold text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded-md whitespace-nowrap">Владелец</span>
                          )}
                          {email === user.email && email !== 'xolodtop889@gmail.com' && (
                            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-md whitespace-nowrap">Вы</span>
                          )}
                        </div>
                      </div>
                      {email !== 'xolodtop889@gmail.com' && email !== user.email && (
                        <button
                          onClick={() => handleRemoveAdmin(email)}
                          disabled={savingSettings}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                          title="Удалить администратора"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Комментарии</h1>
                  <p className="text-slate-400">Модерация комментариев пользователей.</p>
                </div>
                {comments.length > 0 && (
                  <select
                    value={commentSort}
                    onChange={(e) => setCommentSort(e.target.value as 'newest' | 'popular')}
                    className="bg-slate-900 border border-white/10 text-slate-300 text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                  >
                    <option value="newest">Сначала новые</option>
                    <option value="popular">Сначала популярные</option>
                  </select>
                )}
              </div>

              <div className="space-y-4">
                {sortedComments.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                    Комментариев пока нет.
                  </div>
                ) : (
                  sortedComments.map(comment => {
                    const game = games.find(g => g.id === comment.gameId);
                    return (
                      <div key={comment.id} className="bg-slate-900 border border-cyan-500/10 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-cyan-400">{comment.authorName}</span>
                            <span className="text-xs text-slate-500">
                              {new Date(comment.createdAt).toLocaleDateString()} в {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            {(comment.likedBy || []).length > 0 && (
                              <span className="text-xs font-medium text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" /> {(comment.likedBy || []).length}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed mb-3">
                            {comment.text}
                          </p>
                          {game && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              К игре: <span className="text-slate-400 font-medium">{game.title}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                          title="Удалить комментарий"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-12 pb-20">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Топы и Статистика</h1>
                <p className="text-slate-400">Рейтинг ваших игр по популярности и вовлеченности.</p>
              </div>

              {/* Table Section */}
              <div className="bg-slate-900 border border-cyan-500/10 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-xl font-bold text-white">Таблица лидеров</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Игра</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Просмотры</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Скачивания</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Лайки</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Конверсия (DL/View)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[...games].sort((a, b) => b.views - a.views).map((game) => (
                        <tr key={game.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{game.title}</div>
                            <div className="text-xs text-slate-500">v{game.version}</div>
                          </td>
                          <td className="px-6 py-4 text-cyan-400 font-mono">{game.views.toLocaleString()}</td>
                          <td className="px-6 py-4 text-emerald-400 font-mono">{game.downloads.toLocaleString()}</td>
                          <td className="px-6 py-4 text-pink-400 font-mono">{(game.likedBy || []).length}</td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                              <div 
                                className="bg-cyan-500 h-full" 
                                style={{ width: `${Math.min(100, (game.downloads / (game.views || 1)) * 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {((game.downloads / (game.views || 1)) * 100).toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-cyan-500/10 rounded-3xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-400" /> Топ по просмотрам
                  </h3>
                  <div className="h-[300px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...games].sort((a, b) => b.views - a.views).slice(0, 5)}
                        layout="vertical"
                        margin={{ left: 40, right: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="title" 
                          type="category" 
                          stroke="#94a3b8" 
                          fontSize={12} 
                          width={80}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '12px' }}
                          itemStyle={{ color: '#22d3ee' }}
                        />
                        <Bar dataKey="views" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={20}>
                          {games.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`rgba(6, 182, 212, ${1 - index * 0.15})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 border border-cyan-500/10 rounded-3xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Download className="w-5 h-5 text-emerald-400" /> Топ по скачиваниям
                  </h3>
                  <div className="h-[300px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...games].sort((a, b) => b.downloads - a.downloads).slice(0, 5)}
                        layout="vertical"
                        margin={{ left: 40, right: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="title" 
                          type="category" 
                          stroke="#94a3b8" 
                          fontSize={12} 
                          width={80}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Bar dataKey="downloads" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                          {games.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`rgba(16, 185, 129, ${1 - index * 0.15})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-cyan-500/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-900/20">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingGame?.id ? 'Редактировать игру' : 'Добавить новую игру'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="gameForm" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Название игры</label>
                    <input
                      type="text"
                      required
                      value={editingGame?.title || ''}
                      onChange={e => setEditingGame({...editingGame, title: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Версия</label>
                    <input
                      type="text"
                      required
                      value={editingGame?.version || ''}
                      onChange={e => setEditingGame({...editingGame, version: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Ссылка на логотип (квадрат)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editingGame?.logoUrl || ''}
                      onChange={e => setEditingGame({...editingGame, logoUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Ссылка на превью (баннер)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editingGame?.previewUrl || ''}
                      onChange={e => setEditingGame({...editingGame, previewUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Платформа</label>
                    <select
                      value={editingGame?.platform || 'pc'}
                      onChange={e => setEditingGame({...editingGame, platform: e.target.value as any})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all appearance-none"
                    >
                      <option value="pc">PC (Windows/Mac/Linux)</option>
                      <option value="android">Android</option>
                      <option value="both">PC & Android</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Жанр</label>
                    <select
                      value={editingGame?.genre || ''}
                      onChange={e => setEditingGame({...editingGame, genre: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all appearance-none"
                    >
                      <option value="">Выберите жанр</option>
                      <option value="RPG">RPG</option>
                      <option value="Horror">Horror</option>
                      <option value="Simulator">Simulator</option>
                      <option value="Action">Action</option>
                      <option value="Adventure">Adventure</option>
                      <option value="Strategy">Strategy</option>
                      <option value="Puzzle">Puzzle</option>
                      <option value="Shooter">Shooter</option>
                      <option value="Platformer">Platformer</option>
                      <option value="Racing">Racing</option>
                      <option value="Fighting">Fighting</option>
                      <option value="Survival">Survival</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Теги (через запятую)</label>
                  <input
                    type="text"
                    placeholder="Indie, Pixel Art, Hardcore..."
                    value={editingGame?.tags?.join(', ') || ''}
                    onChange={e => setEditingGame({...editingGame, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  />
                </div>

                <div className="space-y-4 p-5 border border-white/5 rounded-2xl bg-slate-900/50">
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-1">Файл игры</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Так как сайт работает на GitHub Pages, файлы игр нужно хранить на внешних сервисах (например, в <b>GitHub Releases</b>, <b>Google Drive</b> или <b>Яндекс.Диске</b>). Просто загрузите файл туда и вставьте прямую ссылку ниже.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Файл игры (загрузка в Firebase Storage)</label>
                    <input
                      type="file"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                          setFileSize(e.target.files[0].size);
                        }
                      }}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-600"
                    />
                    {uploading && <p className="text-xs text-cyan-400">Загрузка: {uploadProgress}%</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Имя файла (для отображения)</label>
                    <input
                      type="text"
                      required
                      placeholder="Например: game_v1.0.zip"
                      value={editingGame?.fileName || ''}
                      onChange={e => setEditingGame({...editingGame, fileName: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Список изменений (changelog)</label>
                  <textarea
                    rows={3}
                    placeholder="Исправлен баг с камерой..."
                    value={changelog}
                    onChange={e => setChangelog(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Описание</label>
                  <textarea
                    required
                    rows={3}
                    value={editingGame?.description || ''}
                    onChange={e => setEditingGame({...editingGame, description: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none"
                  />
                </div>

                <div className="space-y-4 p-5 border border-white/5 rounded-2xl bg-slate-900/50">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" /> Скриншоты
                  </h3>
                  <div className="space-y-3">
                    {(editingGame?.screenshots || []).map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={url}
                          onChange={e => {
                            const newScreenshots = [...(editingGame?.screenshots || [])];
                            newScreenshots[index] = e.target.value;
                            setEditingGame({...editingGame, screenshots: newScreenshots});
                          }}
                          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newScreenshots = (editingGame?.screenshots || []).filter((_, i) => i !== index);
                            setEditingGame({...editingGame, screenshots: newScreenshots});
                          }}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newScreenshots = [...(editingGame?.screenshots || []), ''];
                        setEditingGame({...editingGame, screenshots: newScreenshots});
                      }}
                      className="w-full py-2 border border-dashed border-white/10 rounded-xl text-xs text-slate-500 hover:text-white hover:border-white/20 transition-all"
                    >
                      + Добавить скриншот
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-5 border border-white/5 rounded-2xl bg-slate-900/50">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-cyan-400" /> Системные требования (PC)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ОС</label>
                      <input
                        type="text"
                        placeholder="Windows 10/11"
                        value={editingGame?.systemRequirements?.os || ''}
                        onChange={e => setEditingGame({
                          ...editingGame, 
                          systemRequirements: { ...(editingGame?.systemRequirements || {os:'', cpu:'', ram:'', gpu:'', storage:''}), os: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Процессор</label>
                      <input
                        type="text"
                        placeholder="Intel i5 / Ryzen 5"
                        value={editingGame?.systemRequirements?.cpu || ''}
                        onChange={e => setEditingGame({
                          ...editingGame, 
                          systemRequirements: { ...(editingGame?.systemRequirements || {os:'', cpu:'', ram:'', gpu:'', storage:''}), cpu: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ОЗУ</label>
                      <input
                        type="text"
                        placeholder="8 GB"
                        value={editingGame?.systemRequirements?.ram || ''}
                        onChange={e => setEditingGame({
                          ...editingGame, 
                          systemRequirements: { ...(editingGame?.systemRequirements || {os:'', cpu:'', ram:'', gpu:'', storage:''}), ram: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Видеокарта</label>
                      <input
                        type="text"
                        placeholder="GTX 1060 / RX 580"
                        value={editingGame?.systemRequirements?.gpu || ''}
                        onChange={e => setEditingGame({
                          ...editingGame, 
                          systemRequirements: { ...(editingGame?.systemRequirements || {os:'', cpu:'', ram:'', gpu:'', storage:''}), gpu: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Место на диске</label>
                      <input
                        type="text"
                        placeholder="2 GB"
                        value={editingGame?.systemRequirements?.storage || ''}
                        onChange={e => setEditingGame({
                          ...editingGame, 
                          systemRequirements: { ...(editingGame?.systemRequirements || {os:'', cpu:'', ram:'', gpu:'', storage:''}), storage: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5 border border-white/5 rounded-2xl bg-slate-900/50">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" /> Системные требования (Android)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ОС</label>
                      <input
                        type="text"
                        placeholder="Android 10+"
                        value={editingGame?.androidSystemRequirements?.os || ''}
                        onChange={e => setEditingGame({
                          ...editingGame, 
                          androidSystemRequirements: { ...(editingGame?.androidSystemRequirements || {os:'', ram:'', storage:''}), os: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ОЗУ</label>
                      <input
                        type="text"
                        placeholder="4 GB"
                        value={editingGame?.androidSystemRequirements?.ram || ''}
                        onChange={e => setEditingGame({
                          ...editingGame, 
                          androidSystemRequirements: { ...(editingGame?.androidSystemRequirements || {os:'', ram:'', storage:''}), ram: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Место на диске</label>
                      <input
                        type="text"
                        placeholder="2 GB"
                        value={editingGame?.androidSystemRequirements?.storage || ''}
                        onChange={e => setEditingGame({
                          ...editingGame, 
                          androidSystemRequirements: { ...(editingGame?.androidSystemRequirements || {os:'', ram:'', storage:''}), storage: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5 border border-white/5 rounded-2xl bg-slate-900/50">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-400" /> История версий
                  </h3>
                  <div className="space-y-3">
                    {(editingGame?.versions || []).map((v, index) => (
                      <div key={index} className="space-y-2 p-3 bg-black/40 border border-white/5 rounded-xl">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Версия (напр. 0.9.0)"
                            value={v.version}
                            onChange={e => {
                              const newVersions = [...(editingGame?.versions || [])];
                              newVersions[index] = { ...v, version: e.target.value };
                              setEditingGame({...editingGame, versions: newVersions});
                            }}
                            className="w-24 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                          <input
                            type="url"
                            placeholder="Ссылка на файл"
                            value={v.fileUrl}
                            onChange={e => {
                              const newVersions = [...(editingGame?.versions || [])];
                              newVersions[index] = { ...v, fileUrl: e.target.value };
                              setEditingGame({...editingGame, versions: newVersions});
                            }}
                            className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newVersions = (editingGame?.versions || []).filter((_, i) => i !== index);
                              setEditingGame({...editingGame, versions: newVersions});
                            }}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newVersions = [...(editingGame?.versions || []), { version: '', fileUrl: '', createdAt: Date.now() }];
                        setEditingGame({...editingGame, versions: newVersions});
                      }}
                      className="w-full py-2 border border-dashed border-white/10 rounded-xl text-xs text-slate-500 hover:text-white hover:border-white/20 transition-all"
                    >
                      + Добавить старую версию
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Патчноут (Что нового)</label>
                  <textarea
                    rows={4}
                    value={editingGame?.releaseNotes || ''}
                    onChange={e => setEditingGame({...editingGame, releaseNotes: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Прогресс разработки (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingGame?.developmentProgress ?? 100}
                    onChange={e => setEditingGame({...editingGame, developmentProgress: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-sm"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                form="gameForm"
                disabled={saving || uploadProgress !== null}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
