import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const POSITIONS = ['QB', 'WR', 'RB', 'TE', 'K', 'DEF'];

const PlayerStats = () => {
  const { position } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePosition, setActivePosition] = useState(position?.toUpperCase() || 'QB');

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/players?position=${activePosition}`);
        setPlayers(response.data.sort((a, b) => (b.stats?.fantasy_points || 0) - (a.stats?.fantasy_points || 0)));
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, [activePosition]);

  const handlePositionChange = (pos) => {
    setActivePosition(pos);
    navigate(`/players/${pos.toLowerCase()}`, { replace: true });
  };

  const getPositionColor = (pos) => {
    const colors = {
      QB: 'bg-orange-500 text-white',
      WR: 'bg-teal-500 text-white',
      RB: 'bg-sky-500 text-white',
      TE: 'bg-emerald-500 text-white',
      K: 'bg-purple-500 text-white',
      DEF: 'bg-red-500 text-white'
    };
    return colors[pos] || 'bg-gray-500 text-white';
  };

  const getStatsColumns = (pos) => {
    switch (pos) {
      case 'QB':
        return ['Pass YDS', 'TDs', 'INTs', 'Fantasy Pts'];
      case 'WR':
      case 'TE':
        return ['Receptions', 'Rec YDS', 'TDs', 'Fantasy Pts'];
      case 'RB':
        return ['Rush YDS', 'TDs', 'Receptions', 'Fantasy Pts'];
      case 'K':
        return ['FG Made', 'XP Made', 'Fantasy Pts'];
      case 'DEF':
        return ['Sacks', 'INTs', 'TDs', 'Fantasy Pts'];
      default:
        return ['Fantasy Pts'];
    }
  };

  const getStatValue = (player, statName) => {
    const stats = player.stats;
    switch (statName) {
      case 'Pass YDS': return stats.passing_yards?.toLocaleString() || '-';
      case 'TDs': return stats.touchdowns || '-';
      case 'INTs': return stats.interceptions || '-';
      case 'Receptions': return stats.receptions || '-';
      case 'Rec YDS': return stats.receiving_yards?.toLocaleString() || '-';
      case 'Rush YDS': return stats.rushing_yards?.toLocaleString() || '-';
      case 'FG Made': return stats.field_goals || '-';
      case 'XP Made': return stats.extra_points || '-';
      case 'Sacks': return stats.sacks || '-';
      case 'Fantasy Pts': return stats.fantasy_points?.toFixed(1) || '-';
      default: return '-';
    }
  };

  return (
    <div data-testid="player-stats-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Users className="w-6 h-6 text-neon-blue" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Player Rankings</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            PLAYER <span className="text-neon-blue">STATS</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            Rankings and statistics by position.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activePosition} onValueChange={handlePositionChange} className="space-y-6">
            {/* Position Tabs */}
            <TabsList data-testid="position-tabs" className="bg-transparent flex flex-wrap gap-2 h-auto p-0">
              {POSITIONS.map((pos) => (
                <TabsTrigger
                  key={pos}
                  value={pos}
                  data-testid={`tab-${pos.toLowerCase()}`}
                  className={`px-6 py-3 rounded-lg font-heading font-bold uppercase tracking-wider transition-all data-[state=active]:${getPositionColor(pos).split(' ')[0]} data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60 hover:bg-white/10`}
                >
                  {pos}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Player Tables */}
            {POSITIONS.map((pos) => (
              <TabsContent key={pos} value={pos} className="mt-6">
                <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider w-12">Rank</TableHead>
                            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider">Player</TableHead>
                            <TableHead className="font-heading font-bold text-white/40 uppercase tracking-wider">Team</TableHead>
                            {getStatsColumns(pos).map((col) => (
                              <TableHead key={col} className="font-heading font-bold text-white/40 uppercase tracking-wider text-right">
                                {col}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {players.map((player, idx) => (
                            <TableRow 
                              key={player.id} 
                              className="border-white/5 table-row-hover"
                              data-testid={`player-row-${idx}`}
                            >
                              <TableCell className="font-heading font-black text-xl text-white/20">
                                {String(idx + 1).padStart(2, '0')}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                    <span className="font-heading font-bold">{player.name.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <div className="font-heading font-bold text-white">{player.name}</div>
                                    {player.is_elite && (
                                      <Badge className="bg-neon-volt/20 text-neon-volt text-xs mt-1">ELITE</Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-body text-white/60">{player.team}</TableCell>
                              {getStatsColumns(pos).map((col) => (
                                <TableCell key={col} className={`text-right font-heading font-bold ${col === 'Fantasy Pts' ? 'text-neon-blue text-lg' : 'text-white'}`}>
                                  {getStatValue(player, col)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PlayerStats;
