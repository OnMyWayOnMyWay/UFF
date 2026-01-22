import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Trophy, TrendingUp, AlertCircle, Users, Star, Shield, Zap, ChevronRight, Target, Activity, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TeamLogo from '../components/TeamLogo';

import API from '../lib/api';

const TeamAnalysis = () => {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [players, setPlayers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, analysisRes, scheduleRes, playersRes, teamsRes] = await Promise.all([
          axios.get(`${API}/teams/${teamId}`),
          axios.get(`${API}/teams/${teamId}/analysis`),
          axios.get(`${API}/schedule`),
          axios.get(`${API}/players?team_id=${teamId}&limit=50`),
          axios.get(`${API}/teams`)
        ]);
        setTeam(teamRes.data);
        setAnalysis(analysisRes.data);
        setSchedule(scheduleRes.data.games || []);
        setPlayers(playersRes.data);
        setAllTeams(teamsRes.data);
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

  // Calculate head-to-head records
  const getHeadToHeadData = () => {
    const h2h = {};
    allTeams.forEach(t => {
      if (t.id !== teamId) {
        h2h[t.id] = { name: t.name, abbreviation: t.abbreviation, wins: 0, losses: 0, color: t.color };
      }
    });
    
    schedule.forEach(game => {
      if (game.home_team_id === teamId && h2h[game.away_team_id]) {
        if (game.home_score > game.away_score) {
          h2h[game.away_team_id].wins++;
        } else {
          h2h[game.away_team_id].losses++;
        }
      } else if (game.away_team_id === teamId && h2h[game.home_team_id]) {
        if (game.away_score > game.home_score) {
          h2h[game.home_team_id].wins++;
        } else {
          h2h[game.home_team_id].losses++;
        }
      }
    });
    
    return Object.entries(h2h)
      .filter(([_, data]) => data.wins + data.losses > 0)
      .map(([id, data]) => ({
        id,
        name: data.abbreviation || data.name.split(' ').pop(),
        wins: data.wins,
        losses: data.losses,
        color: data.color
      }));
  };

  // Calculate season statistics
  const getSeasonStats = () => {
    const teamPlayers = players;
    let passingYards = 0, rushingYards = 0, receivingYards = 0, totalTackles = 0, totalTDs = 0;
    
    teamPlayers.forEach(p => {
      passingYards += p.stats?.passing_yards || 0;
      rushingYards += p.stats?.rushing_yards || 0;
      receivingYards += p.stats?.receiving_yards || 0;
      totalTackles += p.stats?.tackles || 0;
      totalTDs += p.stats?.touchdowns || 0;
    });
    
    return { passingYards, rushingYards, receivingYards, totalTackles, totalTDs };
  };

  // Calculate average points
  const getAvgPoints = () => {
    const teamGames = schedule.filter(g => g.home_team_id === teamId || g.away_team_id === teamId);
    if (teamGames.length === 0) return { scored: 0, allowed: 0 };
    
    let totalScored = 0, totalAllowed = 0;
    teamGames.forEach(g => {
      if (g.home_team_id === teamId) {
        totalScored += g.home_score;
        totalAllowed += g.away_score;
      } else {
        totalScored += g.away_score;
        totalAllowed += g.home_score;
      }
    });
    
    return {
      scored: (totalScored / teamGames.length).toFixed(1),
      allowed: (totalAllowed / teamGames.length).toFixed(1)
    };
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
  const h2hData = getHeadToHeadData();
  const seasonStats = getSeasonStats();
  const avgPoints = getAvgPoints();
  const winRate = ((team.wins / (team.wins + team.losses)) * 100).toFixed(1);
  const gamesPlayed = team.wins + team.losses;
  const winStreak = team.wins; // Simplified - would need game history for actual streak

  return (
    <div data-testid="team-analysis-page" className="min-h-screen">
      {/* Team Logo & Conference */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <TeamLogo team={team} size="2xl" className="mb-4" />
            <div className="text-center">
              <span className="font-body text-sm text-white/60 uppercase tracking-widest">
                {team.conference} • {team.division || 'Division'}
              </span>
            </div>
          </div>

          <Link to="/standings" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back to Standings</span>
          </Link>
        </div>
      </div>

      {/* Main Team Card */}
      <div className="px-6 md:px-12 -mt-4">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-panel border-white/10 border-t-4" style={{ borderTopColor: team.color }}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter text-neon-blue">
                    {team.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className="bg-white/10 text-white/60">{team.conference} Conference</Badge>
                    <Badge className="bg-white/10 text-white/60">{team.division || 'Unknown'} Division</Badge>
                    {playoffBadge && <Badge className={playoffBadge.color}>{playoffBadge.label}</Badge>}
                  </div>
                  <p className="font-body text-white/50 mt-2">Franchise Analysis & Legacy</p>
                </div>
                <div className="text-right">
                  <div className="font-heading font-black text-5xl text-white">{team.wins}-{team.losses}</div>
                  <div className="font-heading font-bold text-lg text-neon-volt">{winRate}% Win Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-6 md:px-12 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs text-white/40 uppercase">Total Games</span>
                  <Trophy className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="font-heading font-black text-3xl text-white">{gamesPlayed}</div>
                <div className="font-body text-xs text-white/50 mt-1">Win Streak: {winStreak}</div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs text-white/40 uppercase">AVG Points</span>
                  <Target className="w-4 h-4 text-teal-400" />
                </div>
                <div className="font-heading font-black text-3xl text-teal-400">{avgPoints.scored}</div>
                <div className="font-body text-xs text-white/50 mt-1">Allowed: {avgPoints.allowed}</div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs text-white/40 uppercase">Total TDs</span>
                  <Zap className="w-4 h-4 text-orange-400" />
                </div>
                <div className="font-heading font-black text-3xl text-orange-400">{seasonStats.totalTDs}</div>
                <div className="font-body text-xs text-white/50 mt-1">All categories</div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs text-white/40 uppercase">Roster</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="font-heading font-black text-3xl text-purple-400">{players.length}</div>
                <div className="font-body text-xs text-white/50 mt-1">Players all-time</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Season Statistics */}
      <div className="px-6 md:px-12 py-4">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                Season Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/5 text-center">
                  <div className="font-heading font-black text-3xl text-orange-400">
                    {seasonStats.passingYards.toLocaleString()}
                  </div>
                  <div className="font-body text-xs text-white/60 mt-1">Passing Yards</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-sky-500/20 to-sky-500/5 text-center">
                  <div className="font-heading font-black text-3xl text-sky-400">
                    {seasonStats.rushingYards.toLocaleString()}
                  </div>
                  <div className="font-body text-xs text-white/60 mt-1">Rushing Yards</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-500/5 text-center">
                  <div className="font-heading font-black text-3xl text-teal-400">
                    {seasonStats.receivingYards.toLocaleString()}
                  </div>
                  <div className="font-body text-xs text-white/60 mt-1">Receiving Yards</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/5 text-center">
                  <div className="font-heading font-black text-3xl text-red-400">
                    {seasonStats.totalTackles}
                  </div>
                  <div className="font-body text-xs text-white/60 mt-1">Total Tackles</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Head-to-Head Records */}
      {h2hData.length > 0 && (
        <div className="px-6 md:px-12 py-4">
          <div className="max-w-7xl mx-auto">
            <Card className="glass-panel border-white/10">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Head-to-Head Records
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={h2hData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis type="number" stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#a1a1aa" 
                        tick={{ fill: '#a1a1aa', fontSize: 11 }}
                        width={60}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0a0a0a', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="wins" name="Wins" fill="#40E0D0" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="losses" name="Losses" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Key Players (Roster) */}
      <div className="px-6 md:px-12 py-4">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-neon-volt" />
                Roster ({players.length} Players)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.slice(0, 6).map((player, idx) => (
                  <Link 
                    key={player.id}
                    to={`/player/${player.id}`}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                        <span className="font-heading font-bold text-lg">{player.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-heading font-bold text-white flex items-center gap-2">
                          {player.name}
                          {player.is_elite && <Star className="w-4 h-4 text-neon-volt" />}
                        </div>
                        <Badge className={`${getPositionColor(player.position)} text-white text-xs`}>
                          {player.position}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="font-body text-xs text-white/40">{player.games_played || 0} GP</span>
                      <span className="font-heading font-bold text-lg text-neon-blue">
                        {player.stats?.fantasy_points?.toFixed(1)} FP
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              {players.length > 6 && (
                <div className="mt-4 text-center">
                  <span className="font-body text-sm text-white/40">
                    + {players.length - 6} more players
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Team Analysis */}
      <div className="px-6 md:px-12 py-4 pb-8">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-neon-blue" />
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
        </div>
      </div>
    </div>
  );
};

export default TeamAnalysis;
