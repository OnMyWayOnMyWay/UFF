import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, TrendingUp, TrendingDown, Crown, Medal, Star, LayoutGrid } from 'lucide-react';
import { TeamLogoAvatar, loadTeamLogos, loadTeamColors, getTeamColors } from '../lib/teamLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Standings = () => {
  const navigate = useNavigate();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState({ "Grand Central": { North: [], South: [] }, Ridge: { North: [], South: [] } });
  const [activeTab, setActiveTab] = useState('league');
  const [conferenceStandings, setConferenceStandings] = useState({ 'Grand Central': [], 'Ridge': [] });
  const [logoMap, setLogoMap] = useState({});
  const [colorMap, setColorMap] = useState({});

  useEffect(() => {
    fetchStandings();
    loadTeamLogos().then(logos => setLogoMap(logos));
    loadTeamColors().then(colors => setColorMap(colors));
  }, []);

  const fetchStandings = async () => {
    try {
      const [standingsRes, structureRes, grandCentralRes, ridgeRes] = await Promise.all([
        axios.get(`${API}/teams/standings`),
        axios.get(`${API}/league/structure`),
        axios.get(`${API}/teams/standings/conference/Grand Central`),
        axios.get(`${API}/teams/standings/conference/Ridge`),
      ]);
      const standingsData = standingsRes.data || [];
      setStandings(Array.isArray(standingsData) ? standingsData : []);
      const s = structureRes.data?.structure;
      if (s && typeof s === 'object') {
        setStructure(s);
      }
      const gcData = grandCentralRes.data || [];
      const rData = ridgeRes.data || [];
      setConferenceStandings({
        'Grand Central': Array.isArray(gcData) ? gcData : [],
        'Ridge': Array.isArray(rData) ? rData : []
      });
    } catch (error) {
      console.error('Error fetching standings/structure:', error);
      setStandings([]);
    } finally {
      setLoading(false);
    }
  };

  // Determine playoff status based on rank
  const getPlayoffStatus = (rank) => {
    // Seeds 1-4 are division leaders (bye to Elite 8)
    if (rank >= 0 && rank <= 3) return { indicator: 'x', label: `Division Leader - #${rank + 1} Seed (Bye to Elite 8)`, color: 'text-yellow-400', icon: Crown };
    // Seeds 5-6 go straight to Elite 8
    if (rank >= 4 && rank <= 5) return { indicator: 'y', label: `Wildcard - #${rank + 1} Seed (Elite 8)`, color: 'text-green-400', icon: Star };
    // Seeds 7-10 play in Playins round
    if (rank >= 6 && rank <= 9) return { indicator: 'z', label: `Playins - #${rank + 1} Seed`, color: 'text-blue-400', icon: Medal };
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

  const StandingsTable = ({ standings, getPlayoffStatus, compact = false, showDivision = false }) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4">RANK</th>
              <th className="text-left py-3 px-4">TEAM</th>
              <th className="text-center py-3 px-2">W</th>
              <th className="text-center py-3 px-2">L</th>
              <th className="text-center py-3 px-2">PCT</th>
              <th className="text-center py-3 px-2">PF</th>
              <th className="text-center py-3 px-2">PA</th>
              <th className="text-center py-3 px-2">DIFF</th>
              {showDivision && <th className="text-center py-3 px-2">DIV</th>}
            </tr>
          </thead>
          <tbody>
            {standings.map((team, idx) => {
              const playoffStatus = getPlayoffStatus(idx);
              const isPlayoffTeam = idx < 10 && !compact;
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
                      {idx < 3 && !compact && (
                        <Trophy className={`w-5 h-5 ${
                          idx === 0 ? 'text-yellow-500' :
                          idx === 1 ? 'text-gray-400' :
                          'text-orange-600'
                        }`} />
                      )}
                      <span className="font-bold text-gray-400">{idx + 1}</span>
                      {idx === 9 && !compact && (
                        <div className="w-1 h-6 bg-emerald-500/50 ml-2"></div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="shrink-0">
                        <TeamLogoAvatar teamName={team.team} logoMap={logoMap} size="md" />
                      </div>
                      <div className="flex items-center space-x-2 min-w-0">
                        {playoffStatus && StatusIcon && (
                          <StatusIcon className={`w-4 h-4 ${playoffStatus.color} shrink-0`} />
                        )}
                        {playoffStatus && (
                          <span className={`font-bold text-xs ${playoffStatus.color} shrink-0`}>
                            {playoffStatus.indicator}
                          </span>
                        )}
                        {(() => {
                          const colors = getTeamColors(team.team, colorMap);
                          return (
                            <div 
                              className="w-1 h-6 rounded shrink-0" 
                              style={{
                                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`
                              }}
                            />
                          );
                        })()}
                        <span className="font-bold text-white hover:text-emerald-400 transition-colors truncate">
                          {team.team}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-2">
                    <span className="text-emerald-400 font-bold">{team.wins}</span>
                  </td>
                  <td className="text-center py-4 px-2">
                    <span className="text-red-400 font-bold">{team.losses}</span>
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
                    <div className="flex items-center justify-center space-x-1">
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
                  {showDivision && (
                    <td className="text-center py-4 px-2">
                      <span className="text-gray-400 font-semibold">{team.division}</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {standings.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No standings data yet</p>
          </div>
        )}
      </div>
    );
  };

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
            Playoff Picture (Top 5 per Conference)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-emerald-400 font-semibold mb-2">Grand Central</p>
              <div className="space-y-1">
                {standings.slice(0, 5).map((team, idx) => {
                  const status = getPlayoffStatus(idx);
                  const StatusIcon = status?.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer text-xs" onClick={() => navigate(`/team/${team.team}`)}>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 font-bold w-5">#{idx + 1}</span>
                        {StatusIcon && <StatusIcon className={`w-3 h-3 ${status.color}`} />}
                        <span className="font-bold text-white truncate">{team.team}</span>
                      </div>
                      <span className="text-emerald-400 font-semibold">{team.wins}-{team.losses}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-blue-400 font-semibold mb-2">Ridge</p>
              <div className="space-y-1">
                {standings.slice(0, 5).map((team, idx) => {
                  const status = getPlayoffStatus(idx);
                  const StatusIcon = status?.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer text-xs" onClick={() => navigate(`/team/${team.team}`)}>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 font-bold w-5">#{idx + 1}</span>
                        {StatusIcon && <StatusIcon className={`w-3 h-3 ${status.color}`} />}
                        <span className="font-bold text-white truncate">{team.team}</span>
                      </div>
                      <span className="text-emerald-400 font-semibold">{team.wins}-{team.losses}</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
              <span className="text-gray-400">Conferences:</span>
              <span className="text-blue-400 font-semibold">2</span>
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

      {/* League Structure: Conferences & Divisions */}
      <div className="glass-card mb-6 animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center mb-4">
          <LayoutGrid className="w-5 h-5 text-emerald-400 mr-2" />
          <h3 className="text-base sm:text-lg font-bold text-white">League Structure</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(structure).map(([confName, divisions]) => (
            <div key={confName} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="text-lg font-bold text-white mb-3">{confName} Conference</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(divisions).map(([divName, teams]) => (
                  <div key={divName} className="rounded-lg bg-white/5 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-300">{divName} Division</span>
                      <span className="text-xs text-gray-400">{teams.length} teams</span>
                    </div>
                    {teams.length === 0 ? (
                      <p className="text-gray-500 text-sm">No teams assigned</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {teams.map((t) => (
                          <li key={t} className="flex justify-between">
                            <span className="text-white/90 hover:text-emerald-400 transition-colors cursor-pointer" onClick={() => navigate(`/team/${t}`)}>
                              {t}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standings Tabs */}
      <div className="glass-card mb-6 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
        <div className="flex flex-wrap border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('league')}
            className={`px-4 py-3 font-semibold border-b-2 transition-all ${
              activeTab === 'league'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            League Standings
          </button>
          <button
            onClick={() => setActiveTab('grand-central')}
            className={`px-4 py-3 font-semibold border-b-2 transition-all ${
              activeTab === 'grand-central'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Grand Central Conference
          </button>
          <button
            onClick={() => setActiveTab('ridge')}
            className={`px-4 py-3 font-semibold border-b-2 transition-all ${
              activeTab === 'ridge'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Ridge Conference
          </button>
        </div>

        {/* League Standings Table */}
        {activeTab === 'league' && (
          <StandingsTable standings={standings} getPlayoffStatus={getPlayoffStatus} />
        )}

        {/* Grand Central Standings Table */}
        {activeTab === 'grand-central' && (
          <div>
            <h4 className="text-lg font-bold text-white mb-4">Grand Central Conference</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-3">North Division</h5>
                <StandingsTable 
                  standings={conferenceStandings['Grand Central'].filter(t => t.division === 'North')}
                  getPlayoffStatus={() => null}
                  compact
                />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-3">South Division</h5>
                <StandingsTable 
                  standings={conferenceStandings['Grand Central'].filter(t => t.division === 'South')}
                  getPlayoffStatus={() => null}
                  compact
                />
              </div>
            </div>
            <div className="mt-6">
              <h5 className="text-sm font-semibold text-gray-300 mb-3">Conference Standings</h5>
              <StandingsTable standings={conferenceStandings['Grand Central']} getPlayoffStatus={() => null} showDivision />
            </div>
          </div>
        )}

        {/* Ridge Standings Table */}
        {activeTab === 'ridge' && (
          <div>
            <h4 className="text-lg font-bold text-white mb-4">Ridge Conference</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-3">North Division</h5>
                <StandingsTable 
                  standings={conferenceStandings['Ridge'].filter(t => t.division === 'North')}
                  getPlayoffStatus={() => null}
                  compact
                />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-3">South Division</h5>
                <StandingsTable 
                  standings={conferenceStandings['Ridge'].filter(t => t.division === 'South')}
                  getPlayoffStatus={() => null}
                  compact
                />
              </div>
            </div>
            <div className="mt-6">
              <h5 className="text-sm font-semibold text-gray-300 mb-3">Conference Standings</h5>
              <StandingsTable standings={conferenceStandings['Ridge']} getPlayoffStatus={() => null} showDivision />
            </div>
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
              <span className="text-white">Division Leader (#1-4 Seed, Bye to Elite 8)</span>
            </div>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-green-400 font-bold mr-2">y -</span>
              <span className="text-white">Wildcard (#5-6 Seed, Elite 8)</span>
            </div>
            <div className="flex items-center">
              <Medal className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-400 font-bold mr-2">z -</span>
              <span className="text-white">Playins (#7-10 Seed)</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-purple-400 font-semibold mb-2">Playoff Format</h4>
            <div className="text-gray-300 space-y-1">
              <p>• 10-team playoff bracket</p>
              <p>• Seeds 1-4: Division leaders (bye to Elite 8)</p>
              <p>• Seeds 5-6: Wildcards (straight to Elite 8)</p>
              <p>• Seeds 7-10: Playins round</p>
              <p>• Elite 8 → Final 4 → United Flag Bowl</p>
              <p>• Conference champions meet in final</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Standings;