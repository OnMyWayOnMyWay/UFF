import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, Flame, Star } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TrendingPlayers = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const response = await axios.get(`${API}/stats/leaders`);
      const top = response.data.points.slice(0, 3);
      setTrending(top);
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-modern p-6">
        <div className="skeleton h-6 w-32 mb-4"></div>
        <div className="space-y-3">
          <div className="skeleton h-16 w-full"></div>
          <div className="skeleton h-16 w-full"></div>
          <div className="skeleton h-16 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-modern p-6 hover-lift-smooth">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Flame className="w-5 h-5 mr-2 text-orange-500" />
          Trending Players
        </h3>
        <TrendingUp className="w-5 h-5 text-emerald-400" />
      </div>

      <div className="space-y-3">
        {trending.map((player, idx) => (
          <div
            key={idx}
            onClick={() => navigate(`/player/${player.name}`)}
            className="p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 cursor-pointer transition-all hover-lift-smooth border border-white/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  idx === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-black' :
                  idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                  'bg-gradient-to-br from-orange-600 to-red-700'
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <p className="font-semibold text-white">{player.name}</p>
                  <p className="text-xs text-gray-400">{player.games} games</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gradient">{player.value.toFixed(1)}</p>
                <p className="text-xs text-gray-400">Fantasy Pts</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/stats-leaders')}
        className="w-full mt-4 btn-modern text-sm py-2"
      >
        View All Leaders
      </button>
    </div>
  );
};

export default TrendingPlayers;