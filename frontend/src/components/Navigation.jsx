import { Link } from 'react-router-dom';
import { Home, Star, Users, Trophy, Calendar, Award, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

const Navigation = ({ currentPath }) => {
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/elite', icon: Star, label: 'Elite Players' },
    { path: '/players', icon: Users, label: 'Player Stats' },
    { path: '/standings', icon: Trophy, label: 'Standings' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/playoffs', icon: Zap, label: 'Playoffs' },
    { path: '/awards', icon: Award, label: 'Awards' },
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
        <div className="nav-dock border border-white/10 rounded-full px-4 py-2 flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`relative p-3 rounded-full transition-all duration-300 ${
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
        </div>
      </nav>
    </TooltipProvider>
  );
};

export default Navigation;
