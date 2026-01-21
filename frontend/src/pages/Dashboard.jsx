import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, TrendingUp, Calendar, Users, ChevronRight, Star, ArrowRightLeft, BarChart3, Eye, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const UFF_LOGO = "https://customer-assets.emergentagent.com/job_elite-league-hub/artifacts/g9a4t1r6_image.png";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

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

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        const response = await axios.get(`${API}/players?search=${encodeURIComponent(query)}&limit=5`);
        setSearchResults(response.data);
        setShowSearch(true);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const addToWatchlist = async (playerId) => {
    try {
      await axios.post(`${API}/watchlist`, { player_id: playerId });
      toast.success('Added to watchlist!');
    } catch (error) {
      toast.error('Failed to add to watchlist');
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

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend === 'down') return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
    return <span className="w-3 h-3 text-white/40">—</span>;
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
      <div className="relative hero-bg px-6 md:px-12 pt-8 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* UFF Logo and Title */}
          <div className="flex items-center gap-4 mb-6 animate-slide-up">
            <img src={UFF_LOGO} alt="UFF Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
            <div>
              <h1 className="font-heading font-black text-3xl md:text-5xl lg:text-6xl tracking-tighter uppercase text-white">
                UNITED FOOTBALL
              </h1>
              <h2 className="font-heading font-bold text-lg md:text-2xl tracking-widest uppercase text-neon-volt">
                LEAGUE
              </h2>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md mt-6 animate-slide-up stagger-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                data-testid="player-search"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-10"
              />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-lg border border-white/10 overflow-hidden z-50">
                {searchResults.map((player) => (
                  <Link
                    key={player.id}
                    to={`/player/${player.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                    onClick={() => setShowSearch(false)}
                  >
                    <Badge className={`${getPositionColor(player.position)} text-white text-xs`}>
                      {player.position}
                    </Badge>
                    <span className="font-heading font-bold text-white">{player.name}</span>
                    <span className="text-white/40 text-sm">{player.team}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); addToWatchlist(player.id); }}
                      className="ml-auto p-1 hover:bg-white/10 rounded"
                    >
                      <Eye className="w-4 h-4 text-white/60" />
                    </button>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 animate-slide-up stagger-2">
            <div className="glass-panel rounded-xl p-4">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Teams</div>
              <div className="font-heading font-black text-3xl text-white">12</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Week</div>
              <div className="font-heading font-black text-3xl text-neon-blue">8</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">Playoffs</div>
              <div className="font-heading font-black text-xl text-neon-volt">Week 9</div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">#1 Seed</div>
              <div className="font-heading font-bold text-lg text-white truncate">VIC 8-0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            
            {/* Top Performers */}
            <Card data-testid="top-performers-card" className="lg:col-span-5 glass-panel border-white/10 overflow-hidden">
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
                  {dashboardData?.top_performers?.slice(0, 5).map((item, idx) => {
                    const player = item.player || item;
                    const playerName = player.roblox_username || player.name || 'Unknown';
                    return (
                      <Link 
                        key={player.id} 
                        to={`/player/${player.id}`}
                        className="flex items-center gap-4 p-4 table-row-hover"
                        data-testid={`top-performer-${idx}`}
                      >
                        <div className="font-heading font-black text-2xl text-white/20 w-8">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                          <span className="font-heading font-bold">{playerName.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-heading font-bold text-white truncate">{playerName}</div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getPositionColor(player.position)} text-white text-xs px-2 py-0`}>
                              {player.position}
                            </Badge>
                            <span className="font-body text-xs text-white/40">{player.team}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-heading font-black text-xl text-neon-blue">
                            {item.points?.toFixed(1) || player.fantasy_points?.toFixed(1)}
                          </div>
                          <div className="font-body text-xs text-white/40">PTS</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Power Rankings Preview */}
            <Card data-testid="power-rankings-card" className="lg:col-span-4 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-neon-blue" />
                    Power Rankings
                  </CardTitle>
                  <Link to="/rankings" className="text-neon-blue text-sm flex items-center gap-1 hover:underline">
                    Full <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {dashboardData?.power_rankings?.slice(0, 5).map((pr, idx) => (
                    <Link 
                      key={pr.team_id} 
                      to={`/team/${pr.team_id}`}
                      className="flex items-center gap-3 p-3 table-row-hover"
                    >
                      <div className="font-heading font-black text-lg text-white/30 w-6">{pr.rank}</div>
                      {getTrendIcon(pr.change)}
                      <div 
                        className="w-8 h-8 rounded-md flex items-center justify-center font-heading font-bold text-sm text-white bg-neon-blue/30"
                      >
                        {pr.team_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-bold text-sm text-white truncate">{pr.team_name}</div>
                        <div className="font-body text-xs text-white/40 truncate">{pr.analysis?.slice(0, 40)}...</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Trades */}
            <Card data-testid="recent-trades-card" className="lg:col-span-3 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-neon-volt" />
                    Recent Trades
                  </CardTitle>
                  <Link to="/trades" className="text-neon-blue text-xs hover:underline">
                    All <ChevronRight className="w-3 h-3 inline" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {dashboardData?.recent_trades?.slice(0, 3).map((trade, idx) => (
                  <div key={trade.id} className="p-3 rounded-lg bg-white/5 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/40">{trade.date}</span>
                      <Badge variant="outline" className="border-green-500/50 text-green-500 text-xs">
                        Done
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="text-white/60">
                        <span className="text-white font-semibold">{trade.team1_id.toUpperCase()}</span>: {trade.team1_receives.join(', ')}
                      </div>
                      <div className="text-white/60">
                        <span className="text-white font-semibold">{trade.team2_id.toUpperCase()}</span>: {trade.team2_receives.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Standings Preview */}
            <Card data-testid="standings-preview-card" className="lg:col-span-4 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-neon-volt" />
                    Conference Leaders
                  </CardTitle>
                  <Link to="/standings" className="text-neon-blue text-sm flex items-center gap-1 hover:underline">
                    Standings <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Link to={`/team/${dashboardData?.standings_preview?.grand_central_leader?.id}`} className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="font-body text-xs uppercase tracking-widest text-neon-blue mb-2">Grand Central</div>
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
                </Link>
                <Link to={`/team/${dashboardData?.standings_preview?.ridge_leader?.id}`} className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="font-body text-xs uppercase tracking-widest text-neon-volt mb-2">Ridge</div>
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
                </Link>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card data-testid="quick-links-card" className="lg:col-span-8 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Link to="/schedule" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Calendar className="w-6 h-6 text-neon-blue mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Schedule</div>
                    <div className="font-body text-xs text-white/40">Week 8 Results</div>
                  </Link>
                  <Link to="/playoffs" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Trophy className="w-6 h-6 text-neon-volt mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Playoffs</div>
                    <div className="font-body text-xs text-white/40">Starting Week 9</div>
                  </Link>
                  <Link to="/leaders" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <TrendingUp className="w-6 h-6 text-neon-blue mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Stat Leaders</div>
                    <div className="font-body text-xs text-white/40">Top Stats</div>
                  </Link>
                  <Link to="/watchlist" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Eye className="w-6 h-6 text-neon-volt mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Watchlist</div>
                    <div className="font-body text-xs text-white/40">Your Players</div>
                  </Link>
                  <Link to="/players" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Users className="w-6 h-6 text-neon-blue mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">All Players</div>
                    <div className="font-body text-xs text-white/40">By Position</div>
                  </Link>
                  <Link to="/trades" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <ArrowRightLeft className="w-6 h-6 text-neon-volt mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Trades</div>
                    <div className="font-body text-xs text-white/40">Recent Moves</div>
                  </Link>
                  <Link to="/awards" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                    <Star className="w-6 h-6 text-neon-volt mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white">Awards</div>
                    <div className="font-body text-xs text-white/40">Season Honors</div>
                  </Link>
                  <Link to="/admin" className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 group border border-dashed border-white/20">
                    <Trophy className="w-6 h-6 text-white/60 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-white/80">Admin</div>
                    <div className="font-body text-xs text-white/40">Manage League</div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card data-testid="recent-games-card" className="lg:col-span-12 glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                    Recent Games — Week 8
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
