import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, Trophy, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const RecentActivity = () => {
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentGames();
  }, []);

  const fetchRecentGames = async () => {
    try {
      const response = await axios.get(`${API}/games`);
      setRecentGames(response.data.slice(-5).reverse());
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
      </div>

      <div className="space-y-3">
        {recentGames.map((game) => (
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
      </div>
    </div>
  );
};

export default RecentActivity;