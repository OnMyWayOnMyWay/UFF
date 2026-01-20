import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Crown, Sparkles } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Playoffs = () => {
  const [playoffData, setPlayoffData] = useState({ matchups: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const fetchPlayoffs = async () => {
      try {
        const response = await axios.get(`${API}/playoffs`);
        setPlayoffData(response.data);
      } catch (error) {
        console.error('Error fetching playoffs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayoffs();
  }, []);

  useEffect(() => {
    // Animate bracket reveal
    const timer1 = setTimeout(() => setAnimationPhase(1), 500);
    const timer2 = setTimeout(() => setAnimationPhase(2), 1000);
    const timer3 = setTimeout(() => setAnimationPhase(3), 1500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [loading]);

  const getTeamById = (id) => playoffData.teams.find(t => t.id === id) || { name: 'TBD', abbreviation: 'TBD', color: '#333' };

  const getMatchupsByRound = (round) => playoffData.matchups.filter(m => m.round === round);

  const renderTeamCard = (teamId, score, isWinner, isLoser, position = 'top') => {
    const team = getTeamById(teamId);
    
    return (
      <div 
        className={`relative flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
          isWinner 
            ? 'bg-neon-volt/10 border border-neon-volt/50 shadow-[0_0_20px_rgba(204,255,0,0.2)]' 
            : isLoser 
              ? 'bg-white/5 border border-white/5 opacity-50' 
              : 'bg-white/5 border border-white/10'
        }`}
      >
        {isWinner && (
          <div className="absolute -right-2 -top-2">
            <Crown className="w-4 h-4 text-neon-volt" />
          </div>
        )}
        <div 
          className="w-8 h-8 rounded-md flex items-center justify-center font-heading font-bold text-sm text-white"
          style={{ backgroundColor: team.color }}
        >
          {team.abbreviation?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-sm text-white truncate">{team.name}</div>
          <div className="font-body text-xs text-white/40">{team.abbreviation}</div>
        </div>
        <div className={`font-heading font-black text-lg ${isWinner ? 'text-neon-volt' : 'text-white/60'}`}>
          {score?.toFixed(1) || '-'}
        </div>
      </div>
    );
  };

  const renderMatchup = (matchup, delay = 0) => {
    if (!matchup) return null;
    
    const isTeam1Winner = matchup.winner_id === matchup.team1_id;
    const isTeam2Winner = matchup.winner_id === matchup.team2_id;
    
    return (
      <div 
        className={`space-y-2 transition-all duration-700 ${animationPhase >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {renderTeamCard(matchup.team1_id, matchup.team1_score, isTeam1Winner, isTeam2Winner, 'top')}
        {renderTeamCard(matchup.team2_id, matchup.team2_score, isTeam2Winner, isTeam1Winner, 'bottom')}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const quarterfinals = getMatchupsByRound(1);
  const semifinals = getMatchupsByRound(2);
  const finals = getMatchupsByRound(3);
  const champion = finals[0]?.winner_id ? getTeamById(finals[0].winner_id) : null;

  return (
    <div data-testid="playoffs-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Trophy className="w-6 h-6 text-neon-volt" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Championship Bracket</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            PLAYOFF <span className="text-neon-volt">BRACKET</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            The road to the championship.
          </p>
        </div>
      </div>

      {/* Bracket */}
      <div className="px-6 md:px-12 py-8 overflow-x-auto">
        <div className="max-w-7xl mx-auto">
          {/* Champion Banner */}
          {champion && (
            <div 
              className={`mb-12 text-center transition-all duration-1000 ${animationPhase >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              data-testid="champion-banner"
            >
              <div className="inline-block glass-panel rounded-2xl p-8 border border-neon-volt/30 relative overflow-hidden">
                <div className="absolute inset-0 trophy-shine" />
                <Sparkles className="w-8 h-8 text-neon-volt mx-auto mb-4" />
                <div className="font-body text-xs uppercase tracking-widest text-white/50 mb-2">2024 Champion</div>
                <div className="flex items-center justify-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center font-heading font-black text-2xl text-white shadow-lg"
                    style={{ backgroundColor: champion.color }}
                  >
                    {champion.abbreviation?.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="font-heading font-black text-3xl text-white">{champion.name}</div>
                    <div className="font-body text-white/60">{champion.wins}-{champion.losses} Season Record</div>
                  </div>
                </div>
                <Trophy className="w-6 h-6 text-neon-volt mx-auto mt-4" />
              </div>
            </div>
          )}

          {/* Bracket Grid */}
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 gap-4 items-center">
              {/* Round Labels */}
              <div className="col-span-7 grid grid-cols-7 gap-4 mb-4">
                <div className="col-span-2 text-center">
                  <span className="font-heading font-bold text-sm uppercase tracking-widest text-white/40">Quarterfinals</span>
                </div>
                <div className="col-span-1" />
                <div className="col-span-1 text-center">
                  <span className="font-heading font-bold text-sm uppercase tracking-widest text-white/40">Semifinals</span>
                </div>
                <div className="col-span-1" />
                <div className="col-span-2 text-center">
                  <span className="font-heading font-bold text-sm uppercase tracking-widest text-neon-volt">Championship</span>
                </div>
              </div>

              {/* Quarterfinals - Left Side */}
              <div className="col-span-2 space-y-8">
                {quarterfinals.slice(0, 2).map((matchup, idx) => (
                  <div key={matchup.id} data-testid={`qf-matchup-${idx}`}>
                    {renderMatchup(matchup, idx * 200)}
                  </div>
                ))}
              </div>

              {/* Connector Lines */}
              <div className="col-span-1 flex flex-col items-center justify-center h-full">
                <svg className="w-full h-64" viewBox="0 0 100 200">
                  <path
                    d="M 0 50 L 50 50 L 50 100 L 100 100"
                    className={`bracket-line ${animationPhase >= 2 ? 'bracket-line-winner' : ''}`}
                    strokeDasharray="200"
                    strokeDashoffset={animationPhase >= 1 ? 0 : 200}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                  <path
                    d="M 0 150 L 50 150 L 50 100 L 100 100"
                    className={`bracket-line ${animationPhase >= 2 ? 'bracket-line-winner' : ''}`}
                    strokeDasharray="200"
                    strokeDashoffset={animationPhase >= 1 ? 0 : 200}
                    style={{ transition: 'stroke-dashoffset 1s ease-out 0.3s' }}
                  />
                </svg>
              </div>

              {/* Semifinals */}
              <div className="col-span-1 space-y-8">
                {semifinals.map((matchup, idx) => (
                  <div key={matchup.id} data-testid={`sf-matchup-${idx}`}>
                    {renderMatchup(matchup, 400 + idx * 200)}
                  </div>
                ))}
              </div>

              {/* Connector Lines to Finals */}
              <div className="col-span-1 flex flex-col items-center justify-center h-full">
                <svg className="w-full h-64" viewBox="0 0 100 200">
                  <path
                    d="M 0 50 L 50 50 L 50 100 L 100 100"
                    className={`bracket-line ${animationPhase >= 3 ? 'bracket-line-winner' : ''}`}
                    strokeDasharray="200"
                    strokeDashoffset={animationPhase >= 2 ? 0 : 200}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                  <path
                    d="M 0 150 L 50 150 L 50 100 L 100 100"
                    className={`bracket-line ${animationPhase >= 3 ? 'bracket-line-winner' : ''}`}
                    strokeDasharray="200"
                    strokeDashoffset={animationPhase >= 2 ? 0 : 200}
                    style={{ transition: 'stroke-dashoffset 1s ease-out 0.3s' }}
                  />
                </svg>
              </div>

              {/* Finals */}
              <div className="col-span-2">
                <div className="p-4 glass-panel rounded-xl border border-neon-volt/30" data-testid="finals-matchup">
                  <div className="text-center mb-4">
                    <Trophy className="w-6 h-6 text-neon-volt mx-auto mb-2" />
                    <span className="font-heading font-bold text-sm uppercase tracking-widest text-neon-volt">Championship</span>
                  </div>
                  {finals[0] && renderMatchup(finals[0], 800)}
                </div>
              </div>
            </div>

            {/* Right Side Quarterfinals (visual balance) */}
            <div className="grid grid-cols-7 gap-4 items-center mt-8">
              <div className="col-span-2 space-y-8">
                {quarterfinals.slice(2, 4).map((matchup, idx) => (
                  <div key={matchup.id} data-testid={`qf-matchup-${idx + 2}`}>
                    {renderMatchup(matchup, (idx + 2) * 200)}
                  </div>
                ))}
              </div>
              <div className="col-span-5" />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-12 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-neon-volt/20 border border-neon-volt/50" />
              <span className="font-body text-white/40">Winner</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white/5 border border-white/10" />
              <span className="font-body text-white/40">Eliminated</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-neon-volt" />
              <span className="font-body text-white/40">Advancing Team</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playoffs;
