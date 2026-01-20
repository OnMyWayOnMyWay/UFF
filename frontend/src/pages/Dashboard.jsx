import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, TrendingUp, Calendar, Users, ChevronRight, Star, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API}/dashboard`);
        setDashboardData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="min-h-screen">
      {/* Hero Section */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Zap className="w-8 h-8 text-neon-blue" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Fantasy Football League</span>
          </div>
          <h1 className="font-heading font-black text-5xl md:text-7xl lg:text-8xl tracking-tighter uppercase text-white mb-4 animate-slide-up stagger-1">
            GRIDIRON<br />
            <span className="text-neon-blue">ELITE</span>
          </h1>
          <p className="font-body text-white/60 max-w-md animate-slide-up stagger-2">
            Track your league's top performers, standings, and playoff race in real-time.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 animate-slide-up stagger-3">
            <div className="glass-panel rounded-xl p-4">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Teams</div>
              <div className="font-heading font-black text-3xl text-white">12</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Week</div>
              <div className="font-heading font-black text-3xl text-neon-blue">13</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Playoffs</div>
              <div className="font-heading font-black text-3xl text-neon-volt">LIVE</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Champion</div>
              <div className="font-heading font-bold text-lg text-white truncate">MTL</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            
            {/* Top Performers - Large Card */}
            <Card data-testid="top-performers-card" className="lg:col-span-8 glass-panel border-white/10 overflow-hidden">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                    <Star className="w-5 h-5 text-neon-volt" />
                    Top Performers
                  </CardTitle>
                  <Link to="/elite" className="text-neon-blue text-sm flex items-center gap-1 hover:underline">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {dashboardData?.top_performers?.slice(0, 5).map((player, idx) => (
                    <div 
                      key={player.id} 
                      className="flex items-center gap-4 p-4 table-row-hover"
                      data-testid={`top-performer-${idx}`}
                    >
                      <div className="font-heading font-black text-2xl text-white/20 w-8">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                        <span className="font-heading font-bold text-lg">{player.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-bold text-white truncate">{player.name}</div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getPositionColor(player.position)} text-white text-xs px-2 py-0`}>
                            {player.position}
                          </Badge>
                          <span className="font-body text-xs text-white/40">{player.team}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading font-black text-xl text-neon-blue">
                          {player.stats?.fantasy_points?.toFixed(1)}
                        </div>
                        <div className="font-body text-xs text-white/40">PTS</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Standings Preview */}
            <Card data-testid="standings-preview-card" className="lg:col-span-4 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-neon-volt" />
                    Leaders
                  </CardTitle>
                  <Link to="/standings" className="text-neon-blue text-sm flex items-center gap-1 hover:underline">
                    Full Standings <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Grand Central Leader */}
                <div className="p-4 rounded-lg bg-white/5">
                  <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">Grand Central</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading font-bold text-lg text-white">
                        {dashboardData?.standings_preview?.grand_central_leader?.name}
                      </div>
                      <div className="font-body text-sm text-white/50">
                        {dashboardData?.standings_preview?.grand_central_leader?.wins}-{dashboardData?.standings_preview?.grand_central_leader?.losses}
                      </div>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold"
                      style={{ backgroundColor: dashboardData?.standings_preview?.grand_central_leader?.color }}
                    >
                      {dashboardData?.standings_preview?.grand_central_leader?.abbreviation?.charAt(0)}
                    </div>
                  </div>
                </div>

                {/* Ridge Leader */}
                <div className="p-4 rounded-lg bg-white/5">
                  <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">Ridge</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading font-bold text-lg text-white">
                        {dashboardData?.standings_preview?.ridge_leader?.name}
                      </div>
                      <div className="font-body text-sm text-white/50">
                        {dashboardData?.standings_preview?.ridge_leader?.wins}-{dashboardData?.standings_preview?.ridge_leader?.losses}
                      </div>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold"
                      style={{ backgroundColor: dashboardData?.standings_preview?.ridge_leader?.color }}
                    >
                      {dashboardData?.standings_preview?.ridge_leader?.abbreviation?.charAt(0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Leaders */}
            <Card data-testid="position-leaders-card" className="lg:col-span-6 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-neon-blue" />
                  Position Leaders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dashboardData?.leaders && Object.entries(dashboardData.leaders).map(([pos, player]) => (
                    <div 
                      key={pos} 
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      data-testid={`leader-${pos.toLowerCase()}`}
                    >
                      <Badge className={`${getPositionColor(pos)} text-white text-xs mb-2`}>{pos}</Badge>
                      <div className="font-heading font-bold text-sm text-white truncate">{player.name}</div>
                      <div className="font-body text-xs text-white/40">{player.stats?.fantasy_points?.toFixed(1)} pts</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card data-testid="quick-links-card" className="lg:col-span-6 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-neon-blue" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/schedule" data-testid="link-schedule" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Calendar className="w-6 h-6 text-neon-blue mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Schedule</div>
                    <div className="font-body text-xs text-white/40">Week 13 Results</div>
                  </Link>
                  <Link to="/playoffs" data-testid="link-playoffs" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Trophy className="w-6 h-6 text-neon-volt mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Playoffs</div>
                    <div className="font-body text-xs text-white/40">Bracket View</div>
                  </Link>
                  <Link to="/players" data-testid="link-players" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Users className="w-6 h-6 text-neon-blue mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Players</div>
                    <div className="font-body text-xs text-white/40">By Position</div>
                  </Link>
                  <Link to="/awards" data-testid="link-awards" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Star className="w-6 h-6 text-neon-volt mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Awards</div>
                    <div className="font-body text-xs text-white/40">Season Honors</div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card data-testid="recent-games-card" className="lg:col-span-12 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                    Recent Games — Week 13
                  </CardTitle>
                  <Link to="/schedule" className="text-neon-blue text-sm flex items-center gap-1 hover:underline">
                    Full Schedule <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData?.recent_games?.slice(0, 6).map((game, idx) => (
                    <div 
                      key={game.id} 
                      className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      data-testid={`recent-game-${idx}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-body text-xs text-white/40 uppercase">Final</span>
                        {game.player_of_game && (
                          <Badge variant="outline" className="text-xs border-neon-volt/50 text-neon-volt">
                            POG: {game.player_of_game.split(' ')[0]}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between ${game.home_score > game.away_score ? 'text-white' : 'text-white/50'}`}>
                          <span className="font-heading font-bold">{game.home_team_id.toUpperCase()}</span>
                          <span className="font-heading font-black text-xl">{game.home_score}</span>
                        </div>
                        <div className={`flex items-center justify-between ${game.away_score > game.home_score ? 'text-white' : 'text-white/50'}`}>
                          <span className="font-heading font-bold">{game.away_team_id.toUpperCase()}</span>
                          <span className="font-heading font-black text-xl">{game.away_score}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
