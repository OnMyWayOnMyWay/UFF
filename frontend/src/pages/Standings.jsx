import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Standings = () => {
  const [standings, setStandings] = useState({ grand_central: [], ridge: [], league_structure: null });
  const [loading, setLoading] = useState(true);
  const [activeConference, setActiveConference] = useState('all');

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const response = await axios.get(`${API}/standings`);
        setStandings(response.data);
      } catch (error) {
        console.error('Error fetching standings:', error);
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

  const renderStandingsTable = (teams, conferenceName) => (
    <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${conferenceName === 'Grand Central' ? 'bg-neon-blue' : 'bg-neon-volt'}`} />
        <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white">
          {conferenceName} Conference
        </h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider w-12">#</TableHead>
              <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider">Team</TableHead>
              <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center">W</TableHead>
              <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center">L</TableHead>
              <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-center">PCT</TableHead>
              <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-right">PF</TableHead>
              <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-right">PA</TableHead>
              <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider text-right">DIFF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team, idx) => {
              const pct = ((team.wins / (team.wins + team.losses)) * 100).toFixed(0);
              const diff = (team.points_for - team.points_against).toFixed(1);
              const playoffBadge = getPlayoffBadge(team.playoff_status);
              
              return (
                <TableRow 
                  key={team.id} 
                  className={`border-white/5 table-row-hover ${team.playoff_status ? 'bg-white/[0.02]' : ''}`}
                  data-testid={`standings-row-${team.id}`}
                >
                  <TableCell className="font-heading font-black text-xl text-white/20">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold text-white"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.abbreviation?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-heading font-bold text-white flex items-center gap-2">
                          {team.name}
                          {playoffBadge && (
                            <Badge className={`${playoffBadge.color} text-xs px-1.5`}>
                              {playoffBadge.label}
                            </Badge>
                          )}
                        </div>
                        <div className="font-body text-xs text-white/40">{team.abbreviation}</div>
                      </div>
                      {idx === 0 && (
                        <Trophy className="w-4 h-4 text-neon-volt ml-2" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-heading font-bold text-neon-volt text-lg">{team.wins}</TableCell>
                  <TableCell className="text-center font-heading font-bold text-white/60 text-lg">{team.losses}</TableCell>
                  <TableCell className="text-center font-heading font-bold text-white">{pct}%</TableCell>
                  <TableCell className="text-right font-body text-white/80">{team.points_for.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-body text-white/60">{team.points_against.toFixed(1)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {parseFloat(diff) > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`font-heading font-bold ${parseFloat(diff) > 0 ? 'text-green-500' : 'text-red-500'}`}>
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
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const structure = standings.league_structure;

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
            LEAGUE <span className="text-neon-volt">STANDINGS</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            Conference standings and playoff positions.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* League Structure Card */}
          {structure && (
            <Card className="glass-panel border-white/10" data-testid="league-structure">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight flex items-center gap-2">
                  <Info className="w-5 h-5 text-neon-blue" />
                  League Structure & Playoff Format
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Playoff Format */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-lg text-neon-volt uppercase">Playoff Format</h4>
                    <ul className="space-y-2 font-body text-sm text-white/70">
                      <li>• {structure.format}</li>
                      <li>• {structure.seeding.division_leaders}</li>
                      <li>• {structure.seeding.wildcards}</li>
                      <li>• {structure.seeding.playins}</li>
                    </ul>
                    <div className="pt-2">
                      <p className="font-body text-xs text-white/50">
                        {structure.rounds.join(' → ')}
                      </p>
                    </div>
                  </div>

                  {/* Playoff Indicators */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-lg text-neon-blue uppercase">Playoff Indicators</h4>
                    <div className="space-y-2">
                      {Object.entries(structure.legend).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-3">
                          <Badge className={
                            key === 'x' ? 'bg-neon-volt/20 text-neon-volt border-neon-volt/30' :
                            key === 'y' ? 'bg-neon-blue/20 text-neon-blue border-neon-blue/30' :
                            'bg-white/10 text-white/60 border-white/20'
                          }>
                            {key}
                          </Badge>
                          <span className="font-body text-sm text-white/70">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statistics Legend */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-bold text-lg text-white uppercase">Statistics</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(structure.stats_legend).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="font-heading font-bold text-sm text-neon-blue">{key}:</span>
                          <span className="font-body text-xs text-white/60">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeConference} onValueChange={setActiveConference} className="space-y-6">
            <TabsList data-testid="conference-tabs" className="bg-transparent flex gap-2 h-auto p-0">
              <TabsTrigger
                value="all"
                data-testid="tab-all"
                className="px-6 py-3 rounded-lg font-heading font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
              >
                All Conferences
              </TabsTrigger>
              <TabsTrigger
                value="grand_central"
                data-testid="tab-grand-central"
                className="px-6 py-3 rounded-lg font-heading font-bold uppercase tracking-wider transition-all data-[state=active]:bg-neon-blue data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
              >
                Grand Central
              </TabsTrigger>
              <TabsTrigger
                value="ridge"
                data-testid="tab-ridge"
                className="px-6 py-3 rounded-lg font-heading font-bold uppercase tracking-wider transition-all data-[state=active]:bg-neon-volt data-[state=active]:text-black data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
              >
                Ridge
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-8 mt-6">
              <div className="animate-slide-up">
                {renderStandingsTable(standings.grand_central, 'Grand Central')}
              </div>
              <div className="animate-slide-up stagger-2">
                {renderStandingsTable(standings.ridge, 'Ridge')}
              </div>
            </TabsContent>

            <TabsContent value="grand_central" className="mt-6">
              <div className="animate-slide-up">
                {renderStandingsTable(standings.grand_central, 'Grand Central')}
              </div>
            </TabsContent>

            <TabsContent value="ridge" className="mt-6">
              <div className="animate-slide-up">
                {renderStandingsTable(standings.ridge, 'Ridge')}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Standings;
