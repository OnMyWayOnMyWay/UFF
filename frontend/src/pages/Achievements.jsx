import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Swords, Trophy, ChevronRight, Lock, Unlock, Target, Crown, Flame, Star, Zap, Award, Medal, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

import API from '../lib/api';

// Achievement definitions
const ACHIEVEMENTS = [
  // Scoring
  { id: 'scorer_100', name: 'Century Club', description: 'Score 100+ fantasy points', icon: Star, color: '#CCFF00', category: 'scoring', threshold: 100, stat: 'fantasy_points' },
  { id: 'scorer_200', name: 'Double Trouble', description: 'Score 200+ fantasy points', icon: Star, color: '#F97316', category: 'scoring', threshold: 200, stat: 'fantasy_points' },
  { id: 'scorer_300', name: 'Triple Threat', description: 'Score 300+ fantasy points', icon: Star, color: '#EF4444', category: 'scoring', threshold: 300, stat: 'fantasy_points' },
  { id: 'scorer_400', name: 'Legendary', description: 'Score 400+ fantasy points', icon: Crown, color: '#8B5CF6', category: 'scoring', threshold: 400, stat: 'fantasy_points' },
  
  // Passing
  { id: 'pass_3000', name: 'Gunslinger', description: '3,000+ passing yards', icon: Target, color: '#3B82F6', category: 'passing', threshold: 3000, stat: 'passing.yards' },
  { id: 'pass_4000', name: 'Air Raid', description: '4,000+ passing yards', icon: Target, color: '#06B6D4', category: 'passing', threshold: 4000, stat: 'passing.yards' },
  { id: 'pass_td_25', name: 'TD Machine', description: '25+ passing touchdowns', icon: Zap, color: '#22C55E', category: 'passing', threshold: 25, stat: 'passing.touchdowns' },
  { id: 'pass_td_35', name: 'TD King', description: '35+ passing touchdowns', icon: Crown, color: '#FBBF24', category: 'passing', threshold: 35, stat: 'passing.touchdowns' },
  { id: 'qb_rating', name: 'Precision', description: '110+ QB Rating', icon: Target, color: '#EC4899', category: 'passing', threshold: 110, stat: 'passing.rating' },
  
  // Rushing
  { id: 'rush_1000', name: '1K Club', description: '1,000+ rushing yards', icon: Flame, color: '#F97316', category: 'rushing', threshold: 1000, stat: 'rushing.yards' },
  { id: 'rush_1500', name: 'Ground Pounder', description: '1,500+ rushing yards', icon: Flame, color: '#DC2626', category: 'rushing', threshold: 1500, stat: 'rushing.yards' },
  { id: 'rush_td_10', name: 'Goal Line Hero', description: '10+ rushing TDs', icon: Zap, color: '#10B981', category: 'rushing', threshold: 10, stat: 'rushing.touchdowns' },
  { id: 'rush_td_15', name: 'Touchdown Terror', description: '15+ rushing TDs', icon: Crown, color: '#14B8A6', category: 'rushing', threshold: 15, stat: 'rushing.touchdowns' },
  
  // Receiving
  { id: 'rec_1000', name: 'Sticky Hands', description: '1,000+ receiving yards', icon: TrendingUp, color: '#8B5CF6', category: 'receiving', threshold: 1000, stat: 'receiving.yards' },
  { id: 'rec_1500', name: 'Elite Receiver', description: '1,500+ receiving yards', icon: TrendingUp, color: '#A855F7', category: 'receiving', threshold: 1500, stat: 'receiving.yards' },
  { id: 'rec_td_10', name: 'Red Zone Target', description: '10+ receiving TDs', icon: Target, color: '#F472B6', category: 'receiving', threshold: 10, stat: 'receiving.touchdowns' },
  { id: 'rec_100', name: 'Chain Mover', description: '100+ receptions', icon: Award, color: '#38BDF8', category: 'receiving', threshold: 100, stat: 'receiving.receptions' },
  
  // Defense
  { id: 'def_tackles_50', name: 'Tackler', description: '50+ tackles', icon: Shield, color: '#EF4444', category: 'defense', threshold: 50, stat: 'defense.tackles' },
  { id: 'def_tackles_80', name: 'Ballhawk', description: '80+ tackles', icon: Shield, color: '#DC2626', category: 'defense', threshold: 80, stat: 'defense.tackles' },
  { id: 'def_sacks_8', name: 'Sack Artist', description: '8+ sacks', icon: Zap, color: '#F97316', category: 'defense', threshold: 8, stat: 'defense.sacks' },
  { id: 'def_sacks_12', name: 'QB Hunter', description: '12+ sacks', icon: Flame, color: '#EF4444', category: 'defense', threshold: 12, stat: 'defense.sacks' },
  { id: 'def_int_3', name: 'Pickpocket', description: '3+ interceptions', icon: Target, color: '#3B82F6', category: 'defense', threshold: 3, stat: 'defense.interceptions' },
  
  // Special
  { id: 'elite', name: 'Elite Status', description: 'Marked as Elite player', icon: Crown, color: '#CCFF00', category: 'special', threshold: 1, stat: 'is_elite' },
  { id: 'games_8', name: 'Iron Man', description: 'Played all 8 games', icon: Medal, color: '#64748B', category: 'special', threshold: 8, stat: 'games_played' },
];

