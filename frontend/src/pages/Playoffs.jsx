import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Calendar, ChevronRight, Medal, Crown, Star } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Playoffs = () => {
  const [games, setGames] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playoffGames, setPlayoffGames] = useState({
    wildcard: [],
    divisional: [],
    semifinals: [],
    championship: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, standingsRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/teams/standings`)
      ]);
      
      const gamesData = Array.isArray(gamesRes.data) ? gamesRes.data : (gamesRes.data.games || []);
      const standingsData = Array.isArray(standingsRes.data) ? standingsRes.data : [];
      
      setGames(gamesData);
      setStandings(standingsData);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              seed === 1 ? 'bg-yellow-500 text-black' :
              seed === 2 ? 'bg-gray-400 text-black' :
              'bg-gray-700 text-white'
            }`}>
              {seed}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-lg leading-tight truncate" title={team}>{team}</div>
              {record && <div className="text-gray-400 text-xs">{record}</div>}
            </div>
          </div>
          {isBye && (
            <div className="text-yellow-500 text-xs font-bold uppercase">Bye</div>
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

  // Get top 10 teams for playoff seeding
  const playoffTeams = standings.slice(0, 10);
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
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            Playoff Seeds
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {playoffTeams.map((team, idx) => (
              <SeedCard 
                key={idx}
                seed={idx + 1}
                team={team.team}
                record={`${team.wins}-${team.losses}`}
                isBye={idx < 2}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bracket Container */}
      <div className="max-w-7xl mx-auto">
        {/* Desktop View - NFL-inspired (original) */}
        <div className="hidden lg:block">
          <div className="rounded-3xl bg-white/8 backdrop-blur-2xl border border-white/15 shadow-2xl p-6 overflow-x-auto">
            {/* Stage Header */}
            <div className="min-w-[1100px]">
              <div className="bg-white/10 border border-white/15 rounded-2xl px-6 py-3 flex items-center justify-between mb-6">
                <div className="text-xs font-bold tracking-widest text-white/70">WILD CARD</div>
                <div className="text-xs font-bold tracking-widest text-white/70">DIVISIONAL</div>
                <div className="text-xs font-bold tracking-widest text-white/70">CONFERENCE</div>
                <div className="text-xs font-bold tracking-widest text-white/70">FINAL</div>
                <div className="text-xs font-bold tracking-widest text-white/70">CONFERENCE</div>
                <div className="text-xs font-bold tracking-widest text-white/70">DIVISIONAL</div>
                <div className="text-xs font-bold tracking-widest text-white/70">WILD CARD</div>
              </div>

              {/* Bracket Grid */}
              <div className="grid grid-cols-7 gap-6 items-center">
                {/* Left Wild Card (use wildcard[0], wildcard[1]) */}
                <div className="space-y-6">
                  <BracketMatchCard
                    title="Wild Card"
                    game={playoffGames.wildcard[0]}
                    seedTop={3}
                    seedBottom={10}
                    teamTop={playoffTeams[2]?.team}
                    teamBottom={playoffTeams[9]?.team}
                    recordTop={getTeamRecord(playoffTeams[2]?.team)}
                    recordBottom={getTeamRecord(playoffTeams[9]?.team)}
                    accentClass="bg-orange-500"
                  />
                  <BracketMatchCard
                    title="Wild Card"
                    game={playoffGames.wildcard[1]}
                    seedTop={4}
                    seedBottom={9}
                    teamTop={playoffTeams[3]?.team}
                    teamBottom={playoffTeams[8]?.team}
                    recordTop={getTeamRecord(playoffTeams[3]?.team)}
                    recordBottom={getTeamRecord(playoffTeams[8]?.team)}
                    accentClass="bg-orange-500"
                  />
                </div>

                {/* Left Divisional (use divisional[0]) */}
                <div className="space-y-10">
                  <BracketMatchCard
                    title="Divisional"
                    game={playoffGames.divisional[0]}
                    seedTop={1}
                    teamTop={playoffTeams[0]?.team}
                    recordTop={getTeamRecord(playoffTeams[0]?.team)}
                    compact
                    accentClass="bg-indigo-500"
                  />
                  <BracketMatchCard
                    title="Divisional"
                    game={null}
                    compact
                    accentClass="bg-indigo-500"
                  />
                </div>

                {/* Left Conference (use semifinals[0]) */}
                <div className="space-y-10">
                  <BracketMatchCard title="Conference" game={playoffGames.semifinals[0]} accentClass="bg-violet-500" />
                </div>

                {/* Final (center) */}
                <div className="flex items-center justify-center">
                  <div className="w-full max-w-sm">
                    <BracketMatchCard
                      game={playoffGames.championship}
                      variant="final"
                    />
                  </div>
                </div>

                {/* Right Conference (use semifinals[1]) */}
                <div className="space-y-10">
                  <BracketMatchCard title="Conference" game={playoffGames.semifinals[1]} accentClass="bg-violet-500" />
                </div>

                {/* Right Divisional (use wildcard[2], wildcard[3] -> divisional placeholders) */}
                <div className="space-y-10">
                  <BracketMatchCard
                    title="Divisional"
                    game={playoffGames.divisional[1]}
                    seedTop={2}
                    teamTop={playoffTeams[1]?.team}
                    recordTop={getTeamRecord(playoffTeams[1]?.team)}
                    compact
                    accentClass="bg-indigo-500"
                  />
                  <BracketMatchCard
                    title="Divisional"
                    game={null}
                    compact
                    accentClass="bg-indigo-500"
                  />
                </div>

                {/* Right Wild Card (use wildcard[2], wildcard[3]) */}
                <div className="space-y-6">
                  <BracketMatchCard
                    title="Wild Card"
                    game={playoffGames.wildcard[2]}
                    seedTop={5}
                    seedBottom={8}
                    teamTop={playoffTeams[4]?.team}
                    teamBottom={playoffTeams[7]?.team}
                    recordTop={getTeamRecord(playoffTeams[4]?.team)}
                    recordBottom={getTeamRecord(playoffTeams[7]?.team)}
                    accentClass="bg-orange-500"
                  />
                  <BracketMatchCard
                    title="Wild Card"
                    game={playoffGames.wildcard[3]}
                    seedTop={6}
                    seedBottom={7}
                    teamTop={playoffTeams[5]?.team}
                    teamBottom={playoffTeams[6]?.team}
                    recordTop={getTeamRecord(playoffTeams[5]?.team)}
                    recordBottom={getTeamRecord(playoffTeams[6]?.team)}
                    accentClass="bg-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet View */}
        <div className="lg:hidden space-y-6">
          {/* Championship */}
          <div>
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <Trophy className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-center text-yellow-400 font-bold mb-4 uppercase tracking-wider flex items-center justify-center gap-2">
              Championship • Week 12
            </h3>
            <GameCard 
              game={playoffGames.championship}
              isFinal={true}
            />
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>

          {/* Conference Championships */}
          <div>
            <h3 className="text-center text-purple-400 font-bold mb-4 uppercase tracking-wider text-sm">
              Conference Championships • Week 11
            </h3>
            <div className="space-y-4">
              {[0, 1].map(idx => (
                <GameCard 
                  key={idx}
                  game={playoffGames.semifinals[idx]}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>

          {/* Divisional Round */}
          <div>
            <h3 className="text-center text-blue-400 font-bold mb-4 uppercase tracking-wider text-sm">
              Divisional Round • Week 10
            </h3>
            <div className="space-y-4">
              {[0, 1].map(idx => (
                <GameCard 
                  key={idx}
                  game={playoffGames.divisional[idx]}
                  seed1={idx === 0 ? 1 : 2}
                  team1={playoffTeams[idx]?.team}
                  record1={getTeamRecord(playoffTeams[idx]?.team)}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>

          {/* Wildcard Round */}
          <div>
            <h3 className="text-center text-emerald-400 font-bold mb-4 uppercase tracking-wider text-sm">
              Wildcard Round • Week 9
            </h3>
            <div className="space-y-4">
              {[
                { game: playoffGames.wildcard[0], s1: 3, s2: 10 },
                { game: playoffGames.wildcard[1], s1: 4, s2: 9 },
                { game: playoffGames.wildcard[2], s1: 5, s2: 8 },
                { game: playoffGames.wildcard[3], s1: 6, s2: 7 }
              ].map((item, idx) => (
                <GameCard 
                  key={idx}
                  game={item.game}
                  seed1={item.s1} 
                  seed2={item.s2}
                  team1={playoffTeams[item.s1 - 1]?.team}
                  team2={playoffTeams[item.s2 - 1]?.team}
                  record1={getTeamRecord(playoffTeams[item.s1 - 1]?.team)}
                  record2={getTeamRecord(playoffTeams[item.s2 - 1]?.team)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 glass-card p-6 rounded-xl border border-white/10">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5 text-emerald-400" />
            Playoff Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-400">
            <div className="space-y-2">
              <p>• <span className="text-yellow-400 font-semibold">Seeds 1 & 2</span>: First-round bye</p>
              <p>• <span className="text-emerald-400 font-semibold">Week 9</span>: Wildcard Round (4 games)</p>
              <p className="ml-4 text-xs">3v10, 4v9, 5v8, 6v7</p>
              <p>• <span className="text-blue-400 font-semibold">Week 10</span>: Divisional Round (4 games)</p>
            </div>
            <div className="space-y-2">
              <p>• <span className="text-purple-400 font-semibold">Week 11</span>: Conference Championships (2 games)</p>
              <p>• <span className="text-yellow-400 font-semibold">Week 12</span>: Championship Game</p>
              <p className="text-xs text-gray-500 mt-2">Total: 10 playoff teams compete for the title</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playoffs;
