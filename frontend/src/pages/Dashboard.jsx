import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Calendar, ChevronRight, Users, TrendingUp, Settings } from 'lucide-react';
import AdminPanel from '@/components/AdminPanel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [games, setGames] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, weeksRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/weeks`)
      ]);
      setGames(gamesRes.data);
      setWeeks(weeksRes.data.weeks || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecentGames = () => {
    return games.slice(-5).reverse();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f0f10]">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Flag Football League
                </h1>
                <p className="text-gray-400 text-sm mt-0.5">Season Statistics & Scores</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/stats-leaders')}
                data-testid="stats-leaders-button"
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all font-semibold"
              >
                <TrendingUp className="w-5 h-5" />
                <span>Stats Leaders</span>
              </button>
              <button
                onClick={() => setShowAdmin(true)}
                data-testid="admin-button"
                className="p-2 bg-[#1a1a1b] hover:bg-[#2a2a2b] text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Panel Modal */}
      <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card" data-testid="total-games-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Total Games</p>
                <p className="text-3xl font-bold text-white">{games.length}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="stat-card" data-testid="weeks-played-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Weeks Played</p>
                <p className="text-3xl font-bold text-white">{weeks.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="stat-card" data-testid="active-week-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Current Week</p>
                <p className="text-3xl font-bold text-white">{weeks[0] || '-'}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Weeks Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Browse by Week
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {weeks.map((week) => (
              <button
                key={week}
                data-testid={`week-${week}-button`}
                onClick={() => navigate(`/week/${week}`)}
                className="stat-card group hover:border-emerald-500 transition-all"
              >
                <div className="text-center">
                  <Calendar className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">Week {week}</p>
                  <ChevronRight className="w-5 h-5 text-gray-400 mx-auto mt-2 group-hover:text-emerald-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Games */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Recent Games
          </h2>
          <div className="space-y-4">
            {getRecentGames().map((game) => (
              <div
                key={game.id}
                data-testid={`game-${game.id}`}
                onClick={() => navigate(`/week/${game.week}`)}
                className="stat-card cursor-pointer hover:border-emerald-500 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-semibold">
                        Week {game.week}
                      </span>
                      <span className="text-gray-500 text-sm">{game.game_date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-8">
                        <div className="text-left">
                          <p className="text-white font-semibold text-lg">{game.home_team}</p>
                          <p className="text-3xl font-bold text-white mt-1">{game.home_score}</p>
                        </div>
                        <span className="text-gray-500 text-xl font-bold">VS</span>
                        <div className="text-left">
                          <p className="text-white font-semibold text-lg">{game.away_team}</p>
                          <p className="text-3xl font-bold text-white mt-1">{game.away_score}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm mb-1">Player of the Game</p>
                        <div className="flex items-center space-x-2">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          <p className="text-yellow-500 font-semibold">{game.player_of_game}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {games.length === 0 && (
              <div className="stat-card text-center py-12">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No games recorded yet</p>
                <p className="text-gray-500 text-sm mt-2">Games will appear here once submitted from Roblox</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;