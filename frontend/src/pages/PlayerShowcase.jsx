import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Star, Trophy, Flame, Zap, Eye, Crown, Sparkles } from 'lucide-react';
import { Badge } from '../components/ui/badge';

import API from '../lib/api';

const PlayerShowcase = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState({});

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await axios.get(`${API}/players?elite_only=true&limit=12`);
        setPlayers(res.data);
      } catch (err) {
        // Fallback to all players if elite filter fails
        try {
          const res = await axios.get(`${API}/players?limit=12`);
          setPlayers(res.data.slice(0, 12));
        } catch (e) {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getPositionColor = (pos) => {
    const colors = { QB: '#F97316', WR: '#14B8A6', RB: '#3B82F6', DEF: '#EF4444', K: '#8B5CF6', TE: '#10B981' };
    return colors[pos] || '#6B7280';
  };

  const getPositionGradient = (pos) => {
    const gradients = {
      QB: 'from-orange-600 to-orange-900',
      WR: 'from-teal-600 to-teal-900',
      RB: 'from-blue-600 to-blue-900',
      DEF: 'from-red-600 to-red-900',
      K: 'from-purple-600 to-purple-900',
      TE: 'from-emerald-600 to-emerald-900'
    };
    return gradients[pos] || 'from-gray-600 to-gray-900';
  };

  const getTotalTDs = (player) => {
    return (player.passing?.touchdowns || 0) + (player.rushing?.touchdowns || 0) + 
           (player.receiving?.touchdowns || 0) + (player.defense?.td || 0);
  };

  const getMainStat = (player) => {
    switch (player.position) {
      case 'QB': return { label: 'Pass YDS', value: player.passing?.yards || 0 };
      case 'RB': return { label: 'Rush YDS', value: player.rushing?.yards || 0 };
      case 'WR': case 'TE': return { label: 'Rec YDS', value: player.receiving?.yards || 0 };
      case 'DEF': return { label: 'Tackles', value: player.defense?.tackles || 0 };
      default: return { label: 'FP', value: player.fantasy_points || 0 };
    }
  };

  const getBadges = (player) => {
    const badges = [];
    if (player.is_elite) badges.push({ icon: Crown, label: 'Elite', color: 'text-yellow-400' });
    if (player.fantasy_points >= 300) badges.push({ icon: Flame, label: 'On Fire', color: 'text-orange-400' });
    if (getTotalTDs(player) >= 25) badges.push({ icon: Zap, label: 'TD King', color: 'text-blue-400' });
    if (player.passing?.rating >= 110) badges.push({ icon: Star, label: 'MVP', color: 'text-neon-volt' });
    return badges;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-neon-volt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="showcase-page" className="min-h-screen">
      {/* Header */}
      <div className="hero-bg px-6 md:px-12 pt-8 pb-16">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-neon-volt" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Interactive Cards</span>
            <Sparkles className="w-6 h-6 text-neon-volt" />
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tight">
            <span className="text-white">PLAYER</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-volt via-neon-blue to-neon-volt animate-gradient">SHOWCASE</span>
          </h1>
          <p className="text-white/50 mt-3 text-lg">Hover or tap cards to reveal detailed stats</p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 -mt-12">
        <div className="max-w-7xl mx-auto">
          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player, idx) => (
              <div
                key={player.id}
                className="perspective-1000 h-[380px] cursor-pointer group"
                onClick={() => toggleFlip(player.id)}
                onMouseEnter={() => setFlippedCards(prev => ({ ...prev, [player.id]: true }))}
                onMouseLeave={() => setFlippedCards(prev => ({ ...prev, [player.id]: false }))}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div 
                  className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
                    flippedCards[player.id] ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front of Card */}
                  <div className="absolute inset-0 backface-hidden">
                    <div className={`h-full rounded-2xl bg-gradient-to-br ${getPositionGradient(player.position)} p-1 shadow-2xl`}>
                      <div className="h-full rounded-xl bg-[#0a0a0a] overflow-hidden relative">
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Position Badge */}
                        <div 
                          className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold text-white"
                          style={{ backgroundColor: getPositionColor(player.position) }}
                        >
                          {player.position}
                        </div>

                        {/* Player Avatar */}
                        <div className="pt-8 px-6">
                          <div 
                            className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center text-5xl font-black text-white shadow-2xl relative overflow-hidden"
                            style={{ backgroundColor: getPositionColor(player.position) }}
                          >
                            {player.image ? (
                              <img src={player.image} alt={player.roblox_username} className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                                {player.roblox_username?.charAt(0) || '?'}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Player Info */}
                        <div className="p-6 text-center">
                          <h3 className="font-heading font-black text-xl text-white truncate">
                            {player.roblox_username || player.name}
                          </h3>
                          <p className="text-white/50 text-sm mt-1">{player.team}</p>
                          
                          {/* Badges */}
                          <div className="flex justify-center gap-2 mt-3 flex-wrap">
                            {getBadges(player).map((badge, i) => (
                              <div 
                                key={i}
                                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-xs"
                              >
                                <badge.icon className={`w-3 h-3 ${badge.color}`} />
                                <span className={badge.color}>{badge.label}</span>
                              </div>
                            ))}
                          </div>

                          {/* Fantasy Points */}
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-4xl font-black text-neon-volt">
                              {player.fantasy_points?.toFixed(1)}
                            </div>
                            <div className="text-white/40 text-xs uppercase tracking-wider">Fantasy Points</div>
                          </div>
                        </div>

                        {/* Flip Hint */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-white/30 text-xs">
                          <Eye className="w-3 h-3" />
                          <span>Hover for stats</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back of Card */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180">
                    <div className={`h-full rounded-2xl bg-gradient-to-br ${getPositionGradient(player.position)} p-1 shadow-2xl`}>
                      <div className="h-full rounded-xl bg-[#0a0a0a] overflow-hidden p-6 flex flex-col">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
                            style={{ backgroundColor: getPositionColor(player.position) }}
                          >
                            {player.roblox_username?.charAt(0) || '?'}
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-white">{player.roblox_username}</h3>
                            <p className="text-white/50 text-xs">{player.team}</p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 space-y-3">
                          <StatBar label="Fantasy Pts" value={player.fantasy_points || 0} max={450} color={getPositionColor(player.position)} />
                          
                          {player.position === 'QB' && (
                            <>
                              <StatBar label="Pass YDS" value={player.passing?.yards || 0} max={5000} color="#F97316" />
                              <StatBar label="Pass TD" value={player.passing?.touchdowns || 0} max={45} color="#22C55E" />
                              <StatBar label="Rating" value={player.passing?.rating || 0} max={158.3} color="#3B82F6" />
                            </>
                          )}
                          {player.position === 'RB' && (
                            <>
                              <StatBar label="Rush YDS" value={player.rushing?.yards || 0} max={1800} color="#3B82F6" />
                              <StatBar label="Rush TD" value={player.rushing?.touchdowns || 0} max={20} color="#22C55E" />
                              <StatBar label="YPC" value={player.rushing?.yards_per_carry || 0} max={7} color="#8B5CF6" />
                            </>
                          )}
                          {(player.position === 'WR' || player.position === 'TE') && (
                            <>
                              <StatBar label="Rec YDS" value={player.receiving?.yards || 0} max={2000} color="#14B8A6" />
                              <StatBar label="Rec TD" value={player.receiving?.touchdowns || 0} max={18} color="#22C55E" />
                              <StatBar label="Catches" value={player.receiving?.receptions || 0} max={130} color="#3B82F6" />
                            </>
                          )}
                          {player.position === 'DEF' && (
                            <>
                              <StatBar label="Tackles" value={player.defense?.tackles || 0} max={150} color="#EF4444" />
                              <StatBar label="Sacks" value={player.defense?.sacks || 0} max={20} color="#F97316" />
                              <StatBar label="INTs" value={player.defense?.interceptions || 0} max={10} color="#3B82F6" />
                            </>
                          )}
                        </div>

                        {/* View Profile Link */}
                        <Link 
                          to={`/player/${player.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-4 block w-full py-2 rounded-lg bg-gradient-to-r from-neon-volt to-neon-blue text-center text-black font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                          View Full Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {players.length === 0 && (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-heading font-bold text-xl text-white/50">No Players Yet</h3>
              <p className="text-white/30 mt-2">Add players via the Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom CSS for 3D effects */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

const StatBar = ({ label, value, max, color }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/50">{label}</span>
        <span className="text-white font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}50`
          }}
        />
      </div>
    </div>
  );
};

export default PlayerShowcase;
