import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Star, Award, TrendingUp, User } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import API from '../lib/api';

const ElitePlayers = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchElitePlayers = async () => {
      try {
        const response = await axios.get(`${API}/players?elite_only=true`);
        setPlayers(response.data);
      } catch (error) {
        console.error('Error fetching elite players:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchElitePlayers();
  }, []);

  const getPositionColor = (pos) => {
    const colors = {
      QB: 'bg-orange-500',
      WR: 'bg-teal-500',
      RB: 'bg-sky-500',
      TE: 'bg-emerald-500',
      K: 'bg-purple-500',
      DEF: 'bg-red-500'
    };
    return colors[pos] || 'bg-gray-500';
  };

  const getStatLabel = (pos) => {
    switch (pos) {
      case 'QB': return 'Pass YDS';
      case 'WR': case 'TE': return 'Rec YDS';
      case 'RB': return 'Rush YDS';
      case 'K': return 'FG Made';
      case 'DEF': return 'Tackles';
      default: return 'Stats';
    }
  };

  const getMainStat = (player) => {
    switch (player.position) {
      case 'QB': return player.passing?.yards?.toLocaleString() || '0';
      case 'WR': case 'TE': return player.receiving?.yards?.toLocaleString() || '0';
      case 'RB': return player.rushing?.yards?.toLocaleString() || '0';
      case 'K': return player.kicking?.field_goals || '0';
      case 'DEF': return player.defense?.tackles || '0';
      default: return '-';
    }
  };

  const getTouchdowns = (player) => {
    const passingTDs = player.passing?.touchdowns || 0;
    const rushingTDs = player.rushing?.touchdowns || 0;
    const receivingTDs = player.receiving?.touchdowns || 0;
    const defenseTDs = player.defense?.td || 0;
    return passingTDs + rushingTDs + receivingTDs + defenseTDs;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="elite-players-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Star className="w-6 h-6 text-neon-volt" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Season Leaders</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            ELITE <span className="text-neon-volt">PLAYERS</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            The top performers dominating the league this season.
          </p>
        </div>
      </div>

      {/* Players Grid */}
      <div className="px-6 md:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player, idx) => (
              <Link
                to={`/player/${player.id}`}
                key={player.id}
                data-testid={`elite-player-card-${idx}`}
                className="group relative glass-panel rounded-xl overflow-hidden hover:-translate-y-2 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Card shine overlay */}
                <div className="absolute inset-0 card-shine opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Elite badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-1 bg-neon-volt/20 text-neon-volt px-2 py-1 rounded-full">
                    <Award className="w-3 h-3" />
                    <span className="font-body text-xs font-semibold">ELITE</span>
                  </div>
                </div>

                {/* Player Avatar */}
                <div className="relative h-32 bg-gradient-to-br from-white/10 to-transparent flex items-end justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                  {player.image ? (
                    <img 
                      src={player.image} 
                      alt={player.name} 
                      className="relative w-20 h-20 rounded-full object-cover mb-4 border-2 border-white/10"
                    />
                  ) : (
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center mb-4 border-2 border-white/10">
                      <User className="w-10 h-10 text-white/50" />
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-6">
                  <Badge className={`${getPositionColor(player.position)} text-white text-xs mb-3`}>
                    {player.position}
                  </Badge>
                  <h3 className="font-heading font-bold text-2xl text-white mb-1">{player.name || player.roblox_username}</h3>
                  <p className="font-body text-sm text-white/50 mb-4">{player.team}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Fantasy Pts</div>
                      <div className="font-heading font-black text-2xl text-neon-blue">
                        {player.fantasy_points?.toFixed(1) || '0.0'}
                      </div>
                    </div>
                    <div>
                      <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">{getStatLabel(player.position)}</div>
                      <div className="font-heading font-black text-2xl text-white">
                        {getMainStat(player)}
                      </div>
                    </div>
                  </div>

                  {/* TDs */}
                  <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-white/5">
                    <TrendingUp className="w-4 h-4 text-neon-volt" />
                    <span className="font-body text-sm text-white/70">
                      {getTouchdowns(player)} Touchdowns
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElitePlayers;
