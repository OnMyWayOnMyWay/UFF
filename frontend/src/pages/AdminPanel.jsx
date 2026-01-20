import { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, Users, Calendar, ArrowRightLeft, AlertCircle, Plus, Trash2, Edit, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPanel = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);

  const authenticate = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { 'X-Admin-Key': adminKey }
      });
      setStats(response.data);
      setIsAuthenticated(true);
      toast.success('Authentication successful');
      fetchData();
    } catch (error) {
      toast.error('Invalid admin key');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [teamsRes, playersRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/players?limit=100`)
      ]);
      setTeams(teamsRes.data);
      setPlayers(playersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const updateTeam = async (teamId, updates) => {
    try {
      await axios.put(`${API}/admin/team/${teamId}`, updates, {
        headers: { 'X-Admin-Key': adminKey }
      });
      toast.success('Team updated');
      setEditingTeam(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update team');
    }
  };

  const updatePlayer = async (playerId, updates) => {
    try {
      await axios.put(`${API}/admin/player/${playerId}`, updates, {
        headers: { 'X-Admin-Key': adminKey }
      });
      toast.success('Player updated');
      setEditingPlayer(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update player');
    }
  };

  const deletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to delete this player?')) return;
    try {
      await axios.delete(`${API}/admin/player/${playerId}`, {
        headers: { 'X-Admin-Key': adminKey }
      });
      toast.success('Player deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  const getPositionColor = (pos) => {
    const colors = {
      QB: 'bg-orange-500',
      WR: 'bg-teal-500',
      RB: 'bg-sky-500',
      TE: 'bg-emerald-500',
      K: 'bg-purple-500',
      DEF: 'bg-red-500'
    };
    return colors[pos] || 'bg-gray-500';
  };

  if (!isAuthenticated) {
    return (
      <div data-testid="admin-login" className="min-h-screen flex items-center justify-center px-6">
        <Card className="glass-panel border-white/10 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-neon-blue/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-neon-blue" />
            </div>
            <CardTitle className="font-heading font-bold text-2xl uppercase tracking-tight">
              Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="font-body text-sm text-white/60 mb-2 block">Admin Key</label>
              <Input
                type="password"
                placeholder="Enter admin key..."
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="bg-white/5 border-white/10"
                data-testid="admin-key-input"
              />
            </div>
            <Button 
              onClick={authenticate} 
              disabled={loading || !adminKey}
              className="w-full bg-neon-blue hover:bg-neon-blue/80"
              data-testid="admin-login-btn"
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="admin-panel" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Shield className="w-6 h-6 text-neon-blue" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">League Management</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            ADMIN <span className="text-neon-blue">PANEL</span>
          </h1>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="px-6 md:px-12 py-6 border-b border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="glass-panel rounded-lg p-4 text-center">
                  <div className="font-body text-xs uppercase tracking-widest text-white/40 mb-1">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="font-heading font-black text-2xl text-neon-blue">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="teams" className="space-y-6">
            <TabsList data-testid="admin-tabs" className="bg-transparent flex gap-2 h-auto p-0">
              <TabsTrigger
                value="teams"
                className="px-6 py-3 rounded-lg font-heading font-bold uppercase tracking-wider transition-all data-[state=active]:bg-neon-blue data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
              >
                <Users className="w-4 h-4 mr-2" />
                Teams
              </TabsTrigger>
              <TabsTrigger
                value="players"
                className="px-6 py-3 rounded-lg font-heading font-bold uppercase tracking-wider transition-all data-[state=active]:bg-neon-blue data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
              >
                <Users className="w-4 h-4 mr-2" />
                Players
              </TabsTrigger>
            </TabsList>

            {/* Teams Tab */}
            <TabsContent value="teams">
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                    Manage Teams
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Team</th>
                          <th className="p-4 text-center font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Record</th>
                          <th className="p-4 text-center font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Seed</th>
                          <th className="p-4 text-center font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Status</th>
                          <th className="p-4 text-center font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team) => (
                          <tr key={team.id} className="border-b border-white/5 table-row-hover">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold text-white"
                                  style={{ backgroundColor: team.color }}
                                >
                                  {team.abbreviation?.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-heading font-bold text-white">{team.name}</div>
                                  <div className="font-body text-xs text-white/40">{team.conference}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {editingTeam === team.id ? (
                                <div className="flex gap-2 justify-center">
                                  <Input 
                                    defaultValue={team.wins}
                                    className="w-16 bg-white/5 border-white/10 text-center"
                                    id={`wins-${team.id}`}
                                  />
                                  <Input 
                                    defaultValue={team.losses}
                                    className="w-16 bg-white/5 border-white/10 text-center"
                                    id={`losses-${team.id}`}
                                  />
                                </div>
                              ) : (
                                <span className="font-heading font-bold text-white">{team.wins}-{team.losses}</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-heading font-bold text-neon-blue">#{team.seed || '-'}</span>
                            </td>
                            <td className="p-4 text-center">
                              {team.playoff_status && (
                                <Badge className={
                                  team.playoff_status === 'x' ? 'bg-neon-volt/20 text-neon-volt' :
                                  team.playoff_status === 'y' ? 'bg-neon-blue/20 text-neon-blue' :
                                  'bg-white/10 text-white/60'
                                }>
                                  {team.playoff_status}
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {editingTeam === team.id ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const wins = parseInt(document.getElementById(`wins-${team.id}`).value);
                                    const losses = parseInt(document.getElementById(`losses-${team.id}`).value);
                                    updateTeam(team.id, { wins, losses });
                                  }}
                                  className="bg-green-500 hover:bg-green-600"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingTeam(team.id)}
                                  className="text-white/60 hover:text-white"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Players Tab */}
            <TabsContent value="players">
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="font-heading font-bold text-xl uppercase tracking-tight">
                    Manage Players
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Player</th>
                          <th className="p-4 text-center font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Position</th>
                          <th className="p-4 text-left font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Team</th>
                          <th className="p-4 text-center font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Fantasy Pts</th>
                          <th className="p-4 text-center font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Status</th>
                          <th className="p-4 text-center font-heading font-bold text-white/40 uppercase tracking-wider text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.slice(0, 20).map((player) => (
                          <tr key={player.id} className="border-b border-white/5 table-row-hover">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                  <span className="font-heading font-bold">{player.name.charAt(0)}</span>
                                </div>
                                <div>
                                  <div className="font-heading font-bold text-white">{player.name}</div>
                                  {player.is_elite && (
                                    <Badge className="bg-neon-volt/20 text-neon-volt text-xs">ELITE</Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <Badge className={`${getPositionColor(player.position)} text-white`}>
                                {player.position}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span className="font-body text-white/60">{player.team}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-heading font-bold text-neon-blue">
                                {player.stats?.fantasy_points?.toFixed(1)}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {player.injury_status ? (
                                <Badge variant="outline" className="border-red-500/50 text-red-500">
                                  {player.injury_status}
                                </Badge>
                              ) : (
                                <Badge className="bg-green-500/20 text-green-500">Active</Badge>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deletePlayer(player.id)}
                                  className="text-white/60 hover:text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
