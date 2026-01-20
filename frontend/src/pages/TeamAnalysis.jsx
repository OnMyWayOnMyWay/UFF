import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, TrendingUp, AlertCircle, Users, Star, Shield, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TeamAnalysis = () => {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, analysisRes] = await Promise.all([
          axios.get(`${API}/teams/${teamId}`),
          axios.get(`${API}/teams/${teamId}/analysis`)
        ]);
        setTeam(teamRes.data);
        setAnalysis(analysisRes.data);
      } catch (error) {
        console.error('Error fetching team:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId]);

  const getPlayoffBadge = (status) => {
    if (!status) return null;
    const badges = {
      x: { label: 'Division Leader', color: 'bg-neon-volt/20 text-neon-volt border-neon-volt/30' },
      y: { label: 'Wildcard', color: 'bg-neon-blue/20 text-neon-blue border-neon-blue/30' },
      z: { label: 'Playins', color: 'bg-white/10 text-white/60 border-white/20' },
    };
    return badges[status];
  };

  const getGradeColor = (grade) => {
    if (grade?.startsWith('A')) return 'text-neon-volt';
    if (grade?.startsWith('B')) return 'text-neon-blue';
    if (grade?.startsWith('C')) return 'text-yellow-500';
    return 'text-white/60';
  };

  const getPositionColor = (pos) => {
    const colors = {
      QB: 'bg-orange-500',
      WR: 'bg-teal-500',
      RB: 'bg-sky-500',
      DEF: 'bg-red-500',
      K: 'bg-purple-500'
    };
    return colors[pos] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading font-bold text-2xl text-white mb-2">Team Not Found</h2>
          <Link to="/standings" className="text-neon-blue hover:underline">Back to Standings</Link>
        </div>
      </div>
    );
  }

  const playoffBadge = getPlayoffBadge(team.playoff_status);

  return (
    <div data-testid="team-analysis-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <Link to="/standings" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back to Standings</span>
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Team Logo */}
            <div className="relative">
              <div 
                className="w-32 h-32 md:w-40 md:h-40 rounded-2xl flex items-center justify-center border border-white/10"
                style={{ backgroundColor: team.color }}
              >
                <span className="font-heading font-black text-6xl text-white">{team.abbreviation?.charAt(0)}</span>
              </div>
              {team.seed && team.seed <= 4 && (
                <div className="absolute -top-2 -right-2 bg-neon-volt text-black p-2 rounded-full">
                  <Trophy className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Team Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-white/10 text-white/60">{team.conference}</Badge>
                {playoffBadge && (
                  <Badge className={playoffBadge.color}>
                    {playoffBadge.label}
                  </Badge>
                )}
              </div>
              <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter uppercase text-white mb-2">
                {team.name}
              </h1>
              <p className="font-body text-white/60 text-lg mb-4">{team.abbreviation}</p>
              
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="font-body text-xs text-white/40 uppercase">Record</div>
                  <div className="font-heading font-black text-3xl text-white">{team.wins}-{team.losses}</div>
                </div>
                {team.seed && (
                  <div>
                    <div className="font-body text-xs text-white/40 uppercase">Seed</div>
                    <div className="font-heading font-black text-3xl text-neon-blue">#{team.seed}</div>
                  </div>
                )}
                <div>
                  <div className="font-body text-xs text-white/40 uppercase">Power Rank</div>
                  <div className="font-heading font-black text-3xl text-neon-volt">#{analysis.power_ranking}</div>
                </div>
              </div>
            </div>

            {/* Grades */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="font-heading font-bold text-sm text-white/40 uppercase mb-4">Team Grades</h3>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="font-body text-xs text-white/40 uppercase mb-1">Offense</div>
                  <div className={`font-heading font-black text-4xl ${getGradeColor(analysis.offense_grade)}`}>
                    {analysis.offense_grade}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-body text-xs text-white/40 uppercase mb-1">Defense</div>
                  <div className={`font-heading font-black text-4xl ${getGradeColor(analysis.defense_grade)}`}>
                    {analysis.defense_grade}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Team Analysis */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                <Shield className="w-5 h-5 text-neon-blue" />
                Team Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overview */}
                <div className="md:col-span-2">
                  <p className="font-body text-lg text-white/80">{analysis.overview}</p>
                </div>

                {/* Strengths */}
                <div className="space-y-3">
                  <h4 className="font-heading font-bold text-lg text-neon-volt uppercase flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Strengths
                  </h4>
                  <ul className="space-y-2">
                    {analysis.strengths?.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2 font-body text-sm text-white/70">
                        <ChevronRight className="w-4 h-4 text-neon-volt mt-0.5 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="space-y-3">
                  <h4 className="font-heading font-bold text-lg text-red-500 uppercase flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Areas to Improve
                  </h4>
                  <ul className="space-y-2">
                    {analysis.weaknesses?.length > 0 ? analysis.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-2 font-body text-sm text-white/70">
                        <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {weakness}
                      </li>
                    )) : (
                      <li className="font-body text-sm text-white/50">No significant weaknesses identified</li>
                    )}
                  </ul>
                </div>

                {/* Playoff Outlook */}
                <div className="md:col-span-2 p-4 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                  <h5 className="font-heading font-bold text-sm text-neon-blue uppercase mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Playoff Outlook
                  </h5>
                  <p className="font-body text-sm text-white/70">{analysis.playoff_outlook}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Players */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-neon-volt" />
                Key Players
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysis.key_players?.map((player, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                        <span className="font-heading font-bold text-lg">{player.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-heading font-bold text-white">{player.name}</div>
                        <Badge className={`${getPositionColor(player.position)} text-white text-xs`}>
                          {player.position}
                        </Badge>
                      </div>
                      {player.is_elite && (
                        <Star className="w-4 h-4 text-neon-volt ml-auto" />
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="font-body text-xs text-white/40">Fantasy Pts</span>
                      <span className="font-heading font-bold text-lg text-neon-blue">
                        {player.fantasy_points?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-neon-blue" />
                Season Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-white/5 text-center">
                  <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">Points For</div>
                  <div className="font-heading font-black text-2xl text-neon-volt">{team.points_for?.toFixed(1)}</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 text-center">
                  <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">Points Against</div>
                  <div className="font-heading font-black text-2xl text-white">{team.points_against?.toFixed(1)}</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 text-center">
                  <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">Point Diff</div>
                  <div className={`font-heading font-black text-2xl ${(team.points_for - team.points_against) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(team.points_for - team.points_against) > 0 ? '+' : ''}{(team.points_for - team.points_against).toFixed(1)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 text-center">
                  <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-2">Win %</div>
                  <div className="font-heading font-black text-2xl text-neon-blue">
                    {((team.wins / (team.wins + team.losses)) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamAnalysis;
