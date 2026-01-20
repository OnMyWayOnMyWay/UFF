import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PowerRankings = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await axios.get(`${API}/power-rankings`);
        setRankings(response.data);
      } catch (error) {
        console.error('Error fetching rankings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, []);

  const getTrendIcon = (trend, prevRank, currentRank) => {
    const diff = prevRank - currentRank;
    if (trend === 'up') {
      return (
        <div className="flex items-center gap-1 text-green-500">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-bold">+{diff}</span>
        </div>
      );
    }
    if (trend === 'down') {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingDown className="w-4 h-4" />
          <span className="text-xs font-bold">{diff}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-white/40">
        <Minus className="w-4 h-4" />
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

  return (
    <div data-testid="power-rankings-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <BarChart3 className="w-6 h-6 text-neon-blue" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Weekly Analysis</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            POWER <span className="text-neon-blue">RANKINGS</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            Expert analysis and team rankings updated weekly.
          </p>
        </div>
      </div>

      {/* Rankings List */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="glass-panel border-white/10 overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                Week 13 Power Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {rankings.map((team, idx) => (
                  <div 
                    key={team.team_id}
                    className={`flex items-center gap-4 p-4 table-row-hover animate-slide-up ${idx < 4 ? 'bg-neon-volt/5' : ''}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    data-testid={`ranking-${idx}`}
                  >
                    {/* Rank */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-heading font-black text-2xl ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                      idx === 2 ? 'bg-amber-600/20 text-amber-600' :
                      'bg-white/5 text-white/40'
                    }`}>
                      {team.rank}
                    </div>

                    {/* Trend */}
                    <div className="w-12">
                      {getTrendIcon(team.trend, team.prev_rank, team.rank)}
                    </div>

                    {/* Team */}
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold text-white"
                        style={{ backgroundColor: team.team_color }}
                      >
                        {team.team_abbr?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-heading font-bold text-white">{team.team_name}</div>
                        <div className="font-body text-xs text-white/40">{team.record}</div>
                      </div>
                    </div>

                    {/* Analysis */}
                    <div className="hidden md:block flex-1 max-w-md">
                      <p className="font-body text-sm text-white/60 line-clamp-2">{team.analysis}</p>
                    </div>

                    {/* Previous Rank */}
                    <div className="text-right">
                      <div className="font-body text-xs text-white/40 uppercase">Prev</div>
                      <div className="font-heading font-bold text-white/60">#{team.prev_rank}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Cards for Mobile */}
          <div className="mt-6 md:hidden space-y-4">
            {rankings.slice(0, 5).map((team, idx) => (
              <Card key={team.team_id} className="glass-panel border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-8 h-8 rounded-md flex items-center justify-center font-heading font-bold text-white text-sm"
                      style={{ backgroundColor: team.team_color }}
                    >
                      {team.team_abbr?.charAt(0)}
                    </div>
                    <span className="font-heading font-bold text-white">{team.team_name}</span>
                  </div>
                  <p className="font-body text-sm text-white/60">{team.analysis}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerRankings;
