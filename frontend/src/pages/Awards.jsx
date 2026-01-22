import { useEffect, useState } from 'react';
import axios from 'axios';
import { Award, Trophy, Star, Medal, Target, Crown } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

import API from '../lib/api';

const Awards = () => {
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        const response = await axios.get(`${API}/awards`);
        setAwards(response.data);
      } catch (error) {
        console.error('Error fetching awards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAwards();
  }, []);

  const getAwardIcon = (name) => {
    if (name.includes('MVP')) return <Trophy className="w-8 h-8" />;
    if (name.includes('Offensive')) return <Target className="w-8 h-8" />;
    if (name.includes('Rookie')) return <Star className="w-8 h-8" />;
    if (name.includes('Comeback')) return <Medal className="w-8 h-8" />;
    if (name.includes('Manager')) return <Crown className="w-8 h-8" />;
    return <Award className="w-8 h-8" />;
  };

  const getAwardColor = (idx) => {
    const colors = [
      'from-yellow-500/20 to-amber-600/20 border-yellow-500/30',
      'from-neon-blue/20 to-blue-600/20 border-neon-blue/30',
      'from-emerald-500/20 to-green-600/20 border-emerald-500/30',
      'from-purple-500/20 to-violet-600/20 border-purple-500/30',
      'from-orange-500/20 to-red-600/20 border-orange-500/30',
      'from-neon-volt/20 to-lime-600/20 border-neon-volt/30',
    ];
    return colors[idx % colors.length];
  };

  const getIconColor = (idx) => {
    const colors = ['text-yellow-500', 'text-neon-blue', 'text-emerald-500', 'text-purple-500', 'text-orange-500', 'text-neon-volt'];
    return colors[idx % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="awards-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Award className="w-6 h-6 text-neon-volt" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Season Honors</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            LEAGUE <span className="text-neon-volt">AWARDS</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            Recognizing the best performances of the season.
          </p>
        </div>
      </div>

      {/* Awards Grid */}
      <div className="px-6 md:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {awards.map((award, idx) => (
              <Card
                key={award.id}
                data-testid={`award-card-${idx}`}
                className={`glass-panel border overflow-hidden hover:-translate-y-2 transition-all duration-300 animate-slide-up bg-gradient-to-br ${getAwardColor(idx)}`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <CardContent className="p-6">
                  {/* Icon */}
                  <div className={`mb-6 ${getIconColor(idx)}`}>
                    {getAwardIcon(award.name)}
                  </div>

                  {/* Award Name */}
                  <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white mb-2">
                    {award.name}
                  </h3>
                  <p className="font-body text-sm text-white/50 mb-6">
                    {award.description}
                  </p>

                  {/* Winner */}
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                    <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">Winner</div>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                        <span className="font-heading font-black text-2xl text-white">
                          {award.winner_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-bold text-xl text-white truncate">
                          {award.winner_name || 'TBD'}
                        </div>
                        {award.winner_team && (
                          <div className="font-body text-sm text-white/50">{award.winner_team}</div>
                        )}
                      </div>
                    </div>

                    {/* Stat Value */}
                    {award.stat_value && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Achievement</div>
                        <div className="font-heading font-bold text-lg text-neon-volt">
                          {award.stat_value}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Featured MVP Card */}
          <div className="mt-12">
            <Card className="glass-panel border-yellow-500/30 overflow-hidden relative" data-testid="mvp-featured-card">
              <div className="absolute inset-0 trophy-shine" />
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Trophy Icon */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center border border-yellow-500/30">
                      <Trophy className="w-16 h-16 text-yellow-500" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-neon-volt flex items-center justify-center">
                      <Star className="w-4 h-4 text-black" />
                    </div>
                  </div>

                  {/* MVP Info */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="font-body text-xs uppercase tracking-widest text-yellow-500 mb-2">
                      2024 Season MVP
                    </div>
                    <h2 className="font-heading font-black text-4xl md:text-5xl uppercase tracking-tight text-white mb-2">
                      {awards[0]?.winner_name || 'Marcus Williams'}
                    </h2>
                    <p className="font-body text-white/50 mb-4">
                      {awards[0]?.winner_team || 'Mountain Lions'} • Quarterback
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="font-body text-xs text-white/40">Fantasy Pts</div>
                        <div className="font-heading font-black text-xl text-neon-blue">412.5</div>
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="font-body text-xs text-white/40">Pass YDS</div>
                        <div className="font-heading font-black text-xl text-white">4,521</div>
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="font-body text-xs text-white/40">TDs</div>
                        <div className="font-heading font-black text-xl text-neon-volt">38</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Awards;
