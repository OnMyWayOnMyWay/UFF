import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
      setStandings(response.data);
    } catch (error) {
      console.error('Error fetching standings:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2">Team Standings</h1>
        <p className="text-gray-400">Current season rankings and records</p>
      </div>

      {/* Standings Table */}
      <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">RANK</th>
                <th className="text-left">TEAM</th>
                <th className="text-center">W</th>
                <th className="text-center">L</th>
                <th className="text-center">WIN %</th>
                <th className="text-center">PF</th>
                <th className="text-center">PA</th>
                <th className="text-center">DIFF</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, idx) => (
                <tr
                  key={idx}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/team/${team.team}`)}
                  data-testid={`standing-${idx}`}
                >
                  <td>
                    <div className="flex items-center space-x-2">
                      {idx < 3 && (
                        <Trophy className={`w-5 h-5 ${
                          idx === 0 ? 'text-yellow-500' :
                          idx === 1 ? 'text-gray-400' :
                          'text-orange-600'
                        }`} />
                      )}
                      <span className="font-bold text-gray-400">{idx + 1}</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-bold text-white text-lg hover:text-emerald-400 transition-colors">{team.team}</span>
                  </td>
                  <td className="text-center">
                    <span className="text-emerald-400 font-bold text-lg">{team.wins}</span>
                  </td>
                  <td className="text-center">
                    <span className="text-red-400 font-bold text-lg">{team.losses}</span>
                  </td>
                  <td className="text-center">
                    <span className="font-semibold text-white">{(team.win_pct * 100).toFixed(1)}%</span>
                  </td>
                  <td className="text-center">
                    <span className="text-blue-400 font-semibold">{team.points_for}</span>
                  </td>
                  <td className="text-center">
                    <span className="text-purple-400 font-semibold">{team.points_against}</span>
                  </td>
                  <td className="text-center">
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
              ))}
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
      <div className="glass-card mt-6 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-lg font-bold text-white mb-4">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">W:</span>
            <span className="text-white ml-2">Wins</span>
          </div>
          <div>
            <span className="text-gray-400">L:</span>
            <span className="text-white ml-2">Losses</span>
          </div>
          <div>
            <span className="text-gray-400">PF:</span>
            <span className="text-white ml-2">Points For</span>
          </div>
          <div>
            <span className="text-gray-400">PA:</span>
            <span className="text-white ml-2">Points Against</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Standings;