import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Star, Users, Trophy, Calendar, Award, Zap, BarChart3, Eye, ArrowRightLeft, TrendingUp, Shield, MoreHorizontal, X, Activity, Sparkles, GitCompare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

const Navigation = ({ currentPath }) => {
  const [showMore, setShowMore] = useState(false);

  const mainNavItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/showcase', icon: Sparkles, label: 'Showcase' },
    { path: '/compare', icon: GitCompare, label: 'Compare' },
    { path: '/standings', icon: Trophy, label: 'Standings' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/playoffs', icon: Zap, label: 'Playoffs' },
  ];

  const moreNavItems = [
    { path: '/feed', icon: Activity, label: 'Activity Feed' },
    { path: '/elite', icon: Star, label: 'Elite Players' },
    { path: '/players', icon: Users, label: 'All Players' },
    { path: '/leaders', icon: TrendingUp, label: 'Stat Leaders' },
    { path: '/rankings', icon: BarChart3, label: 'Power Rankings' },
    { path: '/trades', icon: ArrowRightLeft, label: 'Trades' },
    { path: '/watchlist', icon: Eye, label: 'Watchlist' },
    { path: '/awards', icon: Award, label: 'Awards' },
    { path: '/admin', icon: Shield, label: 'Admin' },
  ];

  const isActive = (path) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <TooltipProvider>
      <nav 
        data-testid="main-navigation"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="nav-dock border border-white/10 rounded-full px-3 py-2 flex items-center gap-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`relative p-2.5 rounded-full transition-all duration-300 ${
                      active
                        ? 'bg-neon-blue text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {active && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon-volt" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  className="bg-black/90 border-white/10 text-white font-body text-xs"
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Divider */}
          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* More Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowMore(!showMore)}
                data-testid="nav-more"
                className={`relative p-2.5 rounded-full transition-all duration-300 ${
                  showMore || moreNavItems.some(item => isActive(item.path))
                    ? 'bg-neon-volt text-black'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                {showMore ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="bg-black/90 border-white/10 text-white font-body text-xs"
            >
              {showMore ? 'Close' : 'More'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* More Menu */}
        {showMore && (
          <div 
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 nav-dock border border-white/10 rounded-xl p-2 min-w-[200px] animate-slide-up"
            data-testid="more-menu"
          >
            <div className="grid grid-cols-2 gap-1">
              {moreNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMore(false)}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-2 p-2.5 rounded-lg transition-all ${
                      active
                        ? 'bg-neon-blue text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-body text-xs">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Backdrop for closing menu */}
      {showMore && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowMore(false)}
        />
      )}
    </TooltipProvider>
  );
};

export default Navigation;
