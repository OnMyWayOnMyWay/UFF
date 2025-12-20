import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users, X, TrendingUp, Award } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const PlayerComparison = () => {
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerData, setPlayerData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPlayers();
  }, []);

  const fetchAllPlayers = async () => {
    try {
      const response = await axios.get(`${API}/stats/leaders`);
      const players = new Set();
      Object.values(response.data).forEach(category => {
        category.forEach(player => players.add(player.name));
      });
      setAllPlayers(Array.from(players).sort());
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (playerName) => {
    if (selectedPlayers.includes(playerName) || selectedPlayers.length >= 4) return;
    
    try {
      const response = await axios.get(`${API}/players/${playerName}`);
      setSelectedPlayers([...selectedPlayers, playerName]);
      setPlayerData([...playerData, response.data]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error fetching player:', error);
    }
  };

  const removePlayer = (playerName) => {
    setSelectedPlayers(selectedPlayers.filter(p => p !== playerName));
    setPlayerData(playerData.filter(p => p.name !== playerName));
  };

  const getComparisonRadarData = () => {
    if (playerData.length === 0) return [];
    
    const stats = ['Passing', 'Rushing', 'Receiving', 'Defense'];
    return stats.map(stat => {
      const dataPoint = { stat };
      playerData.forEach(player => {
        const value = stat === 'Passing' ? player.total_stats.passing.yards / 10 :
                     stat === 'Rushing' ? player.total_stats.rushing.yards / 3 :
                     stat === 'Receiving' ? player.total_stats.receiving.yards / 3 :
                     player.total_stats.defense.tak * 3;
        dataPoint[player.name] = Math.min(value, 100);
      });
      return dataPoint;
    });
  };

  const getFantasyPointsComparison = () => {
    return playerData.map(player => ({
      name: player.name.split(' ')[0],
      points: player.fantasy_points
    }));
  };

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

  const filteredPlayers = allPlayers.filter(p => 
    p.toLowerCase().includes(searchTerm.toLowerCase()) && !selectedPlayers.includes(p)
  );

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors animate-fadeIn"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2 flex items-center">
          <Users className="w-10 h-10 mr-3" />
          Player Comparison
        </h1>
        <p className="text-gray-400">Compare up to 4 players side-by-side</p>
      </div>

      {/* Player Search */}
      <div className="glass-card mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search for players to compare..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchTerm && filteredPlayers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 glass-card max-h-60 overflow-y-auto z-10">
              {filteredPlayers.slice(0, 10).map(player => (
                <button
                  key={player}
                  onClick={() => addPlayer(player)}
                  className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors text-white"
                  disabled={selectedPlayers.length >= 4}
                >
                  {player}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedPlayers.length >= 4 && (
          <p className="text-yellow-500 text-sm mt-2">Maximum 4 players can be compared</p>
        )}
      </div>

      {/* Selected Players */}
      {selectedPlayers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          {playerData.map((player, idx) => (
            <div key={player.name} className="stat-card-modern relative" style={{ borderColor: colors[idx] }}>
              <button
                onClick={() => removePlayer(player.name)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold" style={{ background: `linear-gradient(135deg, ${colors[idx]}, ${colors[idx]}88)` }}>
                  {player.name.charAt(0)}
                </div>
                <h3 className="font-bold text-white text-lg">{player.name}</h3>
                <p className="text-sm text-gray-400">{player.games_played} games</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Fantasy Pts:</span>
                  <span className="font-bold" style={{ color: colors[idx] }}>{player.fantasy_points.toFixed(1)}</span>
                </div>
                {player.total_stats.passing.yards > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pass Yds:</span>
                    <span className="text-white font-semibold">{player.total_stats.passing.yards}</span>
                  </div>
                )}
                {player.total_stats.rushing.yards > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rush Yds:</span>
                    <span className="text-white font-semibold">{player.total_stats.rushing.yards}</span>
                  </div>
                )}
                {player.total_stats.receiving.yards > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rec Yds:</span>
                    <span className="text-white font-semibold">{player.total_stats.receiving.yards}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Charts */}
      {playerData.length >= 2 && (
        <div className="space-y-6">
          {/* Radar Comparison */}
          <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-emerald-500" />
              Performance Comparison
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={getComparisonRadarData()}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="stat" stroke="#9ca3af" />
                <PolarRadiusAxis stroke="#9ca3af" />
                {playerData.map((player, idx) => (
                  <Radar
                    key={player.name}
                    name={player.name}
                    dataKey={player.name}
                    stroke={colors[idx]}
                    fill={colors[idx]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Fantasy Points Bar Chart */}
          <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Award className="w-6 h-6 mr-2 text-yellow-500" />
              Fantasy Points Comparison
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getFantasyPointsComparison()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px' }}
                  labelStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="points" radius={[8, 8, 0, 0]}>
                  {getFantasyPointsComparison().map((entry, index) => (
                    <Bar key={`bar-${index}`} dataKey="points" fill={colors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedPlayers.length === 0 && (
        <div className="glass-card text-center py-16 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <Users className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Players Selected</h3>
          <p className="text-gray-400">Search and select players to start comparing their stats</p>
        </div>
      )}

      {selectedPlayers.length === 1 && (
        <div className="glass-card text-center py-12 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Add at least one more player to see comparisons</p>
        </div>
      )}
    </div>
  );
};

export default PlayerComparison;