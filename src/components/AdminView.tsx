import React, { useState, useEffect, FormEvent } from 'react';
import { User, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from '../firebase';
import { LogOut, Save, Loader2, Download, Eye, Settings, Plus, Edit3, Trash2, AlertCircle, CheckCircle2, UploadCloud, X, BarChart2, Smartphone, Monitor, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminViewProps {
  user: User;
}

interface Game {
  id: string;
  title: string;
  description: string;
  version: string;
  fileUrl: string;
  fileName: string;
  releaseNotes: string;
  views: number;
  downloads: number;
  createdAt: number;
  authorUid: string;
  platform: 'pc' | 'android' | 'both';
  logoUrl?: string;
  previewUrl?: string;
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteAvatar: string;
  vkUrl: string;
  telegramUrl: string;
  youtubeUrl: string;
  adminEmails?: string[];
}

export default function AdminView({ user }: AdminViewProps) {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'games' | 'settings' | 'admins'>('games');
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
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

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

    return () => {
      unsubscribeGames();
      unsubscribeSettings();
    };
  }, []);

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
    if (!editingGame?.title || !editingGame?.fileUrl || !editingGame?.fileName) {
      setMessage({ type: 'error', text: 'Заполните название, укажите ссылку на файл и его имя.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    
    try {
      const isNew = !editingGame.id;
      const gameId = editingGame.id || doc(collection(db, 'games')).id;
      
      const gameData: any = {
        title: editingGame.title,
        description: editingGame.description || '',
        version: editingGame.version || '1.0.0',
        fileUrl: editingGame.fileUrl,
        fileName: editingGame.fileName || 'game.zip',
        releaseNotes: editingGame.releaseNotes || '',
        views: isNew ? 0 : editingGame.views,
        downloads: isNew ? 0 : editingGame.downloads,
        createdAt: isNew ? Date.now() : editingGame.createdAt,
        authorUid: user.uid,
        platform: editingGame.platform || 'pc'
      };

      if (editingGame.logoUrl) gameData.logoUrl = editingGame.logoUrl;
      if (editingGame.previewUrl) gameData.previewUrl = editingGame.previewUrl;

      await setDoc(doc(db, 'games', gameId), gameData);
      setMessage({ type: 'success', text: 'Игра успешно сохранена!' });
      setIsModalOpen(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage({ type: 'error', text: 'Ошибка при сохранении: ' + err.message });
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 md:min-h-screen border-b md:border-b-0 md:border-r border-cyan-500/10 bg-slate-900/50 flex flex-col shrink-0">
        <div className="p-4 md:p-6 border-b border-cyan-500/10 flex justify-between items-center md:block">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              ice_game Admin
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
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-colors text-sm font-medium whitespace-nowrap ${
              activeTab === 'games' 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="hidden sm:inline md:inline">Управление играми</span>
            <span className="sm:hidden">Игры</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-colors text-sm font-medium whitespace-nowrap ${
              activeTab === 'settings' 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline md:inline">Настройки сайта</span>
            <span className="sm:hidden">Настройки</span>
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-colors text-sm font-medium whitespace-nowrap ${
              activeTab === 'admins' 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline md:inline">Администраторы</span>
            <span className="sm:hidden">Админы</span>
          </button>
        </nav>

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
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-12 relative w-full">
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

          {activeTab === 'games' ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Ваши игры</h1>
                  <p className="text-slate-400">Управляйте каталогом игр и отслеживайте статистику.</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => window.open('/', '_blank')}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors border border-white/10"
                  >
                    На сайт
                  </button>
                  <button
                    onClick={() => {
                      setEditingGame({});
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить игру
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map(game => (
                  <div key={game.id} className="bg-slate-900 border border-cyan-500/10 rounded-3xl p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-xl font-bold text-white">{game.title}</h3>
                      <div className="flex gap-1 text-cyan-500/50">
                        {(game.platform === 'pc' || game.platform === 'both') && <Monitor className="w-4 h-4" />}
                        {(game.platform === 'android' || game.platform === 'both') && <Smartphone className="w-4 h-4" />}
                      </div>
                    </div>
                    <p className="text-sm text-cyan-400 mb-4">v{game.version}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-950 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                          <Download className="w-3 h-3" /> Скачивания
                        </div>
                        <div className="text-xl font-semibold text-white">{game.downloads}</div>
                      </div>
                      <div className="bg-slate-950 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                          <Eye className="w-3 h-3" /> Просмотры
                        </div>
                        <div className="text-xl font-semibold text-white">{game.views}</div>
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
                  </div>
                ))}
                {games.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                    У вас пока нет добавленных игр.
                  </div>
                )}
              </div>
            </>
          ) : (
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

                <div className="space-y-4 p-5 border border-white/5 rounded-2xl bg-slate-900/50">
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-1">Файл игры</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Так как сайт работает на GitHub Pages, файлы игр нужно хранить на внешних сервисах (например, в <b>GitHub Releases</b>, <b>Google Drive</b> или <b>Яндекс.Диске</b>). Просто загрузите файл туда и вставьте прямую ссылку ниже.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Ссылка на скачивание файла</label>
                    <input
                      type="url"
                      required
                      placeholder="https://github.com/user/repo/releases/download/..."
                      value={editingGame?.fileUrl || ''}
                      onChange={e => setEditingGame({...editingGame, fileUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm"
                    />
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
                  <label className="text-sm font-medium text-slate-400">Описание</label>
                  <textarea
                    required
                    rows={3}
                    value={editingGame?.description || ''}
                    onChange={e => setEditingGame({...editingGame, description: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none"
                  />
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
