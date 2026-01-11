import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Calendar, ChevronRight, Medal, Crown, Star } from 'lucide-react';
import { TeamLogoAvatar, loadTeamLogos } from '../lib/teamLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Playoffs = () => {
  const [games, setGames] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playoffSeeds, setPlayoffSeeds] = useState(null);
  const [logoMap, setLogoMap] = useState({});
  const [playoffGames, setPlayoffGames] = useState({
    wildcard: [],
    divisional: [],
    semifinals: [],
    championship: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    loadTeamLogos().then(logos => setLogoMap(logos));
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, seedsRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/playoffs/seeds`)
      ]);
      
      const gamesData = Array.isArray(gamesRes.data) ? gamesRes.data : (gamesRes.data.games || []);
      const seedsData = seedsRes.data || {};
      
      setGames(gamesData);
      setPlayoffSeeds(seedsData);
      setStandings(seedsData.standings || []);
      organizePlayoffGames(gamesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizePlayoffGames = (allGames) => {
    // 10-team playoff bracket with byes:
    // Week 9: Wildcard Round (4 games - seeds 3v10, 4v9, 5v8, 6v7; seeds 1 & 2 get byes)
    // Week 10: Divisional Round (4 games - 1v lowest, 2v2nd lowest, other 2 winners play)
    // Week 11: Conference Championships (2 games)
    // Week 12: Championship (1 game)
    
    const wildcard = allGames.filter(g => g.week === 9);
    const divisional = allGames.filter(g => g.week === 10);
    const semifinals = allGames.filter(g => g.week === 11);
    const championship = allGames.find(g => g.week === 12);

    setPlayoffGames({
      wildcard,
      divisional,
      semifinals,
      championship
    });
  };

  const SeedCard = ({ seed, team, record, isBye = false }) => {
    if (!team) {
      return (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 opacity-50">
          <div className="text-center text-gray-500 text-sm">TBD</div>
        </div>
      );
    }

    return (
      <div 
        className={`bg-white/5 border-2 rounded-lg p-3 hover:bg-white/10 transition-all cursor-pointer relative ${
          isBye ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/20'
        }`}
        onClick={() => navigate(`/team/${team}`)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              seed === 1 ? 'bg-yellow-500 text-black' :
              seed === 2 ? 'bg-gray-400 text-black' :
              'bg-gray-700 text-white'
            }`}>
              {seed}
            </div>
            <TeamLogoAvatar teamName={team} logoMap={logoMap} size="sm" />
            <div className="min-w-0">
              <div className="font-bold text-white text-sm leading-tight truncate" title={team}>{team}</div>
              {record && <div className="text-gray-400 text-xs">{record}</div>}
            </div>
          </div>
          {isBye && (
            <div className="text-yellow-500 text-xs font-bold uppercase shrink-0">Bye</div>
          )}
        </div>
      </div>
    );
  };

  const GameCard = ({ game, seed1, seed2, team1, team2, record1, record2, isFinal = false }) => {
    if (!game && !team1 && !team2) {
      return (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
          <div className="text-center text-gray-500 text-sm">TBD</div>
        </div>
      );
    }

    // If we have a game with results
    if (game) {
      const homeWin = game.home_score > game.away_score;
      const awayWin = game.away_score > game.home_score;

      return (
        <div 
          className="bg-white/5 border-2 border-white/20 rounded-lg hover:border-emerald-500/50 transition-all cursor-pointer"
          onClick={() => navigate(`/week/${game.week}`)}
        >
          {isFinal && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-yellow-500/30 p-2 text-center">
              <span className="text-yellow-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4" />
                Championship
              </span>
            </div>
          )}
          
          <div className="p-3 space-y-2">
            <div className={`flex items-center justify-between p-2 rounded ${
              homeWin ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-gray-800/50'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {homeWin && <Trophy className="w-4 h-4 text-emerald-400" />}
                <span className={`font-semibold truncate ${homeWin ? 'text-emerald-400' : 'text-gray-300'}`} title={game.home_team}>
                  {game.home_team}
                </span>
              </div>
              <span className={`text-xl font-bold ${homeWin ? 'text-emerald-400' : 'text-gray-400'}`}>
                {game.home_score}
              </span>
            </div>

            <div className={`flex items-center justify-between p-2 rounded ${
              awayWin ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-gray-800/50'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {awayWin && <Trophy className="w-4 h-4 text-emerald-400" />}
                <span className={`font-semibold truncate ${awayWin ? 'text-emerald-400' : 'text-gray-300'}`} title={game.away_team}>
                  {game.away_team}
                </span>
              </div>
              <span className={`text-xl font-bold ${awayWin ? 'text-emerald-400' : 'text-gray-400'}`}>
                {game.away_score}
              </span>
            </div>
          </div>

          {game.game_date && (
            <div className="px-3 pb-2 text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(game.game_date).toLocaleDateString()}
            </div>
          )}
        </div>
      );
    }

    // If we only have seed/team info (predicted matchup)
    return (
      <div className="bg-white/5 border-2 border-gray-700/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
          <div className="flex items-center gap-2 min-w-0">
            {seed1 && (
              <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                seed1 === 1 ? 'bg-yellow-500 text-black' :
                seed1 === 2 ? 'bg-gray-400 text-black' :
                'bg-gray-700 text-white'
              }`}>
                {seed1}
              </div>
            )}
            <span className="font-semibold text-gray-300 truncate" title={team1 || 'TBD'}>{team1 || 'TBD'}</span>
          </div>
          {record1 && <span className="text-xs text-gray-500">{record1}</span>}
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
          <div className="flex items-center gap-2 min-w-0">
            {seed2 && (
              <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                seed2 === 1 ? 'bg-yellow-500 text-black' :
                seed2 === 2 ? 'bg-gray-400 text-black' :
                'bg-gray-700 text-white'
              }`}>
                {seed2}
              </div>
            )}
            <span className="font-semibold text-gray-300 truncate" title={team2 || 'TBD'}>{team2 || 'TBD'}</span>
          </div>
          {record2 && <span className="text-xs text-gray-500">{record2}</span>}
        </div>
      </div>
    );
  };

  const BracketMatchCard = ({
    title,
    game,
    seedTop,
    seedBottom,
    teamTop,
    teamBottom,
    recordTop,
    recordBottom,
    variant = 'default', // default | final
    compact = false,
    accentClass = 'bg-slate-300'
  }) => {
    const isTbd = !game && !teamTop && !teamBottom;

    const rows = (() => {
      if (game) {
        const topTeam = game.home_team;
        const bottomTeam = game.away_team;
        const topScore = game.home_score;
        const bottomScore = game.away_score;
        const topWin = topScore > bottomScore;
        const bottomWin = bottomScore > topScore;
        return {
          top: { name: topTeam, score: topScore, win: topWin },
          bottom: { name: bottomTeam, score: bottomScore, win: bottomWin },
          status: game.game_date ? new Date(game.game_date).toLocaleDateString() : null
        };
      }

      return {
        top: { name: teamTop || 'TBD', score: null, win: false },
        bottom: { name: teamBottom || 'TBD', score: null, win: false },
        status: null
      };
    })();

    const seedChip = (seed) => {
      if (!seed) return null;
      return (
        <div className="w-6 h-6 rounded-md bg-white/30 text-white/90 border border-white/25 backdrop-blur-sm flex items-center justify-center text-xs font-bold shrink-0">
          {seed}
        </div>
      );
    };

    const TeamName = ({ name, win, compactName = false }) => (
      <div
        className={
          compactName
            ? `text-[13px] font-semibold truncate ${win ? 'text-emerald-200' : 'text-white/90'}`
            : `text-[clamp(12px,1.1vw,14px)] font-semibold leading-snug break-words overflow-hidden ${win ? 'text-emerald-200' : 'text-white/90'}`
        }
        style={compactName ? undefined : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        title={name}
      >
        {name}
      </div>
    );

    return (
      <div
        className={
          variant === 'final'
            ? 'relative rounded-2xl overflow-hidden shadow-xl border border-white/25 bg-white/10 backdrop-blur-xl'
            : 'relative rounded-2xl overflow-hidden shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl'
        }
      >
        {variant !== 'final' && (
          <div className={`absolute left-0 top-0 h-full w-[5px] ${accentClass}`} />
        )}
        {title && (
          <div className="px-4 py-2 text-[11px] font-semibold tracking-widest text-white/70 uppercase bg-white/10 border-b border-white/15">
            {title}
          </div>
        )}

        {variant === 'final' && (
          <div className="px-4 py-3 bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-white">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold tracking-widest uppercase opacity-90">Final</div>
              <Trophy className="w-4 h-4" />
            </div>
          </div>
        )}

        <div className={compact ? 'p-3' : 'p-4'}>
          {isTbd ? (
            <div className="h-16 flex items-center justify-center text-white/50 text-sm font-medium">TBD</div>
          ) : (
            <div className="space-y-2">
              <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${rows.top.win ? 'bg-emerald-500/15 border border-emerald-400/25' : 'bg-white/8 border border-white/15'}`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {seedChip(seedTop)}
                  <div className="min-w-0">
                    <TeamName name={rows.top.name} win={rows.top.win} compactName={compact} />
                    {recordTop && !game && <div className="text-[11px] text-white/55">{recordTop}</div>}
                  </div>
                </div>
                {rows.top.score !== null && (
                  <div className={`text-sm font-bold tabular-nums ${rows.top.win ? 'text-emerald-200' : 'text-white/70'}`}>{rows.top.score}</div>
                )}
              </div>

              <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${rows.bottom.win ? 'bg-emerald-500/15 border border-emerald-400/25' : 'bg-white/8 border border-white/15'}`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {seedChip(seedBottom)}
                  <div className="min-w-0">
                    <TeamName name={rows.bottom.name} win={rows.bottom.win} compactName={compact} />
                    {recordBottom && !game && <div className="text-[11px] text-white/55">{recordBottom}</div>}
                  </div>
                </div>
                {rows.bottom.score !== null && (
                  <div className={`text-sm font-bold tabular-nums ${rows.bottom.win ? 'text-emerald-200' : 'text-white/70'}`}>{rows.bottom.score}</div>
                )}
              </div>

              {rows.status && (
                <div className="pt-1 text-[11px] text-white/55 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {rows.status}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading playoff bracket...</p>
        </div>
      </div>
    );
  }

  // Get playoff seeded teams organized by conference
  const getPlayoffTeams = () => {
    if (!playoffSeeds || !playoffSeeds.seeds) return { 'Grand Central': [], 'Ridge': [] };
    
    const teams = {
      'Grand Central': [],
      'Ridge': []
    };

    playoffSeeds.seeds.forEach(s => {
      const teamData = standings.find(st => st.team === s.team);
      const teamWithRecord = {
        ...s,
        wins: teamData?.wins || s.wins || 0,
        losses: teamData?.losses || s.losses || 0
      };
      
      // Determine conference - this is set in the backend
      const conference = s.conference || 'Grand Central'; // fallback for safety
      if (teams[conference]) {
        teams[conference].push(teamWithRecord);
      }
    });

    return teams;
  };

  const playoffTeamsByConference = getPlayoffTeams();
  const getTeamRecord = (team) => {
    const t = standings.find(s => s.team === team);
    return t ? `${t.wins}-${t.losses}` : '';
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center glow-yellow">
            <Trophy className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-2">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Playoff Bracket
          </span>
        </h1>
        <p className="text-gray-400 text-lg">Road to the Championship</p>
      </div>

      {/* Playoff Seeds */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="glass-card p-6 rounded-xl border border-white/10">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            Playoff Seeds
          </h3>
          
          {Object.keys(playoffTeamsByConference).some(conf => playoffTeamsByConference[conf].length > 0) ? (
            <div className="space-y-10">
              {/* Grand Central Conference */}
              <div>
                <h4 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  Grand Central Conference
                </h4>
                <div className="space-y-6">
                  {/* Seeds 1-2: Division Leaders (Bye) */}
                  <div>
                    <h5 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      Seeds 1-2 (Division Leaders - Bye to Round 2)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {playoffTeamsByConference['Grand Central'].filter(t => t.seed <= 2).map((team) => (
                        <div key={team.seed} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <TeamLogoAvatar teamName={team.team} logoMap={logoMap} size="sm" />
                              <div className="w-7 h-7 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-sm">
                                {team.seed}
                              </div>
                            </div>
                            <Crown className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div className="font-semibold text-sm text-gray-200 mb-1" title={team.team}>{team.team}</div>
                          <div className="text-xs text-gray-400">{team.wins}-{team.losses}</div>
                          <div className="text-xs text-yellow-400 mt-1">Division Leader</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seeds 3-5: Wildcards */}
                  <div>
                    <h5 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Seeds 3-5 (Wildcards - Play-In Round)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {playoffTeamsByConference['Grand Central'].filter(t => t.seed >= 3 && t.seed <= 5).map((team) => (
                        <div key={team.seed} className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <TeamLogoAvatar teamName={team.team} logoMap={logoMap} size="sm" />
                              <div className="w-7 h-7 bg-green-500 text-black rounded-full flex items-center justify-center font-bold text-sm">
                                {team.seed}
                              </div>
                            </div>
                            <Star className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="font-semibold text-sm text-gray-200 mb-1" title={team.team}>{team.team}</div>
                          <div className="text-xs text-gray-400">{team.wins}-{team.losses}</div>
                          <div className="text-xs text-green-400 mt-1">Wildcard</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ridge Conference */}
              <div className="pt-6 border-t border-white/10">
                <h4 className="text-xl font-bold text-orange-400 mb-6 flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                  Ridge Conference
                </h4>
                <div className="space-y-6">
                  {/* Seeds 1-2: Division Leaders (Bye) */}
                  <div>
                    <h5 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      Seeds 1-2 (Division Leaders - Bye to Round 2)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {playoffTeamsByConference['Ridge'].filter(t => t.seed <= 2).map((team) => (
                        <div key={team.seed} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <TeamLogoAvatar teamName={team.team} logoMap={logoMap} size="sm" />
                              <div className="w-7 h-7 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-sm">
                                {team.seed}
                              </div>
                            </div>
                            <Crown className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div className="font-semibold text-sm text-gray-200 mb-1" title={team.team}>{team.team}</div>
                          <div className="text-xs text-gray-400">{team.wins}-{team.losses}</div>
                          <div className="text-xs text-yellow-400 mt-1">Division Leader</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seeds 3-5: Wildcards */}
                  <div>
                    <h5 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Seeds 3-5 (Wildcards - Play-In Round)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {playoffTeamsByConference['Ridge'].filter(t => t.seed >= 3 && t.seed <= 5).map((team) => (
                        <div key={team.seed} className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <TeamLogoAvatar teamName={team.team} logoMap={logoMap} size="sm" />
                              <div className="w-7 h-7 bg-green-500 text-black rounded-full flex items-center justify-center font-bold text-sm">
                                {team.seed}
                              </div>
                            </div>
                            <Star className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="font-semibold text-sm text-gray-200 mb-1" title={team.team}>{team.team}</div>
                          <div className="text-xs text-gray-400">{team.wins}-{team.losses}</div>
                          <div className="text-xs text-green-400 mt-1">Wildcard</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Playoff Structure Info */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl p-5 mt-6">
                <h4 className="text-lg font-semibold mb-3 text-blue-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Conference-Based Playoff Structure
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
                    <span><strong>Within Each Conference:</strong> Seeds 1-5 (5 teams per conference)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-yellow-400 shrink-0" />
                    <span><strong>Seeds 1-2:</strong> Division leaders get bye to Round 2</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-green-400 shrink-0" />
                    <span><strong>Seeds 3-5:</strong> Wildcards play in Round 1</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" />
                    <span><strong>All matchups:</strong> Within-conference only</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No playoff seeds available yet</p>
          )}
        </div>
      </div>

      {/* Bracket Container - Conference-Based */}
      <div className="max-w-7xl mx-auto">
        {/* For each conference, show a simplified bracket */}
        {['Grand Central', 'Ridge'].map(conference => {
          const confTeams = playoffTeamsByConference[conference];
          if (confTeams.length === 0) return null;

          return (
            <div key={conference} className="mb-12">
              <div className="rounded-3xl bg-white/8 backdrop-blur-2xl border border-white/15 shadow-2xl p-6">
                {/* Conference Header */}
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2">
                    {conference === 'Grand Central' ? (
                      <span className="text-blue-400">{conference} Conference</span>
                    ) : (
                      <span className="text-orange-400">{conference} Conference</span>
                    )}
                  </h2>
                  <p className="text-gray-400">5-team conference bracket</p>
                </div>

                {/* Conference Bracket Info */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                  <h4 className="font-bold text-sm mb-3 text-gray-300">Seeds</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {confTeams.sort((a, b) => a.seed - b.seed).map(team => (
                      <div key={team.seed} className={`p-2 rounded-lg text-center text-xs ${
                        team.seed <= 2 
                          ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-200' 
                          : 'bg-green-500/20 border border-green-500/30 text-green-200'
                      }`}>
                        <div className="font-bold">{team.seed}</div>
                        <div className="text-[10px] truncate" title={team.team}>{team.team}</div>
                        <div className="text-[9px] opacity-70">{team.wins}W-{team.losses}L</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Round 1: Play-In (Seeds 3-5) */}
                <div className="space-y-4 mb-8">
                  <h4 className="text-lg font-bold text-green-400 flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5" />
                    Round 1: Play-In (Seeds 3-5)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Matchup 1: Seed 3 vs Seed 5 */}
                    <div className="glass-card p-4 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-2 border-green-500/30">
                      <div className="text-center text-green-400 text-xs font-semibold mb-3 uppercase">Matchup 1</div>
                      <div className="space-y-2">
                        {[
                          { seed: 3, team: confTeams.find(t => t.seed === 3) },
                          { seed: 5, team: confTeams.find(t => t.seed === 5) }
                        ].map(item => item.team && (
                          <div key={item.seed} className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TeamLogoAvatar teamName={item.team.team} logoMap={logoMap} size="xs" />
                              <div className="w-6 h-6 bg-green-500 text-white rounded flex items-center justify-center font-bold text-xs">
                                {item.seed}
                              </div>
                              <span className="text-sm font-semibold text-gray-200">{item.team.team}</span>
                            </div>
                            <span className="text-xs text-gray-400">{item.team.wins}-{item.team.losses}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Matchup 2: Seed 4 gets bye, faces winner of 3v5 */}
                    <div className="glass-card p-4 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-2 border-yellow-500/30">
                      <div className="text-center text-yellow-400 text-xs font-semibold mb-3 uppercase">Seed 4 → Round 2</div>
                      {confTeams.find(t => t.seed === 4) && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TeamLogoAvatar teamName={confTeams.find(t => t.seed === 4).team} logoMap={logoMap} size="xs" />
                            <div className="w-6 h-6 bg-yellow-500 text-black rounded flex items-center justify-center font-bold text-xs">
                              4
                            </div>
                            <span className="text-sm font-semibold text-gray-200">{confTeams.find(t => t.seed === 4).team}</span>
                          </div>
                          <span className="text-xs text-gray-400">{confTeams.find(t => t.seed === 4).wins}-{confTeams.find(t => t.seed === 4).losses}</span>
                        </div>
                      )}
                      <div className="text-xs text-yellow-600 mt-2 text-center font-semibold">Bye to Semifinals</div>
                    </div>
                  </div>
                </div>

                {/* Round 2: Semifinals (Seeds 1, 2 + Winners) */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-purple-400 flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5" />
                    Round 2: Semifinals
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Semifinal 1: Seed 1 vs Winner of 3v5 */}
                    <div className="glass-card p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-2 border-purple-500/30">
                      <div className="text-center text-purple-400 text-xs font-semibold mb-3 uppercase">Semifinal 1</div>
                      <div className="space-y-2">
                        {confTeams.find(t => t.seed === 1) && (
                          <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TeamLogoAvatar teamName={confTeams.find(t => t.seed === 1).team} logoMap={logoMap} size="xs" />
                              <div className="w-6 h-6 bg-yellow-500 text-black rounded flex items-center justify-center font-bold text-xs">
                                1
                              </div>
                              <span className="text-sm font-semibold text-gray-200">{confTeams.find(t => t.seed === 1).team}</span>
                            </div>
                          </div>
                        )}
                        <div className="text-center text-xs text-gray-500 py-1">vs</div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                          <div className="text-center text-xs text-gray-400">Winner of 3 vs 5</div>
                        </div>
                      </div>
                    </div>

                    {/* Semifinal 2: Seed 2 vs Seed 4 */}
                    <div className="glass-card p-4 bg-gradient-to-br from-pink-500/5 to-rose-500/5 border-2 border-pink-500/30">
                      <div className="text-center text-pink-400 text-xs font-semibold mb-3 uppercase">Semifinal 2</div>
                      <div className="space-y-2">
                        {confTeams.find(t => t.seed === 2) && (
                          <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TeamLogoAvatar teamName={confTeams.find(t => t.seed === 2).team} logoMap={logoMap} size="xs" />
                              <div className="w-6 h-6 bg-gray-400 text-black rounded flex items-center justify-center font-bold text-xs">
                                2
                              </div>
                              <span className="text-sm font-semibold text-gray-200">{confTeams.find(t => t.seed === 2).team}</span>
                            </div>
                          </div>
                        )}
                        <div className="text-center text-xs text-gray-500 py-1">vs</div>
                        {confTeams.find(t => t.seed === 4) && (
                          <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TeamLogoAvatar teamName={confTeams.find(t => t.seed === 4).team} logoMap={logoMap} size="xs" />
                              <div className="w-6 h-6 bg-gray-700 text-white rounded flex items-center justify-center font-bold text-xs">
                                4
                              </div>
                              <span className="text-sm font-semibold text-gray-200">{confTeams.find(t => t.seed === 4).team}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conference Championship */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="text-lg font-bold text-yellow-400 flex items-center gap-2 mb-4">
                    <Crown className="w-5 h-5" />
                    Conference Championship
                  </h4>
                  <div className="glass-card p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30">
                    <div className="text-center text-yellow-400 text-xs font-semibold mb-3 uppercase">Winner advances to United Flag Bowl</div>
                    <div className="text-center text-gray-400 text-sm">
                      Winner of Semifinal 1 vs Winner of Semifinal 2
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* United Flag Bowl */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="rounded-3xl bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 shadow-2xl p-1">
            <div className="bg-gray-900 rounded-3xl p-6">
              <div className="text-center mb-4">
                <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-2" />
              </div>
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
                UNITED FLAG BOWL
              </h2>
              <p className="text-center text-gray-300">
                Grand Central Champion vs Ridge Champion
              </p>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Playoffs;
