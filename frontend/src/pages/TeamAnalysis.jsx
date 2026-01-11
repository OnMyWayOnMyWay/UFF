import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Award, Users, Target, Shield, Zap, MapPinned } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TeamLogoAvatar, loadTeamLogos, loadTeamColors } from '../lib/teamLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const TeamAnalysis = () => {
  const { teamName } = useParams();
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [logoMap, setLogoMap] = useState({});
  const [teamColors, setTeamColors] = useState(null);

  useEffect(() => {
    fetchTeamData();
    loadTeamLogos().then(logos => setLogoMap(logos));
    loadTeamColors().then(colors => setTeamColors(colors));
  }, [teamName]);

  const fetchTeamData = async () => {
    try {
      const [teamRes, assignRes] = await Promise.all([
        axios.get(`${API}/teams/${teamName}/analysis`),
        axios.get(`${API}/league/assignments`),
      ]);
      setTeamData(teamRes.data);
      const teamsMap = assignRes.data?.teams || {};
      if (teamsMap && teamsMap[teamName]) {
        setAssignment(teamsMap[teamName]);
      } else {
        // Try to find by case-insensitive match if direct key not found
        const found = Object.entries(teamsMap).find(([k]) => k.toLowerCase() === String(teamName).toLowerCase());
        if (found) setAssignment(found[1]);
      }
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
    <div className="min-h-screen relative">
      {/* Dynamic Gradient Background with Team Colors */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: teamColors && teamColors[teamName]
            ? `linear-gradient(135deg, ${teamColors[teamName].primary}15 0%, ${teamColors[teamName].secondary}10 100%)`
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
        }}
      />

      {/* Animated Background Pattern */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/20 to-gray-900"></div>
      </div>

      {/* Top Bar with Team Color */}
      <div
        className="fixed top-0 left-0 right-0 z-30 h-1 bg-gradient-to-r"
        style={{
          background: teamColors && teamColors[teamName]
            ? `linear-gradient(90deg, ${teamColors[teamName].primary}, ${teamColors[teamName].secondary})`
            : 'linear-gradient(90deg, #10b981, #3b82f6)',
        }}
      />

      {/* Logo and Team Badge in Middle */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-10 text-center">
        <div
          className="w-24 h-24 md:w-32 md:h-32 rounded-2xl shadow-2xl flex items-center justify-center backdrop-blur-sm border-2"
          style={{
            borderColor: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#10b981',
            backgroundColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].primary}20` : 'rgba(16, 185, 129, 0.1)',
          }}
        >
          <TeamLogoAvatar teamName={teamName} logoMap={logoMap} size="lg" />
        </div>
        <div className="mt-4 text-center">
          <h3 className="text-sm md:text-base font-bold text-gray-300 uppercase tracking-wide opacity-75">
            {assignment?.conference || 'Conference'} • {assignment?.division || 'Division'}
          </h3>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-20 min-h-screen pt-56 md:pt-64 pb-8">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8">
          <button onClick={() => navigate('/standings')} className="flex items-center space-x-2 text-gray-400 hover:text-white mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Standings</span>
          </button>

          {/* Main Header Card with Gradient */}
          <div
            className="glass-card mb-6 relative overflow-hidden border-2"
            style={{
              borderColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].primary}50` : 'rgba(16, 185, 129, 0.3)',
              background: teamColors && teamColors[teamName]
                ? `linear-gradient(135deg, ${teamColors[teamName].primary}20 0%, ${teamColors[teamName].secondary}10 100%)`
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
              style={{
                background: teamColors && teamColors[teamName]
                  ? `linear-gradient(90deg, ${teamColors[teamName].primary}, ${teamColors[teamName].secondary})`
                  : 'linear-gradient(90deg, #10b981, #3b82f6)',
              }}
            />
            <div className="relative p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1
                    className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2"
                    style={{
                      color: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#10b981',
                    }}
                  >
                    {teamData.name}
                  </h1>
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <MapPinned className="w-4 h-4" style={{ color: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#10b981' }} />
                    {assignment ? (
                      <>
                        <span className="text-xs sm:text-sm text-gray-300 font-semibold">{assignment.conference} Conference</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-xs sm:text-sm text-gray-300 font-semibold">{assignment.division} Division</span>
                      </>
                    ) : (
                      <span className="text-xs sm:text-sm text-gray-500">Assignment not available</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm sm:text-base md:text-lg">Franchise Analysis & Legacy</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                    {teamData.all_time_record.wins}-{teamData.all_time_record.losses}
                  </div>
                  <p
                    className="text-sm sm:text-base md:text-lg font-semibold"
                    style={{
                      color: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#10b981',
                    }}
                  >
                    {(teamData.all_time_record.win_pct * 100).toFixed(1)}% Win Rate
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8">
            <div
              className="stat-card-modern border-2"
              style={{
                borderColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].primary}40` : 'rgba(16, 185, 129, 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Total Games</span>
              </div>
              <p className="text-3xl font-bold text-white">{teamData.total_games}</p>
              <p className="text-sm text-gray-400 mt-1">
                {teamData.current_streak.type} streak: {teamData.current_streak.count}
              </p>
            </div>

            <div
              className="stat-card-modern border-2"
              style={{
                borderColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].secondary}40` : 'rgba(59, 130, 246, 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <Target className="w-8 h-8" style={{ color: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#10b981' }} />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Avg Points</span>
              </div>
              <p
                className="text-3xl font-bold"
                style={{
                  color: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#10b981',
                }}
              >
                {teamData.avg_points_scored}
              </p>
              <p className="text-sm text-gray-400 mt-1">Allowed: {teamData.avg_points_allowed}</p>
            </div>

            <div
              className="stat-card-modern border-2"
              style={{
                borderColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].secondary}40` : 'rgba(249, 115, 22, 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <Zap className="w-8 h-8 text-orange-500" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Total TDs</span>
              </div>
              <p className="text-3xl font-bold text-orange-400">{teamData.season_stats.total_touchdowns}</p>
              <p className="text-sm text-gray-400 mt-1">All categories</p>
            </div>

            <div
              className="stat-card-modern border-2"
              style={{
                borderColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].primary}40` : 'rgba(168, 85, 247, 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-purple-500" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Roster</span>
              </div>
              <p className="text-3xl font-bold text-purple-400">{Object.keys(teamData.roster).length}</p>
              <p className="text-sm text-gray-400 mt-1">Players all-time</p>
            </div>
          </div>

          <div
            className="glass-card mb-8 border-2"
            style={{
              borderColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].primary}30` : 'rgba(16, 185, 129, 0.2)',
              background: teamColors && teamColors[teamName]
                ? `linear-gradient(135deg, ${teamColors[teamName].primary}10 0%, ${teamColors[teamName].secondary}05 100%)`
                : 'rgba(16, 185, 129, 0.05)',
            }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Season Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              <div
                className="text-center p-3 sm:p-4 rounded-xl"
                style={{
                  backgroundColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].primary}20` : 'rgba(59, 130, 246, 0.1)',
                }}
              >
                <p
                  className="text-2xl sm:text-3xl font-bold"
                  style={{
                    color: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#3b82f6',
                  }}
                >
                  {teamData.season_stats.total_passing_yards.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Passing Yards</p>
              </div>
              <div
                className="text-center p-3 sm:p-4 rounded-xl"
                style={{
                  backgroundColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].secondary}20` : 'rgba(249, 115, 22, 0.1)',
                }}
              >
                <p
                  className="text-2xl sm:text-3xl font-bold"
                  style={{
                    color: teamColors && teamColors[teamName] ? teamColors[teamName].secondary : '#f97316',
                  }}
                >
                  {teamData.season_stats.total_rushing_yards.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Rushing Yards</p>
              </div>
              <div
                className="text-center p-3 sm:p-4 rounded-xl"
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                }}
              >
                <p className="text-2xl sm:text-3xl font-bold text-purple-400">
                  {teamData.season_stats.total_receiving_yards.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Receiving Yards</p>
              </div>
              <div
                className="text-center p-3 sm:p-4 rounded-xl"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                }}
              >
                <p className="text-2xl sm:text-3xl font-bold text-red-400">{teamData.season_stats.total_tackles}</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Total Tackles</p>
              </div>
            </div>
          </div>

          {Object.keys(teamData.head_to_head).length > 0 && (
            <div
              className="glass-card mb-8 border-2"
              style={{
                borderColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].primary}30` : 'rgba(239, 68, 68, 0.2)',
                background: teamColors && teamColors[teamName]
                  ? `linear-gradient(135deg, ${teamColors[teamName].primary}10 0%, ${teamColors[teamName].secondary}05 100%)`
                  : 'rgba(239, 68, 68, 0.05)',
              }}
            >
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                <Shield
                  className="w-5 sm:w-6 h-5 sm:h-6 mr-2"
                  style={{
                    color: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#ef4444',
                  }}
                />
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
                  <Bar
                    dataKey="wins"
                    fill={teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#10b981'}
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar dataKey="losses" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div
            className="glass-card border-2"
            style={{
              borderColor: teamColors && teamColors[teamName] ? `${teamColors[teamName].primary}30` : 'rgba(16, 185, 129, 0.2)',
              background: teamColors && teamColors[teamName]
                ? `linear-gradient(135deg, ${teamColors[teamName].primary}10 0%, ${teamColors[teamName].secondary}05 100%)`
                : 'rgba(16, 185, 129, 0.05)',
            }}
          >
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
                      <td className="text-center px-2 sm:px-3 py-2 sm:py-3"><span style={{ color: teamColors && teamColors[teamName] ? teamColors[teamName].primary : '#10b981' }} className="font-semibold">{data.games}</span></td>
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
      </div>
    </div>
  );
};

export default TeamAnalysis;
