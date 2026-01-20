import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Star, TrendingUp, Eye, EyeOff, AlertCircle, Target, Shield, Zap, ChevronRight, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlayerProfile = () => {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playerRes, watchlistRes, analysisRes] = await Promise.all([
          axios.get(`${API}/players/${playerId}`),
          axios.get(`${API}/watchlist`),
          axios.get(`${API}/players/${playerId}/analysis`)
        ]);
        setPlayer(playerRes.data);
        setInWatchlist(watchlistRes.data.some(p => p.id === playerId));
        setAnalysis(analysisRes.data);
      } catch (error) {
        console.error('Error fetching player:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [playerId]);

  const toggleWatchlist = async () => {
    try {
      if (inWatchlist) {
        await axios.delete(`${API}/watchlist/${playerId}`);
        toast.success('Removed from watchlist');
      } else {
        await axios.post(`${API}/watchlist`, { player_id: playerId });
        toast.success('Added to watchlist');
      }
      setInWatchlist(!inWatchlist);
    } catch (error) {
      toast.error('Failed to update watchlist');
    }
  };

  const getPositionColor = (pos) => {
    const colors = {
      QB: 'bg-orange-500',
      WR: 'bg-teal-500',
      RB: 'bg-sky-500',
      DEF: 'bg-red-500',
      K: 'bg-purple-500'
    };
    return colors[pos] || 'bg-gray-500';
  };

  // Generate radar chart data based on position
  const getRadarData = () => {
    if (!player?.stats) return [];
    const pos = player.position;
    
    // Normalize values to 0-100 scale for radar chart
    const normalize = (val, max) => Math.min(100, (val / max) * 100);
    
    if (pos === 'QB') {
      return [
        { stat: 'Passing', value: normalize(player.stats.passing_yards || 0, 5000), fullMark: 100 },
        { stat: 'TDs', value: normalize(player.stats.touchdowns || 0, 50), fullMark: 100 },
        { stat: 'Accuracy', value: player.stats.completion_pct || 0, fullMark: 100 },
        { stat: 'Rating', value: normalize(player.stats.rating || 0, 150), fullMark: 100 },
        { stat: 'Rushing', value: normalize(player.stats.rushing_yards || 0, 500), fullMark: 100 },
      ];
    } else if (pos === 'RB') {
      return [
        { stat: 'Rushing', value: normalize(player.stats.rushing_yards || 0, 1500), fullMark: 100 },
        { stat: 'TDs', value: normalize(player.stats.touchdowns || 0, 20), fullMark: 100 },
        { stat: 'YPC', value: normalize(player.stats.yards_per_carry || 0, 7), fullMark: 100 },
        { stat: 'Receiving', value: normalize(player.stats.receiving_yards || 0, 500), fullMark: 100 },
        { stat: 'Big Plays', value: normalize(player.stats.twenty_plus || 0, 15), fullMark: 100 },
      ];
    } else if (pos === 'WR') {
      return [
        { stat: 'Receiving', value: normalize(player.stats.receiving_yards || 0, 1800), fullMark: 100 },
        { stat: 'TDs', value: normalize(player.stats.touchdowns || 0, 15), fullMark: 100 },
        { stat: 'Receptions', value: normalize(player.stats.receptions || 0, 120), fullMark: 100 },
        { stat: 'YPR', value: normalize((player.stats.receiving_yards || 0) / (player.stats.receptions || 1), 20), fullMark: 100 },
        { stat: 'Hands', value: 100 - normalize(player.stats.drops || 0, 10), fullMark: 100 },
      ];
    } else if (pos === 'DEF') {
      return [
        { stat: 'Tackles', value: normalize(player.stats.tackles || 0, 100), fullMark: 100 },
        { stat: 'Sacks', value: normalize(player.stats.sacks || 0, 15), fullMark: 100 },
        { stat: 'INTs', value: normalize(player.stats.interceptions || 0, 8), fullMark: 100 },
        { stat: 'TFL', value: normalize(player.stats.tackles_for_loss || 0, 20), fullMark: 100 },
        { stat: 'Def TDs', value: normalize(player.stats.defensive_td || 0, 3), fullMark: 100 },
      ];
    }
    return [
      { stat: 'Fantasy Pts', value: normalize(player.stats.fantasy_points || 0, 400), fullMark: 100 },
      { stat: 'Avg/Game', value: normalize(player.stats.avg_points || 0, 50), fullMark: 100 },
    ];
  };

  // Get stat cards data by position
  const getStatCards = () => {
    if (!player?.stats) return [];
    const pos = player.position;
    
    if (pos === 'QB') {
      return [
        { label: 'PASSING', value: player.stats.passing_yards || 0, sub: `${player.stats.touchdowns || 0} TD • ${player.stats.interceptions || 0} INT`, color: 'text-orange-400' },
        { label: 'RUSHING', value: player.stats.rushing_yards || 0, sub: `${player.stats.rushing_tds || 0} TD • ${player.stats.attempts || 0} Att`, color: 'text-sky-400' },
        { label: 'COMP %', value: `${(player.stats.completion_pct || 0).toFixed(1)}%`, sub: `${player.stats.completions || 0}/${player.stats.attempts || 0}`, color: 'text-teal-400' },
      ];
    } else if (pos === 'RB') {
      return [
        { label: 'RUSHING', value: player.stats.rushing_yards || 0, sub: `${player.stats.touchdowns || 0} TD • ${player.stats.attempts || 0} Att`, color: 'text-sky-400' },
        { label: 'RECEIVING', value: player.stats.receiving_yards || 0, sub: `${player.stats.receiving_tds || 0} TD • ${player.stats.receptions || 0} Rec`, color: 'text-teal-400' },
        { label: 'YPC', value: (player.stats.yards_per_carry || 0).toFixed(1), sub: `${player.stats.fumbles || 0} Fumbles`, color: 'text-orange-400' },
      ];
    } else if (pos === 'WR') {
      return [
        { label: 'RECEIVING', value: player.stats.receiving_yards || 0, sub: `${player.stats.touchdowns || 0} TD • ${player.stats.receptions || 0} Rec`, color: 'text-teal-400' },
        { label: 'YPR', value: ((player.stats.receiving_yards || 0) / (player.stats.receptions || 1)).toFixed(1), sub: `${player.stats.drops || 0} Drops`, color: 'text-orange-400' },
        { label: 'LONGEST', value: player.stats.longest || 0, sub: 'yards', color: 'text-sky-400' },
      ];
    } else if (pos === 'DEF') {
      return [
        { label: 'TACKLES', value: player.stats.tackles || 0, sub: `${player.stats.tackles_for_loss || 0} TFL`, color: 'text-red-400' },
        { label: 'SACKS', value: player.stats.sacks || 0, sub: `${player.stats.interceptions || 0} INT`, color: 'text-orange-400' },
        { label: 'DEF TDs', value: player.stats.defensive_td || 0, sub: `${player.stats.pass_deflections || 0} PD`, color: 'text-teal-400' },
      ];
    }
    return [
      { label: 'FANTASY PTS', value: (player.stats.fantasy_points || 0).toFixed(1), sub: `${(player.stats.avg_points || 0).toFixed(1)} avg`, color: 'text-neon-blue' },
    ];
  };

  // Get game log columns by position
  const getGameLogColumns = () => {
    const pos = player?.position;
    if (pos === 'QB') {
      return ['PASSING', 'RUSHING', 'RECEIVING', 'DEFENSE', 'PTS'];
    } else if (pos === 'RB') {
      return ['RUSHING', 'RECEIVING', 'DEFENSE', 'PTS'];
    } else if (pos === 'WR') {
      return ['RECEIVING', 'RUSHING', 'DEFENSE', 'PTS'];
    } else if (pos === 'DEF') {
      return ['TACKLES', 'SACKS', 'INTs', 'PTS'];
    }
    return ['PTS'];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading font-bold text-2xl text-white mb-2">Player Not Found</h2>
          <Link to="/players" className="text-neon-blue hover:underline">Back to Players</Link>
        </div>
      </div>
    );
  }

  const radarData = getRadarData();
  const statCards = getStatCards();
  const gameLogCols = getGameLogColumns();

  return (
    <div data-testid="player-profile-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <Link to="/players" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back</span>
          </Link>
        </div>
      </div>

      {/* Player Card */}
      <div className="px-6 md:px-12 -mt-4">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-panel border-white/10 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-blue/30 to-neon-volt/30 flex items-center justify-center border-2 border-white/20">
                      <span className="font-heading font-black text-3xl text-white">{player.name.charAt(0).toLowerCase()}</span>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div>
                    <h1 className="font-heading font-black text-3xl md:text-4xl tracking-tighter text-neon-blue">
                      {player.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-body text-white/60">{player.games_played || 0} Games Played</span>
                      <span className="font-heading font-bold text-neon-volt">{player.stats?.fantasy_points?.toFixed(1)} FP</span>
                      <Badge className={`${getPositionColor(player.position)} text-white`}>
                        Current: {player.team?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Watch Button */}
                <Button
                  onClick={toggleWatchlist}
                  variant="outline"
                  className={inWatchlist ? "border-neon-volt text-neon-volt" : "border-white/20"}
                  data-testid="watchlist-toggle"
                >
                  {inWatchlist ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {inWatchlist ? 'Watching' : 'Watch'}
                </Button>
              </div>

              {/* Team History (Trades) */}
              {player.team_history && player.team_history.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="font-body text-xs text-white/40 uppercase mb-2">Team History (Trades)</div>
                  <div className="flex flex-wrap gap-2">
                    {player.team_history?.map((th, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white/5 border-white/20">
                        {th.team} ({th.games} games)
                      </Badge>
                    )) || (
                      <Badge variant="outline" className="bg-white/5 border-white/20">
                        {player.team} ({player.games_played || 0} games)
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 md:px-12 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => (
              <Card key={idx} className="glass-panel border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-body text-xs text-white/40 uppercase">{stat.label}</span>
                    <Activity className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className={`font-heading font-black text-3xl ${stat.color}`}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </div>
                  <div className="font-body text-xs text-white/50 mt-1">{stat.sub}</div>
                </CardContent>
              </Card>
            ))}
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs text-white/40 uppercase">DEFENSE</span>
                  <Shield className="w-4 h-4 text-red-400" />
                </div>
                <div className="font-heading font-black text-3xl text-red-400">
                  {player.stats?.tackles || player.stats?.sacks || 0}
                </div>
                <div className="font-body text-xs text-white/50 mt-1">
                  {player.stats?.sacks ? `${player.stats.sacks} SCK` : '0 SCK'} • {player.stats?.interceptions || 0} INT
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="px-6 md:px-12 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Profile Radar */}
            <Card className="glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                  Performance Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#27272a" />
                      <PolarAngleAxis 
                        dataKey="stat" 
                        tick={{ fill: '#a1a1aa', fontSize: 11 }} 
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        tickCount={5}
                      />
                      <Radar
                        name="Stats"
                        dataKey="value"
                        stroke="#CCFF00"
                        fill="#CCFF00"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Fantasy Points by Game */}
            <Card className="glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                  Fantasy Points by Game
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={player.weekly_scores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis 
                        dataKey="week" 
                        stroke="#a1a1aa" 
                        tick={{ fill: '#a1a1aa', fontSize: 11 }}
                        tickFormatter={(v) => `W${v}`}
                      />
                      <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0a0a0a', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value} pts`, 'Fantasy Points']}
                        labelFormatter={(v) => `Week ${v}`}
                      />
                      <Bar 
                        dataKey="points" 
                        fill="#40E0D0"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Game Log */}
      <div className="px-6 md:px-12 py-6">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                Game Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-4 text-left font-heading font-bold text-neon-blue uppercase tracking-wider text-sm">WEEK</th>
                      <th className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">TEAM</th>
                      <th className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">DATE</th>
                      {gameLogCols.map(col => (
                        <th key={col} className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {player.weekly_scores?.map((week, idx) => (
                      <tr key={idx} className="border-b border-white/5 table-row-hover">
                        <td className="p-4">
                          <span className="font-heading font-bold text-neon-blue">Week {week.week}</span>
                        </td>
                        <td className="p-4">
                          <Badge className="bg-teal-600/30 text-teal-400 border-teal-500/30">
                            {player.team?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4 font-body text-white/60 text-sm">
                          {new Date().toISOString().split('T')[0]}
                        </td>
                        {player.position === 'QB' && (
                          <>
                            <td className="p-4 font-body text-white/80 text-sm">
                              {Math.floor((player.stats?.passing_yards || 0) / 8)}Y, 0TD
                            </td>
                            <td className="p-4 font-body text-white/80 text-sm">
                              {Math.floor((player.stats?.rushing_yards || 0) / 8)}Y, 0TD
                            </td>
                            <td className="p-4 font-body text-white/80 text-sm">0R, 0Y</td>
                            <td className="p-4 font-body text-white/80 text-sm">0T • 0SCK</td>
                          </>
                        )}
                        {player.position === 'RB' && (
                          <>
                            <td className="p-4 font-body text-white/80 text-sm">
                              {Math.floor((player.stats?.rushing_yards || 0) / 8)}Y, 0TD
                            </td>
                            <td className="p-4 font-body text-white/80 text-sm">0R, 0Y</td>
                            <td className="p-4 font-body text-white/80 text-sm">0T • 0SCK</td>
                          </>
                        )}
                        {player.position === 'WR' && (
                          <>
                            <td className="p-4 font-body text-white/80 text-sm">
                              {Math.floor((player.stats?.receptions || 0) / 8)}R, {Math.floor((player.stats?.receiving_yards || 0) / 8)}Y
                            </td>
                            <td className="p-4 font-body text-white/80 text-sm">0Att, 0Y</td>
                            <td className="p-4 font-body text-white/80 text-sm">0T • 0SCK</td>
                          </>
                        )}
                        {player.position === 'DEF' && (
                          <>
                            <td className="p-4 font-body text-white/80 text-sm">
                              {Math.floor((player.stats?.tackles || 0) / 8)}
                            </td>
                            <td className="p-4 font-body text-white/80 text-sm">
                              {Math.floor((player.stats?.sacks || 0) / 8)}
                            </td>
                            <td className="p-4 font-body text-white/80 text-sm">
                              {Math.floor((player.stats?.interceptions || 0) / 8)}
                            </td>
                          </>
                        )}
                        <td className="p-4">
                          <span className={`font-heading font-bold ${week.points > (player.stats?.avg_points || 0) ? 'text-neon-volt' : 'text-white'}`}>
                            {week.points}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
