import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, TrendingUp, TrendingDown, Info, Crown, Users, Award, Grid } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import API from '../lib/api';

const Standings = () => {
  const [standings, setStandings] = useState({ grand_central: [], ridge: [], league_structure: null });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConference, setActiveConference] = useState('all');

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const [standingsRes, teamsRes] = await Promise.all([
          axios.get(`${API}/standings`),
          axios.get(`${API}/teams`)
        ]);
        setStandings(standingsRes.data);
        setTeams(teamsRes.data);
      } catch (error) {
        console.error('Error fetching standings:', error);
        // Set empty data to prevent crashes
        setStandings({ grand_central: [], ridge: [], league_structure: null });
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, []);

  const getPlayoffBadge = (status) => {
    if (!status) return null;
    const badges = {
      x: { label: 'x', color: 'bg-neon-volt/20 text-neon-volt border-neon-volt/30', desc: 'Division Leader' },
      y: { label: 'y', color: 'bg-neon-blue/20 text-neon-blue border-neon-blue/30', desc: 'Wildcard' },
      z: { label: 'z', color: 'bg-white/10 text-white/60 border-white/20', desc: 'Playins' },
    };
    return badges[status];
  };

  // Get all teams sorted by wins for league standings
  const getAllTeamsSorted = () => {
    return [...standings.grand_central, ...standings.ridge].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
  };

  // Get top 5 teams per conference for playoff picture
  const getPlayoffPicture = (conference) => {
    const confTeams = conference === 'grand_central' ? standings.grand_central : standings.ridge;
    return confTeams.slice(0, 5);
  };

  // Group teams by division
  const getTeamsByDivision = (conference) => {
    const confTeams = conference === 'Grand Central' ? standings.grand_central : standings.ridge;
    const divisions = {};
    confTeams.forEach(team => {
      const div = team.division || 'Unknown';
      if (!divisions[div]) divisions[div] = [];
      divisions[div].push(team);
    });
    return divisions;
  };

  const renderStandingsTable = (teamsList, showRank = true) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider w-16">RANK</TableHead>
            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider">TEAM</TableHead>
            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center w-16">W</TableHead>
            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center w-16">L</TableHead>
            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center w-20">PCT</TableHead>
            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center w-20">PF</TableHead>
            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center w-20">PA</TableHead>
            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center w-24">DIFF</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamsList.map((team, idx) => {
            const pct = ((team.wins / (team.wins + team.losses)) * 100).toFixed(1);
            const diff = (team.points_for - team.points_against).toFixed(0);
            const playoffBadge = getPlayoffBadge(team.playoff_status);
            
            return (
              <TableRow 
                key={team.id} 
                className={`border-white/5 table-row-hover cursor-pointer ${team.playoff_status ? 'bg-white/[0.02]' : ''}`}
                data-testid={`standings-row-${team.id}`}
              >
                <TableCell className="font-heading font-black text-lg text-white/30">
                  <div className="flex items-center gap-2">
                    {idx < 3 && <Crown className={`w-4 h-4 ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-amber-700'}`} />}
                    {showRank ? idx + 1 : ''}
                  </div>
                </TableCell>
                <TableCell>
                  <Link to={`/team/${team.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold text-white shadow-lg"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.abbreviation?.charAt(0)}
                    </div>
                    <div className="flex items-center gap-2">
                      {playoffBadge && (
                        <Badge className={`${playoffBadge.color} text-xs px-1.5 py-0`}>
                          {playoffBadge.label}
                        </Badge>
                      )}
                      <span className="font-heading font-bold text-white hover:text-neon-blue transition-colors">
                        {team.name}
                      </span>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-center font-heading font-bold text-neon-blue text-lg">{team.wins}</TableCell>
                <TableCell className="text-center font-heading font-bold text-red-400 text-lg">{team.losses}</TableCell>
                <TableCell className="text-center font-heading font-bold text-white">{pct}%</TableCell>
                <TableCell className="text-center font-body text-teal-400">{team.points_for.toFixed(0)}</TableCell>
                <TableCell className="text-center font-body text-white/60">{team.points_against.toFixed(0)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {parseFloat(diff) > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : parseFloat(diff) < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : null}
                    <span className={`font-heading font-bold ${parseFloat(diff) > 0 ? 'text-green-500' : parseFloat(diff) < 0 ? 'text-red-500' : 'text-white/60'}`}>
                      {parseFloat(diff) > 0 ? '+' : ''}{diff}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Safety checks to prevent crashes
  if (!standings || (!standings.grand_central && !standings.ridge)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-white/70 text-center">
              Unable to load standings data. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const structure = standings.league_structure || null;
  const allTeamsSorted = getAllTeamsSorted();
  const gcPlayoff = getPlayoffPicture('grand_central');
  const ridgePlayoff = getPlayoffPicture('ridge');

  // Calculate quick stats
  const playoffTeams = allTeamsSorted.filter(t => t && t.playoff_status).length;
  const leadingTeam = allTeamsSorted[0];
  const bestRecord = leadingTeam ? `${leadingTeam.wins || 0}-${leadingTeam.losses || 0}` : '0-0';

  return (
    <div data-testid="standings-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Trophy className="w-6 h-6 text-neon-volt" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">League Rankings</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            TEAM <span className="text-neon-volt">STANDINGS</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            Current season rankings and records
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Playoff Picture + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Playoff Picture */}
            <div className="lg:col-span-3">
              <Card className="glass-panel border-white/10" data-testid="playoff-picture">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                    <Crown className="w-5 h-5 text-neon-volt" />
                    Playoff Picture (Top 5 per Conference)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Grand Central */}
                    <div>
                      <h4 className="font-heading font-bold text-sm text-neon-blue uppercase mb-4">Grand Central</h4>
                      <div className="space-y-2">
                        {gcPlayoff.map((team, idx) => (
                          <Link 
                            key={team.id} 
                            to={`/team/${team.id}`}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-heading font-bold text-white/40 w-6">#{idx + 1}</span>
                              <div 
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: team.color }}
                              >
                                {team.abbreviation?.charAt(0)}
                              </div>
                              <span className="font-heading font-bold text-white">{team.name}</span>
                            </div>
                            <span className="font-heading font-bold text-neon-blue">{team.wins}-{team.losses}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                    
                    {/* Ridge */}
                    <div>
                      <h4 className="font-heading font-bold text-sm text-neon-volt uppercase mb-4">Ridge</h4>
                      <div className="space-y-2">
                        {ridgePlayoff.map((team, idx) => (
                          <Link 
                            key={team.id} 
                            to={`/team/${team.id}`}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-heading font-bold text-white/40 w-6">#{idx + 1}</span>
                              <div 
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: team.color }}
                              >
                                {team.abbreviation?.charAt(0)}
                              </div>
                              <span className="font-heading font-bold text-white">{team.name}</span>
                            </div>
                            <span className="font-heading font-bold text-neon-volt">{team.wins}-{team.losses}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="lg:col-span-1">
              <Card className="glass-panel border-white/10 h-full" data-testid="quick-stats">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="font-heading font-bold text-lg uppercase tracking-tight">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="font-body text-sm text-white/60">Total Teams:</span>
                    <span className="font-heading font-bold text-neon-blue text-lg">{teams.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="font-body text-sm text-white/60">Playoff Teams:</span>
                    <span className="font-heading font-bold text-neon-volt text-lg">{playoffTeams}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="font-body text-sm text-white/60">Conferences:</span>
                    <span className="font-heading font-bold text-white text-lg">2</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="font-body text-sm text-white/60">Leading Team:</span>
                    <span className="font-heading font-bold text-white text-sm">{leadingTeam?.name}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="font-body text-sm text-white/60">Best Record:</span>
                    <span className="font-heading font-bold text-neon-volt text-lg">{bestRecord}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* League Structure */}
          <Card className="glass-panel border-white/10" data-testid="league-structure">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                <Grid className="w-5 h-5 text-neon-blue" />
                League Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Grand Central Conference */}
                <div className="space-y-4">
                  <h4 className="font-heading font-bold text-lg text-neon-blue uppercase border-b border-neon-blue/30 pb-2">
                    Grand Central Conference
                  </h4>
                  {Object.entries(getTeamsByDivision('Grand Central')).map(([division, divTeams]) => (
                    <div key={division} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm text-white/80">{division} Division</span>
                        <span className="font-body text-xs text-white/40">{divTeams.length} teams</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        {divTeams.map(team => (
                          <Link 
                            key={team.id} 
                            to={`/team/${team.id}`}
                            className="block font-body text-sm text-white/60 hover:text-white transition-colors"
                          >
                            {team.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ridge Conference */}
                <div className="space-y-4">
                  <h4 className="font-heading font-bold text-lg text-neon-volt uppercase border-b border-neon-volt/30 pb-2">
                    Ridge Conference
                  </h4>
                  {Object.entries(getTeamsByDivision('Ridge')).map(([division, divTeams]) => (
                    <div key={division} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm text-white/80">{division} Division</span>
                        <span className="font-body text-xs text-white/40">{divTeams.length} teams</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        {divTeams.map(team => (
                          <Link 
                            key={team.id} 
                            to={`/team/${team.id}`}
                            className="block font-body text-sm text-white/60 hover:text-white transition-colors"
                          >
                            {team.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standings Table */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <Tabs value={activeConference} onValueChange={setActiveConference} className="w-full">
                <TabsList data-testid="conference-tabs" className="bg-transparent flex gap-2 h-auto p-0">
                  <TabsTrigger
                    value="all"
                    data-testid="tab-all"
                    className="px-6 py-3 rounded-lg font-heading font-bold text-sm uppercase tracking-wider transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
                  >
                    League Standings
                  </TabsTrigger>
                  <TabsTrigger
                    value="grand_central"
                    data-testid="tab-grand-central"
                    className="px-6 py-3 rounded-lg font-heading font-bold text-sm uppercase tracking-wider transition-all data-[state=active]:bg-neon-blue data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
                  >
                    Grand Central Conference
                  </TabsTrigger>
                  <TabsTrigger
                    value="ridge"
                    data-testid="tab-ridge"
                    className="px-6 py-3 rounded-lg font-heading font-bold text-sm uppercase tracking-wider transition-all data-[state=active]:bg-neon-volt data-[state=active]:text-black data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
                  >
                    Ridge Conference
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {activeConference === 'all' && renderStandingsTable(allTeamsSorted)}
              {activeConference === 'grand_central' && renderStandingsTable(standings.grand_central)}
              {activeConference === 'ridge' && renderStandingsTable(standings.ridge)}
            </CardContent>
          </Card>

          {/* Legend */}
          {structure && (
            <Card className="glass-panel border-white/10" data-testid="standings-legend">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                  <Info className="w-5 h-5 text-neon-blue" />
                  Legend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Statistics */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-sm text-white uppercase mb-3">Statistics</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(structure.stats_legend).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="font-heading font-bold text-sm text-neon-blue">{key}:</span>
                          <span className="font-body text-xs text-white/60">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Playoff Indicators */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-sm text-white uppercase mb-3">Playoff Indicators</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-neon-volt/20 text-neon-volt border-neon-volt/30 px-2">x</Badge>
                        <span className="font-body text-sm text-white/70">Division Leader (#1-4 Seed, Bye to Elite 8)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/30 px-2">y</Badge>
                        <span className="font-body text-sm text-white/70">Wildcard (#5-6 Seed, Elite 8)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-white/10 text-white/60 border-white/20 px-2">z</Badge>
                        <span className="font-body text-sm text-white/70">Playins (#7-10 Seed)</span>
                      </div>
                    </div>
                  </div>

                  {/* Playoff Format */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-sm text-white uppercase mb-3">Playoff Format</h4>
                    <ul className="space-y-1 font-body text-sm text-white/70">
                      <li>• 10-team playoff bracket</li>
                      <li>• Seeds 1-4: Division leaders (bye to Elite 8)</li>
                      <li>• Seeds 5-6: Wildcards (straight to Elite 8)</li>
                      <li>• Seeds 7-10: Playins round</li>
                      <li>• Elite 8 → Final 4 → United Flag Bowl</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Standings;
