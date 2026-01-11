import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Trophy, ChevronRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Schedule = () => {
  const [games, setGames] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, weeksRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/weeks`)
      ]);
      const gamesData = gamesRes.data || [];
      const weeksData = weeksRes.data?.weeks || [];
      setGames(Array.isArray(gamesData) ? gamesData : []);
      setWeeks(Array.isArray(weeksData) ? weeksData : []);
      if (weeksData.length > 0) {
        setSelectedWeek(weeksData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setGames([]);
      setWeeks([]);
    } finally {
      setLoading(false);
    }
  };

  const getGamesForWeek = (week) => {
    if (!games || !Array.isArray(games)) return [];
    return games.filter(g => g && g.week === week);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2">Season Schedule</h1>
        <p className="text-gray-400">Browse games by week</p>
      </div>

      {/* Week Selector */}
      <div className="glass-card mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center space-x-3 overflow-x-auto pb-2">
          {weeks.map(week => (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              data-testid={`week-selector-${week}`}
              className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedWeek === week
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white glow-emerald'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              Week {week}
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      {selectedWeek && (
        <div className="space-y-4">
          {getGamesForWeek(selectedWeek).map((game, idx) => (
            <div
              key={game.id}
              className="glass-card hover:border-emerald-500/30 transition-all cursor-pointer animate-fadeInUp"
              style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
              onClick={() => navigate(`/week/${game.week}`)}
              data-testid={`game-${game.id}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-6">
                {/* Date */}
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-emerald-500" />
                  <div>
                    <p className="text-sm text-gray-400">Game Date</p>
                    <p className="font-semibold text-white">{game.game_date}</p>
                  </div>
                </div>

                {/* Teams & Score */}
                <div className="flex items-center space-x-8 flex-1 justify-center">
                  <div className="text-right">
                    <p className="font-bold text-white text-lg mb-1">{game.home_team}</p>
                    <p className="text-4xl font-bold text-emerald-400">{game.home_score}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 font-bold text-sm mb-2">VS</p>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-emerald-500" />
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-lg mb-1">{game.away_team}</p>
                    <p className="text-4xl font-bold text-blue-400">{game.away_score}</p>
                  </div>
                </div>

                {/* Player of Game + Arrow */}
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Player of Game</p>
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <p className="text-yellow-500 font-semibold">{game.player_of_game}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            </div>
          ))}

          {getGamesForWeek(selectedWeek).length === 0 && (
            <div className="glass-card text-center py-12">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No games scheduled for Week {selectedWeek}</p>
            </div>
          )}
        </div>
      )}

      {weeks.length === 0 && (
        <div className="glass-card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No games scheduled yet</p>
        </div>
      )}
    </div>
  );
};

export default Schedule;