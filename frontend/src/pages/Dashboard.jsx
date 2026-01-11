import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, TrendingUp, Users, Activity, Zap, Target, Award } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Watchlist from '@/components/Watchlist';
import RecentTrades from '@/components/RecentTrades';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [games, setGames] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [leaders, setLeaders] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, weeksRes, leadersRes, standingsRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/weeks`),
        axios.get(`${API}/stats/leaders`),
        axios.get(`${API}/teams/standings`)
      ]);
      setGames(gamesRes.data);
      setWeeks(weeksRes.data.weeks || []);
      setLeaders(leadersRes.data);
      setStandings(standingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecentGames = () => (games && Array.isArray(games)) ? games.slice(-5).reverse() : [];

  const getScoresByWeek = () => {
    if (!games || !Array.isArray(games)) return [];
    const weekData = {};
    games.forEach(game => {
      if (!game || !game.week) return;
      if (!weekData[game.week]) {
        weekData[game.week] = { week: game.week, avgScore: 0, totalGames: 0, totalPoints: 0 };
      }
      weekData[game.week].totalPoints += (game.home_score || 0) + (game.away_score || 0);
      weekData[game.week].totalGames += 1;
    });
    return Object.values(weekData).map(w => ({
      week: `W${w.week}`,
      avgScore: Math.round(w.totalPoints / w.totalGames)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2">Dashboard</h1>
        <p className="text-gray-400">Season overview and recent activity</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.1s' }} data-testid="total-games-stat">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white animate-countUp">{games.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Games</p>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"></div>
        </div>

        <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.2s' }} data-testid="weeks-stat">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white animate-countUp">{weeks.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Weeks Played</p>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
        </div>

        <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.3s' }} data-testid="teams-stat">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white animate-countUp">{standings.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Active Teams</p>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"></div>
        </div>

        <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.4s' }} data-testid="current-week-stat">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white animate-countUp">{weeks[0] || '-'}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Current Week</p>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full"></div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Performers */}
        <div className="lg:col-span-2 glass-card animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Award className="w-6 h-6 mr-2 text-yellow-500" />
              Top Performers
            </h2>
            <button
              onClick={() => navigate('/stats-leaders')}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            {leaders?.points.slice(0, 5).map((player, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer" onClick={() => navigate(`/player/${player.name}`)}>
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-500 text-black' :
                    idx === 1 ? 'bg-gray-400 text-black' :
                    idx === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{player.name}</p>
                    <p className="text-xs text-gray-400">{player.games} games</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">{player.value.toFixed(1)}</p>
                  <p className="text-xs text-gray-400">Fantasy Pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Standings Preview */}
        <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Target className="w-6 h-6 mr-2 text-blue-500" />
              Standings
            </h2>
            <button
              onClick={() => navigate('/standings')}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-colors"
            >
              Full Table →
            </button>
          </div>
          <div className="space-y-3">
            {standings.slice(0, 6).map((team, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-400 text-sm w-6">{idx + 1}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{team.team}</p>
                    <p className="text-xs text-gray-400">{team.wins}-{team.losses}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{(team.win_pct * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score Trends Chart */}
      <div className="glass-card mb-8 animate-fadeInUp" style={{ animationDelay: '0.7s' }}>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-emerald-500" />
          Average Scores by Week
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={getScoresByWeek()}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="week" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px' }}
              labelStyle={{ color: '#10b981' }}
            />
            <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Games */}
      <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
        <h2 className="text-2xl font-bold text-white mb-6">Recent Games</h2>
        <div className="space-y-4">
          {getRecentGames().map((game) => (
            <div
              key={game.id}
              onClick={() => navigate(`/week/${game.week}`)}
              className="p-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">
                    Week {game.week}
                  </span>
                  <span className="text-gray-400 text-sm">{game.game_date}</span>
                </div>
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <p className="text-white font-semibold">{game.home_team}</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">{game.home_score}</p>
                  </div>
                  <span className="text-gray-500 font-bold">VS</span>
                  <div className="text-center">
                    <p className="text-white font-semibold">{game.away_team}</p>
                    <p className="text-3xl font-bold text-blue-400 mt-1">{game.away_score}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-1">Player of Game</p>
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <p className="text-yellow-500 font-semibold text-sm">{game.player_of_game}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {games.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No games recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Watchlist + Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Watchlist />
        <RecentTrades />
      </div>
    </div>
  );
};

export default Dashboard;