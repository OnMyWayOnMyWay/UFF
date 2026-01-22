import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Crown, Sparkles, Calendar, ChevronRight, Zap, Award, Target, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const UFF_LOGO = "https://customer-assets.emergentagent.com/job_elite-league-hub/artifacts/g9a4t1r6_image.png";

const Playoffs = () => {
  const [playoffData, setPlayoffData] = useState({ matchups: [], rounds: [] });
  const [loading, setLoading] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

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
    if (!loading) {
      const timers = [
        setTimeout(() => setAnimationPhase(1), 300),
        setTimeout(() => setAnimationPhase(2), 600),
        setTimeout(() => setAnimationPhase(3), 900),
        setTimeout(() => setAnimationPhase(4), 1200),
        setTimeout(() => setAnimationPhase(5), 1500),
      ];
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [loading]);

  // Check if championship has a winner for confetti
  useEffect(() => {
    const championship = playoffData.matchups.find(m => m.round === 'Championship');
    if (championship?.winner_id && championship?.is_completed) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [playoffData]);

  const getMatchupsByRound = useCallback((round) => {
    return playoffData.matchups.filter(m => m.round === round);
  }, [playoffData.matchups]);

  const getAnimationClass = (matchup) => {
    if (!matchup) return '';
    if (matchup.animation_state === 'advancing') {
      return 'animate-pulse ring-2 ring-neon-volt';
    }
    if (matchup.animation_state === 'completed') {
      return 'opacity-80';
    }
    return '';
  };

  const renderTeamSlot = (team, score, isWinner, isLoser, animationState) => {
    if (!team) {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/[0.02] border border-dashed border-white/20 h-[52px]">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="text-white/30 text-xs font-bold">?</span>
          </div>
          <div className="flex-1">
            <div className="font-heading font-bold text-sm text-white/30">TBD</div>
          </div>
          <div className="font-heading font-bold text-lg text-white/20 w-12 text-right">-</div>
        </div>
      );
    }

    const advancingClass = animationState === 'advancing' && isWinner ? 'animate-team-advance' : '';
    
    return (
      <Link 
        to={`/team/${team.id}`}
        data-testid={`team-${team.id}`}
        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 h-[52px] group relative overflow-hidden ${advancingClass} ${
          isWinner 
            ? 'bg-gradient-to-r from-neon-volt/20 to-neon-volt/5 border border-neon-volt/50 shadow-[0_0_30px_rgba(204,255,0,0.15)]' 
            : isLoser 
              ? 'bg-white/[0.02] border border-white/5 opacity-40 grayscale' 
              : 'bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
        }`}
      >
        {/* Winner glow effect */}
        {isWinner && (
          <div className="absolute inset-0 bg-gradient-to-r from-neon-volt/10 via-transparent to-neon-volt/10 animate-shimmer" />
        )}
        
        {/* Crown for winner */}
        {isWinner && (
          <div className="absolute -top-1 -right-1 z-10">
            <Crown className="w-5 h-5 text-neon-volt drop-shadow-[0_0_8px_rgba(204,255,0,0.8)]" />
          </div>
        )}
        
        {/* Team Logo/Initial */}
        <div 
          className="w-9 h-9 rounded-lg flex items-center justify-center font-heading font-black text-sm text-white relative z-10 shadow-lg"
          style={{ 
            backgroundColor: team.color,
            boxShadow: isWinner ? `0 0 20px ${team.color}50` : 'none'
          }}
        >
          {team.logo ? (
            <img src={team.logo} alt={team.name} className="w-7 h-7 object-contain" />
          ) : (
            team.abbreviation?.substring(0, 2) || team.name?.charAt(0)
          )}
        </div>
        
        {/* Team Info */}
        <div className="flex-1 min-w-0 relative z-10">
          <div className={`font-heading font-bold text-sm truncate ${isWinner ? 'text-neon-volt' : 'text-white'}`}>
            {team.name}
          </div>
          <div className="font-body text-xs text-white/40">
            {team.wins}-{team.losses} · Seed #{team.seed || '?'}
          </div>
        </div>
        
        {/* Score */}
        <div className={`font-heading font-black text-xl relative z-10 w-14 text-right ${
          isWinner ? 'text-neon-volt' : isLoser ? 'text-white/30' : 'text-white/60'
        }`}>
          {score > 0 ? score.toFixed(1) : '-'}
        </div>
      </Link>
    );
  };

  const renderMatchup = (matchup, index, phaseRequired) => {
    if (!matchup) return null;
    
    const isTeam1Winner = matchup.winner_id === matchup.team1_id;
    const isTeam2Winner = matchup.winner_id === matchup.team2_id;
    const hasWinner = matchup.winner_id !== null;
    
    return (
      <div 
        data-testid={`matchup-${matchup.id}`}
        className={`space-y-2 transition-all duration-700 ease-out ${
          animationPhase >= phaseRequired 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-8 scale-95'
        } ${getAnimationClass(matchup)}`}
        style={{ transitionDelay: `${index * 100}ms` }}
      >
        {/* Matchup Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-body text-xs text-white/50 uppercase tracking-widest">
            {matchup.matchup_name}
          </span>
          {matchup.is_completed && (
            <Badge className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5">
              Final
            </Badge>
          )}
        </div>
        
        {/* Teams */}
        <div className="space-y-1.5">
          {renderTeamSlot(matchup.team1, matchup.team1_score, isTeam1Winner, isTeam2Winner && hasWinner, matchup.animation_state)}
          {renderTeamSlot(matchup.team2, matchup.team2_score, isTeam2Winner, isTeam1Winner && hasWinner, matchup.animation_state)}
        </div>
        
        {/* Advancement Arrow */}
        {hasWinner && (
          <div className="flex justify-center mt-2">
            <div className="flex items-center gap-1 text-neon-volt/60 animate-bounce">
              <ArrowRight className="w-4 h-4" />
              <span className="text-[10px] font-body uppercase tracking-wider">Advances</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const RoundSection = ({ title, subtitle, week, badge, matchups, phaseRequired, icon: Icon, gradient }) => (
    <Card className={`glass-panel border-white/10 overflow-hidden ${gradient || ''}`}>
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-neon-volt" />}
            <div>
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="font-body text-xs text-white/40 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {badge && (
              <Badge className={badge.className}>{badge.text}</Badge>
            )}
            {week && (
              <Badge className="bg-white/10 text-white/60 font-mono text-xs">Week {week}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className={`grid gap-6 ${
          matchups.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
          matchups.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {matchups.map((matchup, idx) => renderMatchup(matchup, idx, phaseRequired))}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-neon-volt border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-white/50 animate-pulse">Loading playoff bracket...</p>
        </div>
      </div>
    );
  }

  const playins = getMatchupsByRound('Playins');
  const wildcards = getMatchupsByRound('Wildcard');
  const divisional = getMatchupsByRound('Divisional');
  const conference = getMatchupsByRound('Conference');
  const championship = getMatchupsByRound('Championship');

  const championshipWinner = championship[0]?.winner_id ? 
    championship[0].team1?.id === championship[0].winner_id ? championship[0].team1 : championship[0].team2 
    : null;

  return (
    <div data-testid="playoffs-page" className="min-h-screen relative">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#CCFF00', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981'][Math.floor(Math.random() * 5)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Hero Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-8 pb-12 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-volt/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 animate-slide-up">
            <div className="relative">
              <img 
                src={UFF_LOGO} 
                alt="UFF Logo" 
                className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_30px_rgba(204,255,0,0.3)]" 
              />
              <Sparkles className="w-6 h-6 text-neon-volt absolute -top-2 -right-2 animate-ping" />
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Trophy className="w-5 h-5 text-neon-volt" />
                <span className="font-body text-xs uppercase tracking-[0.2em] text-white/50">Championship Bracket</span>
              </div>
              <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase">
                <span className="text-white">UFF</span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-volt to-neon-blue">PLAYOFFS</span>
              </h1>
              <p className="font-body text-sm text-white/40 mt-2">10-Team Bracket · 5 Rounds · 1 Champion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Champion Banner (if exists) */}
      {championshipWinner && (
        <div className="px-6 md:px-12 -mt-6 relative z-20">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-r from-neon-volt/20 via-neon-volt/10 to-neon-volt/20 rounded-xl p-6 border border-neon-volt/30 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-4">
                <Trophy className="w-10 h-10 text-neon-volt animate-bounce" />
                <div className="text-center">
                  <p className="font-body text-xs uppercase tracking-widest text-neon-volt/80">2025 UFF Champions</p>
                  <h2 className="font-heading font-black text-3xl text-white">{championshipWinner.name}</h2>
                </div>
                <Trophy className="w-10 h-10 text-neon-volt animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bracket Sections */}
      <div className="px-6 md:px-12 py-8 space-y-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Play-Ins Round */}
          {playins.length > 0 && (
            <RoundSection
              title="Play-In Games"
              subtitle="Seeds 5-6 per conference compete"
              week={9}
              badge={{ text: "Round 1", className: "bg-orange-500/20 text-orange-400" }}
              matchups={playins}
              phaseRequired={1}
              icon={Target}
            />
          )}

          {/* Wildcard Round */}
          {wildcards.length > 0 && (
            <RoundSection
              title="Wildcard Round"
              subtitle="Seeds 3-4 vs Play-In winners"
              week={10}
              badge={{ text: "Round 2", className: "bg-blue-500/20 text-blue-400" }}
              matchups={wildcards}
              phaseRequired={2}
              icon={Zap}
            />
          )}

          {/* Divisional Round */}
          {divisional.length > 0 && (
            <RoundSection
              title="Divisional Round"
              subtitle="Top seeds enter the bracket"
              week={11}
              badge={{ text: "Round 3", className: "bg-purple-500/20 text-purple-400" }}
              matchups={divisional}
              phaseRequired={3}
              icon={Award}
            />
          )}

          {/* Conference Championships */}
          {conference.length > 0 && (
            <RoundSection
              title="Conference Championships"
              subtitle="Road to the United Flag Bowl"
              week={12}
              badge={{ text: "Final 4", className: "bg-neon-volt/20 text-neon-volt" }}
              matchups={conference}
              phaseRequired={4}
              icon={Crown}
            />
          )}

          {/* Championship - United Flag Bowl */}
          {championship.length > 0 && (
            <Card className="glass-panel border-neon-volt/30 overflow-hidden relative">
              {/* Trophy shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-volt/5 to-transparent animate-shimmer" />
              
              <CardHeader className="border-b border-neon-volt/20 pb-6 relative z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-neon-volt drop-shadow-[0_0_15px_rgba(204,255,0,0.6)]" />
                    <CardTitle className="font-heading font-black text-3xl uppercase tracking-tight text-center">
                      United Flag Bowl
                    </CardTitle>
                    <Trophy className="w-8 h-8 text-neon-volt drop-shadow-[0_0_15px_rgba(204,255,0,0.6)]" />
                  </div>
                  <Badge className="bg-neon-volt text-black font-bold px-4 py-1">
                    Week 13 · The Championship
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 relative z-10">
                <div className="max-w-lg mx-auto">
                  {/* Championship Logo */}
                  <div className="text-center mb-8">
                    <div className="relative inline-block">
                      <img 
                        src={UFF_LOGO} 
                        alt="UFF Logo" 
                        className="w-24 h-24 mx-auto opacity-30 animate-pulse" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full border-2 border-neon-volt/20 animate-spin-slow" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Championship Matchup */}
                  {renderMatchup(championship[0], 0, 5)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Playoff Format Legend */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-volt" />
                Playoff Format
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                  <div className="font-heading font-bold text-neon-blue mb-1 text-lg">10 Teams</div>
                  <div className="font-body text-xs text-white/50">Full playoff field</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                  <div className="font-heading font-bold text-orange-400 mb-1 text-lg">Seeds 5-6</div>
                  <div className="font-body text-xs text-white/50">Play-In games</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <div className="font-heading font-bold text-blue-400 mb-1 text-lg">Seeds 3-4</div>
                  <div className="font-body text-xs text-white/50">Wildcard round</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                  <div className="font-heading font-bold text-purple-400 mb-1 text-lg">Seeds 1-2</div>
                  <div className="font-body text-xs text-white/50">Divisional bye</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-neon-volt/10 to-neon-volt/5 border border-neon-volt/30 col-span-2 md:col-span-1">
                  <div className="font-heading font-bold text-neon-volt mb-1 text-lg">Flag Bowl</div>
                  <div className="font-body text-xs text-white/50">Conference champions</div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        @keyframes team-advance {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); box-shadow: 0 0 40px rgba(204, 255, 0, 0.4); }
        }
        .animate-team-advance {
          animation: team-advance 1.5s ease-in-out infinite;
        }
        @keyframes confetti {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 4s linear forwards;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Playoffs;
