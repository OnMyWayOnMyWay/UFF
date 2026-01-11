import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Calendar, ChevronRight, Medal, Crown, Star } from 'lucide-react';
import { TeamLogoAvatar, loadTeamLogos } from '../lib/teamLogos';
import AnimatedBracket from '../components/AnimatedBracket';

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
    // 10-team playoff bracket structure:
    // Week 9: Play-Ins (4 games - seeds 7v10, 8v9, 3v6, 4v5)
    // Week 10: Elite 8 (4 games - winners play seeds 1,2,3,4 who had byes)
    // Week 11: Final 4 / Conference Championships (2 games)
    // Week 12: Championship (1 game)
    
    const playins = allGames.filter(g => g.week === 9);
    const elite8 = allGames.filter(g => g.week === 10);
    const final4 = allGames.filter(g => g.week === 11);
    const championship = allGames.find(g => g.week === 12);

    setPlayoffGames({
      wildcard: playins,
      divisional: elite8,
      semifinals: final4,
      championship
    });
  };

  // Get conference-based seed label (e.g., "GC-1" for Grand Central 1st seed)
  const getConferenceSeedLabel = (overallSeed) => {
    if (!playoffSeeds || !playoffSeeds.seeds) return `#${overallSeed}`;
    
    const seed = playoffSeeds.seeds.find(s => s.seed === overallSeed);
    if (!seed) return `#${overallSeed}`;
    
    const confAbbrev = seed.conference === 'Grand Central' ? 'GC' : 'Ridge';
    // Count how many seeds from this conference are ranked equal or better
    const conferenceSeeds = playoffSeeds.seeds
      .filter(s => s.conference === seed.conference)
      .sort((a, b) => a.seed - b.seed);
    
    const confRank = conferenceSeeds.findIndex(s => s.seed === overallSeed) + 1;
    return `${confAbbrev}-${confRank}`;
  };

  const SeedCard = ({ seed, team, record, isBye = false }) => {
    if (!team) {
      return (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 opacity-50">
          <div className="text-center text-gray-500 text-sm">TBD</div>
        </div>
      );
    }

    const confLabel = getConferenceSeedLabel(seed);

    return (
      <div 
        className={`bg-white/5 border-2 rounded-lg p-3 hover:bg-white/10 transition-all cursor-pointer relative ${
          isBye ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/20'
        }`}
        onClick={() => navigate(`/team/${team}`)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`shrink-0 flex flex-col items-center justify-center ${
              seed === 1 ? 'bg-yellow-500 text-black' :
              seed === 2 ? 'bg-gray-400 text-black' :
              'bg-gray-700 text-white'
            } rounded-lg px-2 py-1`}>
              <div className="font-bold text-sm leading-tight">{seed}</div>
              <div className="text-xs opacity-90">{confLabel}</div>
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

      {/* Animated Bracket Section */}
      {games.length > 0 && playoffSeeds && (
        <div className="max-w-7xl mx-auto mb-12 glass-card p-6 rounded-xl border border-white/10">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ✨ Animated Tournament
            </span>
          </h2>
          <AnimatedBracket 
            playoffSeeds={playoffSeeds}
            games={games}
            logoMap={logoMap}
          />
        </div>
      )}

      {/* Playoff Bracket - 10 Teams Tournament Style */}
      {playoffSeeds && playoffSeeds.seeds && playoffSeeds.seeds.length > 0 ? (
        <div className="max-w-7xl mx-auto mb-8">
          {/* Playoff Structure Header */}
          <div className="mb-8">
            <div className="glass-card p-6 rounded-xl border border-white/10">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-400" />
                UFB XXI Playoff Bracket
              </h3>
              <p className="text-gray-400 mb-4">10-team single-elimination tournament</p>
              
              {/* Seeds Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                {/* Seeds 1-2 */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-yellow-400 mb-3 text-sm">Bye to Elite 8</h4>
                  <div className="space-y-2">
                    {playoffSeeds.seeds.filter(s => s.seed <= 2).map(seed => (
                      <div key={seed.seed} className="text-sm text-gray-300">
                        <div className="font-semibold">{seed.seed}. {seed.team}</div>
                        <div className="text-xs text-gray-400">{seed.wins}W-{seed.losses}L • {getConferenceSeedLabel(seed.seed)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seeds 3-6 */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-blue-400 mb-3 text-sm">Elite 8 Entry</h4>
                  <div className="space-y-2">
                    {playoffSeeds.seeds.filter(s => s.seed >= 3 && s.seed <= 6).map(seed => (
                      <div key={seed.seed} className="text-sm text-gray-300">
                        <div className="font-semibold">{seed.seed}. {seed.team}</div>
                        <div className="text-xs text-gray-400">{seed.wins}W-{seed.losses}L • {getConferenceSeedLabel(seed.seed)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seeds 7-10 */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-green-400 mb-3 text-sm">Play-In Round</h4>
                  <div className="space-y-2">
                    {playoffSeeds.seeds.filter(s => s.seed >= 7 && s.seed <= 10).map(seed => (
                      <div key={seed.seed} className="text-sm text-gray-300">
                        <div className="font-semibold">{seed.seed}. {seed.team}</div>
                        <div className="text-xs text-gray-400">{seed.wins}W-{seed.losses}L • {getConferenceSeedLabel(seed.seed)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Structure Info */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-purple-400 mb-3 text-sm">Tournament Structure</h4>
                  <div className="space-y-1 text-xs text-gray-300">
                    <div>📍 <strong>Play-Ins:</strong> Seeds 7-10</div>
                    <div>📍 <strong>Elite 8:</strong> Seeds 1-6</div>
                    <div>📍 <strong>Final 4:</strong> Conference Champs</div>
                    <div>🏆 <strong>Championship:</strong> UFB XXI</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Play-In Round (Seeds 7-10) */}
          <div className="mb-8">
            <div className="glass-card p-6 rounded-xl border border-green-500/30">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-green-400">
                <Trophy className="w-5 h-5" />
                Play-In Round (Seeds 7-10)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 10 vs 7 */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">Matchup 1: #10 vs #7</div>
                  <div className="space-y-2">
                    {[10, 7].map(seedNum => {
                      const seed = playoffSeeds.seeds.find(s => s.seed === seedNum);
                      return seed ? (
                        <div key={seedNum} className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamLogoAvatar teamName={seed.team} logoMap={logoMap} size="xs" />
                            <div className="w-6 h-6 bg-green-500 text-black rounded flex items-center justify-center font-bold text-xs shrink-0">
                              {seedNum}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">{seed.team}</div>
                              <div className="text-xs text-gray-400">{getConferenceSeedLabel(seedNum)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 ml-2">{seed.wins}-{seed.losses}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* 9 vs 8 */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">Matchup 2: #9 vs #8</div>
                  <div className="space-y-2">
                    {[9, 8].map(seedNum => {
                      const seed = playoffSeeds.seeds.find(s => s.seed === seedNum);
                      return seed ? (
                        <div key={seedNum} className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamLogoAvatar teamName={seed.team} logoMap={logoMap} size="xs" />
                            <div className="w-6 h-6 bg-green-500 text-black rounded flex items-center justify-center font-bold text-xs shrink-0">
                              {seedNum}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">{seed.team}</div>
                              <div className="text-xs text-gray-400">{getConferenceSeedLabel(seedNum)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 ml-2">{seed.wins}-{seed.losses}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Elite 8 Round (Seeds 1-6) */}
          <div className="mb-8">
            <div className="glass-card p-6 rounded-xl border border-blue-500/30">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-400">
                <Trophy className="w-5 h-5" />
                Elite 8 (Seeds 1-6 + Play-In Winners)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1 vs Play-In Winner */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">#1 vs Win (10/7)</div>
                  <div className="space-y-2">
                    {[1].map(seedNum => {
                      const seed = playoffSeeds.seeds.find(s => s.seed === seedNum);
                      return seed ? (
                        <div key={seedNum} className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamLogoAvatar teamName={seed.team} logoMap={logoMap} size="xs" />
                            <div className="w-6 h-6 bg-yellow-500 text-black rounded flex items-center justify-center font-bold text-xs shrink-0">
                              {seedNum}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">{seed.team}</div>
                              <div className="text-xs text-gray-400">{getConferenceSeedLabel(seedNum)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 ml-2">{seed.wins}-{seed.losses}</div>
                        </div>
                      ) : null;
                    })}
                    <div className="text-center text-xs text-gray-500 py-1">vs</div>
                    <div className="flex items-center justify-center bg-white/5 border border-white/10 rounded p-2">
                      <div className="text-xs text-gray-400 text-center">Winner of (10 vs 7)</div>
                    </div>
                  </div>
                </div>

                {/* 8 vs Play-In Winner */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">#8 vs Win (9/8)</div>
                  <div className="space-y-2">
                    {[8].map(seedNum => {
                      const seed = playoffSeeds.seeds.find(s => s.seed === seedNum);
                      return seed ? (
                        <div key={seedNum} className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamLogoAvatar teamName={seed.team} logoMap={logoMap} size="xs" />
                            <div className="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center font-bold text-xs shrink-0">
                              {seedNum}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">{seed.team}</div>
                              <div className="text-xs text-gray-400">{getConferenceSeedLabel(seedNum)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 ml-2">{seed.wins}-{seed.losses}</div>
                        </div>
                      ) : null;
                    })}
                    <div className="text-center text-xs text-gray-500 py-1">vs</div>
                    <div className="flex items-center justify-center bg-white/5 border border-white/10 rounded p-2">
                      <div className="text-xs text-gray-400 text-center">Winner of (9 vs 8)</div>
                    </div>
                  </div>
                </div>

                {/* 2 vs 6 */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">#2 vs #6</div>
                  <div className="space-y-2">
                    {[2, 6].map(seedNum => {
                      const seed = playoffSeeds.seeds.find(s => s.seed === seedNum);
                      return seed ? (
                        <div key={seedNum} className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamLogoAvatar teamName={seed.team} logoMap={logoMap} size="xs" />
                            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                              seedNum === 2 ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'
                            }`}>
                              {seedNum}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">{seed.team}</div>
                              <div className="text-xs text-gray-400">{getConferenceSeedLabel(seedNum)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 ml-2">{seed.wins}-{seed.losses}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* 3 vs 5 */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">#3 vs #5</div>
                  <div className="space-y-2">
                    {[3, 5].map(seedNum => {
                      const seed = playoffSeeds.seeds.find(s => s.seed === seedNum);
                      return seed ? (
                        <div key={seedNum} className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamLogoAvatar teamName={seed.team} logoMap={logoMap} size="xs" />
                            <div className="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center font-bold text-xs shrink-0">
                              {seedNum}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">{seed.team}</div>
                              <div className="text-xs text-gray-400">{getConferenceSeedLabel(seedNum)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 ml-2">{seed.wins}-{seed.losses}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* 4 vs Play-In Winner - This would be the alternate bracket */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">#4 vs #7 (if applicable)</div>
                  <div className="space-y-2">
                    {[4].map(seedNum => {
                      const seed = playoffSeeds.seeds.find(s => s.seed === seedNum);
                      return seed ? (
                        <div key={seedNum} className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamLogoAvatar teamName={seed.team} logoMap={logoMap} size="xs" />
                            <div className="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center font-bold text-xs shrink-0">
                              {seedNum}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-200 truncate">{seed.team}</div>
                              <div className="text-xs text-gray-400">{getConferenceSeedLabel(seedNum)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 ml-2">{seed.wins}-{seed.losses}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final 4 - Conference Championships */}
          <div className="mb-8">
            <div className="glass-card p-6 rounded-xl border border-purple-500/30">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-400">
                <Crown className="w-5 h-5" />
                Final 4 (Conference Championships)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">Grand Central Championship</div>
                  <div className="text-center text-sm text-gray-300">
                    <p className="mb-2">Top seed from</p>
                    <p className="text-purple-400 font-semibold">Elite 8 Winners</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-center text-xs text-gray-400 mb-3 font-semibold uppercase">Ridge Championship</div>
                  <div className="text-center text-sm text-gray-300">
                    <p className="mb-2">Top seed from</p>
                    <p className="text-purple-400 font-semibold">Elite 8 Winners</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Championship - United Flag Bowl */}
          <div className="mb-8">
            <div className="rounded-3xl bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 shadow-2xl p-1">
              <div className="bg-gray-900 rounded-3xl p-8">
                <div className="text-center">
                  <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
                    UFB XXI
                  </h2>
                  <p className="text-xl text-gray-300 mb-2">
                    Championship Game
                  </p>
                  <p className="text-gray-400">
                    Grand Central Champion vs Ridge Champion
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="glass-card p-6 rounded-xl border border-white/10">
            <p className="text-gray-400 text-center">No playoff seeds available yet. Check back after regular season concludes.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playoffs;
