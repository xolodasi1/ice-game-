import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Auth() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/admin');
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Вход отменен. Пожалуйста, не закрывайте всплывающее окно до завершения авторизации.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Всплывающее окно заблокировано браузером. Пожалуйста, разрешите всплывающие окна для этого сайта.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Ошибка сети. Проверьте подключение к интернету.');
      } else {
        setError(err.message || 'Произошла неизвестная ошибка при входе.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-zinc-200">
      <div className="w-full max-w-md p-8 bg-zinc-900 shadow-2xl border border-[#00F0FF]/30">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter">Доступ Админа</h1>
          <p className="text-zinc-400">Войдите в систему управления лаунчером</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full py-4 px-4 bg-[#00F0FF] text-black font-bold uppercase tracking-widest hover:bg-[#00F0FF]/80 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
        >
          <LogIn className="w-5 h-5" />
          Войти через Google
        </button>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-sm text-zinc-500 hover:text-[#00F0FF] transition-colors uppercase tracking-widest"
          >
            &larr; Вернуться в Лаунчер
          </button>
        </div>
      </div>
    </div>
  );
}
