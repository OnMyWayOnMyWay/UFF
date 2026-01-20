import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, Trophy, Zap, Target, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatLeaders = () => {
  const [leaders, setLeaders] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const response = await axios.get(`${API}/stat-leaders`);
        setLeaders(response.data);
      } catch (error) {
        console.error('Error fetching stat leaders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
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

  const categories = [
    { key: 'fantasy_points', title: 'Fantasy Points', icon: Trophy, color: 'text-neon-volt', stat: 'fantasy_points', format: (v) => v?.toFixed(1) },
    { key: 'passing_yards', title: 'Passing Yards', icon: Target, color: 'text-orange-500', stat: 'passing_yards', format: (v) => v?.toLocaleString() },
    { key: 'rushing_yards', title: 'Rushing Yards', icon: Zap, color: 'text-sky-500', stat: 'rushing_yards', format: (v) => v?.toLocaleString() },
    { key: 'receiving_yards', title: 'Receiving Yards', icon: TrendingUp, color: 'text-teal-500', stat: 'receiving_yards', format: (v) => v?.toLocaleString() },
    { key: 'touchdowns', title: 'Touchdowns', icon: Trophy, color: 'text-neon-blue', stat: 'touchdowns', format: (v) => v },
    { key: 'sacks', title: 'Sacks (DEF)', icon: Shield, color: 'text-red-500', stat: 'sacks', format: (v) => v },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="stat-leaders-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <TrendingUp className="w-6 h-6 text-neon-blue" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">League Leaders</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            STAT <span className="text-neon-blue">LEADERS</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            Top performers in every major statistical category.
          </p>
        </div>
      </div>

      {/* Leaders Grid */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, catIdx) => {
              const Icon = category.icon;
              const categoryLeaders = leaders[category.key] || [];
              
              return (
                <Card 
                  key={category.key}
                  className="glass-panel border-white/10 overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${catIdx * 0.1}s` }}
                  data-testid={`category-${category.key}`}
                >
                  <CardHeader className="border-b border-white/5">
                    <CardTitle className="font-heading font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${category.color}`} />
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {categoryLeaders.map((player, idx) => (
                        <Link
                          key={player.id}
                          to={`/player/${player.id}`}
                          className="flex items-center gap-3 p-3 table-row-hover"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-sm ${
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                            idx === 2 ? 'bg-amber-600/20 text-amber-600' :
                            'bg-white/5 text-white/40'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-heading font-bold text-sm text-white truncate">{player.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${getPositionColor(player.position)} text-white text-xs px-1.5 py-0`}>
                                {player.position}
                              </Badge>
                              <span className="font-body text-xs text-white/40 truncate">{player.team}</span>
                            </div>
                          </div>
                          <div className={`font-heading font-black text-lg ${idx === 0 ? category.color : 'text-white'}`}>
                            {category.format(player.stats?.[category.stat])}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatLeaders;
