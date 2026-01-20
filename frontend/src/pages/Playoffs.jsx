import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Crown, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const UFF_LOGO = "https://customer-assets.emergentagent.com/job_elite-league-hub/artifacts/g9a4t1r6_image.png";

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

  const renderTeamCard = (teamId, score, isWinner, isLoser) => {
    if (!teamId) {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-dashed border-white/20">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
            <span className="text-white/40 text-sm">?</span>
          </div>
          <div className="flex-1">
            <div className="font-heading font-bold text-sm text-white/40">TBD</div>
          </div>
          <div className="font-heading font-bold text-lg text-white/30">-</div>
        </div>
      );
    }

    const team = getTeamById(teamId);
    
    return (
      <Link 
        to={`/team/${teamId}`}
        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
          isWinner 
            ? 'bg-neon-volt/10 border border-neon-volt/50 shadow-[0_0_20px_rgba(204,255,0,0.2)]' 
            : isLoser 
              ? 'bg-white/5 border border-white/5 opacity-50' 
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }`}
      >
        {isWinner && (
          <Crown className="w-4 h-4 text-neon-volt absolute -right-1 -top-1" />
        )}
        <div 
          className="w-8 h-8 rounded-md flex items-center justify-center font-heading font-bold text-sm text-white"
          style={{ backgroundColor: team.color }}
        >
          {team.abbreviation?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-sm text-white truncate">{team.name}</div>
          <div className="font-body text-xs text-white/40">{team.wins}-{team.losses}</div>
        </div>
        <div className={`font-heading font-black text-lg ${isWinner ? 'text-neon-volt' : 'text-white/60'}`}>
          {score > 0 ? score.toFixed(1) : '-'}
        </div>
      </Link>
    );
  };

  const renderMatchup = (matchup, delay = 0) => {
    if (!matchup) return null;
    
    const isTeam1Winner = matchup.winner_id === matchup.team1_id;
    const isTeam2Winner = matchup.winner_id === matchup.team2_id;
    
    return (
      <div 
        className={`space-y-2 transition-all duration-700 ${animationPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <div className="font-body text-xs text-white/40 uppercase tracking-widest mb-2">{matchup.matchup_name}</div>
        <div className="relative">
          {renderTeamCard(matchup.team1_id, matchup.team1_score, isTeam1Winner, isTeam2Winner)}
        </div>
        <div className="relative">
          {renderTeamCard(matchup.team2_id, matchup.team2_score, isTeam2Winner, isTeam1Winner)}
        </div>
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

  const conferenceChamps = getMatchupsByRound('conference');
  const wildcards = getMatchupsByRound('wildcard');
  const divisional = getMatchupsByRound('divisional');
  const semifinals = getMatchupsByRound('semifinal');
  const finals = getMatchupsByRound('championship');

  return (
    <div data-testid="playoffs-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4 animate-slide-up">
            <img src={UFF_LOGO} alt="UFF Logo" className="w-12 h-12 object-contain" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-6 h-6 text-neon-volt" />
                <span className="font-body text-xs uppercase tracking-widest text-white/50">Championship Bracket</span>
              </div>
              <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter uppercase text-white">
                UFF <span className="text-neon-volt">PLAYOFFS</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Bracket */}
      <div className="px-6 md:px-12 py-8 overflow-x-auto">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Conference Championships - Week 9 */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-neon-blue" />
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                  Conference Championships
                </CardTitle>
                <Badge className="bg-neon-blue/20 text-neon-blue">Week 9</Badge>
                <span className="font-body text-sm text-white/40 ml-auto">Top 2 Per Conference</span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {conferenceChamps.map((matchup, idx) => (
                  <div key={matchup.id} data-testid={`cc-matchup-${idx}`}>
                    <div className="text-center mb-4">
                      <Badge className={idx === 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}>
                        {idx === 0 ? 'Ridge Conference' : 'Grand Central Conference'}
                      </Badge>
                    </div>
                    {renderMatchup(matchup, idx * 200)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Wildcard Round - Week 10 */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-neon-volt" />
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                  Wildcard Round
                </CardTitle>
                <Badge className="bg-neon-volt/20 text-neon-volt">Week 10</Badge>
                <span className="font-body text-sm text-white/40 ml-auto">Seeds 5-10</span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {wildcards.map((matchup, idx) => (
                  <div key={matchup.id} data-testid={`wc-matchup-${idx}`}>
                    {renderMatchup(matchup, 400 + idx * 200)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Divisional Round - Week 11 */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-neon-blue" />
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                  Divisional Round
                </CardTitle>
                <Badge className="bg-neon-blue/20 text-neon-blue">Week 11</Badge>
                <span className="font-body text-sm text-white/40 ml-auto">Round 2</span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {divisional.map((matchup, idx) => (
                  <div key={matchup.id} data-testid={`div-matchup-${idx}`}>
                    {renderMatchup(matchup, 800 + idx * 200)}
                  </div>
                ))}
                <div className="flex items-center justify-center p-6 rounded-lg bg-white/5 border border-dashed border-white/20">
                  <div className="text-center">
                    <div className="font-body text-sm text-white/40">WC Winners</div>
                    <div className="font-heading font-bold text-white/60">Winner #7 vs #8</div>
                    <div className="font-body text-xs text-white/30 mt-2">Bye or eliminated</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Semifinals - Week 12 */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-neon-volt" />
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                  Semifinals
                </CardTitle>
                <Badge className="bg-neon-volt/20 text-neon-volt">Week 12</Badge>
                <span className="font-body text-sm text-white/40 ml-auto">Final 4</span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {semifinals.map((matchup, idx) => (
                  <div key={matchup.id} data-testid={`sf-matchup-${idx}`}>
                    {renderMatchup(matchup, 1200 + idx * 200)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Championship - Week 13 */}
          <Card className="glass-panel border-neon-volt/30 overflow-hidden">
            <div className="absolute inset-0 trophy-shine" />
            <CardHeader className="border-b border-neon-volt/20 relative">
              <div className="flex items-center justify-center gap-3">
                <Trophy className="w-6 h-6 text-neon-volt" />
                <CardTitle className="font-heading font-bold text-2xl uppercase tracking-tight text-center">
                  UFF Championship
                </CardTitle>
                <Trophy className="w-6 h-6 text-neon-volt" />
              </div>
              <div className="text-center mt-2">
                <Badge className="bg-neon-volt text-black font-bold">Week 13 - The Final</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 relative">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-6">
                  <img src={UFF_LOGO} alt="UFF Logo" className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <h3 className="font-heading font-bold text-xl text-white/60">United Flag Bowl</h3>
                </div>
                {finals[0] && (
                  <div data-testid="finals-matchup">
                    {renderMatchup(finals[0], 1600)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Playoff Format Legend */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-lg uppercase tracking-tight">
                Playoff Format
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="font-heading font-bold text-neon-blue mb-1">10-Team Bracket</div>
                  <div className="font-body text-white/60">Full playoff field</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="font-heading font-bold text-neon-volt mb-1">Seeds 1-4</div>
                  <div className="font-body text-white/60">Conference champs, bye to Semifinals</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="font-heading font-bold text-white mb-1">Seeds 5-6</div>
                  <div className="font-body text-white/60">Wildcards, straight to Divisional</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="font-heading font-bold text-white/60 mb-1">Seeds 7-10</div>
                  <div className="font-body text-white/60">Wildcard round</div>
                </div>
                <div className="p-3 rounded-lg bg-neon-volt/10 border border-neon-volt/30">
                  <div className="font-heading font-bold text-neon-volt mb-1">United Flag Bowl</div>
                  <div className="font-body text-white/60">Conference champions meet</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Playoffs;
