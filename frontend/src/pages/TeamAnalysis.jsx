import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Award, Users, Target, Shield, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
    if (!teamData) return [];
    return Object.entries(teamData.head_to_head).map(([opponent, record]) => ({
      name: opponent,
      wins: record.wins,
      losses: record.losses
    }));
  };

  const getTopPlayers = (category) => {
    if (!teamData) return [];
    const players = Object.entries(teamData.roster).map(([name, data]) => ({
      name,
      value: category === 'passing' ? data.stats.passing.yards :
             category === 'rushing' ? data.stats.rushing.yards :
             category === 'receiving' ? data.stats.receiving.yards :
             data.stats.defense.tackles,
      games: data.games
    }));
    return players.filter(p => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  };

  if (loading) {
    return (
      <div className=\"min-h-screen flex items-center justify-center\">
        <div className=\"text-center\">
          <div className=\"w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4\"></div>
          <p className=\"text-gray-400\">Loading team analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"min-h-screen p-4 lg:p-8\">
        <button
          onClick={() => navigate(-1)}
          className=\"flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors\"
        >
          <ArrowLeft className=\"w-5 h-5\" />
          <span>Back</span>
        </button>
        <div className=\"glass-card text-center py-12\">
          <Trophy className=\"w-16 h-16 text-gray-600 mx-auto mb-4\" />
          <p className=\"text-gray-400 text-lg\">{error}</p>
        </div>
      </div>
    );
  }

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  return (
    <div className=\"min-h-screen p-4 lg:p-8\">
      {/* Back Button */}
      <button
        onClick={() => navigate('/standings')}
        className=\"flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors animate-fadeIn\"
      >
        <ArrowLeft className=\"w-5 h-5\" />
        <span>Back to Standings</span>
      </button>

      {/* Team Header */}
      <div className=\"glass-card mb-6 animate-fadeInUp relative overflow-hidden\">
        <div className=\"absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10\"></div>
        <div className=\"relative p-8\">
          <div className=\"flex items-center justify-between flex-wrap gap-4\">
            <div>
              <h1 className=\"text-5xl font-bold gradient-text mb-2\">{teamData.name}</h1>
              <p className=\"text-gray-400 text-lg\">Franchise Analysis & Legacy</p>
            </div>
            <div className=\"text-right\">
              <div className=\"text-4xl font-bold text-white mb-1\">
                {teamData.all_time_record.wins}-{teamData.all_time_record.losses}
              </div>
              <p className=\"text-emerald-400 text-lg font-semibold\">
                {(teamData.all_time_record.win_pct * 100).toFixed(1)}% Win Rate
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8\">
        <div className=\"stat-card-modern animate-fadeInUp\" style={{ animationDelay: '0.1s' }}>
          <div className=\"flex items-center justify-between mb-3\">
            <Trophy className=\"w-8 h-8 text-yellow-500\" />
            <span className=\"text-xs text-gray-400 uppercase tracking-wide\">Total Games</span>
          </div>
          <p className=\"text-3xl font-bold text-white\">{teamData.total_games}</p>
          <p className=\"text-sm text-gray-400 mt-1\">
            {teamData.current_streak.type} streak: {teamData.current_streak.count}
          </p>
        </div>

        <div className=\"stat-card-modern animate-fadeInUp\" style={{ animationDelay: '0.2s' }}>
          <div className=\"flex items-center justify-between mb-3\">
            <Target className=\"w-8 h-8 text-emerald-500\" />
            <span className=\"text-xs text-gray-400 uppercase tracking-wide\">Avg Points</span>
          </div>
          <p className=\"text-3xl font-bold text-emerald-400\">{teamData.avg_points_scored}</p>
          <p className=\"text-sm text-gray-400 mt-1\">Allowed: {teamData.avg_points_allowed}</p>
        </div>

        <div className=\"stat-card-modern animate-fadeInUp\" style={{ animationDelay: '0.3s' }}>
          <div className=\"flex items-center justify-between mb-3\">
            <Zap className=\"w-8 h-8 text-orange-500\" />
            <span className=\"text-xs text-gray-400 uppercase tracking-wide\">Total TDs</span>
          </div>
          <p className=\"text-3xl font-bold text-orange-400\">{teamData.season_stats.total_touchdowns}</p>
          <p className=\"text-sm text-gray-400 mt-1\">All categories</p>
        </div>

        <div className=\"stat-card-modern animate-fadeInUp\" style={{ animationDelay: '0.4s' }}>
          <div className=\"flex items-center justify-between mb-3\">
            <Users className=\"w-8 h-8 text-purple-500\" />
            <span className=\"text-xs text-gray-400 uppercase tracking-wide\">Roster</span>
          </div>
          <p className=\"text-3xl font-bold text-purple-400\">{Object.keys(teamData.roster).length}</p>
          <p className=\"text-sm text-gray-400 mt-1\">Players all-time</p>
        </div>
      </div>

      {/* Team Records & Biggest Win/Loss */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8\">
        {/* Team Records */}
        <div className=\"glass-card animate-fadeInUp\" style={{ animationDelay: '0.5s' }}>
          <h2 className=\"text-2xl font-bold text-white mb-6 flex items-center\">
            <Award className=\"w-6 h-6 mr-2 text-yellow-500\" />
            Team Records
          </h2>
          <div className=\"space-y-4\">
            {teamData.team_records.most_points_game && (
              <div className=\"p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30\">
                <p className=\"text-xs text-emerald-400 uppercase tracking-wide mb-1\">Most Points in a Game</p>
                <p className=\"text-2xl font-bold text-white\">{teamData.team_records.most_points_game.points} Points</p>
                <p className=\"text-sm text-gray-400\">vs {teamData.team_records.most_points_game.opponent} • Week {teamData.team_records.most_points_game.week}</p>
              </div>
            )}
            
            {teamData.team_records.most_yards_passing_game && (
              <div className=\"p-4 rounded-xl bg-blue-500/10 border border-blue-500/30\">
                <p className=\"text-xs text-blue-400 uppercase tracking-wide mb-1\">Most Passing Yards</p>
                <p className=\"text-2xl font-bold text-white\">{teamData.team_records.most_yards_passing_game.yards} Yards</p>
                <p className=\"text-sm text-gray-400\">{teamData.team_records.most_yards_passing_game.player} • Week {teamData.team_records.most_yards_passing_game.week}</p>
              </div>
            )}

            {teamData.team_records.most_yards_rushing_game && (
              <div className=\"p-4 rounded-xl bg-orange-500/10 border border-orange-500/30\">
                <p className=\"text-xs text-orange-400 uppercase tracking-wide mb-1\">Most Rushing Yards</p>
                <p className=\"text-2xl font-bold text-white\">{teamData.team_records.most_yards_rushing_game.yards} Yards</p>
                <p className=\"text-sm text-gray-400\">{teamData.team_records.most_yards_rushing_game.player} • Week {teamData.team_records.most_yards_rushing_game.week}</p>
              </div>
            )}
          </div>
        </div>

        {/* Biggest Win/Loss */}
        <div className=\"glass-card animate-fadeInUp\" style={{ animationDelay: '0.6s' }}>
          <h2 className=\"text-2xl font-bold text-white mb-6 flex items-center\">
            <TrendingUp className=\"w-6 h-6 mr-2 text-emerald-500\" />
            Memorable Games
          </h2>
          <div className=\"space-y-4\">
            {teamData.biggest_win && (
              <div className=\"p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30\">
                <div className=\"flex items-center justify-between mb-2\">
                  <p className=\"text-xs text-emerald-400 uppercase tracking-wide\">Biggest Victory</p>
                  <TrendingUp className=\"w-5 h-5 text-emerald-500\" />
                </div>
                <p className=\"text-3xl font-bold text-white mb-1\">{teamData.biggest_win.score}</p>
                <p className=\"text-emerald-400 font-semibold\">+{teamData.biggest_win.margin} margin</p>
                <p className=\"text-sm text-gray-400 mt-2\">vs {teamData.biggest_win.opponent} • Week {teamData.biggest_win.week}</p>
              </div>
            )}

            {teamData.biggest_loss && (
              <div className=\"p-4 rounded-xl bg-red-500/10 border border-red-500/30\">
                <div className=\"flex items-center justify-between mb-2\">
                  <p className=\"text-xs text-red-400 uppercase tracking-wide\">Toughest Loss</p>
                  <TrendingDown className=\"w-5 h-5 text-red-500\" />
                </div>
                <p className=\"text-3xl font-bold text-white mb-1\">{teamData.biggest_loss.score}</p>
                <p className=\"text-red-400 font-semibold\">-{teamData.biggest_loss.margin} margin</p>
                <p className=\"text-sm text-gray-400 mt-2\">vs {teamData.biggest_loss.opponent} • Week {teamData.biggest_loss.week}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Season Stats Overview */}
      <div className=\"glass-card mb-8 animate-fadeInUp\" style={{ animationDelay: '0.7s' }}>
        <h2 className=\"text-2xl font-bold text-white mb-6\">Season Statistics</h2>
        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
          <div className=\"text-center p-4 rounded-xl bg-blue-500/10\">
            <p className=\"text-3xl font-bold text-blue-400\">{teamData.season_stats.total_passing_yards.toLocaleString()}</p>
            <p className=\"text-sm text-gray-400 mt-1\">Passing Yards</p>
          </div>
          <div className=\"text-center p-4 rounded-xl bg-orange-500/10\">
            <p className=\"text-3xl font-bold text-orange-400\">{teamData.season_stats.total_rushing_yards.toLocaleString()}</p>
            <p className=\"text-sm text-gray-400 mt-1\">Rushing Yards</p>
          </div>
          <div className=\"text-center p-4 rounded-xl bg-purple-500/10\">
            <p className=\"text-3xl font-bold text-purple-400\">{teamData.season_stats.total_receiving_yards.toLocaleString()}</p>
            <p className=\"text-sm text-gray-400 mt-1\">Receiving Yards</p>
          </div>
          <div className=\"text-center p-4 rounded-xl bg-red-500/10\">
            <p className=\"text-3xl font-bold text-red-400\">{teamData.season_stats.total_tackles}</p>
            <p className=\"text-sm text-gray-400 mt-1\">Total Tackles</p>
          </div>
        </div>
      </div>

      {/* Head to Head Records */}
      {Object.keys(teamData.head_to_head).length > 0 && (
        <div className=\"glass-card mb-8 animate-fadeInUp\" style={{ animationDelay: '0.8s' }}>
          <h2 className=\"text-2xl font-bold text-white mb-6 flex items-center\">
            <Shield className=\"w-6 h-6 mr-2 text-red-500\" />
            Head-to-Head Records
          </h2>
          <ResponsiveContainer width=\"100%\" height={300}>
            <BarChart data={getHeadToHeadChartData()}>
              <CartesianGrid strokeDasharray=\"3 3\" stroke=\"rgba(255,255,255,0.1)\" />
              <XAxis dataKey=\"name\" stroke=\"#9ca3af\" />
              <YAxis stroke=\"#9ca3af\" />
              <Tooltip
                contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px' }}
                labelStyle={{ color: '#10b981' }}
              />
              <Bar dataKey=\"wins\" fill=\"#10b981\" radius={[8, 8, 0, 0]} />
              <Bar dataKey=\"losses\" fill=\"#ef4444\" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Players by Category */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8\">
        <div className=\"glass-card animate-fadeInUp\" style={{ animationDelay: '0.9s' }}>
          <h2 className=\"text-2xl font-bold text-white mb-6\">Top Passers (All-Time)</h2>
          <div className=\"space-y-3\">
            {getTopPlayers('passing').map((player, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/player/${player.name}`)}
                className=\"flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all\"
              >
                <div className=\"flex items-center space-x-3\">
                  <span className=\"w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm\">
                    {idx + 1}
                  </span>
                  <div>
                    <p className=\"font-semibold text-white\">{player.name}</p>
                    <p className=\"text-xs text-gray-400\">{player.games} games</p>
                  </div>
                </div>
                <p className=\"text-xl font-bold text-blue-400\">{player.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className=\"glass-card animate-fadeInUp\" style={{ animationDelay: '1s' }}>
          <h2 className=\"text-2xl font-bold text-white mb-6\">Top Receivers (All-Time)</h2>
          <div className=\"space-y-3\">
            {getTopPlayers('receiving').map((player, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/player/${player.name}`)}
                className=\"flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all\"
              >
                <div className=\"flex items-center space-x-3\">
                  <span className=\"w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm\">
                    {idx + 1}
                  </span>
                  <div>
                    <p className=\"font-semibold text-white\">{player.name}</p>
                    <p className=\"text-xs text-gray-400\">{player.games} games</p>
                  </div>
                </div>
                <p className=\"text-xl font-bold text-purple-400\">{player.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Roster */}
      <div className=\"glass-card animate-fadeInUp\" style={{ animationDelay: '1.1s' }}>
        <h2 className=\"text-2xl font-bold text-white mb-6\">Franchise Roster History</h2>
        <div className=\"overflow-x-auto\">
          <table className=\"w-full\">
            <thead>
              <tr>
                <th className=\"text-left\">PLAYER</th>
                <th className=\"text-center\">GAMES</th>
                <th className=\"text-center\">PASS YDS</th>
                <th className=\"text-center\">RUSH YDS</th>
                <th className=\"text-center\">REC YDS</th>
                <th className=\"text-center\">TACKLES</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(teamData.roster).map(([name, data], idx) => (
                <tr
                  key={idx}
                  onClick={() => navigate(`/player/${name}`)}
                  className=\"cursor-pointer\"
                >
                  <td><span className=\"font-semibold text-white\">{name}</span></td>
                  <td className=\"text-center\"><span className=\"text-emerald-400 font-semibold\">{data.games}</span></td>
                  <td className=\"text-center\">{data.stats.passing.yards > 0 ? data.stats.passing.yards : '-'}</td>
                  <td className=\"text-center\">{data.stats.rushing.yards > 0 ? data.stats.rushing.yards : '-'}</td>
                  <td className=\"text-center\">{data.stats.receiving.yards > 0 ? data.stats.receiving.yards : '-'}</td>
                  <td className=\"text-center\">{data.stats.defense.tackles > 0 ? data.stats.defense.tackles : '-'}</td>
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
