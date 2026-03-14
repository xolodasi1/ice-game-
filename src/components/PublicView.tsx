import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, increment, query, orderBy, addDoc, onSnapshot, where, getDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Download, Gamepad2, Info, Loader2, Snowflake, Eye, ChevronLeft, Smartphone, Monitor, MessageSquare, Send, ThumbsUp, ThumbsDown, LogIn, LogOut, Bell, Star, X, Settings, BellRing, Trash, Heart, Bug, Share2, ExternalLink, Cpu, HardDrive, Database, Layers, Terminal, Wrench, Plus, Trophy, User } from 'lucide-react';
import { MediaSlider } from './MediaSlider';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll } from 'motion/react';

interface SystemEvent {
  id: string;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
}

import { Game } from '../types';

interface UserGameData {
  id: string;
  userId: string;
  gameId: string;
  isFavorite: boolean;
  status: 'none' | 'playing' | 'completed' | 'dropped';
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteAvatar: string;
  vkUrl: string;
  telegramUrl: string;
  youtubeUrl: string;
  discordUrl?: string;
}

interface Comment {
  id: string;
  gameId: string;
  authorName: string;
  authorUid?: string;
  text: string;
  createdAt: number;
  likedBy?: string[];
  isDeveloper?: boolean;
  type?: 'comment' | 'bug_report';
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

interface Achievement {
  id: string;
  userId: string;
  gameId: string;
  title: string;
  description?: string;
  iconUrl?: string;
  unlockedAt: number;
}

interface LeaderboardEntry {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  score?: number;
  time?: number;
  createdAt: number;
}

interface Mod {
  id: string;
  gameId: string;
  authorUid: string;
  authorName: string;
  title: string;
  description?: string;
  fileUrl: string;
  createdAt: number;
  downloads?: number;
}

interface DevLog {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  authorUid: string;
}

const Snowfall = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: -20, 
            opacity: Math.random() * 0.5 + 0.2,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: '110vh',
            x: (Math.random() * 100 - 50) + 'px'
          }}
          transition={{ 
            duration: Math.random() * 10 + 10, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * 20
          }}
          className="absolute"
        >
          <Snowflake className="text-white/20 w-4 h-4" />
        </motion.div>
      ))}
    </div>
  );
};

const CustomCursor = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('.cursor-pointer')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      <motion.div 
        className="custom-cursor hidden md:block"
        animate={{ 
          x: mousePos.x - 10, 
          y: mousePos.y - 10,
          scale: isHovering ? 2.5 : 1,
          borderColor: isHovering ? 'rgba(0, 240, 255, 0.8)' : 'rgba(0, 240, 255, 0.5)'
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 200, mass: 0.5 }}
      />
      <motion.div 
        className="custom-cursor-dot hidden md:block"
        animate={{ 
          x: mousePos.x - 2, 
          y: mousePos.y - 2,
          scale: isHovering ? 0 : 1
        }}
        transition={{ type: 'spring', damping: 40, stiffness: 400, mass: 0.2 }}
      />
    </>
  );
};

const NoiseOverlay = () => <div className="noise-overlay" />;

