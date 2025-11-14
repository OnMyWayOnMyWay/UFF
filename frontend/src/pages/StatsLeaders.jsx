import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, TrendingUp, Target, Shield, Zap } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
    { id: 'points', label: 'Fantasy Points', icon: Trophy, color: 'text-yellow-500' },
    { id: 'passing_yards', label: 'Passing Yards', icon: Target, color: 'text-blue-500' },
    { id: 'rushing_yards', label: 'Rushing Yards', icon: Zap, color: 'text-orange-500' },
    { id: 'receiving_yards', label: 'Receiving Yards', icon: TrendingUp, color: 'text-purple-500' },
    { id: 'tackles', label: 'Tackles', icon: Shield, color: 'text-red-500' },
    { id: 'sacks', label: 'Sacks', icon: Shield, color: 'text-emerald-500' },
    { id: 'interceptions', label: 'Interceptions', icon: Shield, color: 'text-cyan-500' },
  ];

  const getMedalColor = (rank) => {
    if (rank === 0) return 'text-yellow-500';
    if (rank === 1) return 'text-gray-400';
    if (rank === 2) return 'text-orange-600';
    return 'text-gray-500';
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
      <div className="space-y-3">
        {data.map((player, index) => (
          <div
            key={index}
            data-testid={`leader-${activeTab}-${index}`}
            className="stat-card flex items-center justify-between hover:border-emerald-500 transition-all"
          >
            <div className="flex items-center space-x-4 flex-1">
              {/* Rank */}
              <div className={`text-3xl font-bold ${getMedalColor(index)} w-12 text-center`}>
                {index + 1}
              </div>

              {/* Player Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{player.name}</h3>
                <p className="text-sm text-gray-400">{player.games} games played</p>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {activeTab === 'points' ? player.value.toFixed(1) : player.value}
                  {activeTab === 'points' && <span className="text-sm text-gray-400 ml-1">pts</span>}
                </div>
                {player.tds !== undefined && (
                  <p className="text-sm text-emerald-500">{player.tds} TDs</p>
                )}
                {player.receptions !== undefined && (
                  <p className="text-sm text-blue-500">{player.receptions} Rec</p>
                )}
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
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stats leaders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f0f10] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              data-testid="back-button"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Stats Leaders
            </h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#1a1a1b] text-gray-400 hover:bg-[#2a2a2b]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scoring Info Card */}
        {activeTab === 'points' && (
          <div className="stat-card mb-6 bg-emerald-500/5 border-emerald-500/20">
            <h3 className="text-lg font-semibold text-emerald-500 mb-3">Fantasy Scoring System</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <p className="font-semibold text-white mb-2">Offense</p>
                <p>Passing TD: 4 pts</p>
                <p>Passing Yard: 0.04 pts</p>
                <p>Rushing/Receiving TD: 6 pts</p>
                <p>Rushing/Receiving Yard: 0.1 pts</p>
                <p>Reception: 1 pt</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Defense</p>
                <p>Tackle: 0.5 pts</p>
                <p>Tackle for Loss: 1 pt</p>
                <p>Sack: 1 pt</p>
                <p>Interception: 2 pts</p>
                <p>Defensive TD: 6 pts</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Penalties</p>
                <p>Interception Thrown: -2 pts</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="stat-card">
          <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {tabs.find(t => t.id === activeTab)?.label} Leaders
          </h2>
          {renderLeaderboard()}
        </div>
      </div>
    </div>
  );
};

export default StatsLeaders;