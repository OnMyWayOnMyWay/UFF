import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

import API from '../lib/api';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    try {
      const response = await axios.get(`${API}/watchlist`);
      setWatchlist(response.data);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const removeFromWatchlist = async (playerId) => {
    try {
      await axios.delete(`${API}/watchlist/${playerId}`);
      setWatchlist(watchlist.filter(p => p.id !== playerId));
      toast.success('Removed from watchlist');
    } catch (error) {
      toast.error('Failed to remove from watchlist');
    }
  };

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
    <div data-testid="watchlist-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Eye className="w-6 h-6 text-neon-volt" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Your Tracking</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            MY <span className="text-neon-volt">WATCHLIST</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            Players you're tracking. {watchlist.length} player{watchlist.length !== 1 ? 's' : ''} watched.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          {watchlist.length === 0 ? (
            <Card className="glass-panel border-white/10">
              <CardContent className="p-12 text-center">
                <Eye className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="font-heading font-bold text-xl text-white mb-2">No Players in Watchlist</h3>
                <p className="font-body text-white/60 mb-6">
                  Start tracking players by searching on the dashboard or browsing the player stats page.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link to="/">
                    <Button className="bg-neon-blue hover:bg-neon-blue/80">Go to Dashboard</Button>
                  </Link>
                  <Link to="/players">
                    <Button variant="outline" className="border-white/20">Browse Players</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-panel border-white/10 overflow-hidden">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                  <Eye className="w-5 h-5 text-neon-volt" />
                  Watched Players
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {watchlist.map((player, idx) => (
                    <div 
                      key={player.id}
                      className="flex items-center gap-4 p-4 table-row-hover animate-slide-up"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                      data-testid={`watchlist-player-${idx}`}
                    >
                      {/* Avatar */}
                      <Link to={`/player/${player.id}`} className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                          <span className="font-heading font-bold text-lg">{player.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-heading font-bold text-white">{player.name}</div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getPositionColor(player.position)} text-white text-xs`}>
                              {player.position}
                            </Badge>
                            <span className="font-body text-xs text-white/40">{player.team}</span>
                            {player.injury_status && (
                              <Badge variant="outline" className="border-red-500/50 text-red-500 text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {player.injury_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-6">
                        <div className="text-center">
                          <div className="font-body text-xs text-white/40">Fantasy Pts</div>
                          <div className="font-heading font-black text-lg text-neon-blue">
                            {player.stats?.fantasy_points?.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-body text-xs text-white/40">Avg/Game</div>
                          <div className="font-heading font-bold text-lg text-white">
                            {player.stats?.avg_points?.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-body text-xs text-white/40">Bye</div>
                          <div className="font-heading font-bold text-lg text-white">
                            Wk {player.bye_week}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromWatchlist(player.id)}
                        className="text-white/40 hover:text-red-500 hover:bg-red-500/10"
                        data-testid={`remove-watchlist-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Watchlist;
