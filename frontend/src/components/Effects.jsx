import { useState, useEffect, useRef } from 'react';

// Animated counter that counts up when in view
export const AnimatedCounter = ({ end, duration = 2000, prefix = '', suffix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateCount();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated, end]);

  const animateCount = () => {
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (end - startValue) * easeOut;
      
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  };

  return (
    <span ref={ref}>
      {prefix}{decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}{suffix}
    </span>
  );
};

// Confetti burst effect
export const ConfettiBurst = ({ active, colors = ['#CCFF00', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981'] }) => {
  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(60)].map((_, i) => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomX = Math.random() * 100;
        const randomDelay = Math.random() * 0.5;
        const randomDuration = 2 + Math.random() * 2;
        const randomRotation = Math.random() * 360;
        const randomSize = 6 + Math.random() * 8;
        
        return (
          <div
            key={i}
            className="absolute animate-confetti-fall"
            style={{
              left: `${randomX}%`,
              top: '-20px',
              animationDelay: `${randomDelay}s`,
              animationDuration: `${randomDuration}s`,
            }}
          >
            <div
              style={{
                width: randomSize,
                height: randomSize,
                backgroundColor: randomColor,
                transform: `rotate(${randomRotation}deg)`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          </div>
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};

// Fire particle effect for hot streaks
export const FireEffect = ({ active }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-fire-rise"
          style={{
            left: `${10 + Math.random() * 80}%`,
            bottom: '-10px',
            animationDelay: `${Math.random() * 1}s`,
            animationDuration: `${1 + Math.random() * 1}s`,
          }}
        >
          <div
            className="rounded-full blur-sm"
            style={{
              width: 4 + Math.random() * 8,
              height: 8 + Math.random() * 16,
              background: `linear-gradient(to top, #EF4444, #F97316, #FBBF24)`,
              opacity: 0.6 + Math.random() * 0.4,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes fire-rise {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-80px) scale(0.3);
            opacity: 0;
          }
        }
        .animate-fire-rise {
          animation: fire-rise ease-out infinite;
        }
      `}</style>
    </div>
  );
};

// Sparkle effect
export const SparkleEffect = ({ active, count = 15 }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-sparkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
              fill="#CCFF00"
            />
          </svg>
        </div>
      ))}
      <style>{`
        @keyframes sparkle {
          0%, 100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
          }
        }
        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// Glow pulse effect
export const GlowPulse = ({ color = '#CCFF00', size = 100, intensity = 0.5 }) => {
  return (
    <div 
      className="absolute rounded-full animate-pulse-glow pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}${Math.floor(intensity * 255).toString(16)} 0%, transparent 70%)`,
        filter: 'blur(20px)',
      }}
    />
  );
};

// Achievement badge with animation
export const AchievementBadge = ({ icon: Icon, label, color, unlocked = false, size = 'md' }) => {
  const sizes = {
    sm: { badge: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-xs' },
    md: { badge: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-sm' },
    lg: { badge: 'w-16 h-16', icon: 'w-8 h-8', text: 'text-base' },
  };
  
  const s = sizes[size];
  
  return (
    <div className={`relative group ${unlocked ? '' : 'grayscale opacity-40'}`}>
      <div 
        className={`${s.badge} rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
          unlocked ? 'group-hover:scale-110' : ''
        }`}
        style={{ backgroundColor: unlocked ? `${color}30` : '#ffffff10' }}
      >
        {unlocked && <SparkleEffect active count={5} />}
        <Icon className={`${s.icon} relative z-10`} style={{ color: unlocked ? color : '#ffffff40' }} />
      </div>
      <div className={`${s.text} text-center mt-1 font-medium`} style={{ color: unlocked ? color : '#ffffff40' }}>
        {label}
      </div>
    </div>
  );
};

export default { AnimatedCounter, ConfettiBurst, FireEffect, SparkleEffect, GlowPulse, AchievementBadge };