const Achievements = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await axios.get(`${API}/players?limit=100`);
        setPlayers(res.data);
        if (res.data.length > 0) {
          setSelectedPlayer(res.data[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const getStatValue = (player, statPath) => {
    const parts = statPath.split('.');
    let value = player;
    for (const part of parts) {
      value = value?.[part];
    }
    return value || 0;
  };

  const checkAchievement = (player, achievement) => {
    const value = getStatValue(player, achievement.stat);
    if (achievement.stat === 'is_elite') return value === true;
    return value >= achievement.threshold;
  };

  const getPlayerAchievements = (player) => {
    return ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: checkAchievement(player, ach),
      progress: Math.min(100, (getStatValue(player, ach.stat) / ach.threshold) * 100)
    }));
  };

  const playerAchievements = selectedPlayer ? getPlayerAchievements(selectedPlayer) : [];
  const unlockedCount = playerAchievements.filter(a => a.unlocked).length;
  const categories = ['all', 'scoring', 'passing', 'rushing', 'receiving', 'defense', 'special'];

  const filteredAchievements = filter === 'all' 
    ? playerAchievements 
    : playerAchievements.filter(a => a.category === filter);

  const getPositionColor = (pos) => {
    const colors = { QB: '#F97316', WR: '#14B8A6', RB: '#3B82F6', DEF: '#EF4444', K: '#8B5CF6', TE: '#10B981' };
    return colors[pos] || '#6B7280';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-neon-volt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="achievements-page" className="min-h-screen">
      {/* Header */}
      <div className="hero-bg px-6 md:px-12 pt-8 pb-12">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-neon-volt" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Player Milestones</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tight">
            <span className="text-white">ACHIEVEMENT</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-volt to-neon-blue">TRACKER</span>
          </h1>
          <p className="text-white/50 mt-3">Track player milestones and unlock achievements</p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 -mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Player List */}
            <div className="lg:col-span-1">
              <Card className="glass-panel border-white/10 sticky top-4">
                <CardHeader className="border-b border-white/5 py-3">
                  <CardTitle className="font-heading font-bold text-sm uppercase">Select Player</CardTitle>
                </CardHeader>
                <CardContent className="p-2 max-h-[500px] overflow-auto">
                  {players.map(player => {
                    const unlocked = getPlayerAchievements(player).filter(a => a.unlocked).length;
                    return (
                      <button
                        key={player.id}
                        onClick={() => setSelectedPlayer(player)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left ${
                          selectedPlayer?.id === player.id ? 'bg-neon-volt/20 border border-neon-volt/30' : 'hover:bg-white/5'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: getPositionColor(player.position) }}
                        >
                          {player.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm truncate">{player.roblox_username || player.name}</div>
                          <div className="text-white/40 text-xs">{unlocked}/{ACHIEVEMENTS.length} unlocked</div>
                        </div>
                        {unlocked > 10 && <Crown className="w-4 h-4 text-neon-volt" />}
                      </button>
                    );
                  })}
                  {players.length === 0 && (
                    <div className="p-4 text-center text-white/40">No players found</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Achievements */}
            <div className="lg:col-span-3 space-y-6">
              {selectedPlayer && (
                <>
                  {/* Player Header */}
                  <Card className="glass-panel border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white"
                          style={{ backgroundColor: getPositionColor(selectedPlayer.position) }}
                        >
                          {selectedPlayer.image ? (
                            <img src={selectedPlayer.image} alt="" className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                            selectedPlayer.roblox_username?.charAt(0) || '?'
                          )}
                        </div>
                        <div className="flex-1">
                          <h2 className="font-heading font-black text-2xl text-white">
                            {selectedPlayer.roblox_username || selectedPlayer.name}
                          </h2>
                          <p className="text-white/50">{selectedPlayer.team} · {selectedPlayer.position}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="text-neon-volt font-bold">{selectedPlayer.fantasy_points?.toFixed(1)} FP</div>
                            <Badge className="bg-white/10">
                              <Trophy className="w-3 h-3 mr-1" />
                              {unlockedCount}/{ACHIEVEMENTS.length} Achievements
                            </Badge>
                          </div>
                        </div>
                        {/* Progress Ring */}
                        <div className="relative w-24 h-24">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="48" cy="48" r="40" fill="none" stroke="#ffffff10" strokeWidth="8" />
                            <circle 
                              cx="48" cy="48" r="40" fill="none" stroke="#CCFF00" strokeWidth="8"
                              strokeDasharray={`${(unlockedCount / ACHIEVEMENTS.length) * 251.2} 251.2`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-heading font-black text-2xl text-white">{Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Filters */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-all ${
                          filter === cat ? 'bg-neon-volt text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Achievements Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAchievements.map((ach, idx) => {
                      const Icon = ach.icon;
                      return (
                        <Card 
                          key={ach.id}
                          className={`glass-panel overflow-hidden transition-all duration-300 ${
                            ach.unlocked 
                              ? 'border-2' 
                              : 'border-white/10 opacity-60 grayscale'
                          }`}
                          style={{ 
                            borderColor: ach.unlocked ? ach.color : undefined,
                            animationDelay: `${idx * 50}ms`
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div 
                                className={`w-12 h-12 rounded-xl flex items-center justify-center relative ${
                                  ach.unlocked ? '' : 'bg-white/10'
                                }`}
                                style={{ backgroundColor: ach.unlocked ? `${ach.color}30` : undefined }}
                              >
                                {ach.unlocked ? (
                                  <>
                                    <Icon className="w-6 h-6" style={{ color: ach.color }} />
                                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                      <Unlock className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <Lock className="w-5 h-5 text-white/30" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-heading font-bold text-white">{ach.name}</div>
                                <div className="text-white/50 text-xs mt-0.5">{ach.description}</div>
                                {!ach.unlocked && (
                                  <div className="mt-2">
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${ach.progress}%`, backgroundColor: ach.color }}
                                      />
                                    </div>
                                    <div className="text-white/30 text-xs mt-1">{Math.round(ach.progress)}% complete</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              {!selectedPlayer && players.length === 0 && (
                <Card className="glass-panel border-white/10 border-dashed">
                  <CardContent className="p-12 text-center">
                    <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-xl text-white/50">No Players Yet</h3>
                    <p className="text-white/30 mt-2">Add players via the Admin Panel to track achievements</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
