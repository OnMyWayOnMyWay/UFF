import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const WeekView = () => {
  const { weekNumber } = useParams();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGame, setExpandedGame] = useState(null);

  useEffect(() => {
    fetchWeekGames();
  }, [weekNumber]);

  const fetchWeekGames = async () => {
    try {
      const response = await axios.get(`${API}/games/week/${weekNumber}`);
      setGames(response.data);
      if (response.data.length > 0) {
        setExpandedGame(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching week games:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGame = (gameId) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  const renderStatsTable = (stats, category, columns, teamName) => {
    if (!stats[category] || stats[category].length === 0) return null;

    // Filter players to only show those on this team
    const teamPlayers = stats[category].filter(player => player.team === teamName);
    
    if (teamPlayers.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-emerald-500 mb-3 uppercase tracking-wide">
          {category}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-800">
                <th className="text-left py-2 px-3">Name</th>
                {columns.map(col => (
                  <th key={col.key} className="text-center py-2 px-2">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamPlayers.map((player, idx) => (
                <tr key={idx} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                  <td className="font-semibold text-white py-2 px-3">{player.name}</td>
                  {columns.map(col => (
                    <td key={col.key} className="text-center text-gray-300 py-2 px-2">
                      {player.stats[col.key] !== undefined ? player.stats[col.key] : 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading week {weekNumber} stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <button
        data-testid="back-button"
        onClick={() => navigate('/')}
        className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors animate-fadeIn"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>

      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2 flex items-center">
          <Calendar className="w-10 h-10 mr-3" />
          Week {weekNumber}
        </h1>
        <p className="text-gray-400">Game details and player statistics</p>
      </div>

      {games.length === 0 ? (
        <div className="glass-card text-center py-12">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No games found for Week {weekNumber}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {games.map((game, idx) => (
            <div key={game.id} className="glass-card animate-fadeInUp" style={{ animationDelay: `${idx * 0.1}s` }} data-testid={`game-detail-${game.id}`}>
                {/* Game Header */}
                <button
                  onClick={() => toggleGame(game.id)}
                  className="w-full text-left"
                  data-testid={`toggle-game-${game.id}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-semibold">
                      {game.game_date}
                    </span>
                    {expandedGame === game.id ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* Score Display */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-8">
                      <div>
                        <p className="text-white font-semibold text-xl mb-1">{game.home_team}</p>
                        <p className="text-4xl font-bold text-white">{game.home_score}</p>
                      </div>
                      <span className="text-gray-500 text-2xl font-bold">VS</span>
                      <div>
                        <p className="text-white font-semibold text-xl mb-1">{game.away_team}</p>
                        <p className="text-4xl font-bold text-white">{game.away_score}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm mb-2">Player of the Game</p>
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        <p className="text-yellow-500 font-semibold text-lg">{game.player_of_game}</p>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Stats */}
                {expandedGame === game.id && (
                  <div className="border-t border-gray-800 pt-6 mt-4">
                    {/* Home Team Stats */}
                    <div className="mb-8 bg-emerald-500/5 rounded-lg p-6 border border-emerald-500/20">
                      <h3 className="text-2xl font-bold text-white mb-6 flex items-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        <span className="w-3 h-8 bg-emerald-500 rounded mr-3"></span>
                        {game.home_team}
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          {renderStatsTable(game.home_stats, 'passing', [
                            { key: 'comp', label: 'COMP' },
                            { key: 'att', label: 'ATT' },
                            { key: 'yards', label: 'YDS' },
                            { key: 'td', label: 'TD' },
                            { key: 'int', label: 'INT' },
                            { key: 'scked', label: 'SCKED' }
                          ], game.home_team)}
                          {renderStatsTable(game.home_stats, 'rushing', [
                            { key: 'att', label: 'ATT' },
                            { key: 'yards', label: 'YDS' },
                            { key: 'td', label: 'TD' }
                          ], game.home_team)}
                        </div>
                        <div>
                          {renderStatsTable(game.home_stats, 'defense', [
                            { key: 'tak', label: 'TAK' },
                            { key: 'tfl', label: 'TFL' },
                            { key: 'sck', label: 'SCK' },
                            { key: 'saf', label: 'SAF' },
                            { key: 'swat', label: 'SWAT' },
                            { key: 'int', label: 'INT' },
                            { key: 'pbu', label: 'PBU' },
                            { key: 'td', label: 'TD' }
                          ], game.home_team)}
                          {renderStatsTable(game.home_stats, 'receiving', [
                            { key: 'rec', label: 'REC' },
                            { key: 'yards', label: 'YDS' },
                            { key: 'td', label: 'TD' }
                          ], game.home_team)}
                        </div>
                      </div>
                    </div>

                    {/* Away Team Stats */}
                    <div className="bg-blue-500/5 rounded-lg p-6 border border-blue-500/20">
                      <h3 className="text-2xl font-bold text-white mb-6 flex items-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        <span className="w-3 h-8 bg-blue-500 rounded mr-3"></span>
                        {game.away_team}
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          {renderStatsTable(game.away_stats, 'passing', [
                            { key: 'comp', label: 'COMP' },
                            { key: 'att', label: 'ATT' },
                            { key: 'yards', label: 'YDS' },
                            { key: 'td', label: 'TD' },
                            { key: 'int', label: 'INT' },
                            { key: 'scked', label: 'SCKED' }
                          ], game.away_team)}
                          {renderStatsTable(game.away_stats, 'rushing', [
                            { key: 'att', label: 'ATT' },
                            { key: 'yards', label: 'YDS' },
                            { key: 'td', label: 'TD' }
                          ], game.away_team)}
                        </div>
                        <div>
                          {renderStatsTable(game.away_stats, 'defense', [
                            { key: 'tak', label: 'TAK' },
                            { key: 'tfl', label: 'TFL' },
                            { key: 'sck', label: 'SCK' },
                            { key: 'saf', label: 'SAF' },
                            { key: 'swat', label: 'SWAT' },
                            { key: 'int', label: 'INT' },
                            { key: 'pbu', label: 'PBU' },
                            { key: 'td', label: 'TD' }
                          ], game.away_team)}
                          {renderStatsTable(game.away_stats, 'receiving', [
                            { key: 'rec', label: 'REC' },
                            { key: 'yards', label: 'YDS' },
                            { key: 'td', label: 'TD' }
                          ], game.away_team)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default WeekView;