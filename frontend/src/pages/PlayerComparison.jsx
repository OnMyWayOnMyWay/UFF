import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Users, ArrowLeftRight, Trophy, Zap, Target, Shield, Star, ChevronDown, X, Search, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlayerComparison = () => {
  const [players, setPlayers] = useState([]);
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  const [dropdown1, setDropdown1] = useState(false);
  const [dropdown2, setDropdown2] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animateRadar, setAnimateRadar] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await axios.get(`${API}/players?limit=100`);
        setPlayers(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (player1 && player2) {
      setAnimateRadar(false);
      setTimeout(() => setAnimateRadar(true), 100);
    }
  }, [player1, player2]);

  const getPositionColor = (pos) => {
    const colors = { QB: '#F97316', WR: '#14B8A6', RB: '#3B82F6', DEF: '#EF4444', K: '#8B5CF6', TE: '#10B981' };
    return colors[pos] || '#6B7280';
  };

  const filteredPlayers1 = players.filter(p => 
    p.roblox_username?.toLowerCase().includes(search1.toLowerCase()) ||
    p.name?.toLowerCase().includes(search1.toLowerCase())
  );
  
  const filteredPlayers2 = players.filter(p => 
    p.roblox_username?.toLowerCase().includes(search2.toLowerCase()) ||
    p.name?.toLowerCase().includes(search2.toLowerCase())
  );

  const getRadarData = () => {
    if (!player1 || !player2) return [];
    
    const normalize = (val, max) => Math.min((val / max) * 100, 100);
    
    const stats = [
      { stat: 'Fantasy Pts', p1: normalize(player1.fantasy_points || 0, 450), p2: normalize(player2.fantasy_points || 0, 450), fullMark: 100 },
      { stat: 'Pass YDS', p1: normalize(player1.passing?.yards || 0, 5000), p2: normalize(player2.passing?.yards || 0, 5000), fullMark: 100 },
      { stat: 'Rush YDS', p1: normalize(player1.rushing?.yards || 0, 1500), p2: normalize(player2.rushing?.yards || 0, 1500), fullMark: 100 },
      { stat: 'Rec YDS', p1: normalize(player1.receiving?.yards || 0, 1800), p2: normalize(player2.receiving?.yards || 0, 1800), fullMark: 100 },
      { stat: 'TDs', p1: normalize(getTotalTDs(player1), 45), p2: normalize(getTotalTDs(player2), 45), fullMark: 100 },
      { stat: 'Defense', p1: normalize(getDefenseScore(player1), 200), p2: normalize(getDefenseScore(player2), 200), fullMark: 100 },
    ];
    return stats;
  };

  const getTotalTDs = (player) => {
    return (player.passing?.touchdowns || 0) + (player.rushing?.touchdowns || 0) + 
           (player.receiving?.touchdowns || 0) + (player.defense?.td || 0);
  };

  const getDefenseScore = (player) => {
    const d = player.defense || {};
    return (d.tackles || 0) + (d.sacks || 0) * 2 + (d.interceptions || 0) * 3 + (d.td || 0) * 6;
  };

  const getComparisonBars = () => {
    if (!player1 || !player2) return [];
    return [
      { name: 'Fantasy Pts', p1: player1.fantasy_points || 0, p2: player2.fantasy_points || 0 },
      { name: 'Games', p1: player1.games_played || 0, p2: player2.games_played || 0 },
      { name: 'Total TDs', p1: getTotalTDs(player1), p2: getTotalTDs(player2) },
      { name: 'Total YDS', p1: (player1.passing?.yards || 0) + (player1.rushing?.yards || 0) + (player1.receiving?.yards || 0), 
                          p2: (player2.passing?.yards || 0) + (player2.rushing?.yards || 0) + (player2.receiving?.yards || 0) },
    ];
  };

  const getWinner = (stat, p1Val, p2Val) => {
    if (p1Val > p2Val) return 1;
    if (p2Val > p1Val) return 2;
    return 0;
  };

  const PlayerSelector = ({ player, setPlayer, search, setSearch, dropdown, setDropdown, filteredPlayers, otherPlayer, label }) => (
    <div className="relative">
      <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">{label}</label>
      {player ? (
        <div className="glass-panel p-4 rounded-xl border border-white/10 relative group">
          <button 
            onClick={() => { setPlayer(null); setSearch(''); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg"
              style={{ backgroundColor: getPositionColor(player.position) }}
            >
              {player.image ? (
                <img src={player.image} alt={player.roblox_username} className="w-full h-full rounded-xl object-cover" />
              ) : (
                player.roblox_username?.charAt(0) || '?'
              )}
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl text-white">{player.roblox_username || player.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge style={{ backgroundColor: getPositionColor(player.position) }}>{player.position}</Badge>
                <span className="text-white/50 text-sm">{player.team}</span>
              </div>
              <div className="text-neon-volt font-bold mt-1">{player.fantasy_points?.toFixed(1)} FP</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search player..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setDropdown(true); }}
              onFocus={() => setDropdown(true)}
              className="pl-10 bg-white/5 border-white/10 h-14 text-lg"
            />
          </div>
          {dropdown && (
            <div className="absolute z-50 w-full mt-2 glass-panel rounded-xl border border-white/10 max-h-64 overflow-auto">
              {filteredPlayers.filter(p => p.id !== otherPlayer?.id).slice(0, 8).map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPlayer(p); setDropdown(false); setSearch(''); }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: getPositionColor(p.position) }}
                  >
                    {p.roblox_username?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="font-heading font-bold text-white">{p.roblox_username || p.name}</div>
                    <div className="text-xs text-white/50">{p.position} · {p.team}</div>
                  </div>
                  <div className="ml-auto text-neon-volt font-bold">{p.fantasy_points?.toFixed(1)}</div>
                </button>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="p-4 text-center text-white/50">No players found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-neon-volt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="comparison-page" className="min-h-screen">
      {/* Header */}
      <div className="hero-bg px-6 md:px-12 pt-8 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ArrowLeftRight className="w-6 h-6 text-neon-volt" />
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Head to Head</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tight">
            <span className="text-white">PLAYER</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-volt to-neon-blue">COMPARISON</span>
          </h1>
          <p className="text-white/50 mt-2">Select two players to compare their stats head-to-head</p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 -mt-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Player Selectors */}
          <div className="grid md:grid-cols-2 gap-6">
            <PlayerSelector
              player={player1}
              setPlayer={setPlayer1}
              search={search1}
              setSearch={setSearch1}
              dropdown={dropdown1}
              setDropdown={setDropdown1}
              filteredPlayers={filteredPlayers1}
              otherPlayer={player2}
              label="Player 1"
            />
            
            <div className="hidden md:flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-neon-volt to-neon-blue flex items-center justify-center">
                <span className="font-heading font-black text-2xl text-black">VS</span>
              </div>
            </div>
            
            <PlayerSelector
              player={player2}
              setPlayer={setPlayer2}
              search={search2}
              setSearch={setSearch2}
              dropdown={dropdown2}
              setDropdown={setDropdown2}
              filteredPlayers={filteredPlayers2}
              otherPlayer={player1}
              label="Player 2"
            />
          </div>

          {/* Comparison Results */}
          {player1 && player2 && (
            <div className={`space-y-6 transition-all duration-700 ${animateRadar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Radar Chart */}
              <Card className="glass-panel border-white/10 overflow-hidden">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2">
                    <Target className="w-5 h-5 text-neon-volt" />
                    Performance Radar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getRadarData()}>
                        <PolarGrid stroke="#ffffff20" />
                        <PolarAngleAxis dataKey="stat" tick={{ fill: '#ffffff80', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name={player1.roblox_username}
                          dataKey="p1"
                          stroke={getPositionColor(player1.position)}
                          fill={getPositionColor(player1.position)}
                          fillOpacity={0.3}
                          strokeWidth={2}
                          animationDuration={1500}
                          animationBegin={0}
                        />
                        <Radar
                          name={player2.roblox_username}
                          dataKey="p2"
                          stroke={getPositionColor(player2.position)}
                          fill={getPositionColor(player2.position)}
                          fillOpacity={0.3}
                          strokeWidth={2}
                          animationDuration={1500}
                          animationBegin={300}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-8 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: getPositionColor(player1.position) }} />
                      <span className="text-white/70">{player1.roblox_username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: getPositionColor(player2.position) }} />
                      <span className="text-white/70">{player2.roblox_username}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stat Bars */}
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2">
                    <Zap className="w-5 h-5 text-neon-blue" />
                    Stat Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {getComparisonBars().map((stat, idx) => {
                    const winner = getWinner(stat.name, stat.p1, stat.p2);
                    const maxVal = Math.max(stat.p1, stat.p2, 1);
                    return (
                      <div key={stat.name} className="space-y-2" style={{ animationDelay: `${idx * 150}ms` }}>
                        <div className="flex justify-between text-sm">
                          <span className={`font-bold ${winner === 1 ? 'text-neon-volt' : 'text-white/60'}`}>
                            {stat.p1.toLocaleString()} {winner === 1 && '👑'}
                          </span>
                          <span className="text-white/50 uppercase tracking-wider text-xs">{stat.name}</span>
                          <span className={`font-bold ${winner === 2 ? 'text-neon-volt' : 'text-white/60'}`}>
                            {winner === 2 && '👑'} {stat.p2.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2 h-3">
                          <div className="flex-1 bg-white/10 rounded-full overflow-hidden flex justify-end">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ 
                                width: `${(stat.p1 / maxVal) * 100}%`,
                                backgroundColor: getPositionColor(player1.position),
                                boxShadow: winner === 1 ? `0 0 20px ${getPositionColor(player1.position)}` : 'none'
                              }}
                            />
                          </div>
                          <div className="flex-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ 
                                width: `${(stat.p2 / maxVal) * 100}%`,
                                backgroundColor: getPositionColor(player2.position),
                                boxShadow: winner === 2 ? `0 0 20px ${getPositionColor(player2.position)}` : 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Detailed Stats */}
              <div className="grid md:grid-cols-2 gap-6">
                {[player1, player2].map((player, idx) => (
                  <Card key={player.id} className="glass-panel border-white/10">
                    <CardHeader className="border-b border-white/5">
                      <CardTitle className="font-heading font-bold flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: getPositionColor(player.position) }}
                        >
                          {player.roblox_username?.charAt(0)}
                        </div>
                        {player.roblox_username}'s Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {player.position === 'QB' && (
                        <>
                          <StatRow label="Completions" value={player.passing?.completions} />
                          <StatRow label="Pass Yards" value={player.passing?.yards} />
                          <StatRow label="Pass TDs" value={player.passing?.touchdowns} />
                          <StatRow label="INTs" value={player.passing?.interceptions} bad />
                          <StatRow label="Rating" value={player.passing?.rating?.toFixed(1)} />
                        </>
                      )}
                      {(player.position === 'RB' || player.rushing?.yards > 0) && (
                        <>
                          <StatRow label="Rush Yards" value={player.rushing?.yards} />
                          <StatRow label="Rush TDs" value={player.rushing?.touchdowns} />
                          <StatRow label="YPC" value={player.rushing?.yards_per_carry?.toFixed(1)} />
                        </>
                      )}
                      {(player.position === 'WR' || player.position === 'TE' || player.receiving?.yards > 0) && (
                        <>
                          <StatRow label="Receptions" value={player.receiving?.receptions} />
                          <StatRow label="Rec Yards" value={player.receiving?.yards} />
                          <StatRow label="Rec TDs" value={player.receiving?.touchdowns} />
                        </>
                      )}
                      {player.position === 'DEF' && (
                        <>
                          <StatRow label="Tackles" value={player.defense?.tackles} />
                          <StatRow label="Sacks" value={player.defense?.sacks} />
                          <StatRow label="INTs" value={player.defense?.interceptions} />
                          <StatRow label="Def TDs" value={player.defense?.td} />
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Verdict */}
              <Card className="glass-panel border-neon-volt/30 bg-gradient-to-r from-neon-volt/10 to-transparent">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-8 h-8 text-neon-volt mx-auto mb-3" />
                  <h3 className="font-heading font-bold text-2xl text-white mb-2">
                    {player1.fantasy_points > player2.fantasy_points 
                      ? `${player1.roblox_username} Wins!`
                      : player2.fantasy_points > player1.fantasy_points
                        ? `${player2.roblox_username} Wins!`
                        : "It's a Tie!"}
                  </h3>
                  <p className="text-white/60">
                    {player1.fantasy_points > player2.fantasy_points 
                      ? `${player1.roblox_username} leads by ${(player1.fantasy_points - player2.fantasy_points).toFixed(1)} fantasy points`
                      : player2.fantasy_points > player1.fantasy_points
                        ? `${player2.roblox_username} leads by ${(player2.fantasy_points - player1.fantasy_points).toFixed(1)} fantasy points`
                        : "Both players are evenly matched!"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {(!player1 || !player2) && (
            <Card className="glass-panel border-white/10 border-dashed">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="font-heading font-bold text-xl text-white/50 mb-2">Select Two Players</h3>
                <p className="text-white/30">Choose players above to see their head-to-head comparison</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value, bad }) => (
  <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
    <span className="text-white/50 text-sm">{label}</span>
    <span className={`font-heading font-bold ${bad ? 'text-red-400' : 'text-white'}`}>
      {value?.toLocaleString() || 0}
    </span>
  </div>
);

export default PlayerComparison;
