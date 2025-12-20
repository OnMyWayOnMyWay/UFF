import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Target, Zap, Shield, Activity, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const StatsLeaders = () => {
  const [leaders, setLeaders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('points');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    try {
      const response = await axios.get(`${API}/stats/leaders`);
      setLeaders(response.data);
    } catch (error) {
      console.error('Error fetching leaders:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'points', label: 'Fantasy Points', icon: Trophy, color: 'from-yellow-500 to-orange-500' },
    { id: 'passing_yards', label: 'Passing Yards', icon: Target, color: 'from-blue-500 to-cyan-500' },
    { id: 'rushing_yards', label: 'Rushing Yards', icon: Zap, color: 'from-orange-500 to-red-500' },
    { id: 'receiving_yards', label: 'Receiving Yards', icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
    { id: 'tackles', label: 'Tackles', icon: Shield, color: 'from-red-500 to-rose-500' },
    { id: 'sacks', label: 'Sacks', icon: Shield, color: 'from-emerald-500 to-teal-500' },
    { id: 'interceptions', label: 'Interceptions', icon: Activity, color: 'from-cyan-500 to-blue-500' },
  ];

  const getMedalColor = (rank) => {
    if (rank === 0) return 'text-yellow-500 bg-yellow-500/20';
    if (rank === 1) return 'text-gray-400 bg-gray-400/20';
    if (rank === 2) return 'text-orange-600 bg-orange-600/20';
    return 'text-gray-500 bg-gray-700/20';
  };

  const renderLeaderboard = () => {
    if (!leaders || !leaders[activeTab]) return null;

    const data = leaders[activeTab];
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-400">No stats recorded yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.map((player, index) => (
          <div
            key={index}
            onClick={() => navigate(`/player/${player.name}`)}
            data-testid={`leader-${activeTab}-${index}`}
            className="stat-card-modern cursor-pointer"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {/* Rank */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${getMedalColor(index)}`}>
                  {index + 1}
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{player.name}</h3>
                  <p className="text-sm text-gray-400">{player.games} games played</p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="text-3xl font-bold gradient-text">
                    {activeTab === 'points' ? player.value.toFixed(1) : player.value}
                  </div>
                  {player.tds !== undefined && (
                    <p className="text-sm text-emerald-500 font-semibold">{player.tds} TDs</p>
                  )}
                  {player.receptions !== undefined && (
                    <p className="text-sm text-blue-500 font-semibold">{player.receptions} Rec</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stats leaders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2">Stats Leaders</h1>
        <p className="text-gray-400">Top performers across all categories</p>
      </div>

      {/* Category Tabs */}
      <div className="mb-8 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="flex overflow-x-auto space-x-3 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white glow-emerald`
                    : 'glass-card text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scoring Info for Fantasy Points */}
      {activeTab === 'points' && (
        <div className="glass-card mb-6 border-emerald-500/20 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-xl font-bold gradient-text mb-4">Fantasy Scoring System</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold text-emerald-500 mb-3 uppercase tracking-wide">Offense</p>
              <div className="space-y-2 text-gray-300">
                <p>Passing TD: <span className="text-white font-semibold">4 pts</span></p>
                <p>Passing Yard: <span className="text-white font-semibold">0.04 pts</span></p>
                <p>Rushing/Receiving TD: <span className="text-white font-semibold">6 pts</span></p>
                <p>Rushing/Receiving Yard: <span className="text-white font-semibold">0.1 pts</span></p>
                <p>Reception: <span className="text-white font-semibold">1 pt</span></p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-blue-500 mb-3 uppercase tracking-wide">Defense</p>
              <div className="space-y-2 text-gray-300">
                <p>Tackle: <span className="text-white font-semibold">0.5 pts</span></p>
                <p>Tackle for Loss: <span className="text-white font-semibold">1 pt</span></p>
                <p>Sack: <span className="text-white font-semibold">1 pt</span></p>
                <p>Interception: <span className="text-white font-semibold">2 pts</span></p>
                <p>Defensive TD: <span className="text-white font-semibold">6 pts</span></p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-red-500 mb-3 uppercase tracking-wide">Penalties</p>
              <div className="space-y-2 text-gray-300">
                <p>Interception Thrown: <span className="text-white font-semibold">-2 pts</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        {renderLeaderboard()}
      </div>
    </div>
  );
};

export default StatsLeaders;