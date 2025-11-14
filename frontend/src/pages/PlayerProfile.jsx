import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, Target, Activity, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PlayerProfile = () => {
  const { playerName } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlayerData();
  }, [playerName]);

  const fetchPlayerData = async () => {
    try {
      const response = await axios.get(`${API}/players/${playerName}`);
      setPlayer(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Player not found');
    } finally {
      setLoading(false);
    }
  };

  const getRadarData = () => {
    if (!player) return [];
    const stats = player.total_stats;
    return [
      { stat: 'Passing', value: Math.min(stats.passing.yards / 10, 100) },
      { stat: 'Rushing', value: Math.min(stats.rushing.yards / 3, 100) },
      { stat: 'Receiving', value: Math.min(stats.receiving.yards / 3, 100) },
      { stat: 'Defense', value: Math.min(stats.defense.tak * 5, 100) },
      { stat: 'TDs', value: Math.min((stats.passing.tds + stats.rushing.tds + stats.receiving.tds + stats.defense.tds) * 10, 100) }
    ];
  };

  const getGameLogChart = () => {
    if (!player) return [];
    return player.game_log.map(game => ({
      week: `W${game.week}`,
      points: calculateGamePoints(game)
    }));
  };

  const calculateGamePoints = (game) => {
    let points = 0;
    if (game.passing) {
      points += (game.passing.yards || 0) * 0.04;
      points += (game.passing.td || 0) * 4;
      points -= (game.passing.int || 0) * 2;
    }
    if (game.rushing) {
      points += (game.rushing.yards || 0) * 0.1;
      points += (game.rushing.td || 0) * 6;
    }
    if (game.receiving) {
      points += (game.receiving.rec || 0) * 1;
      points += (game.receiving.yards || 0) * 0.1;
      points += (game.receiving.td || 0) * 6;
    }
    if (game.defense) {
      points += (game.defense.tak || 0) * 0.5;
      points += (game.defense.sck || 0) * 1;
      points += (game.defense.int || 0) * 2;
      points += (game.defense.td || 0) * 6;
    }
    return Math.round(points * 10) / 10;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading player profile...</p>
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
    <div className="min-h-screen p-4 lg:p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors animate-fadeIn"
        data-testid="back-button"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      {/* Player Header */}
      <div className="glass-card mb-6 animate-fadeInUp">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-4xl font-bold text-white glow-emerald">
            {player.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold gradient-text mb-2">{player.name}</h1>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>{player.games_played} Games Played</span>
              <span className="text-yellow-500 font-bold text-lg">{player.fantasy_points.toFixed(1)} Fantasy Points</span>
              {player.current_team && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-semibold">
                  Current: {player.current_team}
                </span>
              )}
            </div>
            {/* Team History */}
            {player.team_history && player.team_history.length > 1 && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400 uppercase tracking-wide mb-2">Team History (Trades)</p>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  {player.team_history.map((th, idx) => (
                    <span key={idx} className="px-3 py-1 bg-white/5 text-white rounded-lg text-sm">
                      {th.team} ({th.games} games)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {player.total_stats.passing.yards > 0 && (
          <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <Target className="w-8 h-8 text-blue-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Passing</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{player.total_stats.passing.yards}</p>
            <p className="text-sm text-gray-400">{player.total_stats.passing.tds} TDs • {player.total_stats.passing.ints} INTs</p>
            <p className="text-xs text-gray-500 mt-2">{player.total_stats.passing.comp}/{player.total_stats.passing.att} Comp</p>
          </div>
        )}

        {player.total_stats.rushing.yards > 0 && (
          <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-8 h-8 text-orange-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Rushing</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{player.total_stats.rushing.yards}</p>
            <p className="text-sm text-gray-400">{player.total_stats.rushing.tds} TDs</p>
            <p className="text-xs text-gray-500 mt-2">{player.total_stats.rushing.att} Attempts</p>
          </div>
        )}

        {player.total_stats.receiving.yards > 0 && (
          <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <Trophy className="w-8 h-8 text-purple-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Receiving</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{player.total_stats.receiving.yards}</p>
            <p className="text-sm text-gray-400">{player.total_stats.receiving.tds} TDs</p>
            <p className="text-xs text-gray-500 mt-2">{player.total_stats.receiving.rec} Receptions</p>
          </div>
        )}

        {player.total_stats.defense.tak > 0 && (
          <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-3">
              <Shield className="w-8 h-8 text-red-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Defense</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{player.total_stats.defense.tak}</p>
            <p className="text-sm text-gray-400">{player.total_stats.defense.sacks} Sacks • {player.total_stats.defense.ints} INTs</p>
            <p className="text-xs text-gray-500 mt-2">{player.total_stats.defense.tds} TDs</p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Radar */}
        <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
          <h2 className="text-2xl font-bold text-white mb-6">Performance Profile</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={getRadarData()}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="stat" stroke="#9ca3af" />
              <PolarRadiusAxis stroke="#9ca3af" />
              <Radar name="Stats" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Game Log Chart */}
        <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
          <h2 className="text-2xl font-bold text-white mb-6">Fantasy Points by Game</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getGameLogChart()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px' }}
                labelStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="points" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Game Log Table */}
      <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.7s' }}>
        <h2 className="text-2xl font-bold text-white mb-6">Game Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">WEEK</th>
                <th className="text-left">TEAM</th>
                <th className="text-left">DATE</th>
                <th className="text-center">PASSING</th>
                <th className="text-center">RUSHING</th>
                <th className="text-center">RECEIVING</th>
                <th className="text-center">DEFENSE</th>
                <th className="text-center">PTS</th>
              </tr>
            </thead>
            <tbody>
              {player.game_log.map((game, idx) => (
                <tr key={idx}>
                  <td><span className="font-bold text-emerald-400">Week {game.week}</span></td>
                  <td><span className="text-gray-400 text-sm">{game.date}</span></td>
                  <td className="text-center">
                    {game.passing && <span className="text-sm">{game.passing.yards}Y, {game.passing.td}TD</span>}
                  </td>
                  <td className="text-center">
                    {game.rushing && <span className="text-sm">{game.rushing.yards}Y, {game.rushing.td}TD</span>}
                  </td>
                  <td className="text-center">
                    {game.receiving && <span className="text-sm">{game.receiving.rec}R, {game.receiving.yards}Y</span>}
                  </td>
                  <td className="text-center">
                    {game.defense && <span className="text-sm">{game.defense.tak}T, {game.defense.sck}S</span>}
                  </td>
                  <td className="text-center">
                    <span className="font-bold text-yellow-500">{calculateGamePoints(game)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;