const CyberLoading = () => (
  <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden">
    <div className="scanline" />
    <div className="cyber-grid absolute inset-0 opacity-20" />
    
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <div className="w-24 h-24 border-2 border-[#00F0FF]/20 rounded-full animate-spin-slow" />
      <div className="absolute inset-0 w-24 h-24 border-t-2 border-[#00F0FF] rounded-full animate-spin" />
      <Snowflake className="absolute inset-0 m-auto w-10 h-10 text-[#00F0FF] animate-pulse" />
    </motion.div>
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8 text-center"
    >
      <div className="text-[#00F0FF] font-black uppercase tracking-[0.5em] text-sm mb-2 animate-pulse">
        Initializing System
      </div>
      <div className="flex gap-1 justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
            className="w-1 h-1 bg-[#00F0FF]"
          />
        ))}
      </div>
    </motion.div>

    {/* Decorative corner elements */}
    <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-[#00F0FF]/20" />
    <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-[#00F0FF]/20" />
  </div>
);

export default function PublicView() {
  const { scrollYProgress } = useScroll();
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
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popularity' | 'downloads' | 'views'>('newest');
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSort, setCommentSort] = useState<'newest' | 'popular'>('newest');

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userGameData, setUserGameData] = useState<UserGameData[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showModModal, setShowModModal] = useState(false);
  const [newModData, setNewModData] = useState({ title: '', description: '', fileUrl: '' });
  const [submittingMod, setSubmittingMod] = useState(false);
  const [commentType, setCommentType] = useState<'comment' | 'bug_report'>('comment');

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardEntry[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [devlogs, setDevlogs] = useState<DevLog[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'leaderboard' | 'mods'>('comments');
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);

  const addSystemEvent = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setSystemEvents(prev => {
      const newEvents = [{ id, message, timestamp: Date.now(), type }, ...prev].slice(0, 5);
      return newEvents;
    });
    setTimeout(() => {
      setSystemEvents(prev => prev.filter(e => e.id !== id));
    }, 5000);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setNewCommentName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
        
        // Fetch user game data
        const q = query(collection(db, 'userGameData'), where('userId', '==', currentUser.uid));
        const unsubData = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserGameData));
          setUserGameData(data);
        });

        const qAchievements = query(collection(db, 'achievements'), where('userId', '==', currentUser.uid));
        const unsubAchievements = onSnapshot(qAchievements, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Achievement));
          setAchievements(data);
        });

        return () => {
          unsubData();
          unsubAchievements();
        };
      } else {
        setUserGameData([]);
        setAchievements([]);
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

        const devlogsSnapshot = await getDocs(query(collection(db, 'devlogs'), orderBy('createdAt', 'desc')));
        setDevlogs(devlogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DevLog)));
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

  useEffect(() => {
    if (!isAdmin) {
      setNotifications([]);
      return;
    }

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      setNotifications(notificationsData);
    });

    return () => unsubscribe();
  }, [isAdmin]);

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

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      addSystemEvent('Авторизация успешна', 'success');
    } catch (error) {
      console.error("Login failed", error);
      addSystemEvent('Ошибка авторизации', 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    addSystemEvent('Сеанс завершен', 'info');
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
    
    const unsubscribeComments = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
    });

    const qLeaderboards = query(
      collection(db, 'leaderboards'),
      where('gameId', '==', selectedGame.id),
      orderBy('score', 'desc')
    );
    
    const unsubscribeLeaderboards = onSnapshot(qLeaderboards, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaderboardEntry));
      setLeaderboards(data);
    });

    const qMods = query(
      collection(db, 'mods'),
      where('gameId', '==', selectedGame.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeMods = onSnapshot(qMods, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mod));
      setMods(data);
    });
    
    return () => {
      unsubscribeComments();
      unsubscribeLeaderboards();
      unsubscribeMods();
    };
  }, [selectedGame]);

  const handleAddMod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGame) return;
    if (!newModData.title.trim() || !newModData.fileUrl.trim()) return;

    setSubmittingMod(true);
    try {
      await addDoc(collection(db, 'mods'), {
        gameId: selectedGame.id,
        authorUid: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        title: newModData.title.trim(),
        description: newModData.description.trim(),
        fileUrl: newModData.fileUrl.trim(),
        createdAt: Date.now(),
        downloads: 0
      });
      setShowModModal(false);
      setNewModData({ title: '', description: '', fileUrl: '' });
      addSystemEvent('Мод успешно добавлен', 'success');
    } catch (err) {
      console.error("Failed to add mod", err);
      addSystemEvent('Ошибка при добавлении мода', 'error');
    } finally {
      setSubmittingMod(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Пожалуйста, войдите в систему, чтобы оставить отзыв.");
      return;
    }
    if (!selectedGame || !newCommentName.trim() || !newCommentText.trim()) return;
    
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        gameId: selectedGame.id,
        authorName: newCommentName.trim(),
        authorUid: user.uid,
        text: newCommentText.trim(),
        createdAt: Date.now(),
        isDeveloper: isAdmin,
        type: commentType
      });

      // Create notification for admin
      await addDoc(collection(db, 'notifications'), {
        type: commentType === 'bug_report' ? 'new_bug_report' : 'new_comment',
        message: `${commentType === 'bug_report' ? 'Баг-репорт' : 'Новый комментарий'} от ${newCommentName.trim()} к игре "${selectedGame.title}"`,
        gameId: selectedGame.id,
        gameTitle: selectedGame.title,
        authorName: newCommentName.trim(),
        read: false,
        createdAt: Date.now()
      });

      setNewCommentText('');
      setCommentType('comment');
      addSystemEvent(commentType === 'bug_report' ? 'Баг-репорт отправлен' : 'Комментарий добавлен', 'success');
    } catch (err) {
      console.error("Failed to add comment", err);
      addSystemEvent('Ошибка при отправке', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleToggleFavorite = async (gameId: string) => {
    if (!user) return;
    try {
      const existing = userGameData.find(d => d.gameId === gameId);
      if (existing) {
        await updateDoc(doc(db, 'userGameData', existing.id), { isFavorite: !existing.isFavorite });
        addSystemEvent(!existing.isFavorite ? 'Добавлено в избранное' : 'Удалено из избранного', 'info');
      } else {
        await addDoc(collection(db, 'userGameData'), {
          userId: user.uid,
          gameId,
          isFavorite: true,
          status: 'none'
        });
        addSystemEvent('Добавлено в избранное', 'info');
      }
    } catch (e) {
      addSystemEvent('Ошибка при обновлении избранного', 'error');
    }
  };

  const handleUpdateStatus = async (gameId: string, status: UserGameData['status']) => {
    if (!user) return;
    try {
      const existing = userGameData.find(d => d.gameId === gameId);
      if (existing) {
        await updateDoc(doc(db, 'userGameData', existing.id), { status });
      } else {
        await addDoc(collection(db, 'userGameData'), {
          userId: user.uid,
          gameId,
          isFavorite: false,
          status
        });
      }
      addSystemEvent('Статус игры обновлен', 'success');
    } catch (e) {
      addSystemEvent('Ошибка при обновлении статуса', 'error');
    }
  };

  const handleRate = async (gameId: string, score: number) => {
    if (!user) return;
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const ratings = game.ratings || [];
    const existingIndex = ratings.findIndex(r => r.userId === user.uid);
    let newRatings = [...ratings];

    if (existingIndex > -1) {
      newRatings[existingIndex].score = score;
    } else {
      newRatings.push({ userId: user.uid, score });
    }

    try {
      await updateDoc(doc(db, 'games', gameId), { ratings: newRatings });
      addSystemEvent('Оценка сохранена', 'success');
    } catch (err) {
      console.error("Failed to rate", err);
      addSystemEvent('Ошибка при сохранении оценки', 'error');
    }
  };

  const getAverageRating = (game: Game) => {
    if (!game.ratings || game.ratings.length === 0) return 0;
    const sum = game.ratings.reduce((acc, r) => acc + r.score, 0);
    return (sum / game.ratings.length).toFixed(1);
  };

  const handleDownload = async (game: Game) => {
    if (!user) {
      addSystemEvent('Для скачивания игры необходимо войти в систему.', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'games', game.id), {
        downloads: increment(1)
      });
      addSystemEvent(`Загрузка ${game.title} начата`, 'info');
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
      addSystemEvent('Голос учтен', 'success');
    } catch (error) {
      console.error("Vote failed", error);
      addSystemEvent('Ошибка при голосовании', 'error');
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
      addSystemEvent('Оценка комментария сохранена', 'success');
    } catch (error) {
      console.error("Comment vote failed", error);
      addSystemEvent('Ошибка при оценке', 'error');
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
    return <CyberLoading />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-[#00F0FF]/20 relative overflow-hidden">
      <CustomCursor />
      <NoiseOverlay />
      
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#00F0FF] z-[100] origin-left shadow-[0_0_10px_#00F0FF]"
        style={{ scaleX: scrollYProgress }}
      />
      
      {/* Graphical Enhancements */}
      <div className="scanline" />
      <div className="fixed inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950 pointer-events-none" />
      
      <Snowfall />
      
      {/* Top Navigation Bar */}
      <nav className="h-16 glass-panel border-b border-[#00F0FF]/20 sticky top-0 z-[60] px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 text-[#00F0FF] font-black tracking-tighter text-2xl uppercase italic cursor-pointer"
            onClick={() => { setSelectedGame(null); setShowWishlist(false); setShowProfile(false); }}
          >
            <Snowflake className="w-8 h-8" />
            <span>{settings.siteName}</span>
          </motion.div>
          <div className="hidden md:flex items-center gap-6 ml-10">
            <motion.button 
              whileHover={{ y: -2 }}
              onClick={() => { setSelectedGame(null); setShowWishlist(false); setShowProfile(false); }}
              className={`text-sm font-bold uppercase tracking-widest transition-colors relative ${!selectedGame && !showWishlist && !showProfile ? 'text-[#00F0FF]' : 'text-zinc-500 hover:text-white'}`}
            >
              Главная
              {!selectedGame && !showWishlist && !showProfile && <motion.div layoutId="navUnderline" className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />}
            </motion.button>
            {isAdmin && (
              <Link to="/admin" className="text-sm font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                <Settings className="w-4 h-4" />
                Админ
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isAdmin && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowNotifications(true)}
              className="text-white hover:text-[#00F0FF] transition-all duration-300 relative group"
            >
              {unreadCount > 0 ? <BellRing className="w-5 h-5 group-hover:scale-110 animate-pulse" /> : <Bell className="w-5 h-5 group-hover:scale-110" />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00F0FF] rounded-full shadow-[0_0_8px_#00F0FF]"></span>
              )}
            </motion.button>
          )}
          <motion.button 
            whileHover={{ scale: 1.1 }}
            onClick={() => { setShowWishlist(!showWishlist); setSelectedGame(null); setShowProfile(false); }}
            className={`transition-all duration-300 group ${showWishlist ? 'text-[#00F0FF]' : 'text-white hover:text-[#00F0FF]'}`}
          >
            <Star className={`w-5 h-5 group-hover:scale-110 ${showWishlist ? 'fill-[#00F0FF]' : ''}`} />
          </motion.button>
          {user && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              onClick={() => { setShowProfile(!showProfile); setSelectedGame(null); setShowWishlist(false); }}
              className={`transition-all duration-300 group ${showProfile ? 'text-[#00F0FF]' : 'text-white hover:text-[#00F0FF]'}`}
              title="Профиль и достижения"
            >
              <User className={`w-5 h-5 group-hover:scale-110 ${showProfile ? 'fill-[#00F0FF]' : ''}`} />
            </motion.button>
          )}
          {user ? (
            <motion.button 
              whileHover={{ scale: 1.1, color: '#ef4444' }}
              onClick={handleLogout} 
              className="text-white hover:text-red-500 transition-all duration-300 group"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110" />
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.1, color: '#00F0FF' }}
              onClick={handleLogin} 
              className="text-white hover:text-[#00F0FF] transition-all duration-300 group"
            >
              <LogIn className="w-5 h-5 group-hover:scale-110" />
            </motion.button>
          )}
        </div>
      </nav>

      {/* Recent Updates Notification Bar */}
      {games.some(g => Date.now() - (g.createdAt || 0) < 7 * 24 * 60 * 60 * 1000) && (
        <div className="bg-[#00F0FF]/10 border-b border-[#00F0FF]/20 py-2 overflow-hidden relative z-50">
          <div className="animate-marquee flex items-center gap-12 whitespace-nowrap">
            {[...Array(2)].map((_, i) => (
              <React.Fragment key={i}>
                {games
                  .filter(g => Date.now() - (g.createdAt || 0) < 7 * 24 * 60 * 60 * 1000)
                  .map(g => (
                    <span key={`${i}-${g.id}`} className="text-[10px] font-black text-[#00F0FF] uppercase tracking-[0.2em] flex items-center gap-2">
                      <BellRing className="w-3 h-3" />
                      Игра <span className="text-white">{g.title}</span> обновлена! Доступна версия <span className="text-white">{g.version}</span>. Скачивайте прямо сейчас!
                    </span>
                  ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* System Notification Overlay */}
      <AnimatePresence>
        {showProfile && user && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfile(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border border-[#00F0FF]/40 shadow-[0_0_100px_rgba(0,240,255,0.15)] overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                    <User className="w-5 h-5 text-[#00F0FF]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                      Профиль
                    </h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{user.displayName || 'Пользователь'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfile(false)}
                  className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-black/40">
                <h4 className="text-lg font-black text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Snowflake className="w-5 h-5 text-[#00F0FF]" />
                  Мои достижения
                </h4>
                {achievements.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 border-2 border-dashed border-zinc-800 uppercase tracking-widest font-black text-xs">
                    У вас пока нет достижений. Играйте, чтобы получать награды!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {achievements.map(ach => (
                      <div key={ach.id} className="bg-zinc-900 border border-white/5 p-4 flex gap-4 items-center group hover:border-[#00F0FF]/30 transition-colors">
                        <div className="w-12 h-12 shrink-0 bg-[#00F0FF]/10 border border-[#00F0FF]/20 flex items-center justify-center relative overflow-hidden">
                          {ach.iconUrl ? (
                            <img src={ach.iconUrl} alt={ach.title} className="w-full h-full object-cover" />
                          ) : (
                            <Snowflake className="w-6 h-6 text-[#00F0FF] group-hover:scale-110 transition-transform" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-1 group-hover:text-[#00F0FF] transition-colors">{ach.title}</h5>
                          <p className="text-xs text-zinc-400 line-clamp-2">{ach.description}</p>
                          <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-2">
                            {new Date(ach.unlockedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-black flex gap-3">
                <button 
                  onClick={() => setShowProfile(false)}
                  className="flex-1 py-4 bg-[#00F0FF] text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#00F0FF]/90 transition-all shadow-[0_0_30px_rgba(0,240,255,0.2)] active:scale-[0.98]"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModModal && user && selectedGame && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-[#00F0FF]/40 shadow-[0_0_100px_rgba(0,240,255,0.15)] overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                    <Wrench className="w-5 h-5 text-[#00F0FF]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">Добавить мод</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Для игры: {selectedGame.title}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModModal(false)}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddMod} className="p-6 space-y-4 bg-black/40">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Название мода</label>
                  <input
                    type="text"
                    required
                    value={newModData.title}
                    onChange={e => setNewModData({...newModData, title: e.target.value})}
                    className="w-full bg-black border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00F0FF] transition-colors font-bold"
                    placeholder="Например: HD Textures Pack"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Описание</label>
                  <textarea
                    rows={3}
                    value={newModData.description}
                    onChange={e => setNewModData({...newModData, description: e.target.value})}
                    className="w-full bg-black border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00F0FF] transition-colors resize-none font-medium"
                    placeholder="Краткое описание мода..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ссылка на файл</label>
                  <input
                    type="url"
                    required
                    value={newModData.fileUrl}
                    onChange={e => setNewModData({...newModData, fileUrl: e.target.value})}
                    className="w-full bg-black border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00F0FF] transition-colors font-mono"
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowModModal(false)}
                    className="flex-1 py-4 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/5 transition-all"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    disabled={submittingMod}
                    className="flex-1 py-4 bg-[#00F0FF] text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#00F0FF]/90 transition-all shadow-[0_0_30px_rgba(0,240,255,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingMod ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Добавить'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-[#00F0FF]/40 shadow-[0_0_100px_rgba(0,240,255,0.15)] overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                    <Bell className="w-5 h-5 text-[#00F0FF]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                      Уведомления
                    </h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Центр управления</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleClearNotifications}
                      className="text-[10px] text-[#00F0FF] hover:underline font-black uppercase tracking-widest"
                    >
                      Прочитать все
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-black/40">
                {notifications.length === 0 ? (
                  <div className="p-20 text-center">
                    <Bell className="w-12 h-12 text-zinc-800 mx-auto mb-4 opacity-20" />
                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Уведомлений нет</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-5 cursor-pointer transition-all hover:bg-white/5 group relative ${!n.read ? 'bg-[#00F0FF]/[0.02]' : ''}`}
                      >
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border transition-all ${
                            !n.read 
                              ? 'bg-[#00F0FF]/20 border-[#00F0FF]/30 text-[#00F0FF]' 
                              : 'bg-zinc-900 border-white/5 text-zinc-600'
                          }`}>
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <p className={`text-sm leading-snug ${!n.read ? 'text-white font-bold' : 'text-zinc-400 font-medium'}`}>
                                {n.message}
                              </p>
                              <button 
                                onClick={(e) => handleDeleteNotification(e, n.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
                                {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              {!n.read && (
                                <span className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full shadow-[0_0_8px_#00F0FF]"></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-black flex gap-3">
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="flex-1 py-4 bg-[#00F0FF] text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#00F0FF]/90 transition-all shadow-[0_0_30px_rgba(0,240,255,0.2)] active:scale-[0.98]"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 text-center font-bold uppercase tracking-widest">
            {error}
          </div>
        ) : showWishlist ? (
          // Wishlist View
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-12">
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter italic">
                Ваш список желаемого
              </h1>
              <p className="text-zinc-500 text-lg font-bold uppercase tracking-widest">Игры, которые вы ждете или планируете пройти</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {userGameData.filter(d => d.isFavorite).map(data => {
                const game = games.find(g => g.id === data.gameId);
                if (!game) return null;
                return (
                  <div 
                    key={game.id} 
                    onClick={() => handleViewGame(game)}
                    className="bg-zinc-900 border border-white/5 cursor-pointer group hover:border-yellow-500/40 transition-all hover:-translate-y-2 flex flex-col shadow-2xl"
                  >
                    <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                      {game.previewUrl ? (
                        <img src={game.previewUrl} alt="Превью" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-all duration-700" />
                      ) : (
                        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/ice/400/225')] bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity mix-blend-overlay"></div>
                      )}
                      <div className="absolute top-0 right-0 p-4 z-20">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-2xl font-black text-white group-hover:text-yellow-500 transition-colors uppercase tracking-tighter italic mb-2">{game.title}</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest rounded-sm ${
                          data.status === 'playing' ? 'bg-emerald-500 text-white' :
                          data.status === 'completed' ? 'bg-[#00F0FF] text-black' :
                          data.status === 'dropped' ? 'bg-red-500 text-white' :
                          'bg-zinc-800 text-zinc-500'
                        }`}>
                          {data.status === 'playing' ? 'Играю' :
                           data.status === 'completed' ? 'Пройдено' :
                           data.status === 'dropped' ? 'Брошено' :
                           'Нет статуса'}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-xs font-medium line-clamp-2 mb-6 flex-1">
                        {game.description}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">v{game.version}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(game.id); }}
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {userGameData.filter(d => d.isFavorite).length === 0 && (
                <div className="col-span-full py-32 text-center text-zinc-700 border-2 border-dashed border-zinc-900">
                  <Star className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-sm">Ваш список желаемого пуст.</p>
                </div>
              )}
            </div>
          </div>
        ) : selectedGame ? (
          // Single Game View
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={() => setSelectedGame(null)}
              className="flex items-center gap-2 text-zinc-500 hover:text-[#00F0FF] transition-colors mb-8 text-xs font-black uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад к играм
            </button>

            <div className="grid md:grid-cols-2 gap-12 items-start relative">
              {/* Background Glow for Detail View */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-radial-gradient from-[#00F0FF]/5 to-transparent blur-[150px] pointer-events-none" />

              <div className="space-y-8 relative z-10">
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00F0FF]/10 text-[#00F0FF] text-[10px] font-black uppercase tracking-widest border border-[#00F0FF]/20">
                    Версия {selectedGame.version}
                  </div>
                  
                  <div className="flex gap-2">
                    {(selectedGame.platform === 'pc' || selectedGame.platform === 'both') && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase tracking-widest border border-white/5">
                        <Monitor className="w-3 h-3" /> PC
                      </div>
                    )}
                    {(selectedGame.platform === 'android' || selectedGame.platform === 'both') && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase tracking-widest border border-white/5">
                        <Smartphone className="w-3 h-3" /> Android
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 px-3 py-1 bg-zinc-900 text-yellow-500 text-[10px] font-black uppercase tracking-widest border border-white/5">
                    <Star className="w-3 h-3 fill-yellow-500" />
                    {getAverageRating(selectedGame)}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  {selectedGame.logoUrl && (
                    <img src={selectedGame.logoUrl} alt="Логотип" className="w-20 h-20 sm:w-24 sm:h-24 object-cover border-2 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.3)] shrink-0" />
                  )}
                  <div className="space-y-2 w-full">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-[1.1]">
                      {selectedGame.title}
                    </h1>
                    
                    {selectedGame.developmentProgress !== undefined && selectedGame.developmentProgress < 100 && (
                      <div className="w-full max-w-md mt-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#00F0FF] mb-1">
                          <span>В разработке</span>
                          <span>{selectedGame.developmentProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 border border-white/10 overflow-hidden">
                          <div 
                            className="h-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" 
                            style={{ width: `${selectedGame.developmentProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const userRating = selectedGame.ratings?.find(r => r.userId === user?.uid)?.score || 0;
                        return (
                          <button
                            key={star}
                            onClick={() => handleRate(selectedGame.id, star)}
                            className="transition-transform hover:scale-125"
                          >
                            <Star 
                              className={`w-5 h-5 ${star <= userRating ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-700'}`} 
                            />
                          </button>
                        );
                      })}
                      <span className="text-[10px] text-zinc-500 font-black uppercase ml-2">Оцените игру</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-lg text-zinc-400 leading-relaxed max-w-xl font-medium">
                  {selectedGame.description}
                </p>

                {selectedGame.changelog && (
                  <div className="mt-8 p-6 bg-zinc-900/40 border border-white/5">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#00F0FF] mb-4">Список изменений</h3>
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed font-medium">
                      {selectedGame.changelog}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <div className="flex flex-col gap-2">
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(0, 240, 255, 0.6)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDownload(selectedGame)}
                      className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-[#00F0FF] text-black font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(0,240,255,0.4)] rounded-lg relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                      <Download className="w-5 h-5 relative z-10" />
                      <span className="relative z-10">Скачать сейчас</span>
                    </motion.button>
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{selectedGame.downloads} скачиваний</span>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{selectedGame.views} просмотров</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(selectedGame.id, 'like')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 font-black transition-all ${
                          user && (selectedGame.likedBy || []).includes(user.uid)
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:bg-zinc-800'
                        }`}
                      >
                        <ThumbsUp className="w-5 h-5" />
                        {(selectedGame.likedBy || []).length}
                      </button>
                      <button
                        onClick={() => handleVote(selectedGame.id, 'dislike')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 font-black transition-all ${
                          user && (selectedGame.dislikedBy || []).includes(user.uid)
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:bg-zinc-800'
                        }`}
                      >
                        <ThumbsDown className="w-5 h-5" />
                        {(selectedGame.dislikedBy || []).length}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFavorite(selectedGame.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          userGameData.find(d => d.gameId === selectedGame.id)?.isFavorite
                            ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                            : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:bg-zinc-800'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${userGameData.find(d => d.gameId === selectedGame.id)?.isFavorite ? 'fill-yellow-500' : ''}`} />
                        {userGameData.find(d => d.gameId === selectedGame.id)?.isFavorite ? 'В желаемом' : 'В желаемое'}
                      </button>
                      <select
                        value={userGameData.find(d => d.gameId === selectedGame.id)?.status || 'none'}
                        onChange={(e) => handleUpdateStatus(selectedGame.id, e.target.value as any)}
                        className="flex-1 bg-zinc-900 border border-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 focus:outline-none focus:border-[#00F0FF] transition-all cursor-pointer"
                      >
                        <option value="none">Статус</option>
                        <option value="playing">Играю</option>
                        <option value="completed">Пройдено</option>
                        <option value="dropped">Брошено</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative aspect-square md:aspect-[4/3] bg-zinc-900 border border-[#00F0FF]/20 shadow-2xl flex items-center justify-center group overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-[#00F0FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                {selectedGame.previewUrl ? (
                  <img src={selectedGame.previewUrl} alt="Превью игры" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/winter/800/600')] bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-700 mix-blend-overlay"></div>
                    <Gamepad2 className="w-32 h-32 text-[#00F0FF]/20 relative z-10" />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
              </div>
            </div>

            {/* Media Gallery */}
            {( (selectedGame.screenshots && selectedGame.screenshots.length > 0) || selectedGame.trailerUrl ) && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-20 pt-16 border-t border-white/5"
              >
                <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3 uppercase tracking-widest italic">
                  <Eye className="w-6 h-6 text-[#00F0FF]" />
                  Медиа
                </h2>
                <MediaSlider screenshots={selectedGame.screenshots || []} trailerUrl={selectedGame.trailerUrl} />
              </motion.div>
            )}

            {/* System Requirements */}
            {selectedGame.systemRequirements && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-20 pt-16 border-t border-white/5"
              >
                <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3 uppercase tracking-widest italic">
                  <Cpu className="w-6 h-6 text-[#00F0FF]" />
                  Системные требования
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Операционная система</p>
                    <p className="text-sm text-zinc-300 font-bold">{selectedGame.systemRequirements.os || 'Не указано'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Процессор</p>
                    <p className="text-sm text-zinc-300 font-bold">{selectedGame.systemRequirements.cpu || 'Не указано'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Оперативная память</p>
                    <p className="text-sm text-zinc-300 font-bold">{selectedGame.systemRequirements.ram || 'Не указано'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Видеокарта</p>
                    <p className="text-sm text-zinc-300 font-bold">{selectedGame.systemRequirements.gpu || 'Не указано'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Место на диске</p>
                    <p className="text-sm text-zinc-300 font-bold">{selectedGame.systemRequirements.storage || 'Не указано'}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {selectedGame.releaseNotes && (
              <div className="mt-20 pt-16 border-t border-white/5">
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-widest italic">
                    <Info className="w-6 h-6 text-[#00F0FF]" />
                    Список изменений {selectedGame.version}
                  </h2>
                  <div className="prose prose-invert prose-zinc max-w-none">
                    <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedGame.releaseNotes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Game Tabs */}
            <div className="mt-20 pt-16 border-t border-white/5">
              <div className="max-w-3xl">
                <div className="flex gap-6 mb-8 border-b border-white/10">
                  <button 
                    onClick={() => { setActiveTab('comments'); }} 
                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-colors relative ${activeTab === 'comments' ? 'text-[#00F0FF]' : 'text-zinc-500 hover:text-white'}`}
                  >
                    Сообщество
                    {activeTab === 'comments' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]"></span>}
                  </button>
                  <button 
                    onClick={() => { setActiveTab('leaderboard'); }} 
                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-colors relative ${activeTab === 'leaderboard' ? 'text-[#00F0FF]' : 'text-zinc-500 hover:text-white'}`}
                  >
                    Таблица лидеров
                    {activeTab === 'leaderboard' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]"></span>}
                  </button>
                  <button 
                    onClick={() => { setActiveTab('mods'); }} 
                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-colors relative ${activeTab === 'mods' ? 'text-[#00F0FF]' : 'text-zinc-500 hover:text-white'}`}
                  >
                    Мастерская
                    {activeTab === 'mods' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]"></span>}
                  </button>
                </div>
                
                {activeTab === 'comments' && (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-widest italic">
                        <MessageSquare className="w-6 h-6 text-[#00F0FF]" />
                        Отзывы ({comments.length})
                      </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-lg">
                      <button
                        onClick={() => setCommentType('comment')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-md ${commentType === 'comment' ? 'bg-[#00F0FF] text-black' : 'text-zinc-500 hover:text-white'}`}
                      >
                        Отзывы
                      </button>
                      <button
                        onClick={() => setCommentType('bug_report')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-md ${commentType === 'bug_report' ? 'bg-red-500 text-white' : 'text-zinc-500 hover:text-white'}`}
                      >
                        Баги
                      </button>
                    </div>
                    {comments.length > 0 && (
                      <select
                        value={commentSort}
                        onChange={(e) => setCommentSort(e.target.value as 'newest' | 'popular')}
                        className="bg-zinc-900 border border-white/5 text-zinc-400 text-xs font-black uppercase tracking-widest px-4 py-2.5 focus:outline-none focus:border-[#00F0FF] transition-all cursor-pointer"
                      >
                        <option value="newest">Сначала новые</option>
                        <option value="popular">Популярные</option>
                      </select>
                    )}
                  </div>
                </div>
                
                {user ? (
                  <form onSubmit={handleSubmitComment} className={`bg-zinc-900 border p-6 mb-10 transition-all ${commentType === 'bug_report' ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-white/5'}`}>
                    <h3 className={`text-sm font-black mb-4 uppercase tracking-widest ${commentType === 'bug_report' ? 'text-red-400' : 'text-white'}`}>
                      {commentType === 'bug_report' ? 'Сообщить о баге' : 'Оставить комментарий'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Ваше имя"
                          maxLength={50}
                          value={newCommentName}
                          onChange={(e) => setNewCommentName(e.target.value)}
                          className={`w-full sm:w-64 bg-black border px-4 py-3 text-white text-sm focus:outline-none transition-all font-bold ${commentType === 'bug_report' ? 'border-red-500/20 focus:border-red-500' : 'border-white/10 focus:border-[#00F0FF]'}`}
                        />
                      </div>
                      <div>
                        <textarea
                          required
                          placeholder={commentType === 'bug_report' ? "Опишите проблему, шаги для воспроизведения..." : "Поделитесь своими мыслями..."}
                          maxLength={1000}
                          rows={3}
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          className={`w-full bg-black border px-4 py-3 text-white text-sm focus:outline-none transition-all resize-none font-medium ${commentType === 'bug_report' ? 'border-red-500/20 focus:border-red-500' : 'border-white/10 focus:border-[#00F0FF]'}`}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingComment || !newCommentName.trim() || !newCommentText.trim()}
                          className={`inline-flex items-center gap-2 px-8 py-3 font-black uppercase tracking-widest text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${commentType === 'bug_report' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black'}`}
                        >
                          {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : (commentType === 'bug_report' ? <Bug className="w-4 h-4" /> : <Send className="w-4 h-4" />)}
                          {commentType === 'bug_report' ? 'Отправить отчет' : 'Отправить'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="bg-zinc-900 border border-white/5 p-10 mb-10 text-center">
                    <Snowflake className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">Требуется вход</h3>
                    <p className="text-zinc-500 mb-6 max-w-md mx-auto font-medium">
                      Присоединяйтесь к сообществу, чтобы делиться отзывами и оценивать игры.
                    </p>
                    <button
                      onClick={handleLogin}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-xs transition-colors border border-white/10"
                    >
                      <LogIn className="w-4 h-4" />
                      Войти через Google
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  {sortedComments.length === 0 ? (
                    <div className="text-center py-16 text-zinc-600 border-2 border-dashed border-zinc-800 uppercase tracking-widest font-black text-xs">
                      Комментариев пока нет. Будьте первым!
                    </div>
                  ) : (
                    sortedComments.map(comment => (
                      <div 
                        key={comment.id} 
                        className={`border p-6 transition-all ${
                          comment.isDeveloper 
                            ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                            : comment.type === 'bug_report'
                              ? 'bg-red-500/10 border-red-500/40'
                              : 'bg-zinc-900/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`font-black uppercase tracking-widest text-xs italic ${comment.isDeveloper ? 'text-cyan-400' : comment.type === 'bug_report' ? 'text-red-400' : 'text-[#00F0FF]'}`}>
                              {comment.authorName}
                            </span>
                            {comment.isDeveloper && (
                              <span className="bg-cyan-500 text-black text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest rounded-sm">Разработчик</span>
                            )}
                            {comment.type === 'bug_report' && (
                              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest rounded-sm flex items-center gap-1">
                                <Bug className="w-2 h-2" /> Баг-репорт
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                            {new Date(comment.createdAt).toLocaleDateString()} • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap leading-relaxed font-medium ${comment.isDeveloper ? 'text-white' : 'text-zinc-400'}`}>
                          {comment.text}
                        </p>
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                          <button
                            onClick={() => handleCommentVote(comment.id)}
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                              user && (comment.likedBy || []).includes(user.uid)
                                ? 'text-[#00F0FF]'
                                : 'text-zinc-600 hover:text-[#00F0FF]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {(comment.likedBy || []).length > 0 ? (comment.likedBy || []).length : 'Нравится'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                  </div>
                )}

                {activeTab === 'leaderboard' && (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-widest italic mb-8">
                      <Snowflake className="w-6 h-6 text-[#00F0FF]" />
                      Топ игроков
                    </h2>
                    {leaderboards.length === 0 ? (
                      <div className="text-center py-16 text-zinc-600 border-2 border-dashed border-zinc-800 uppercase tracking-widest font-black text-xs">
                        Таблица лидеров пока пуста.
                      </div>
                    ) : (
                      <div className="bg-zinc-900/40 border border-white/5">
                        {leaderboards.map((entry, index) => (
                          <div key={entry.id} className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 ${index < 3 ? 'bg-white/[0.02]' : ''}`}>
                            <div className="flex items-center gap-4">
                              <span className={`w-8 h-8 flex items-center justify-center font-black text-xs ${index === 0 ? 'text-yellow-500 bg-yellow-500/10' : index === 1 ? 'text-zinc-300 bg-zinc-300/10' : index === 2 ? 'text-amber-600 bg-amber-600/10' : 'text-zinc-600'}`}>
                                #{index + 1}
                              </span>
                              <span className="font-bold text-white uppercase tracking-wider text-sm">{entry.userName}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              {entry.time && <span className="text-zinc-500 text-xs font-mono">{entry.time}</span>}
                              <span className="text-[#00F0FF] font-black font-mono">{entry.score.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'mods' && (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-widest italic">
                        <Wrench className="w-6 h-6 text-[#00F0FF]" />
                        Моды и ассеты
                      </h2>
                      {user && (
                        <button
                          onClick={() => setShowModModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                          <Plus className="w-4 h-4" /> Добавить мод
                        </button>
                      )}
                    </div>
                    {mods.length === 0 ? (
                      <div className="text-center py-16 text-zinc-600 border-2 border-dashed border-zinc-800 uppercase tracking-widest font-black text-xs">
                        Модов пока нет.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mods.map(mod => (
                          <div key={mod.id} className="bg-zinc-900/40 border border-white/5 p-6 hover:border-[#00F0FF]/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-lg font-black text-white uppercase tracking-wider">{mod.title}</h3>
                              <a href={mod.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-colors text-[10px] font-black uppercase tracking-widest">
                                <Download className="w-3 h-3" /> Скачать
                              </a>
                            </div>
                            <p className="text-sm text-zinc-400 mb-4">{mod.description}</p>
                            <div className="flex items-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                              <span>Автор: {mod.authorName}</span>
                              <span>•</span>
                              <span>Скачиваний: {mod.downloads}</span>
                              <span>•</span>
                              <span>{new Date(mod.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Games List View
          <div className="animate-in fade-in duration-700">
            <div className="mb-24 relative min-h-[60vh] flex items-center">
              {/* Hero Background Decoration */}
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#00F0FF]/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
              
              {/* Floating Geometric Shapes */}
              <motion.div 
                animate={{ 
                  y: [0, -30, 0],
                  rotate: [0, 90, 180, 270, 360]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/4 right-1/4 w-32 h-32 border border-[#00F0FF]/10 rounded-lg pointer-events-none opacity-20"
              />
              <motion.div 
                animate={{ 
                  y: [0, 40, 0],
                  x: [0, 20, 0],
                  rotate: [0, -45, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-1/4 left-1/3 w-16 h-16 border border-purple-500/10 rounded-full pointer-events-none opacity-20"
              />

              <div className="relative z-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-12">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  className="relative"
                >
                  {/* Floating Accent */}
                  <motion.div 
                    animate={{ 
                      y: [0, -20, 0],
                      rotate: [0, 5, 0]
                    }}
                    transition={{ 
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-12 -left-12 w-24 h-24 border border-[#00F0FF]/20 rounded-full flex items-center justify-center opacity-20 pointer-events-none"
                  >
                    <div className="w-12 h-12 border border-[#00F0FF]/40 rounded-full" />
                  </motion.div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-[2px] w-12 bg-[#00F0FF]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F0FF]">Official Portal</span>
                  </div>
                  <h1 
                    className="text-6xl md:text-9xl font-black text-white mb-6 uppercase tracking-tighter italic leading-[0.85] drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] text-glitch"
                    data-text={settings.siteName}
                  >
                    {settings.siteName}
                  </h1>
                  <p className="text-zinc-400 text-xl md:text-2xl font-medium uppercase tracking-widest max-w-2xl leading-relaxed opacity-80">
                    {settings.siteDescription}
                  </p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-wrap justify-center md:justify-end bg-zinc-900/50 backdrop-blur-md border border-white/10 p-1.5 gap-1.5 rounded-sm">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${filter === 'all' ? 'text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {filter === 'all' && <motion.div layoutId="activeFilter" className="absolute inset-0 bg-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.5)]" />}
                      <span className="relative z-10">Все платформы</span>
                    </button>
                    <button
                      onClick={() => setFilter('pc')}
                      className={`flex items-center gap-2 px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${filter === 'pc' ? 'text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {filter === 'pc' && <motion.div layoutId="activeFilter" className="absolute inset-0 bg-[#00F0FF]" />}
                      <span className="relative z-10 flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> PC</span>
                    </button>
                    <button
                      onClick={() => setFilter('android')}
                      className={`flex items-center gap-2 px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${filter === 'android' ? 'text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {filter === 'android' && <motion.div layoutId="activeFilter" className="absolute inset-0 bg-[#00F0FF]" />}
                      <span className="relative z-10 flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Android</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-center md:justify-end gap-3">
                    <select
                      value={genreFilter}
                      onChange={e => setGenreFilter(e.target.value)}
                      className="bg-zinc-900/50 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-widest px-6 py-3 focus:outline-none focus:border-[#00F0FF] transition-all rounded-sm appearance-none cursor-pointer hover:bg-zinc-800/50"
                    >
                      <option value="all">Все жанры</option>
                      {Array.from(new Set(games.map(g => g.genre).filter(Boolean))).sort().map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>

                    <select
                      value={tagFilter}
                      onChange={e => setTagFilter(e.target.value)}
                      className="bg-zinc-900/50 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-widest px-6 py-3 focus:outline-none focus:border-[#00F0FF] transition-all rounded-sm appearance-none cursor-pointer hover:bg-zinc-800/50"
                    >
                      <option value="all">Все теги</option>
                      {Array.from(new Set(games.flatMap(g => g.tags || []).filter(Boolean))).sort().map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>

                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="bg-zinc-900/50 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-widest px-6 py-3 focus:outline-none focus:border-[#00F0FF] transition-all rounded-sm appearance-none cursor-pointer hover:bg-zinc-800/50"
                    >
                      <option value="newest">Сначала новые</option>
                      <option value="oldest">Сначала старые</option>
                      <option value="popularity">По популярности</option>
                      <option value="downloads">По скачиваниям</option>
                      <option value="views">По просмотрам</option>
                    </select>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {games
                .filter(g => {
                  const platformMatch = filter === 'all' || g.platform === filter || g.platform === 'both';
                  const genreMatch = genreFilter === 'all' || g.genre === genreFilter;
                  const tagMatch = tagFilter === 'all' || (g.tags && g.tags.includes(tagFilter));
                  return platformMatch && genreMatch && tagMatch;
                })
                .sort((a, b) => {
                  if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
                  if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
                  if (sortBy === 'popularity') {
                    const scoreA = (a.downloads || 0) * 5 + (a.views || 0);
                    const scoreB = (b.downloads || 0) * 5 + (b.views || 0);
                    return scoreB - scoreA;
                  }
                  if (sortBy === 'downloads') return (b.downloads || 0) - (a.downloads || 0);
                  if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
                  return 0;
                })
                .map((game, index) => (
                <motion.div 
                  key={game.id} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -10 }}
                  onClick={() => handleViewGame(game)}
                  className="bento-card cursor-pointer group flex flex-col shadow-2xl relative overflow-hidden neon-border shimmer rounded-2xl"
                >
                  {/* Card Glow Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#00F0FF]/0 via-[#00F0FF]/10 to-[#00F0FF]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                  
                  <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                    {game.previewUrl ? (
                      <img src={game.previewUrl} alt="Превью" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-all duration-700" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/ice/400/225')] bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity mix-blend-overlay"></div>
                        <Gamepad2 className="w-12 h-12 text-[#00F0FF]/10 relative z-10 group-hover:scale-110 transition-transform duration-700" />
                      </>
                    )}
                    <div className="absolute top-0 right-0 p-4 flex flex-col gap-2 z-20 items-end">
                      {/* New Update Badge */}
                      {Date.now() - (game.createdAt || 0) < 7 * 24 * 60 * 60 * 1000 && (
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-red-500 text-white text-[8px] font-black px-2 py-1 uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.5)] flex items-center gap-1"
                        >
                          <BellRing className="w-2.5 h-2.5" />
                          Обновлено
                        </motion.div>
                      )}
                      <div className="flex gap-2">
                        {(game.platform === 'pc' || game.platform === 'both') && (
                          <div className="bg-black/80 backdrop-blur-sm p-2 border border-white/5 text-[#00F0FF]">
                            <Monitor className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {(game.platform === 'android' || game.platform === 'both') && (
                          <div className="bg-black/80 backdrop-blur-sm p-2 border border-white/5 text-[#00F0FF]">
                            <Smartphone className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      {game.genre && (
                        <span className="bg-[#00F0FF] text-black text-[8px] font-black px-2 py-1 uppercase tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                          {game.genre}
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 mb-3">
                      {game.logoUrl && (
                        <img src={game.logoUrl} alt="Лого" className="w-10 h-10 object-cover border border-white/10" />
                      )}
                      <h3 className="text-2xl font-black text-white group-hover:text-[#00F0FF] transition-colors uppercase tracking-tighter italic">{game.title}</h3>
                    </div>
                    
                    <p className="text-zinc-500 text-sm font-medium line-clamp-2 mb-4 flex-1">
                      {game.description}
                    </p>

                    {game.tags && game.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-6">
                        {game.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[8px] font-black text-zinc-500 border border-white/5 px-1.5 py-0.5 uppercase tracking-widest">
                            #{tag}
                          </span>
                        ))}
                        {game.tags.length > 3 && (
                          <span className="text-[8px] font-black text-zinc-600 px-1.5 py-0.5 uppercase tracking-widest">
                            +{game.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-[10px] font-black text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-1 uppercase tracking-widest">
                        v{game.version}
                      </span>
                      <div className="flex items-center gap-4 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {(game.likedBy || []).length}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {game.views}</span>
                        <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {game.downloads}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {games.filter(g => {
                const platformMatch = filter === 'all' || g.platform === filter || g.platform === 'both';
                const genreMatch = genreFilter === 'all' || g.genre === genreFilter;
                const tagMatch = tagFilter === 'all' || (g.tags && g.tags.includes(tagFilter));
                return platformMatch && genreMatch && tagMatch;
              }).length === 0 && (
                <div className="col-span-full py-32 text-center text-zinc-700 border-2 border-dashed border-zinc-900">
                  <Snowflake className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-sm">Список пуст. Игр с такими фильтрами не найдено.</p>
                </div>
              )}
            </div>

            {/* Community Section */}
            <div className="mt-32 pt-16 border-t border-white/5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* DevLog */}
                <div className="lg:col-span-2">
                  <h2 className="text-4xl font-black text-white mb-12 uppercase tracking-tighter italic flex items-center gap-4">
                    <Terminal className="w-8 h-8 text-[#00F0FF]" />
                    Дневник разработки
                  </h2>
                  {devlogs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {devlogs.map(log => (
                        <div key={log.id} className="bg-zinc-900 border border-white/5 p-8 hover:border-[#00F0FF]/30 transition-all group">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-[#00F0FF] text-[10px] font-black uppercase tracking-widest bg-[#00F0FF]/10 px-2 py-1">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-wider group-hover:text-[#00F0FF] transition-colors">{log.title}</h3>
                          <p className="text-zinc-400 font-medium leading-relaxed whitespace-pre-wrap line-clamp-4">
                            {log.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-zinc-600 border-2 border-dashed border-zinc-800 uppercase tracking-widest font-black text-xs">
                      Записей в дневнике пока нет.
                    </div>
                  )}
                </div>

                {/* Discord Widget */}
                <div className="lg:col-span-1">
                  <h2 className="text-4xl font-black text-white mb-12 uppercase tracking-tighter italic flex items-center gap-4">
                    <MessageSquare className="w-8 h-8 text-[#5865F2]" />
                    Discord
                  </h2>
                  <div className="bg-zinc-900 border border-white/5 p-8 text-center h-[400px] flex flex-col items-center justify-center">
                    <MessageSquare className="w-16 h-16 text-[#5865F2] mb-6 opacity-50" />
                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">Наш сервер</h3>
                    <p className="text-zinc-500 mb-8 text-sm font-medium">Присоединяйтесь к нашему сообществу, чтобы общаться с разработчиками и другими игроками.</p>
                    <a 
                      href={settings.discordUrl || "#"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#5865F2] text-white font-black uppercase tracking-widest text-xs hover:bg-[#4752C4] transition-colors shadow-[0_0_20px_rgba(88,101,242,0.3)]"
                    >
                      Присоединиться
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

      {/* System Event Log */}
      <div className="fixed bottom-4 left-4 z-50 w-72 pointer-events-none flex flex-col-reverse gap-2">
        <AnimatePresence>
          {systemEvents.map(event => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-3 bg-zinc-950/90 border-l-2 backdrop-blur-md shadow-lg pointer-events-auto ${
                event.type === 'success' ? 'border-emerald-500' :
                event.type === 'warning' ? 'border-amber-500' :
                event.type === 'error' ? 'border-red-500' :
                'border-[#00F0FF]'
              }`}
            >
              <div className="flex items-start gap-2">
                <Terminal className={`w-4 h-4 mt-0.5 shrink-0 ${
                  event.type === 'success' ? 'text-emerald-500' :
                  event.type === 'warning' ? 'text-amber-500' :
                  event.type === 'error' ? 'text-red-500' :
                  'text-[#00F0FF]'
                }`} />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-xs font-medium text-white">
                    {event.message}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="mt-32 border-t border-[#00F0FF]/10 bg-black/60 backdrop-blur-2xl py-24 px-6 relative z-10 overflow-hidden">
        {/* Footer Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00F0FF]/50 to-transparent" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#00F0FF]/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 relative z-10">
          <div className="col-span-1 md:col-span-2">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-2 text-[#00F0FF] font-black tracking-tighter text-3xl uppercase italic mb-8 cursor-pointer"
              onClick={() => { setSelectedGame(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <Snowflake className="w-10 h-10" />
              <span>{settings.siteName}</span>
            </motion.div>
            <p className="text-zinc-500 text-base font-medium max-w-md leading-relaxed mb-10 opacity-80">
              {settings.siteDescription || 'Ваш надежный портал в мир инди-игр и уникальных проектов. Исследуйте, играйте и делитесь впечатлениями.'}
            </p>
            <div className="flex gap-4">
              {settings.vkUrl && (
                <motion.a 
                  whileHover={{ y: -5, borderColor: 'rgba(0, 240, 255, 0.5)', color: '#00F0FF' }}
                  href={settings.vkUrl} target="_blank" rel="noreferrer" 
                  className="w-12 h-12 glass-panel flex items-center justify-center text-zinc-400 transition-all border border-white/5 rounded-lg"
                >
                  <Share2 className="w-5 h-5" />
                </motion.a>
              )}
              {settings.telegramUrl && (
                <motion.a 
                  whileHover={{ y: -5, borderColor: 'rgba(0, 240, 255, 0.5)', color: '#00F0FF' }}
                  href={settings.telegramUrl} target="_blank" rel="noreferrer" 
                  className="w-12 h-12 glass-panel flex items-center justify-center text-zinc-400 transition-all border border-white/5 rounded-lg"
                >
                  <Send className="w-5 h-5" />
                </motion.a>
              )}
              {settings.discordUrl && (
                <motion.a 
                  whileHover={{ y: -5, borderColor: 'rgba(88, 101, 242, 0.5)', color: '#5865F2' }}
                  href={settings.discordUrl} target="_blank" rel="noreferrer" 
                  className="w-12 h-12 glass-panel flex items-center justify-center text-zinc-400 transition-all border border-white/5 rounded-lg"
                >
                  <MessageSquare className="w-5 h-5" />
                </motion.a>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-white font-black uppercase tracking-[0.2em] text-xs mb-8 flex items-center gap-2">
              <div className="w-4 h-px bg-[#00F0FF]" />
              Навигация
            </h4>
            <ul className="space-y-5">
              <li><button onClick={() => { setSelectedGame(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-zinc-500 hover:text-[#00F0FF] text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-zinc-800 group-hover:bg-[#00F0FF] transition-colors" /> Главная</button></li>
              <li><button onClick={() => setShowWishlist(true)} className="text-zinc-500 hover:text-[#00F0FF] text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-zinc-800 group-hover:bg-[#00F0FF] transition-colors" /> Избранное</button></li>
              {isAdmin && <li><Link to="/admin" className="text-zinc-500 hover:text-[#00F0FF] text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-zinc-800 group-hover:bg-[#00F0FF] transition-colors" /> Админ-панель</Link></li>}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black uppercase tracking-[0.2em] text-xs mb-8 flex items-center gap-2">
              <div className="w-4 h-px bg-[#00F0FF]" />
              Система
            </h4>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Сервер: Online</span>
              </div>
              <div className="flex items-center gap-3">
                <Terminal className="w-3 h-3 text-zinc-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Версия: 2.4.0-stable</span>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  © {new Date().getFullYear()} {settings.siteName}.<br />
                  Designed for the future.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
