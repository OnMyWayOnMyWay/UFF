import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Award, Users, Target, Shield, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const TeamAnalysis = () => {
  const { teamName } = useParams();
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeamData();
  }, [teamName]);

  const fetchTeamData = async () => {
    try {
      const response = await axios.get(`${API}/teams/${teamName}/analysis`);
      setTeamData(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Team not found');
    } finally {
      setLoading(false);
    }
  };

  const getHeadToHeadChartData = () => {
    if (!teamData || !teamData.head_to_head) return [];
    return Object.entries(teamData.head_to_head).map(([opponent, record]) => ({
      name: opponent,
      wins: record?.wins || 0,
      losses: record?.losses || 0
    }));
  };

  const getTopPlayers = (category) => {
    if (!teamData || !teamData.roster) return [];
    const players = Object.entries(teamData.roster).map(([name, data]) => {
      if (!data || !data.stats) return null;
      return {
        name,
        value: category === 'passing' ? (data.stats.passing?.yards || 0) :
               category === 'rushing' ? (data.stats.rushing?.yards || 0) :
               category === 'receiving' ? (data.stats.receiving?.yards || 0) :
               (data.stats.defense?.tackles || 0),
        games: data.games || 0
      };
    }).filter(p => p !== null);
    return players.filter(p => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading team analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 lg:p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="glass-card text-center py-12">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      <button onClick={() => navigate('/standings')} className="flex items-center space-x-2 text-gray-400 hover:text-white mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Standings</span>
      </button>

      <div className="glass-card mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-1 sm:mb-2">{teamData.name}</h1>
              <p className="text-gray-400 text-sm sm:text-base md:text-lg">Franchise Analysis & Legacy</p>
            </div>
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                {teamData.all_time_record.wins}-{teamData.all_time_record.losses}
              </div>
              <p className="text-emerald-400 text-sm sm:text-base md:text-lg font-semibold">
                {(teamData.all_time_record.win_pct * 100).toFixed(1)}% Win Rate
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8">
        <div className="stat-card-modern">
          <div className="flex items-center justify-between mb-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Total Games</span>
          </div>
          <p className="text-3xl font-bold text-white">{teamData.total_games}</p>
          <p className="text-sm text-gray-400 mt-1">
            {teamData.current_streak.type} streak: {teamData.current_streak.count}
          </p>
        </div>

        <div className="stat-card-modern">
          <div className="flex items-center justify-between mb-3">
            <Target className="w-8 h-8 text-emerald-500" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Avg Points</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{teamData.avg_points_scored}</p>
          <p className="text-sm text-gray-400 mt-1">Allowed: {teamData.avg_points_allowed}</p>
        </div>

        <div className="stat-card-modern">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-8 h-8 text-orange-500" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Total TDs</span>
          </div>
          <p className="text-3xl font-bold text-orange-400">{teamData.season_stats.total_touchdowns}</p>
          <p className="text-sm text-gray-400 mt-1">All categories</p>
        </div>

        <div className="stat-card-modern">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-purple-500" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Roster</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">{Object.keys(teamData.roster).length}</p>
          <p className="text-sm text-gray-400 mt-1">Players all-time</p>
        </div>
      </div>

      <div className="glass-card mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Season Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <div className="text-center p-3 sm:p-4 rounded-xl bg-blue-500/10">
            <p className="text-2xl sm:text-3xl font-bold text-blue-400">{teamData.season_stats.total_passing_yards.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Passing Yards</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl bg-orange-500/10">
            <p className="text-2xl sm:text-3xl font-bold text-orange-400">{teamData.season_stats.total_rushing_yards.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Rushing Yards</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl bg-purple-500/10">
            <p className="text-2xl sm:text-3xl font-bold text-purple-400">{teamData.season_stats.total_receiving_yards.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Receiving Yards</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl bg-red-500/10">
            <p className="text-2xl sm:text-3xl font-bold text-red-400">{teamData.season_stats.total_tackles}</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Total Tackles</p>
          </div>
        </div>
      </div>

      {Object.keys(teamData.head_to_head).length > 0 && (
        <div className="glass-card mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
            <Shield className="w-5 sm:w-6 h-5 sm:h-6 mr-2 text-red-500" />
            Head-to-Head Records
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getHeadToHeadChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px' }}
                labelStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="wins" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="losses" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass-card">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Franchise Roster History</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-3 sm:px-4 py-2 sm:py-3">PLAYER</th>
                <th className="text-center px-2 sm:px-3 py-2 sm:py-3">GAMES</th>
                <th className="text-center px-2 sm:px-3 py-2 sm:py-3">PASS</th>
                <th className="text-center px-2 sm:px-3 py-2 sm:py-3">RUSH</th>
                <th className="text-center px-2 sm:px-3 py-2 sm:py-3">REC</th>
                <th className="text-center px-2 sm:px-3 py-2 sm:py-3">TCK</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(teamData.roster).map(([name, data], idx) => (
                <tr key={idx} onClick={() => navigate(`/player/${encodeURIComponent(name)}`)} className="cursor-pointer border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-3 sm:px-4 py-2 sm:py-3"><span className="font-semibold text-white">{name}</span></td>
                  <td className="text-center px-2 sm:px-3 py-2 sm:py-3"><span className="text-emerald-400 font-semibold">{data.games}</span></td>
                  <td className="text-center px-2 sm:px-3 py-2 sm:py-3">{data.stats.passing.yards > 0 ? data.stats.passing.yards : '-'}</td>
                  <td className="text-center px-2 sm:px-3 py-2 sm:py-3">{data.stats.rushing.yards > 0 ? data.stats.rushing.yards : '-'}</td>
                  <td className="text-center px-2 sm:px-3 py-2 sm:py-3">{data.stats.receiving.yards > 0 ? data.stats.receiving.yards : '-'}</td>
                  <td className="text-center px-2 sm:px-3 py-2 sm:py-3">{data.stats.defense.tackles > 0 ? data.stats.defense.tackles : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamAnalysis;
