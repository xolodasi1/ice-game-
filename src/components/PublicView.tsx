import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, increment, query, orderBy, addDoc, onSnapshot, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Download, Gamepad2, Info, Loader2, Snowflake, Eye, ChevronLeft, Smartphone, Monitor, MessageSquare, Send, ThumbsUp, ThumbsDown, LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  platform: 'pc' | 'android' | 'both';
  logoUrl?: string;
  previewUrl?: string;
  likedBy?: string[];
  dislikedBy?: string[];
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteAvatar: string;
  vkUrl: string;
  telegramUrl: string;
  youtubeUrl: string;
}

interface Comment {
  id: string;
  gameId: string;
  authorName: string;
  text: string;
  createdAt: number;
  likedBy?: string[];
}

export default function PublicView() {
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'ice_game',
    siteDescription: 'Каталог инди-игр и проектов',
    siteAvatar: '',
    vkUrl: '',
    telegramUrl: '',
    youtubeUrl: ''
  });
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pc' | 'android'>('all');
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSort, setCommentSort] = useState<'newest' | 'popular'>('newest');

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setNewCommentName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
        setGames(gamesData);

        const settingsDoc = await getDocs(query(collection(db, 'settings')));
        settingsDoc.forEach(doc => {
          if (doc.id === 'general') {
            const data = doc.data() as any;
            setSettings(prev => ({ ...prev, ...data }));
            
            // Check admin status
            const adminEmails = data.adminEmails || (data.adminEmail ? [data.adminEmail] : ['xolodtop889@gmail.com']);
            if (user?.email && (adminEmails.includes(user.email) || user.email === 'xolodtop889@gmail.com')) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          }
        });
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Не удалось загрузить данные.");
        if (err.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'games');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleViewGame = async (game: Game) => {
    setSelectedGame(game);
    try {
      await updateDoc(doc(db, 'games', game.id), {
        views: increment(1)
      });
    } catch (e) {
      console.error("Failed to increment views", e);
    }
  };

  useEffect(() => {
    if (!selectedGame) return;
    
    const q = query(
      collection(db, 'comments'),
      where('gameId', '==', selectedGame.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
    });
    
    return () => unsubscribe();
  }, [selectedGame]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Пожалуйста, войдите в систему, чтобы оставить комментарий.");
      return;
    }
    if (!selectedGame || !newCommentName.trim() || !newCommentText.trim()) return;
    
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        gameId: selectedGame.id,
        authorName: newCommentName.trim(),
        text: newCommentText.trim(),
        createdAt: Date.now()
      });
      setNewCommentText('');
    } catch (err) {
      console.error("Failed to add comment", err);
      alert("Не удалось отправить комментарий. Попробуйте позже.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDownload = async (game: Game) => {
    try {
      await updateDoc(doc(db, 'games', game.id), {
        downloads: increment(1)
      });
    } catch (e) {
      console.error("Failed to increment downloads", e);
    }
    window.open(game.fileUrl, '_blank');
  };

  const handleVote = async (gameId: string, type: 'like' | 'dislike') => {
    if (!user) {
      alert("Пожалуйста, войдите в систему, чтобы голосовать.");
      return;
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const likedBy = game.likedBy || [];
    const dislikedBy = game.dislikedBy || [];
    
    const hasLiked = likedBy.includes(user.uid);
    const hasDisliked = dislikedBy.includes(user.uid);

    let newLikedBy = [...likedBy];
    let newDislikedBy = [...dislikedBy];

    if (type === 'like') {
      if (hasLiked) {
        newLikedBy = newLikedBy.filter(uid => uid !== user.uid);
      } else {
        newLikedBy.push(user.uid);
        newDislikedBy = newDislikedBy.filter(uid => uid !== user.uid);
      }
    } else {
      if (hasDisliked) {
        newDislikedBy = newDislikedBy.filter(uid => uid !== user.uid);
      } else {
        newDislikedBy.push(user.uid);
        newLikedBy = newLikedBy.filter(uid => uid !== user.uid);
      }
    }

    try {
      await updateDoc(doc(db, 'games', gameId), {
        likedBy: newLikedBy,
        dislikedBy: newDislikedBy
      });
      
      const updatedGames = games.map(g => g.id === gameId ? { ...g, likedBy: newLikedBy, dislikedBy: newDislikedBy } : g);
      setGames(updatedGames);
      if (selectedGame?.id === gameId) {
        setSelectedGame({ ...selectedGame, likedBy: newLikedBy, dislikedBy: newDislikedBy });
      }
    } catch (error) {
      console.error("Vote failed", error);
      alert("Не удалось сохранить голос. Попробуйте позже.");
    }
  };

  const handleCommentVote = async (commentId: string) => {
    if (!user) {
      alert("Пожалуйста, войдите в систему, чтобы голосовать.");
      return;
    }
    
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const likedBy = comment.likedBy || [];
    const hasLiked = likedBy.includes(user.uid);
    let newLikedBy = [...likedBy];

    if (hasLiked) {
      newLikedBy = newLikedBy.filter(uid => uid !== user.uid);
    } else {
      newLikedBy.push(user.uid);
    }

    try {
      await updateDoc(doc(db, 'comments', commentId), {
        likedBy: newLikedBy
      });
      // Optimistic update
      setComments(comments.map(c => c.id === commentId ? { ...c, likedBy: newLikedBy } : c));
    } catch (error) {
      console.error("Comment vote failed", error);
      alert("Не удалось сохранить голос. Попробуйте позже.");
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Navigation */}
      <nav className="border-b border-cyan-500/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-white">
            {settings.siteAvatar ? (
              <img src={settings.siteAvatar} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <Snowflake className="w-6 h-6 text-cyan-400" />
            )}
            {settings.siteName}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors">
                    Панель автора
                  </Link>
                )}
                <button onClick={handleLogout} className="text-sm font-medium text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Выйти</span>
                </button>
              </>
            ) : (
              <button onClick={handleLogin} className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                <LogIn className="w-4 h-4" /> Войти
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center">
            {error}
          </div>
        ) : selectedGame ? (
          // Single Game View
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={() => setSelectedGame(null)}
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-8 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад к списку игр
            </button>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium border border-cyan-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  Версия {selectedGame.version}
                </div>
                
                <div className="flex gap-2">
                  {(selectedGame.platform === 'pc' || selectedGame.platform === 'both') && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700">
                      <Monitor className="w-4 h-4" /> PC
                    </div>
                  )}
                  {(selectedGame.platform === 'android' || selectedGame.platform === 'both') && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700">
                      <Smartphone className="w-4 h-4" /> Android
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  {selectedGame.logoUrl && (
                    <img src={selectedGame.logoUrl} alt="Game Logo" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl object-cover shadow-xl shadow-cyan-900/20 border border-white/10 shrink-0" />
                  )}
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                    {selectedGame.title}
                  </h1>
                </div>
                
                <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
                  {selectedGame.description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    onClick={() => handleDownload(selectedGame)}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-500 text-slate-950 font-bold rounded-2xl hover:bg-cyan-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
                  >
                    <Download className="w-5 h-5" />
                    Скачать игру
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVote(selectedGame.id, 'like')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all ${
                        user && (selectedGame.likedBy || []).includes(user.uid)
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-900 text-slate-400 border border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      {(selectedGame.likedBy || []).length}
                    </button>
                    <button
                      onClick={() => handleVote(selectedGame.id, 'dislike')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all ${
                        user && (selectedGame.dislikedBy || []).includes(user.uid)
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-slate-900 text-slate-400 border border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      {(selectedGame.dislikedBy || []).length}
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/10 shadow-2xl flex items-center justify-center group">
                {selectedGame.previewUrl ? (
                  <img src={selectedGame.previewUrl} alt="Game Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/ice_game/800/600')] bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-500 mix-blend-overlay"></div>
                    <Gamepad2 className="w-32 h-32 text-cyan-500/20 relative z-10" />
                  </>
                )}
              </div>
            </div>

            {selectedGame.releaseNotes && (
              <div className="mt-20 pt-16 border-t border-cyan-500/10">
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <Info className="w-6 h-6 text-cyan-400" />
                    Что нового в {selectedGame.version}?
                  </h2>
                  <div className="prose prose-invert prose-slate max-w-none">
                    <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {selectedGame.releaseNotes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="mt-20 pt-16 border-t border-cyan-500/10">
              <div className="max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-cyan-400" />
                    Комментарии ({comments.length})
                  </h2>
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
                
                {user ? (
                  <form onSubmit={handleSubmitComment} className="bg-slate-900 border border-cyan-500/10 rounded-3xl p-6 mb-10">
                    <h3 className="text-lg font-bold text-white mb-4">Оставить комментарий</h3>
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Ваше имя"
                          maxLength={50}
                          value={newCommentName}
                          onChange={(e) => setNewCommentName(e.target.value)}
                          className="w-full sm:w-64 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                        />
                      </div>
                      <div>
                        <textarea
                          required
                          placeholder="Что вы думаете об игре?"
                          maxLength={1000}
                          rows={3}
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingComment || !newCommentName.trim() || !newCommentText.trim()}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          Отправить
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="bg-slate-900 border border-cyan-500/10 rounded-3xl p-8 mb-10 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Войдите, чтобы оставить комментарий</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                      Только зарегистрированные пользователи могут оставлять комментарии и оценивать игры.
                    </p>
                    <button
                      onClick={handleLogin}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                    >
                      <LogIn className="w-5 h-5" />
                      Войти через Google
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  {sortedComments.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                      Пока нет комментариев. Будьте первым!
                    </div>
                  ) : (
                    sortedComments.map(comment => (
                      <div key={comment.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-cyan-400">{comment.authorName}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(comment.createdAt).toLocaleDateString()} в {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {comment.text}
                        </p>
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                          <button
                            onClick={() => handleCommentVote(comment.id)}
                            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                              user && (comment.likedBy || []).includes(user.uid)
                                ? 'text-cyan-400'
                                : 'text-slate-500 hover:text-cyan-400'
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            {(comment.likedBy || []).length > 0 ? (comment.likedBy || []).length : 'Лайк'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Games List View
          <div className="animate-in fade-in duration-500">
            <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{settings.siteName}</h1>
                <p className="text-slate-400 text-lg whitespace-pre-wrap">{settings.siteDescription}</p>
              </div>
              
              <div className="flex flex-wrap justify-center bg-slate-900 border border-cyan-500/20 rounded-xl p-1 self-center md:self-auto gap-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  Все
                </button>
                <button
                  onClick={() => setFilter('pc')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pc' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  <Monitor className="w-4 h-4" /> PC
                </button>
                <button
                  onClick={() => setFilter('android')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'android' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  <Smartphone className="w-4 h-4" /> Android
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.filter(g => filter === 'all' || g.platform === filter || g.platform === 'both').map(game => (
                <div 
                  key={game.id} 
                  onClick={() => handleViewGame(game)}
                  className="bg-slate-900 border border-cyan-500/10 rounded-3xl p-6 cursor-pointer group hover:border-cyan-500/30 transition-all hover:-translate-y-1 shadow-lg hover:shadow-cyan-900/20 flex flex-col"
                >
                  <div className="aspect-video bg-slate-950 rounded-2xl mb-6 flex items-center justify-center border border-white/5 relative overflow-hidden">
                    {game.previewUrl ? (
                      <img src={game.previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/ice_game/400/225')] bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity mix-blend-overlay"></div>
                        <Gamepad2 className="w-12 h-12 text-cyan-500/30 relative z-10 group-hover:scale-110 transition-transform" />
                      </>
                    )}
                    <div className="absolute top-3 right-3 flex gap-1 z-20">
                      {(game.platform === 'pc' || game.platform === 'both') && (
                        <div className="bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-md border border-white/10 text-cyan-400">
                          <Monitor className="w-4 h-4" />
                        </div>
                      )}
                      {(game.platform === 'android' || game.platform === 'both') && (
                        <div className="bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-md border border-white/10 text-cyan-400">
                          <Smartphone className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-2">
                    {game.logoUrl && (
                      <img src={game.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                    )}
                    <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">{game.title}</h3>
                  </div>
                  
                  <p className="text-slate-400 text-sm line-clamp-2 mb-6 flex-1">
                    {game.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-xs font-medium text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded-md">
                      v{game.version}
                    </span>
                    <div className="flex items-center gap-4 text-slate-500 text-xs font-medium">
                      <span className="flex items-center gap-1" title="Лайки"><ThumbsUp className="w-3 h-3" /> {(game.likedBy || []).length}</span>
                      <span className="flex items-center gap-1" title="Просмотры"><Eye className="w-3 h-3" /> {game.views}</span>
                      <span className="flex items-center gap-1" title="Скачивания"><Download className="w-3 h-3" /> {game.downloads}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {games.filter(g => filter === 'all' || g.platform === filter || g.platform === 'both').length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                  <Snowflake className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Игры для выбранной платформы пока не добавлены.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-500/10 mt-20 py-10 text-center text-slate-500 text-sm">
        <div className="flex justify-center gap-6 mb-6">
          {settings.vkUrl && (
            <a href={settings.vkUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
              ВКонтакте
            </a>
          )}
          {settings.telegramUrl && (
            <a href={settings.telegramUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
              Telegram
            </a>
          )}
          {settings.youtubeUrl && (
            <a href={settings.youtubeUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
              YouTube
            </a>
          )}
        </div>
        <p>© {new Date().getFullYear()} {settings.siteName}. Все права защищены.</p>
      </footer>
    </div>
  );
}
