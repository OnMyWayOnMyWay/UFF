import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Calendar, ChevronRight, Medal, Crown, Star } from 'lucide-react';
import { TeamLogoAvatar, loadTeamLogos, loadTeamColors, getTeamColors } from '../lib/teamLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Playoffs = () => {
  const [games, setGames] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playoffSeeds, setPlayoffSeeds] = useState(null);
  const [logoMap, setLogoMap] = useState({});
  const [colorMap, setColorMap] = useState({});
  const [assignments, setAssignments] = useState(null);
  const [playoffGames, setPlayoffGames] = useState({
    conference_championships: [],
    wildcard: [],
    divisional: [],
    semifinals: [],
    championship: null
  });
  const [animateLines, setAnimateLines] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    loadTeamLogos().then(logos => setLogoMap(logos));
    loadTeamColors().then(colors => setColorMap(colors));
  }, []);

  useEffect(() => {
    if (!loading && playoffSeeds) {
      const timer = setTimeout(() => setAnimateLines(true), 200);
      return () => clearTimeout(timer);
    }
  }, [loading, playoffSeeds]);

  const fetchData = async () => {
    try {
      // Fetch playoff seeds for both conferences
      const [gamesRes, gcSeedsRes, ridgeSeedsRes, assignRes, playoffGamesRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/playoffs/seeds/Grand Central`),
        axios.get(`${API}/playoffs/seeds/Ridge`),
        axios.get(`${API}/league/assignments`),
        axios.get(`${API}/playoffs/games`)
      ]);
      
      const gamesData = Array.isArray(gamesRes.data) ? gamesRes.data : (gamesRes.data.games || []);
      const gcSeeds = Array.isArray(gcSeedsRes.data?.seeds) ? gcSeedsRes.data.seeds : [];
      const ridgeSeeds = Array.isArray(ridgeSeedsRes.data?.seeds) ? ridgeSeedsRes.data.seeds : [];
      const assignmentsData = assignRes.data || {};
      const playoffGamesData = Array.isArray(playoffGamesRes.data) ? playoffGamesRes.data : [];
      
      // Combine both conferences' seeds into a single array
      const combinedSeeds = [...gcSeeds, ...ridgeSeeds];
      
      setGames(gamesData);
      setPlayoffSeeds({
        seeds: combinedSeeds,
        gc: gcSeeds,
        ridge: ridgeSeeds
      });
      setAssignments(assignmentsData);
      
      // Organize playoff games by round
      const wcGames = playoffGamesData.filter(g => g.playoff_round === 'wildcard');
      const divGames = playoffGamesData.filter(g => g.playoff_round === 'divisional');
      const confChampGames = playoffGamesData.filter(g => g.playoff_round === 'conference_championship');
      const champGames = playoffGamesData.filter(g => g.playoff_round === 'championship');
      
      setPlayoffGames({
        wildcard: wcGames,
        divisional: divGames,
        conference_championship: confChampGames,
        championship: champGames.length > 0 ? champGames[0] : null
      });
      
      // Also get regular season standings for reference
      const [gcStandingsRes, ridgeStandingsRes] = await Promise.all([
        axios.get(`${API}/teams/standings/conference/Grand Central`),
        axios.get(`${API}/teams/standings/conference/Ridge`)
      ]);
      
      const gcStandings = Array.isArray(gcStandingsRes.data) ? gcStandingsRes.data : [];
      const ridgeStandings = Array.isArray(ridgeStandingsRes.data) ? ridgeStandingsRes.data : [];
      
      setStandings([...gcStandings, ...ridgeStandings].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.point_diff || 0) - (a.point_diff || 0);
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeName = (name = '') => name.toLowerCase().trim();

  const findGameByTeams = (week, teamA, teamB) => {
    if (!teamA || !teamB) return null;
    const target = new Set([normalizeName(teamA), normalizeName(teamB)]);
    return games.find(g => g.week === week && target.has(normalizeName(g.home_team)) && target.has(normalizeName(g.away_team))) || null;
  };

  const findGameBySeeds = (week, seedA, seedB) => {
    const teamA = playoffSeeds?.seeds?.find(s => s.seed === seedA)?.team;
    const teamB = playoffSeeds?.seeds?.find(s => s.seed === seedB)?.team;
    return findGameByTeams(week, teamA, teamB);
  };

  const getWinnerName = (game) => {
    if (!game) return null;
    if (typeof game.home_score !== 'number' || typeof game.away_score !== 'number') return null;
    return game.home_score > game.away_score ? game.home_team : game.away_team;
  };

  const getTeamRecord = (team) => {
    if (!team) return '';
    const match = standings.find(s => normalizeName(s.team) === normalizeName(team));
    if (match) {
      return `${match.wins}-${match.losses}`;
    }
    const seed = playoffSeeds?.seeds?.find(s => normalizeName(s.team) === normalizeName(team));
    if (seed && (seed.wins !== undefined || seed.losses !== undefined)) {
      return `${seed.wins || 0}-${seed.losses || 0}`;
    }
    return '';
  };

  const Connector = ({ delay = 0 }) => (
    <div
      className="hidden lg:block h-[2px] rounded-full bg-gradient-to-r from-emerald-400 via-emerald-200 to-white/60 transition-all duration-700"
      style={{ width: animateLines ? '100%' : '0%', transitionDelay: `${delay}ms` }}
    />
  );

  const RoundColumn = ({ title, subtitle, children }) => (
    <div className="space-y-4">
      <div className="sticky top-2 z-10">
        <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white/90">{title}</div>
            {subtitle && <div className="text-[11px] text-white/60">{subtitle}</div>}
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  // Get conference-based seed label (e.g., "GC-1" for Grand Central 1st seed)
  const getConferenceSeedLabel = (overallSeed) => {
    if (!playoffSeeds || !playoffSeeds.seeds) return `#${overallSeed}`;
    
    const seed = playoffSeeds.seeds.find(s => s.seed === overallSeed);
    if (!seed) return `#${overallSeed}`;
    // Resolve conference with fallback to assignments mapping
    const assignedTeams = assignments?.teams || assignments;
    const assignedConf = assignedTeams && seed?.team
      ? (assignedTeams[seed.team]?.conference || Object.entries(assignedTeams).find(([k]) => k.toLowerCase() === String(seed.team).toLowerCase())?.[1]?.conference)
      : null;
    const conferenceName = seed.conference || assignedConf || null;
    const confAbbrev = conferenceName === 'Grand Central' ? 'GC' : (conferenceName === 'Ridge' ? 'Ridge' : '');
    // Count how many seeds from this conference are ranked equal or better
    const conferenceSeeds = playoffSeeds.seeds
      .filter(s => {
        const sAssignedConf = assignedTeams && s?.team
          ? (assignedTeams[s.team]?.conference || Object.entries(assignedTeams).find(([k]) => k.toLowerCase() === String(s.team).toLowerCase())?.[1]?.conference)
          : null;
        return (s.conference || sAssignedConf) === conferenceName;
      })
      .sort((a, b) => a.seed - b.seed);
    
    const confRank = conferenceSeeds.findIndex(s => s.seed === overallSeed) + 1;
    return confAbbrev ? `${confAbbrev}-${confRank}` : `#${overallSeed}`;
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
            <TeamLogoAvatar teamName={team} logoMap={logoMap} colorMap={colorMap} size="sm" />
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
                                <TeamLogoAvatar teamName={game.home_team} logoMap={logoMap} colorMap={colorMap} size="sm" />
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
                                <TeamLogoAvatar teamName={game.away_team} logoMap={logoMap} colorMap={colorMap} size="sm" />
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
                          {team1 && team1 !== 'TBD' && <TeamLogoAvatar teamName={team1} logoMap={logoMap} colorMap={colorMap} size="sm" />}
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
                          {team2 && team2 !== 'TBD' && <TeamLogoAvatar teamName={team2} logoMap={logoMap} colorMap={colorMap} size="sm" />}
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
              <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${rows.top.win ? 'border' : 'bg-white/8 border border-white/15'}`}
                style={rows.top.win && rows.top.name && rows.top.name !== 'TBD' ? {
                  backgroundColor: `${getTeamColors(rows.top.name, colorMap).primary}20`,
                  borderColor: `${getTeamColors(rows.top.name, colorMap).primary}50`
                } : undefined}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {seedChip(seedTop)}
                                    <TeamLogoAvatar teamName={rows.top.name} logoMap={logoMap} colorMap={colorMap} size="sm" />
                  <div className="min-w-0">
                    <TeamName name={rows.top.name} win={rows.top.win} compactName={compact} />
                    {recordTop && !game && <div className="text-[11px] text-white/55">{recordTop}</div>}
                  </div>
                </div>
                {rows.top.score !== null && (
                  <div className={`text-sm font-bold tabular-nums ${rows.top.win ? 'text-emerald-200' : 'text-white/70'}`}>{rows.top.score}</div>
                )}
              </div>

              <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${rows.bottom.win ? 'border' : 'bg-white/8 border border-white/15'}`}
                style={rows.bottom.win && rows.bottom.name && rows.bottom.name !== 'TBD' ? {
                  backgroundColor: `${getTeamColors(rows.bottom.name, colorMap).primary}20`,
                  borderColor: `${getTeamColors(rows.bottom.name, colorMap).primary}50`
                } : undefined}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {seedChip(seedBottom)}
                                    <TeamLogoAvatar teamName={rows.bottom.name} logoMap={logoMap} colorMap={colorMap} size="sm" />
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

  const seedsByNumber = new Map((playoffSeeds?.seeds || []).map(s => [s.seed, s]));
  const teamForSeed = (n) => seedsByNumber.get(n)?.team || null;

  // Conference Championships (Week 10) - 1v4 and 2v3 per conference
  const confChamp1v4Game = playoffGames.conference_championships?.[0] || null;
  const confChamp2v3Game = playoffGames.conference_championships?.[1] || null;
  const confChamp1v4Winner = getWinnerName(confChamp1v4Game) || (confChamp1v4Game ? null : 'Winner #1 vs #4');
  const confChamp2v3Winner = getWinnerName(confChamp2v3Game) || (confChamp2v3Game ? null : 'Winner #2 vs #3');

  // Wildcard (Week 11) - 5v12, 6v11, 7v10, 8v9
  const wildcard5v12Game = playoffGames.wildcard?.[0] || null;
  const wildcard6v11Game = playoffGames.wildcard?.[1] || null;
  const wildcard7v10Game = playoffGames.wildcard?.[2] || null;
  const wildcard8v9Game = playoffGames.wildcard?.[3] || null;
  const wildcard5v12Winner = getWinnerName(wildcard5v12Game) || (wildcard5v12Game ? null : 'Winner #5 vs #12');
  const wildcard6v11Winner = getWinnerName(wildcard6v11Game) || (wildcard6v11Game ? null : 'Winner #6 vs #11');
  const wildcard7v10Winner = getWinnerName(wildcard7v10Game) || (wildcard7v10Game ? null : 'Winner #7 vs #10');
  const wildcard8v9Winner = getWinnerName(wildcard8v9Game) || (wildcard8v9Game ? null : 'Winner #8 vs #9');

  // Divisional (Week 12) - Conference champs play wildcard winners
  const divisional1Game = playoffGames.divisional?.[0] || null;
  const divisional2Game = playoffGames.divisional?.[1] || null;
  const divisional3Game = playoffGames.divisional?.[2] || null;
  const divisional4Game = playoffGames.divisional?.[3] || null;
  const divisional1Winner = getWinnerName(divisional1Game) || null;
  const divisional2Winner = getWinnerName(divisional2Game) || null;
  const divisional3Winner = getWinnerName(divisional3Game) || null;
  const divisional4Winner = getWinnerName(divisional4Game) || null;

  // Semifinals (Week 13) - Conference Finals
  const semifinal1Game = playoffGames.semifinals?.[0] || null;
  const semifinal2Game = playoffGames.semifinals?.[1] || null;
  const semifinal1Winner = getWinnerName(semifinal1Game) || (semifinal1Game ? null : 'Winner #1');
  const semifinal2Winner = getWinnerName(semifinal2Game) || (semifinal2Game ? null : 'Winner #2');

  // Championship (Week 14)
  const championshipGame = playoffGames.championship || null;

  const roundLabelClass = 'text-[11px] font-semibold tracking-[0.2em] uppercase text-white/70';

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

  // Get division champions from standings
  const getDivisionChampions = () => {
    if (!standings || standings.length === 0) return {};
    
    const divisions = {};
    standings.forEach(team => {
      if (!team.division || !team.conference) return;
      const key = `${team.conference}-${team.division}`;
      if (!divisions[key] || (team.wins > divisions[key].wins || 
         (team.wins === divisions[key].wins && (team.point_diff || 0) > (divisions[key].point_diff || 0)))) {
        divisions[key] = team;
      }
    });
    return divisions;
  };

  const divisionChampions = getDivisionChampions();

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

      {playoffSeeds && playoffSeeds.seeds && playoffSeeds.seeds.length > 0 ? (
        <>
          {/* Division Champions Section */}
          {Object.keys(divisionChampions).length > 0 && (
            <div className="max-w-7xl mx-auto mb-10">
              <div className="glass-card p-4 md:p-6 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-bold text-white">Division Champions</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['Grand Central', 'Ridge'].map(conf => (
                    <div key={conf} className="space-y-2">
                      <h3 className="text-sm font-semibold text-white/70 mb-2">{conf} Conference</h3>
                      {['North', 'South'].map(div => {
                        const key = `${conf}-${div}`;
                        const champ = divisionChampions[key];
                        if (!champ) return null;
                        return (
                          <div 
                            key={key}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                            onClick={() => navigate(`/team/${champ.team}`)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Crown className="w-4 h-4 text-yellow-400 shrink-0" />
                              <TeamLogoAvatar teamName={champ.team} logoMap={logoMap} colorMap={colorMap} size="sm" />
                              <div className="min-w-0">
                                <div className="font-bold text-white text-sm truncate">{champ.team}</div>
                                <div className="text-xs text-gray-400">{div} Division</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-emerald-400 text-sm">{champ.wins}-{champ.losses}</div>
                              <div className="text-xs text-gray-400">{((champ.wins / (champ.wins + champ.losses)) * 100).toFixed(0)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto mb-10 space-y-8">
            <div className="glass-card p-4 md:p-6 rounded-2xl border border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white/60">Seeds 1-4</div>
                  <div className="text-sm text-white/90">Conference Champ = Seeds 1-2 · CC Runners-Up = Seeds 3-4</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <span className="bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded-md border border-yellow-400/40">Elite 8 Entry</span>
                  <span className="bg-blue-500/20 text-blue-200 px-2 py-1 rounded-md border border-blue-400/40">Final 4</span>
                  <span className="bg-green-500/20 text-emerald-200 px-2 py-1 rounded-md border border-emerald-400/40">Play-Ins</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            {/* Conference Championships */}
            <RoundColumn title="Conference Championships" subtitle="Week 10 · Seeds 1v4, 2v3">
              <BracketMatchCard
                title="Conf Champ: #1 vs #4"
                game={confChamp1v4Game}
                seedTop={1}
                seedBottom={4}
                teamTop={teamForSeed(1)}
                teamBottom={teamForSeed(4)}
                recordTop={getTeamRecord(teamForSeed(1))}
                recordBottom={getTeamRecord(teamForSeed(4))}
                compact
                accentClass="bg-purple-400"
              />
              <Connector delay={100} />
              <BracketMatchCard
                title="Conf Champ: #2 vs #3"
                game={confChamp2v3Game}
                seedTop={2}
                seedBottom={3}
                teamTop={teamForSeed(2)}
                teamBottom={teamForSeed(3)}
                recordTop={getTeamRecord(teamForSeed(2))}
                recordBottom={getTeamRecord(teamForSeed(3))}
                compact
                accentClass="bg-purple-400"
              />
            </RoundColumn>

            {/* Wildcard */}
            <RoundColumn title="Wildcard" subtitle="Week 11 · Seeds 5-12">
              <BracketMatchCard
                title="WC: #5 vs #12"
                game={wildcard5v12Game}
                seedTop={5}
                seedBottom={12}
                teamTop={teamForSeed(5)}
                teamBottom={teamForSeed(12)}
                recordTop={getTeamRecord(teamForSeed(5))}
                recordBottom={getTeamRecord(teamForSeed(12))}
                compact
                accentClass="bg-green-400"
              />
              <Connector delay={140} />
              <BracketMatchCard
                title="WC: #6 vs #11"
                game={wildcard6v11Game}
                seedTop={6}
                seedBottom={11}
                teamTop={teamForSeed(6)}
                teamBottom={teamForSeed(11)}
                recordTop={getTeamRecord(teamForSeed(6))}
                recordBottom={getTeamRecord(teamForSeed(11))}
                compact
                accentClass="bg-green-400"
              />
              <Connector delay={180} />
              <BracketMatchCard
                title="WC: #7 vs #10"
                game={wildcard7v10Game}
                seedTop={7}
                seedBottom={10}
                teamTop={teamForSeed(7)}
                teamBottom={teamForSeed(10)}
                recordTop={getTeamRecord(teamForSeed(7))}
                recordBottom={getTeamRecord(teamForSeed(10))}
                compact
                accentClass="bg-green-400"
              />
              <Connector delay={220} />
              <BracketMatchCard
                title="WC: #8 vs #9"
                game={wildcard8v9Game}
                seedTop={8}
                seedBottom={9}
                teamTop={teamForSeed(8)}
                teamBottom={teamForSeed(9)}
                recordTop={getTeamRecord(teamForSeed(8))}
                recordBottom={getTeamRecord(teamForSeed(9))}
                compact
                accentClass="bg-green-400"
              />
            </RoundColumn>

            {/* Divisional */}
            <RoundColumn title="Divisional" subtitle="Week 12 · Playoff Round">
              <BracketMatchCard
                title="Divisional"
                game={divisional1Game}
                seedTop={null}
                seedBottom={null}
                teamTop={confChamp1v4Winner || 'Winner #1/#4'}
                teamBottom={wildcard5v12Winner || 'Winner #5/#12'}
                recordTop={getTeamRecord(confChamp1v4Winner)}
                recordBottom={getTeamRecord(wildcard5v12Winner)}
                compact
                accentClass="bg-blue-400"
              />
              <Connector delay={260} />
              <BracketMatchCard
                title="Divisional"
                game={divisional2Game}
                seedTop={null}
                seedBottom={null}
                teamTop={confChamp2v3Winner || 'Winner #2/#3'}
                teamBottom={wildcard6v11Winner || 'Winner #6/#11'}
                recordTop={getTeamRecord(confChamp2v3Winner)}
                recordBottom={getTeamRecord(wildcard6v11Winner)}
                compact
                accentClass="bg-blue-400"
              />
              <Connector delay={300} />
              <BracketMatchCard
                title="Divisional"
                game={divisional3Game}
                seedTop={null}
                seedBottom={null}
                teamTop={confChamp1v4Winner || 'Winner #1/#4'}
                teamBottom={wildcard7v10Winner || 'Winner #7/#10'}
                recordTop={getTeamRecord(confChamp1v4Winner)}
                recordBottom={getTeamRecord(wildcard7v10Winner)}
                compact
                accentClass="bg-blue-400"
              />
              <Connector delay={340} />
              <BracketMatchCard
                title="Divisional"
                game={divisional4Game}
                seedTop={null}
                seedBottom={null}
                teamTop={confChamp2v3Winner || 'Winner #2/#3'}
                teamBottom={wildcard8v9Winner || 'Winner #8/#9'}
                recordTop={getTeamRecord(confChamp2v3Winner)}
                recordBottom={getTeamRecord(wildcard8v9Winner)}
                compact
                accentClass="bg-blue-400"
              />
            </RoundColumn>

            {/* Semifinals (Conference Finals) */}
            <RoundColumn title="Semifinals" subtitle="Week 13 · Conference Finals">
              <BracketMatchCard
                title="Conf Final #1"
                game={semifinal1Game}
                seedTop={null}
                seedBottom={null}
                teamTop={divisional1Winner || 'Winner Div 1'}
                teamBottom={divisional2Winner || 'Winner Div 2'}
                recordTop={getTeamRecord(divisional1Winner)}
                recordBottom={getTeamRecord(divisional2Winner)}
                compact
                accentClass="bg-orange-400"
              />
              <Connector delay={380} />
              <BracketMatchCard
                title="Conf Final #2"
                game={semifinal2Game}
                seedTop={null}
                seedBottom={null}
                teamTop={divisional3Winner || 'Winner Div 3'}
                teamBottom={divisional4Winner || 'Winner Div 4'}
                recordTop={getTeamRecord(divisional3Winner)}
                recordBottom={getTeamRecord(divisional4Winner)}
                compact
                accentClass="bg-orange-400"
              />
            </RoundColumn>

            {/* Championship */}
            <RoundColumn title="Championship" subtitle="Week 14 · The Final">
              <BracketMatchCard
                title="Championship Game"
                game={championshipGame}
                seedTop={null}
                seedBottom={null}
                teamTop={semifinal1Winner || 'Conf Final #1 Winner'}
                teamBottom={semifinal2Winner || 'Conf Final #2 Winner'}
                recordTop={getTeamRecord(semifinal1Winner)}
                recordBottom={getTeamRecord(semifinal2Winner)}
                variant="final"
                accentClass="bg-red-400"
              />
            </RoundColumn>
            </div>
          </div>
        </>
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
