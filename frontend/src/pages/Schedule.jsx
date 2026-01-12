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
            const gameDate = game.game_date ? new Date(game.game_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() : '';
            
            return (
              <div
                key={game.id}
                className="relative overflow-hidden rounded-2xl animate-fadeInUp cursor-pointer group"
                style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
                onClick={() => navigate(`/week/${game.week}`)}
                data-testid={`game-${game.id}`}
              >
                {/* Game Card Container */}
                <div className="flex items-stretch min-h-[120px]">
                  {/* Away Team Section (Left) */}
                  <div className={`flex-1 flex items-center justify-between px-6 py-4 transition-all ${
                    awayWin 
                      ? 'border-2 border-emerald-500/50' 
                      : 'bg-slate-800/50 border-2 border-slate-700/50'
                  }`}
                  style={awayWin ? {
                    background: `linear-gradient(90deg, ${getTeamColors(game.away_team, colorMap).primary}40, ${getTeamColors(game.away_team, colorMap).secondary}30)`
                  } : undefined}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <TeamLogoAvatar teamName={game.away_team} logoMap={logoMap} colorMap={colorMap} size="lg" />
                      <div className="min-w-0">
                        <div className={`text-xs font-bold tracking-wider mb-1 ${
                          awayWin ? 'text-emerald-400' : 'text-gray-400'
                        }`}>
                          {game.away_team.split(' ')[0].toUpperCase()}
                        </div>
                        <div className={`text-xl font-black uppercase tracking-tight ${
                          awayWin ? 'text-white' : 'text-gray-300'
                        }`}>
                          {game.away_team.split(' ').slice(1).join(' ')}
                        </div>
                      </div>
                    </div>
                    <div className={`text-5xl font-black tabular-nums ${
                      awayWin ? 'text-white' : 'text-gray-400'
                    }`}>
                      {game.away_score}
                    </div>
                  </div>

                  {/* Center Info Section */}
                  <div className="w-48 bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center px-4 py-4 border-y-2 border-white/20">
                    <div className="text-center space-y-1">
                      <div className="text-xs font-bold text-white/90 tracking-widest">Final</div>
                      <div className="text-lg font-black text-white">WEEK {game.week}</div>
                      <div className="text-xs font-semibold text-white/70">{gameDate}</div>
                    </div>
                    {game.player_of_game && (
                      <div className="mt-3 pt-3 border-t border-white/20 w-full">
                        <div className="flex items-center justify-center gap-1 text-xs text-yellow-400">
                          <Award className="w-3 h-3" />
                          <span className="font-semibold truncate">{game.player_of_game}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Home Team Section (Right) */}
                  <div className={`flex-1 flex items-center justify-between px-6 py-4 transition-all ${
                    homeWin 
                      ? 'border-2 border-red-500/50' 
                      : 'bg-slate-800/50 border-2 border-slate-700/50'
                  }`}
                  style={homeWin ? {
                    background: `linear-gradient(270deg, ${getTeamColors(game.home_team, colorMap).primary}40, ${getTeamColors(game.home_team, colorMap).secondary}30)`
                  } : undefined}
                  >
                    <div className={`text-5xl font-black tabular-nums ${
                      homeWin ? 'text-white' : 'text-gray-400'
                    }`}>
                      {game.home_score}
                    </div>
                    <div className="flex items-center gap-4 min-w-0 flex-1 justify-end">
                      <div className="min-w-0 text-right">
                        <div className={`text-xs font-bold tracking-wider mb-1 ${
                          homeWin ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {game.home_team.split(' ')[0].toUpperCase()}
                        </div>
                        <div className={`text-xl font-black uppercase tracking-tight ${
                          homeWin ? 'text-white' : 'text-gray-300'
                        }`}>
                          {game.home_team.split(' ').slice(1).join(' ')}
                        </div>
                      </div>
                      <TeamLogoAvatar teamName={game.home_team} logoMap={logoMap} colorMap={colorMap} size="lg" />
                    </div>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:via-emerald-500/10 group-hover:to-emerald-500/5 transition-all duration-300 pointer-events-none" />
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