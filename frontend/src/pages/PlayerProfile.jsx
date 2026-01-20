import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Star, TrendingUp, Eye, EyeOff, AlertCircle, Target, Shield, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlayerProfile = () => {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

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

  const getStatsByPosition = (pos, stats) => {
    switch (pos) {
      case 'QB':
        return [
          { label: 'Completions', value: stats.completions },
          { label: 'Attempts', value: stats.attempts },
          { label: 'Pass Yards', value: stats.passing_yards?.toLocaleString() },
          { label: 'TDs', value: stats.touchdowns },
          { label: 'INTs', value: stats.interceptions },
          { label: 'Rating', value: stats.rating?.toFixed(1) },
          { label: 'Comp %', value: `${stats.completion_pct?.toFixed(1)}%` },
          { label: 'Avg/Att', value: stats.avg_per_attempt?.toFixed(1) },
          { label: 'Longest', value: stats.longest },
        ];
      case 'WR':
        return [
          { label: 'Receptions', value: stats.receptions },
          { label: 'Rec Yards', value: stats.receiving_yards?.toLocaleString() },
          { label: 'TDs', value: stats.touchdowns },
          { label: 'Drops', value: stats.drops },
          { label: 'Longest', value: stats.longest },
        ];
      case 'RB':
        return [
          { label: 'Attempts', value: stats.attempts },
          { label: 'Rush Yards', value: stats.rushing_yards?.toLocaleString() },
          { label: 'TDs', value: stats.touchdowns },
          { label: 'YPC', value: stats.yards_per_carry?.toFixed(1) },
          { label: 'Fumbles', value: stats.fumbles },
          { label: '20+ Yards', value: stats.twenty_plus },
          { label: 'Longest', value: stats.longest },
        ];
      case 'DEF':
        return [
          { label: 'Tackles', value: stats.tackles },
          { label: 'TFL', value: stats.tackles_for_loss },
          { label: 'Sacks', value: stats.sacks },
          { label: 'Safeties', value: stats.safeties },
          { label: 'Swat', value: stats.swat },
          { label: 'INTs', value: stats.interceptions },
          { label: 'Pass Def', value: stats.pass_deflections },
          { label: 'Def TDs', value: stats.defensive_td },
        ];
      case 'K':
        return [
          { label: 'FG Made', value: stats.field_goals },
          { label: 'FG Att', value: stats.field_goal_attempts },
          { label: 'XP Made', value: stats.extra_points },
          { label: 'Longest', value: stats.longest },
        ];
      default:
        return [];
    }
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

  return (
    <div data-testid="player-profile-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <Link to="/players" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back to Players</span>
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Player Avatar */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/10">
                <span className="font-heading font-black text-6xl text-white">{player.name.charAt(0)}</span>
              </div>
              {player.is_elite && (
                <div className="absolute -top-2 -right-2 bg-neon-volt text-black p-2 rounded-full">
                  <Star className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Player Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={`${getPositionColor(player.position)} text-white`}>
                  {player.position}
                </Badge>
                {player.injury_status && (
                  <Badge variant="outline" className="border-red-500/50 text-red-500">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {player.injury_status}
                  </Badge>
                )}
              </div>
              <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter uppercase text-white mb-2">
                {player.name}
              </h1>
              <p className="font-body text-white/60 text-lg mb-4">{player.team}</p>
              
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  onClick={toggleWatchlist}
                  variant={inWatchlist ? "default" : "outline"}
                  className={inWatchlist ? "bg-neon-volt text-black hover:bg-neon-volt/80" : "border-white/20"}
                  data-testid="watchlist-toggle"
                >
                  {inWatchlist ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </Button>
                <Button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  variant="outline"
                  className="border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10"
                  data-testid="show-analysis-btn"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {showAnalysis ? 'Hide Analysis' : 'View Analysis'}
                </Button>
                <div className="text-right">
                  <div className="font-body text-xs text-white/40 uppercase">Bye Week</div>
                  <div className="font-heading font-bold text-lg text-white">Week {player.bye_week}</div>
                </div>
              </div>
            </div>

            {/* Fantasy Points */}
            <div className="glass-panel rounded-xl p-6 text-center">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">Fantasy Points</div>
              <div className="font-heading font-black text-5xl text-neon-blue mb-1">
                {player.stats?.fantasy_points?.toFixed(1)}
              </div>
              <div className="font-body text-sm text-white/60">
                {player.stats?.avg_points?.toFixed(1)} avg/game
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Player Analysis */}
          {showAnalysis && analysis && (
            <Card className="glass-panel border-neon-blue/30 animate-slide-up" data-testid="player-analysis">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                  <Target className="w-5 h-5 text-neon-blue" />
                  Player Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Overview */}
                  <div className="md:col-span-2">
                    <p className="font-body text-lg text-white/80">{analysis.overview}</p>
                  </div>

                  {/* Strengths */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-lg text-neon-volt uppercase flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Strengths
                    </h4>
                    <ul className="space-y-2">
                      {analysis.strengths?.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2 font-body text-sm text-white/70">
                          <ChevronRight className="w-4 h-4 text-neon-volt mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-lg text-red-500 uppercase flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Areas to Improve
                    </h4>
                    <ul className="space-y-2">
                      {analysis.weaknesses?.length > 0 ? analysis.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="flex items-start gap-2 font-body text-sm text-white/70">
                          <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          {weakness}
                        </li>
                      )) : (
                        <li className="font-body text-sm text-white/50">No significant weaknesses identified</li>
                      )}
                    </ul>
                  </div>

                  {/* Outlook & Fantasy Advice */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div className="p-4 rounded-lg bg-white/5">
                      <h5 className="font-heading font-bold text-sm text-neon-blue uppercase mb-2">Season Outlook</h5>
                      <p className="font-body text-sm text-white/70">{analysis.outlook}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-neon-volt/10 border border-neon-volt/30">
                      <h5 className="font-heading font-bold text-sm text-neon-volt uppercase mb-2">Fantasy Advice</h5>
                      <p className="font-body text-sm text-white/70">{analysis.fantasy_advice}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-neon-blue" />
                Season Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {getStatsByPosition(player.position, player.stats).map((stat, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 text-center">
                    <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">{stat.label}</div>
                    <div className="font-heading font-black text-2xl text-white">{stat.value || '-'}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Performance Chart */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                Weekly Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={player.weekly_scores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis 
                      dataKey="week" 
                      stroke="#a1a1aa" 
                      tick={{ fill: '#a1a1aa', fontSize: 12 }}
                      tickFormatter={(v) => `W${v}`}
                    />
                    <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
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
                    <Line 
                      type="monotone" 
                      dataKey="points" 
                      stroke="#007AFF" 
                      strokeWidth={2}
                      dot={{ fill: '#007AFF', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#CCFF00' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Game Log */}
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
                      <th className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Week</th>
                      <th className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Opponent</th>
                      <th className="p-4 text-right font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.weekly_scores?.map((week, idx) => (
                      <tr key={idx} className="border-b border-white/5 table-row-hover">
                        <td className="p-4 font-heading font-bold text-white">Week {week.week}</td>
                        <td className="p-4 font-body text-white/60">vs {week.opponent}</td>
                        <td className="p-4 text-right">
                          <span className={`font-heading font-bold ${week.points > player.stats?.avg_points ? 'text-neon-volt' : 'text-white'}`}>
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
