import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

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
      <div className="relative mb-12">
        {/* Animated rings */}
        <div className="absolute inset-0 -m-8">
          <div className="w-40 h-40 rounded-full border border-neon-blue/20 animate-pulse-glow" />
        </div>
        <div className="absolute inset-0 -m-16">
          <div className="w-56 h-56 rounded-full border border-neon-blue/10 animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
        </div>
        
        {/* Main logo */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-neon-blue/20 rounded-xl blur-xl" />
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl p-4 neon-glow">
            <Zap className="w-14 h-14 text-neon-blue" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className={`transition-all duration-700 ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="font-heading font-black text-5xl md:text-7xl tracking-tighter uppercase text-white mb-2">
          GRIDIRON
        </h1>
        <h2 className="font-heading font-bold text-2xl md:text-3xl tracking-widest uppercase text-neon-blue text-center">
          ELITE
        </h2>
      </div>

      {/* Progress bar */}
      <div className="w-64 mt-12">
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
