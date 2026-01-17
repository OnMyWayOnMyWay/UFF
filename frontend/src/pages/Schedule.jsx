import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Trophy, ChevronRight, Award } from 'lucide-react';
import { TeamLogoAvatar, loadTeamLogos, loadTeamColors, getTeamColors } from '../lib/teamLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Schedule = () => {
  const [games, setGames] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoMap, setLogoMap] = useState({});
  const [colorMap, setColorMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    loadTeamLogos().then(logos => setLogoMap(logos));
    loadTeamColors().then(colors => setColorMap(colors));
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
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
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
          {getGamesForWeek(selectedWeek).map((game, idx) => {
            const homeWin = game.home_score > game.away_score;
            const awayWin = game.away_score > game.home_score;
            
            return (
              <div
                key={game.id}
                className="relative overflow-hidden rounded-3xl animate-fadeInUp cursor-pointer group"
                style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
                onClick={() => navigate(`/week/${game.week}`)}
                data-testid={`game-${game.id}`}
              >
                {/* Game Card with gradient border */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-white/10 p-6">
                  {/* Score Row */}
                  <div className="flex items-center justify-between gap-4 mb-6">
                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <TeamLogoAvatar teamName={game.away_team} logoMap={logoMap} colorMap={colorMap} size="lg" />
                      <div className="text-4xl md:text-5xl font-black text-white">
                        {game.away_score}
                      </div>
                    </div>

                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <TeamLogoAvatar teamName={game.home_team} logoMap={logoMap} colorMap={colorMap} size="lg" />
                      <div className="text-4xl md:text-5xl font-black text-white">
                        {game.home_score}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />

                  {/* Player Stats */}
                  <div className="space-y-3 text-sm">
                    {game.away_stats && Object.keys(game.away_stats).length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex-shrink-0">
                          <TeamLogoAvatar teamName={game.away_team} logoMap={logoMap} colorMap={colorMap} size="xs" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-white">
                            {Object.keys(game.away_stats)[0] || 'Away Player'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {Object.values(game.away_stats)[0] && typeof Object.values(game.away_stats)[0] === 'object'
                              ? Object.entries(Object.values(game.away_stats)[0])
                                  .slice(0, 4)
                                  .map(([key, val]) => `${val}`)
                                  .join(', ')
                              : 'Stats pending'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {game.home_stats && Object.keys(game.home_stats).length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex-shrink-0">
                          <TeamLogoAvatar teamName={game.home_team} logoMap={logoMap} colorMap={colorMap} size="xs" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-white">
                            {Object.keys(game.home_stats)[0] || 'Home Player'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {Object.values(game.home_stats)[0] && typeof Object.values(game.home_stats)[0] === 'object'
                              ? Object.entries(Object.values(game.home_stats)[0])
                                  .slice(0, 4)
                                  .map(([key, val]) => `${val}`)
                                  .join(', ')
                              : 'Stats pending'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-amber-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-amber-500/10 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none rounded-3xl" />
                </div>
              </div>
            );
          })}

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