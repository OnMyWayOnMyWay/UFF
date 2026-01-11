import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, TrendingUp, TrendingDown, Crown, Medal, Star } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Standings = () => {
  const navigate = useNavigate();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandings();
  }, []);

  const fetchStandings = async () => {
    try {
      const response = await axios.get(`${API}/teams/standings`);
      const standingsData = response.data || [];
      setStandings(Array.isArray(standingsData) ? standingsData : []);
    } catch (error) {
      console.error('Error fetching standings:', error);
      setStandings([]);
    } finally {
      setLoading(false);
    }
  };

  // Determine playoff status based on rank
  const getPlayoffStatus = (rank) => {
    if (rank === 0) return { indicator: 'x', label: 'Clinched Playoffs - 1st Seed', color: 'text-yellow-400', icon: Crown };
    if (rank === 1) return { indicator: 'y', label: 'Clinched Playoffs - 2nd Seed', color: 'text-emerald-400', icon: Star };
    if (rank >= 2 && rank <= 9) return { indicator: 'z', label: `Clinched Playoffs - ${rank + 1}${['th', 'st', 'nd', 'rd'][rank + 1] || 'th'} Seed`, color: 'text-blue-400', icon: Medal };
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading standings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fadeInUp">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-1 sm:mb-2">Team Standings</h1>
        <p className="text-gray-400 text-sm sm:text-base">Current season rankings and records</p>
      </div>

      {/* Playoff Picture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="lg:col-span-2 glass-card p-3 sm:p-4 border-2 border-emerald-500/30">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 flex items-center">
            <Crown className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-yellow-400" />
            Playoff Seeding (Top 10)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {standings.slice(0, 10).map((team, idx) => {
              const status = getPlayoffStatus(idx);
              const StatusIcon = status?.icon;
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer text-sm" onClick={() => navigate(`/team/${team.team}`)}>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <span className="text-gray-400 font-bold w-6">#{idx + 1}</span>
                    {StatusIcon && <StatusIcon className={`w-3 sm:w-4 h-3 sm:h-4 ${status.color}`} />}
                    <span className="font-bold text-white">{team.team}</span>
                    {status && (
                      <span className={`text-xs font-bold ${status.color}`}>
                        {status.indicator}
                      </span>
                    )}
                  </div>
                  <span className="text-emerald-400 font-semibold text-sm">{team.wins}-{team.losses}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3">Quick Stats</h3>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-gray-400">Total Teams:</span>
              <span className="text-white font-semibold">{standings.length}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-gray-400">Playoff Teams:</span>
              <span className="text-emerald-400 font-semibold">10</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-gray-400">Regular Season:</span>
              <span className="text-blue-400 font-semibold">8 Weeks</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-gray-400">Leading Team:</span>
              <span className="text-white font-semibold">{standings[0]?.team || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-gray-400">Best Record:</span>
              <span className="text-emerald-400 font-semibold">
                {standings[0] ? `${standings[0].wins}-${standings[0].losses}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4">RANK</th>
                <th className="text-left py-3 px-4">TEAM</th>
                <th className="text-center py-3 px-2">W</th>
                <th className="text-center py-3 px-2">L</th>
                <th className="text-center py-3 px-2">PCT</th>
                <th className="text-center py-3 px-2">PF</th>
                <th className="text-center py-3 px-2">PA</th>
                <th className="text-center py-3 px-2">DIFF</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => {
                const playoffStatus = getPlayoffStatus(idx);
                const isPlayoffTeam = idx < 10;
                const StatusIcon = playoffStatus?.icon;
                
                return (
                  <tr
                    key={idx}
                    className={`group cursor-pointer border-b border-gray-800 hover:bg-white/5 transition-all ${
                      isPlayoffTeam ? 'bg-emerald-500/5' : ''
                    }`}
                    onClick={() => navigate(`/team/${team.team}`)}
                    data-testid={`standing-${idx}`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {idx < 3 && (
                          <Trophy className={`w-5 h-5 ${
                            idx === 0 ? 'text-yellow-500' :
                            idx === 1 ? 'text-gray-400' :
                            'text-orange-600'
                          }`} />
                        )}
                        <span className="font-bold text-gray-400">{idx + 1}</span>
                        {idx === 9 && (
                          <div className="w-1 h-6 bg-emerald-500/50 ml-2"></div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {playoffStatus && StatusIcon && (
                          <StatusIcon className={`w-4 h-4 ${playoffStatus.color}`} />
                        )}
                        {playoffStatus && (
                          <span className={`font-bold text-xs ${playoffStatus.color}`}>
                            {playoffStatus.indicator}
                          </span>
                        )}
                        <span className="font-bold text-white text-lg hover:text-emerald-400 transition-colors">
                          {team.team}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-2">
                      <span className="text-emerald-400 font-bold text-lg">{team.wins}</span>
                    </td>
                    <td className="text-center py-4 px-2">
                      <span className="text-red-400 font-bold text-lg">{team.losses}</span>
                    </td>
                    <td className="text-center py-4 px-2">
                      <span className="font-semibold text-white">{(team.win_pct * 100).toFixed(1)}%</span>
                    </td>
                    <td className="text-center py-4 px-2">
                      <span className="text-blue-400 font-semibold">{team.points_for}</span>
                    </td>
                    <td className="text-center py-4 px-2">
                      <span className="text-purple-400 font-semibold">{team.points_against}</span>
                    </td>
                    <td className="text-center py-4 px-2">
                      <div className="flex items-center justify-center space-x-2">
                        {team.point_diff > 0 ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-400 font-bold">+{team.point_diff}</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <span className="text-red-400 font-bold">{team.point_diff}</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {standings.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No standings data yet</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="glass-card mt-6 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        <h3 className="text-lg font-bold text-white mb-4">Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="text-emerald-400 font-semibold mb-2">Statistics</h4>
            <div>
              <span className="text-gray-400">W:</span>
              <span className="text-white ml-2">Wins</span>
            </div>
            <div>
              <span className="text-gray-400">L:</span>
              <span className="text-white ml-2">Losses</span>
            </div>
            <div>
              <span className="text-gray-400">PCT:</span>
              <span className="text-white ml-2">Winning Percentage</span>
            </div>
            <div>
              <span className="text-gray-400">PF:</span>
              <span className="text-white ml-2">Points For</span>
            </div>
            <div>
              <span className="text-gray-400">PA:</span>
              <span className="text-white ml-2">Points Against</span>
            </div>
            <div>
              <span className="text-gray-400">DIFF:</span>
              <span className="text-white ml-2">Point Differential</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-yellow-400 font-semibold mb-2">Playoff Indicators</h4>
            <div className="flex items-center">
              <Crown className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-yellow-400 font-bold mr-2">x -</span>
              <span className="text-white">Clinched Playoffs (1st Seed)</span>
            </div>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-emerald-400 mr-2" />
              <span className="text-emerald-400 font-bold mr-2">y -</span>
              <span className="text-white">Clinched Playoffs (2nd Seed)</span>
            </div>
            <div className="flex items-center">
              <Medal className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-400 font-bold mr-2">z -</span>
              <span className="text-white">Clinched Playoffs (3rd-10th Seed)</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-purple-400 font-semibold mb-2">Playoff Format</h4>
            <div className="text-gray-300 space-y-1">
              <p>• Top 10 teams make playoffs</p>
              <p>• Seeds 1-2 get first-round bye</p>
              <p>• Week 9: Wildcard (4 games)</p>
              <p>• Week 10: Divisional (4 games)</p>
              <p>• Week 11: Semifinals (2 games)</p>
              <p>• Week 12: Championship (1 game)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Standings;