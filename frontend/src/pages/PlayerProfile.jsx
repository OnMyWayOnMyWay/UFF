import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Star, TrendingUp, Eye, EyeOff, Target, Shield, Zap, Activity, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

import API from '../lib/api';

const PlayerProfile = () => {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState('passing');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playerRes, watchlistRes] = await Promise.all([
          axios.get(`${API}/players/${playerId}`),
          axios.get(`${API}/watchlist`)
        ]);
        setPlayer(playerRes.data);
        setInWatchlist(watchlistRes.data.some(p => p?.id === playerId));
        
        // Set default stats tab based on position
        const pos = playerRes.data.position;
        if (pos === 'QB') setActiveStatsTab('passing');
        else if (pos === 'RB') setActiveStatsTab('rushing');
        else if (pos === 'WR') setActiveStatsTab('receiving');
        else if (pos === 'DEF') setActiveStatsTab('defense');
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
    if (!player) return [];
    const pos = player.position;
    const normalize = (val, max) => Math.min(100, (val / max) * 100);
    
    if (pos === 'QB') {
      const passing = player.passing || {};
      const rushing = player.rushing || {};
      return [
        { stat: 'Yards', value: normalize(passing.yards || 0, 5000), fullMark: 100 },
        { stat: 'TDs', value: normalize(passing.touchdowns || 0, 50), fullMark: 100 },
        { stat: 'Comp %', value: passing.completion_pct || 0, fullMark: 100 },
        { stat: 'Rating', value: normalize(passing.rating || 0, 150), fullMark: 100 },
        { stat: 'Rush Yds', value: normalize(rushing.yards || 0, 500), fullMark: 100 },
      ];
    } else if (pos === 'RB') {
      const rushing = player.rushing || {};
      const receiving = player.receiving || {};
      return [
        { stat: 'Rush Yds', value: normalize(rushing.yards || 0, 1500), fullMark: 100 },
        { stat: 'Rush TDs', value: normalize(rushing.touchdowns || 0, 20), fullMark: 100 },
        { stat: 'YPC', value: normalize(rushing.yards_per_carry || 0, 7), fullMark: 100 },
        { stat: 'Rec Yds', value: normalize(receiving.yards || 0, 500), fullMark: 100 },
        { stat: '20+ Runs', value: normalize(rushing.twenty_plus || 0, 15), fullMark: 100 },
      ];
    } else if (pos === 'WR') {
      const receiving = player.receiving || {};
      return [
        { stat: 'Yards', value: normalize(receiving.yards || 0, 1800), fullMark: 100 },
        { stat: 'TDs', value: normalize(receiving.touchdowns || 0, 15), fullMark: 100 },
        { stat: 'Receptions', value: normalize(receiving.receptions || 0, 120), fullMark: 100 },
        { stat: 'YPR', value: normalize((receiving.yards || 0) / (receiving.receptions || 1), 20), fullMark: 100 },
        { stat: 'Hands', value: 100 - normalize(receiving.drops || 0, 10), fullMark: 100 },
      ];
    } else if (pos === 'DEF') {
      const defense = player.defense || {};
      return [
        { stat: 'Tackles', value: normalize(defense.tackles || 0, 100), fullMark: 100 },
        { stat: 'Sacks', value: normalize(defense.sacks || 0, 15), fullMark: 100 },
        { stat: 'INTs', value: normalize(defense.interceptions || 0, 8), fullMark: 100 },
        { stat: 'TFL', value: normalize(defense.tackles_for_loss || 0, 20), fullMark: 100 },
        { stat: 'Def TDs', value: normalize(defense.td || 0, 3), fullMark: 100 },
      ];
    }
    return [];
  };

  // Format stat label
  const formatStatLabel = (key) => {
    const labels = {
      completions: 'Completions',
      attempts: 'Attempts',
      yards: 'Yards',
      touchdowns: 'Touchdowns',
      interceptions: 'Interceptions',
      rating: 'Passer Rating',
      completion_pct: 'Completion %',
      average: 'Avg/Attempt',
      longest: 'Longest',
      yards_per_carry: 'Yards/Carry',
      fumbles: 'Fumbles',
      twenty_plus: '20+ Yard Runs',
      receptions: 'Receptions',
      drops: 'Drops',
      tackles: 'Tackles',
      tackles_for_loss: 'Tackles For Loss',
      sacks: 'Sacks',
      safeties: 'Safeties',
      swat: 'Pass Swats',
      pass_deflections: 'Pass Deflections',
      td: 'Defensive TDs'
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Render stats table for a category
  const renderStatsTable = (stats, category) => {
    if (!stats) return null;
    
    // Define which stats are calculated vs raw
    const calculatedStats = {
      passing: ['rating', 'completion_pct', 'average'],
      rushing: ['yards_per_carry'],
      receiving: [],
      defense: []
    };
    
    const isCalculated = (key) => calculatedStats[category]?.includes(key);
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className={`p-4 rounded-lg ${isCalculated(key) ? 'bg-neon-volt/10 border border-neon-volt/30' : 'bg-white/5'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-body text-xs text-white/50 uppercase">{formatStatLabel(key)}</span>
              {isCalculated(key) && <Badge className="text-[10px] bg-neon-volt/20 text-neon-volt">CALC</Badge>}
            </div>
            <div className="font-heading font-black text-2xl text-white">
              {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
            </div>
          </div>
        ))}
      </div>
    );
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

  return (
    <div data-testid="player-profile-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <Link to="/players" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back to Players</span>
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
                    {player.image ? (
                      <img 
                        src={player.image} 
                        alt={player.name} 
                        className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-blue/30 to-neon-volt/30 flex items-center justify-center border-2 border-white/20">
                        <User className="w-10 h-10 text-white/50" />
                      </div>
                    )}
                    <Badge className={`absolute -bottom-1 -right-1 ${getPositionColor(player.position)} text-white text-xs`}>
                      {player.position}
                    </Badge>
                  </div>
                  
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-heading font-black text-3xl md:text-4xl tracking-tighter text-white">
                        {player.name || player.roblox_username}
                      </h1>
                      {player.is_elite && <Star className="w-6 h-6 text-neon-volt fill-neon-volt" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-body text-white/60">{player.games_played || 0} Games Played</span>
                      <span className="font-heading font-bold text-neon-volt">{player.fantasy_points?.toFixed(1)} FP</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-white/10 text-white/80">{player.team}</Badge>
                      {player.roblox_id && (
                        <Badge className="bg-sky-500/20 text-sky-400">Roblox: {player.roblox_id}</Badge>
                      )}
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-6 md:px-12 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs text-white/40 uppercase">Fantasy Pts</span>
                  <Zap className="w-4 h-4 text-neon-volt" />
                </div>
                <div className="font-heading font-black text-3xl text-neon-volt">{player.fantasy_points?.toFixed(1)}</div>
                <div className="font-body text-xs text-white/50 mt-1">{((player.fantasy_points || 0) / (player.games_played || 1)).toFixed(1)} avg/game</div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs text-white/40 uppercase">Games</span>
                  <Activity className="w-4 h-4 text-teal-400" />
                </div>
                <div className="font-heading font-black text-3xl text-teal-400">{player.games_played || 0}</div>
                <div className="font-body text-xs text-white/50 mt-1">This season</div>
              </CardContent>
            </Card>
            {player.position === 'QB' && (
              <>
                <Card className="glass-panel border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs text-white/40 uppercase">Pass Yards</span>
                      <Target className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="font-heading font-black text-3xl text-orange-400">{player.passing?.yards?.toLocaleString() || 0}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{player.passing?.touchdowns || 0} TD • {player.passing?.interceptions || 0} INT</div>
                  </CardContent>
                </Card>
                <Card className="glass-panel border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs text-white/40 uppercase">Rating</span>
                      <TrendingUp className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="font-heading font-black text-3xl text-sky-400">{player.passing?.rating?.toFixed(1) || 0}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{player.passing?.completion_pct?.toFixed(1) || 0}% Comp</div>
                  </CardContent>
                </Card>
              </>
            )}
            {player.position === 'RB' && (
              <>
                <Card className="glass-panel border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs text-white/40 uppercase">Rush Yards</span>
                      <Target className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="font-heading font-black text-3xl text-sky-400">{player.rushing?.yards?.toLocaleString() || 0}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{player.rushing?.touchdowns || 0} TD</div>
                  </CardContent>
                </Card>
                <Card className="glass-panel border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs text-white/40 uppercase">YPC</span>
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="font-heading font-black text-3xl text-orange-400">{player.rushing?.yards_per_carry?.toFixed(1) || 0}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{player.rushing?.attempts || 0} attempts</div>
                  </CardContent>
                </Card>
              </>
            )}
            {player.position === 'WR' && (
              <>
                <Card className="glass-panel border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs text-white/40 uppercase">Rec Yards</span>
                      <Target className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="font-heading font-black text-3xl text-teal-400">{player.receiving?.yards?.toLocaleString() || 0}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{player.receiving?.touchdowns || 0} TD</div>
                  </CardContent>
                </Card>
                <Card className="glass-panel border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs text-white/40 uppercase">Receptions</span>
                      <Activity className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="font-heading font-black text-3xl text-orange-400">{player.receiving?.receptions || 0}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{player.receiving?.drops || 0} drops</div>
                  </CardContent>
                </Card>
              </>
            )}
            {player.position === 'DEF' && (
              <>
                <Card className="glass-panel border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs text-white/40 uppercase">Tackles</span>
                      <Shield className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="font-heading font-black text-3xl text-red-400">{player.defense?.tackles || 0}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{player.defense?.tackles_for_loss || 0} TFL</div>
                  </CardContent>
                </Card>
                <Card className="glass-panel border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs text-white/40 uppercase">Sacks</span>
                      <Zap className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="font-heading font-black text-3xl text-orange-400">{player.defense?.sacks || 0}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{player.defense?.interceptions || 0} INT</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="px-6 md:px-12 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Radar */}
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
                      <PolarAngleAxis dataKey="stat" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} tickCount={5} />
                      <Radar name="Stats" dataKey="value" stroke="#CCFF00" fill="#CCFF00" fillOpacity={0.3} strokeWidth={2} />
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
                    <BarChart data={player.weekly_scores || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="week" stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `W${v}`} />
                      <YAxis stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value} pts`, 'Fantasy Points']}
                        labelFormatter={(v) => `Week ${v}`}
                      />
                      <Bar dataKey="points" fill="#40E0D0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="px-6 md:px-12 py-6">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                Season Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs value={activeStatsTab} onValueChange={setActiveStatsTab}>
                <TabsList className="bg-transparent flex gap-2 h-auto p-0 mb-6">
                  <TabsTrigger value="passing" className="px-4 py-2 rounded-lg font-heading font-bold text-sm uppercase data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60">
                    Passing
                  </TabsTrigger>
                  <TabsTrigger value="rushing" className="px-4 py-2 rounded-lg font-heading font-bold text-sm uppercase data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60">
                    Rushing
                  </TabsTrigger>
                  <TabsTrigger value="receiving" className="px-4 py-2 rounded-lg font-heading font-bold text-sm uppercase data-[state=active]:bg-teal-500 data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60">
                    Receiving
                  </TabsTrigger>
                  <TabsTrigger value="defense" className="px-4 py-2 rounded-lg font-heading font-bold text-sm uppercase data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60">
                    Defense
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="passing">{renderStatsTable(player.passing, 'passing')}</TabsContent>
                <TabsContent value="rushing">{renderStatsTable(player.rushing, 'rushing')}</TabsContent>
                <TabsContent value="receiving">{renderStatsTable(player.receiving, 'receiving')}</TabsContent>
                <TabsContent value="defense">{renderStatsTable(player.defense, 'defense')}</TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game Log */}
      <div className="px-6 md:px-12 py-6 pb-12">
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
                      <th className="p-4 text-left font-heading font-bold text-neon-blue uppercase tracking-wider text-sm">Week</th>
                      <th className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Team</th>
                      <th className="p-4 text-right font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Fantasy Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(player.weekly_scores || []).map((week, idx) => (
                      <tr key={idx} className="border-b border-white/5 table-row-hover">
                        <td className="p-4">
                          <span className="font-heading font-bold text-neon-blue">Week {week.week}</span>
                        </td>
                        <td className="p-4">
                          <Badge className="bg-white/10 text-white/80">{player.team}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`font-heading font-bold text-lg ${week.points > ((player.fantasy_points || 0) / (player.games_played || 1)) ? 'text-neon-volt' : 'text-white'}`}>
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
