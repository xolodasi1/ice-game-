import React from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-zinc-200 font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 p-8 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                Произошла ошибка
              </h1>
              
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                Приносим извинения, что-то пошло не так. Мы уже работаем над исправлением.
              </p>

              {this.state.error && (
                <div className="w-full bg-black/50 border border-white/5 p-4 mb-8 rounded-lg text-left">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Техническая информация:</p>
                  <p className="text-xs font-mono text-red-400/80 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={this.handleReset}
                  className="w-full py-4 bg-[#00F0FF] text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#00F0FF]/90 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Перезагрузить страницу
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full py-4 bg-zinc-800 text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Вернуться на главную
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
