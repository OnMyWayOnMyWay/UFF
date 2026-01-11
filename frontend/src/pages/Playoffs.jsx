import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Calendar, ChevronRight, Medal, Crown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Playoffs = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playoffGames, setPlayoffGames] = useState({
    wildcard: [],
    semifinals: [],
    championship: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API}/games`);
      const gamesData = Array.isArray(response.data) ? response.data : (response.data.games || []);
      setGames(gamesData);
      organizePlayoffGames(gamesData);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizePlayoffGames = (allGames) => {
    // Assume playoffs start at week 9
    // Week 9: Wildcard/Quarterfinals (4 teams to 2)
    // Week 10: Semifinals (2 teams play for 3rd place)
    // Week 11: Championship (top 2 teams)
    
    const wildcard = allGames.filter(g => g.week === 9);
    const semifinals = allGames.filter(g => g.week === 10);
    const championship = allGames.find(g => g.week === 11);

    setPlayoffGames({
      wildcard,
      semifinals,
      championship
    });
  };

  const GameCard = ({ game, isFinal = false }) => {
    if (!game) {
      return (
        <div className="glass-card p-4 rounded-xl border border-white/10 opacity-50">
          <div className="text-center text-gray-500 text-sm">TBD</div>
        </div>
      );
    }

    const homeWin = game.home_score > game.away_score;
    const awayWin = game.away_score > game.home_score;

    return (
      <div 
        className="glass-card p-4 rounded-xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group"
        onClick={() => navigate(`/week/${game.week}`)}
      >
        {isFinal && (
          <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-white/10">
            <Crown className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-500 font-bold text-sm uppercase tracking-wider">
              Championship
            </span>
            <Crown className="w-5 h-5 text-yellow-500" />
          </div>
        )}
        
        <div className="space-y-2">
          {/* Home Team */}
          <div className={`flex items-center justify-between p-2 rounded-lg transition-all ${
            homeWin ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5'
          }`}>
            <div className="flex items-center gap-2">
              {homeWin && <Trophy className="w-4 h-4 text-emerald-400" />}
              <span className={`font-semibold ${homeWin ? 'text-emerald-400' : 'text-gray-300'}`}>
                {game.home_team}
              </span>
            </div>
            <span className={`text-xl font-bold ${homeWin ? 'text-emerald-400' : 'text-gray-400'}`}>
              {game.home_score}
            </span>
          </div>

          {/* Away Team */}
          <div className={`flex items-center justify-between p-2 rounded-lg transition-all ${
            awayWin ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5'
          }`}>
            <div className="flex items-center gap-2">
              {awayWin && <Trophy className="w-4 h-4 text-emerald-400" />}
              <span className={`font-semibold ${awayWin ? 'text-emerald-400' : 'text-gray-300'}`}>
                {game.away_team}
              </span>
            </div>
            <span className={`text-xl font-bold ${awayWin ? 'text-emerald-400' : 'text-gray-400'}`}>
              {game.away_score}
            </span>
          </div>
        </div>

        {game.game_date && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(game.game_date).toLocaleDateString()}</span>
            </div>
            <span className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
              View Details →
            </span>
          </div>
        )}
      </div>
    );
  };

  const ConnectorLine = ({ vertical = false }) => (
    <div className={vertical ? 'w-0.5 h-8 bg-gradient-to-b from-emerald-500/50 to-blue-500/50 mx-auto' : 
                              'h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-blue-500/50'}>
    </div>
  );

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

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
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

      {/* Bracket Container */}
      <div className="max-w-7xl mx-auto">
        {/* Desktop View */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-7 gap-4 items-center">
            {/* Round 1 - Quarterfinals */}
            <div className="col-span-2 space-y-8">
              <div>
                <h3 className="text-center text-emerald-400 font-bold mb-4 uppercase tracking-wider text-sm">
                  Quarterfinals - Week 9
                </h3>
                <div className="space-y-4">
                  {playoffGames.wildcard[0] && <GameCard game={playoffGames.wildcard[0]} />}
                  {playoffGames.wildcard[1] && <GameCard game={playoffGames.wildcard[1]} />}
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center">
                <div className="h-0.5 w-8 bg-gradient-to-r from-emerald-500/50 to-blue-500/50"></div>
                <ChevronRight className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center">
                <div className="h-0.5 w-8 bg-gradient-to-r from-emerald-500/50 to-blue-500/50"></div>
                <ChevronRight className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            {/* Round 2 - Third Place */}
            <div className="col-span-2">
              <h3 className="text-center text-blue-400 font-bold mb-4 uppercase tracking-wider text-sm">
                Third Place - Week 10
              </h3>
              {playoffGames.semifinals[0] ? (
                <GameCard game={playoffGames.semifinals[0]} />
              ) : (
                <GameCard game={null} />
              )}
            </div>

            {/* Final Connector */}
            <div className="flex items-center justify-center">
              <div className="h-0.5 w-8 bg-gradient-to-r from-blue-500/50 to-yellow-500/50"></div>
              <ChevronRight className="w-5 h-5 text-yellow-400" />
            </div>

            {/* Championship */}
            <div className="col-span-1">
              <h3 className="text-center text-yellow-400 font-bold mb-4 uppercase tracking-wider text-sm">
                Week 11
              </h3>
              {playoffGames.championship ? (
                <GameCard game={playoffGames.championship} isFinal={true} />
              ) : (
                <GameCard game={null} />
              )}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet View */}
        <div className="lg:hidden space-y-8">
          {/* Championship */}
          <div>
            <h3 className="text-center text-yellow-400 font-bold mb-4 uppercase tracking-wider flex items-center justify-center gap-2">
              <Crown className="w-5 h-5" />
              Championship - Week 11
              <Crown className="w-5 h-5" />
            </h3>
            {playoffGames.championship ? (
              <GameCard game={playoffGames.championship} isFinal={true} />
            ) : (
              <GameCard game={null} />
            )}
          </div>

          <ConnectorLine vertical />

          {/* Third Place */}
          <div>
            <h3 className="text-center text-blue-400 font-bold mb-4 uppercase tracking-wider text-sm">
              Third Place Game - Week 10
            </h3>
            {playoffGames.semifinals[0] ? (
              <GameCard game={playoffGames.semifinals[0]} />
            ) : (
              <GameCard game={null} />
            )}
          </div>

          <ConnectorLine vertical />

          {/* Quarterfinals */}
          <div>
            <h3 className="text-center text-emerald-400 font-bold mb-4 uppercase tracking-wider text-sm">
              Quarterfinals - Week 9
            </h3>
            <div className="space-y-4">
              {playoffGames.wildcard.map((game, idx) => (
                <GameCard key={game.id || idx} game={game} />
              ))}
              {playoffGames.wildcard.length === 0 && (
                <>
                  <GameCard game={null} />
                  <GameCard game={null} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 glass-card p-6 rounded-xl border border-white/10">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5 text-emerald-400" />
            Playoff Format
          </h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• <span className="text-emerald-400 font-semibold">Week 9</span>: Quarterfinals - Top 4 seeds compete</p>
            <p>• <span className="text-blue-400 font-semibold">Week 10</span>: Third Place Game - Losers compete for 3rd place</p>
            <p>• <span className="text-yellow-400 font-semibold">Week 11</span>: Championship - Winners compete for the title</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playoffs;
