import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import UFFLogo from '../assets/uff-logo.svg';


const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    setTimeout(() => setShowText(true), 300);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div 
      data-testid="loading-screen"
      className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-50"
    >
      {/* Background glow */}
      <div className="absolute inset-0 hero-glow opacity-50" />
      
      {/* Logo container */}
      <div className="relative mb-8">
        {/* Animated rings */}
        <div className="absolute inset-0 -m-8">
          <div className="w-48 h-48 rounded-full border border-neon-blue/20 animate-pulse-glow" />
        </div>
        <div className="absolute inset-0 -m-16">
          <div className="w-64 h-64 rounded-full border border-neon-blue/10 animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
        </div>
        
        {/* UFF Logo */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <img 
            src={UFFLogo} 
            alt="UFF Logo" 
            className="w-32 h-32 object-contain"
          />
        </div>
      </div>

      {/* Title */}
      <div className={`transition-all duration-700 ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white mb-2 text-center">
          UNITED FOOTBALL
        </h1>
        <h2 className="font-heading font-bold text-xl md:text-2xl tracking-widest uppercase text-neon-volt text-center">
          LEAGUE
        </h2>
      </div>

      {/* Progress bar */}
      <div className="w-64 mt-10">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-neon-blue to-neon-volt rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-body text-xs text-white/40 uppercase tracking-widest">Loading</span>
          <span className="font-heading font-bold text-sm text-neon-blue">{progress}%</span>
        </div>
      </div>

      {/* Status text */}
      <p className="font-body text-xs text-white/30 mt-8 uppercase tracking-widest animate-pulse">
        {progress < 30 ? 'Initializing...' : progress < 60 ? 'Loading players...' : progress < 90 ? 'Preparing stats...' : 'Ready!'}
      </p>
    </div>
  );
};

export default LoadingScreen;
