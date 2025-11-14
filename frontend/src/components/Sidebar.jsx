import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, BarChart3, Users, Calendar, Settings, X, Menu } from 'lucide-react';

const Sidebar = ({ onAdminOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/' },
    { icon: Trophy, label: 'Stats Leaders', path: '/stats-leaders' },
    { icon: Users, label: 'Team Standings', path: '/standings' },
    { icon: Calendar, label: 'Schedule', path: '/schedule' },
    { icon: Users, label: 'Compare Players', path: '/compare' },
    { icon: Trophy, label: 'Season Awards', path: '/awards' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl glass-card"
        data-testid="mobile-menu-toggle"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <div
        className={`fixed left-0 top-0 h-full w-64 glass-card backdrop-blur-xl z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderRadius: 0, borderLeft: 'none' }}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center glow-emerald">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Flag Football</h1>
              <p className="text-xs text-gray-400">League Stats</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => {
              onAdminOpen();
              setIsOpen(false);
            }}
            data-testid="sidebar-admin-button"
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Admin Panel</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
