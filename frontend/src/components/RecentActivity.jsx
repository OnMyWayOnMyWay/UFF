import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, Trophy, Calendar, ArrowRightLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const RecentActivity = () => {
  const [recentGames, setRecentGames] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('games'); // games | trades
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const [gamesRes, tradesRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/trades`, { params: { limit: 5 } })
      ]);

      const gamesData = gamesRes.data || [];
      setRecentGames(Array.isArray(gamesData) ? gamesData.slice(-5).reverse() : []);

      const tradesData = tradesRes.data?.trades || [];
      setRecentTrades(Array.isArray(tradesData) ? tradesData : []);
    } catch (error) {
      console.error('Error fetching recent games:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-modern p-6">
        <div className="skeleton h-6 w-32 mb-4"></div>
        <div className="space-y-3">
          <div className="skeleton h-20 w-full"></div>
          <div className="skeleton h-20 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-modern p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-500" />
          Recent Activity
        </h3>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setView('games')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              view === 'games' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => setView('trades')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              view === 'trades' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Trades
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {view === 'games' && recentGames.map((game) => (
          <div
            key={game.id}
            onClick={() => navigate(`/week/${game.week}`)}
            className="p-4 rounded-xl bg-white/3 hover:bg-white/8 cursor-pointer transition-all border border-white/5 hover:border-emerald-500/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="badge-modern text-xs">Week {game.week}</span>
              <span className="text-xs text-gray-400 flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {game.game_date}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-sm font-semibold text-white">{game.home_team}</p>
                <p className="text-2xl font-bold text-emerald-400">{game.home_score}</p>
              </div>
              <span className="text-gray-500 text-sm font-bold">VS</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">{game.away_team}</p>
                <p className="text-2xl font-bold text-blue-400">{game.away_score}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center space-x-2 text-xs">
              <Trophy className="w-3 h-3 text-yellow-500" />
              <span className="text-gray-400">POG:</span>
              <span className="text-yellow-500 font-semibold">{game.player_of_game}</span>
            </div>
          </div>
        ))}

        {view === 'trades' && (
          recentTrades.length > 0 ? (
            recentTrades.map((trade) => (
              <div
                key={trade.id}
                onClick={() => navigate(`/player/${encodeURIComponent(trade.player_name)}`)}
                className="p-4 rounded-xl bg-white/3 hover:bg-white/8 cursor-pointer transition-all border border-white/5 hover:border-cyan-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="badge-modern text-xs">Trade</span>
                  <span className="text-xs text-gray-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {(trade.timestamp || '').slice(0, 10)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{trade.player_name}</p>
                    <p className="text-xs text-gray-400">{trade.week ? `Effective after week ${trade.week}` : 'Effective immediately'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white">{trade.from_team}</span>
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-white">{trade.to_team}</span>
                  </div>
                </div>

                {trade.notes && (
                  <p className="mt-2 text-xs text-gray-400 line-clamp-2">{trade.notes}</p>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl bg-white/3 border border-white/5">
              <p className="text-sm text-gray-400">No trades recorded yet.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default RecentActivity;