import { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, Users, Calendar, ArrowRightLeft, Trash2, Edit, Save, Plus, Search, Download, RefreshCw, AlertCircle, Check, X, Trophy, BarChart3, History, Zap, UserPlus, Merge, Copy, Image, Camera, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPanel = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [trades, setTrades] = useState([]);
  const [playoffs, setPlayoffs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form states
  const [searchQuery, setSearchQuery] = useState('');
  const [robloxSearch, setRobloxSearch] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [newAdminForm, setNewAdminForm] = useState({ username: '', password: '', role: 'admin' });
  const [tradeForm, setTradeForm] = useState({ team1_id: '', team2_id: '', team1_receives: '', team2_receives: '' });
  const [gameForm, setGameForm] = useState({ week: 1, home_team_id: '', away_team_id: '', mode: 'simple' });
  const [bulkDeleteRange, setBulkDeleteRange] = useState({ start: 1, end: 1 });
  const [mergeForm, setMergeForm] = useState({ source_player_id: '', target_player_id: '', keep_name: 'target' });
  
  // Edit modal states
  const [editTeamModal, setEditTeamModal] = useState({ open: false, team: null });
  const [editGameModal, setEditGameModal] = useState({ open: false, game: null });
  const [editPlayerModal, setEditPlayerModal] = useState({ open: false, player: null });
  
  const headers = { 'X-Admin-Key': adminKey };

  const authenticate = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/stats`, { headers: { 'X-Admin-Key': adminKey } });
      setStats(response.data);
      setIsAuthenticated(true);
      setCurrentAdmin({ username: 'admin' });
      toast.success('Authentication successful');
      fetchAllData();
    } catch (error) {
      toast.error('Invalid admin key');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      const [teamsRes, playersRes, gamesRes, tradesRes, playoffsRes, adminsRes, logRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/players?limit=100`),
        axios.get(`${API}/schedule`),
        axios.get(`${API}/trades`),
        axios.get(`${API}/admin/playoffs`, { headers }),
        axios.get(`${API}/admin/admins`, { headers }),
        axios.get(`${API}/admin/activity-log`, { headers }),
        axios.get(`${API}/player-analytics`)
      ]);
      setTeams(teamsRes.data);
      setPlayers(playersRes.data);
      setGames(gamesRes.data.games || []);
      setTrades(tradesRes.data);
      setPlayoffs(playoffsRes.data.matchups || []);
      setAdmins(adminsRes.data);
      setActivityLog(logRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const refreshStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/stats`, { headers });
      setStats(res.data);
      toast.success('Stats refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    }
  };

  // Admin Management
  const createAdmin = async () => {
    try {
      await axios.post(`${API}/admin/admins`, newAdminForm, { headers });
      toast.success('Admin created');
      setNewAdminForm({ username: '', password: '', role: 'admin' });
      const res = await axios.get(`${API}/admin/admins`, { headers });
      setAdmins(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create admin');
    }
  };

  const deleteAdmin = async (username) => {
    if (!window.confirm(`Delete admin ${username}?`)) return;
    try {
      await axios.delete(`${API}/admin/admins/${username}`, { headers });
      toast.success('Admin deleted');
      setAdmins(admins.filter(a => a.username !== username));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  // Player Management
  const updatePlayer = async (playerId, updates) => {
    try {
      await axios.put(`${API}/admin/player/${playerId}`, updates, { headers });
      toast.success('Player updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update player');
    }
  };

  const updatePlayerStats = async (playerId, stats) => {
    try {
      await axios.put(`${API}/admin/player/${playerId}/stats`, stats, { headers });
      toast.success('Stats updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update stats');
    }
  };

  const deletePlayer = async (playerId) => {
    if (!window.confirm('Delete this player?')) return;
    try {
      await axios.delete(`${API}/admin/player/${playerId}`, { headers });
      toast.success('Player deleted');
      setPlayers(players.filter(p => p.id !== playerId));
    } catch (error) {
      toast.error('Failed to delete player');
    }
  };

  // Fetch Roblox avatar for a player
  const [fetchingAvatar, setFetchingAvatar] = useState({});
  
  const fetchPlayerAvatar = async (playerId) => {
    setFetchingAvatar(prev => ({ ...prev, [playerId]: true }));
    try {
      const res = await axios.post(`${API}/admin/player/${playerId}/fetch-avatar`, {}, { headers });
      if (res.data.success) {
        toast.success('Avatar fetched successfully!');
        fetchAllData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fetch avatar');
    } finally {
      setFetchingAvatar(prev => ({ ...prev, [playerId]: false }));
    }
  };

  // Bulk fetch all avatars
  const fetchAllAvatars = async () => {
    const playersWithoutAvatars = players.filter(p => !p.image && (p.roblox_id || p.roblox_username));
    if (playersWithoutAvatars.length === 0) {
      toast.info('All players already have avatars');
      return;
    }
    toast.info(`Fetching avatars for ${playersWithoutAvatars.length} players...`);
    for (const player of playersWithoutAvatars) {
      await fetchPlayerAvatar(player.id);
      await new Promise(r => setTimeout(r, 500)); // Rate limiting
    }
    toast.success('Avatar fetch complete!');
  };

  const searchRoblox = async () => {
    try {
      const res = await axios.get(`${API}/admin/player/search-roblox?roblox_id=${robloxSearch}&roblox_username=${robloxSearch}`, { headers });
      if (res.data.length > 0) {
        toast.success(`Found ${res.data.length} player(s)`);
      } else {
        toast.info('No players found');
      }
      return res.data;
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const mergePlayers = async () => {
    if (!mergeForm.source_player_id || !mergeForm.target_player_id) {
      toast.error('Select both players');
      return;
    }
    try {
      await axios.post(`${API}/admin/player/merge`, mergeForm, { headers });
      toast.success('Players merged');
      fetchAllData();
      setMergeForm({ source_player_id: '', target_player_id: '', keep_name: 'target' });
    } catch (error) {
      toast.error('Failed to merge players');
    }
  };

  // Team Management
  const updateTeam = async (teamId, updates) => {
    try {
      await axios.put(`${API}/admin/team/${teamId}`, updates, { headers });
      toast.success('Team updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update team');
    }
  };

  const updateTeamBranding = async (teamId, color, logo) => {
    try {
      await axios.put(`${API}/admin/team/${teamId}/branding?color=${encodeURIComponent(color)}&logo=${encodeURIComponent(logo || '')}`, {}, { headers });
      toast.success('Branding updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update branding');
    }
  };

  // Game Management
  const createGame = async () => {
    try {
      await axios.post(`${API}/admin/game`, gameForm, { headers });
      toast.success('Game created');
      fetchAllData();
      setGameForm({ week: 1, home_team_id: '', away_team_id: '', mode: 'simple' });
    } catch (error) {
      toast.error('Failed to create game');
    }
  };

  const updateGame = async (gameId, updates) => {
    try {
      await axios.put(`${API}/admin/game/${gameId}`, updates, { headers });
      toast.success('Game updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update game');
    }
  };

  const deleteGame = async (gameId) => {
    try {
      await axios.delete(`${API}/admin/game/${gameId}`, { headers });
      toast.success('Game deleted');
      setGames(games.filter(g => g.id !== gameId));
    } catch (error) {
      toast.error('Failed to delete game');
    }
  };

  const bulkDeleteGames = async () => {
    if (!window.confirm(`Delete all games from week ${bulkDeleteRange.start} to ${bulkDeleteRange.end}?`)) return;
    try {
      const res = await axios.post(`${API}/admin/game/bulk-delete`, { start_week: bulkDeleteRange.start, end_week: bulkDeleteRange.end }, { headers });
      toast.success(`Deleted ${res.data.deleted_count} games`);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete games');
    }
  };

  const cloneGame = async (gameId, targetWeek) => {
    try {
      await axios.post(`${API}/admin/game/clone`, { game_id: gameId, target_week: targetWeek }, { headers });
      toast.success('Game cloned');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to clone game');
    }
  };

  const exportGames = async () => {
    try {
      const res = await axios.get(`${API}/admin/games/export`, { headers, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'games_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Games exported');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  // Trade Management
  const createTrade = async () => {
    try {
      await axios.post(`${API}/admin/trade`, {
        team1_id: tradeForm.team1_id,
        team2_id: tradeForm.team2_id,
        team1_receives: tradeForm.team1_receives.split(',').map(s => s.trim()),
        team2_receives: tradeForm.team2_receives.split(',').map(s => s.trim())
      }, { headers });
      toast.success('Trade created');
      fetchAllData();
      setTradeForm({ team1_id: '', team2_id: '', team1_receives: '', team2_receives: '' });
    } catch (error) {
      toast.error('Failed to create trade');
    }
  };

  // Playoff Management
  const updatePlayoff = async (matchupId, updates) => {
    try {
      await axios.put(`${API}/admin/playoff/${matchupId}`, { matchup_id: matchupId, ...updates }, { headers });
      toast.success('Playoff updated');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update playoff');
    }
  };

  // Season Reset
  const resetSeason = async () => {
    if (!window.confirm('WARNING: This will reset ALL season data. Are you sure?')) return;
    if (!window.confirm('This action cannot be undone. Type "RESET" to confirm.')) return;
    try {
      await axios.post(`${API}/admin/season/reset`, {}, { headers });
      toast.success('Season reset complete');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to reset season');
    }
  };

  // Data Validation
  const validateData = async () => {
    try {
      const res = await axios.get(`${API}/admin/validate`, { headers });
      if (res.data.valid) {
        toast.success('All data is valid!');
      } else {
        toast.error(`Found ${res.data.issues.length} issues`);
      }
      return res.data;
    } catch (error) {
      toast.error('Validation failed');
    }
  };

  const getPositionColor = (pos) => {
    const colors = { QB: 'bg-orange-500', WR: 'bg-teal-500', RB: 'bg-sky-500', DEF: 'bg-red-500', K: 'bg-purple-500' };
    return colors[pos] || 'bg-gray-500';
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : teamId?.toUpperCase();
  };

  // Save Team Edit
  const saveTeamEdit = async () => {
    if (!editTeamModal.team) return;
    const { id, name, conference, division, color, logo, wins, losses } = editTeamModal.team;
    try {
      await axios.put(`${API}/admin/team/${id}`, { name, conference, division, wins: parseInt(wins), losses: parseInt(losses) }, { headers });
      if (color || logo) {
        await axios.put(`${API}/admin/team/${id}/branding?color=${encodeURIComponent(color || '')}&logo=${encodeURIComponent(logo || '')}`, {}, { headers });
      }
      toast.success('Team updated');
      setEditTeamModal({ open: false, team: null });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update team');
    }
  };

  // Save Game Edit
  const saveGameEdit = async () => {
    if (!editGameModal.game) return;
    const { id, home_score, away_score, player_of_game, player_of_game_stats, is_completed } = editGameModal.game;
    try {
      await axios.put(`${API}/admin/game/${id}`, {
        home_score: parseFloat(home_score) || 0,
        away_score: parseFloat(away_score) || 0,
        player_of_game: player_of_game || '',
        player_of_game_stats: player_of_game_stats || '',
        is_completed: is_completed
      }, { headers });
      toast.success('Game updated');
      setEditGameModal({ open: false, game: null });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update game');
    }
  };

  // Save Player Edit
  const savePlayerEdit = async () => {
    if (!editPlayerModal.player) return;
    const { id, name, position, team_id, image, roblox_id, roblox_username, is_elite } = editPlayerModal.player;
    try {
      await axios.put(`${API}/admin/player/${id}`, {
        name,
        position,
        team_id,
        image: image || '',
        roblox_id: roblox_id || '',
        roblox_username: roblox_username || '',
        is_elite: is_elite || false
      }, { headers });
      toast.success('Player updated');
      setEditPlayerModal({ open: false, player: null });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update player');
    }
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
              UFF Admin Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin key..."
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && authenticate()}
              className="bg-white/5 border-white/10"
              data-testid="admin-key-input"
            />
            <Button onClick={authenticate} disabled={loading || !adminKey} className="w-full bg-neon-blue hover:bg-neon-blue/80" data-testid="admin-login-btn">
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="admin-panel" className="min-h-screen">
      {/* Edit Team Modal */}
      <Dialog open={editTeamModal.open} onOpenChange={(open) => setEditTeamModal({ ...editTeamModal, open })}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl uppercase">Edit Team</DialogTitle>
          </DialogHeader>
          {editTeamModal.team && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-white/60">Team Name</Label>
                <Input
                  value={editTeamModal.team.name || ''}
                  onChange={(e) => setEditTeamModal({ ...editTeamModal, team: { ...editTeamModal.team, name: e.target.value } })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/60">Conference</Label>
                  <Select
                    value={editTeamModal.team.conference || ''}
                    onValueChange={(v) => setEditTeamModal({ ...editTeamModal, team: { ...editTeamModal.team, conference: v } })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grand Central">Grand Central</SelectItem>
                      <SelectItem value="Ridge">Ridge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60">Division</Label>
                  <Select
                    value={editTeamModal.team.division || ''}
                    onValueChange={(v) => setEditTeamModal({ ...editTeamModal, team: { ...editTeamModal.team, division: v } })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="East">East</SelectItem>
                      <SelectItem value="West">West</SelectItem>
                      <SelectItem value="North">North</SelectItem>
                      <SelectItem value="South">South</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/60">Wins</Label>
                  <Input
                    type="number"
                    value={editTeamModal.team.wins || 0}
                    onChange={(e) => setEditTeamModal({ ...editTeamModal, team: { ...editTeamModal.team, wins: e.target.value } })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60">Losses</Label>
                  <Input
                    type="number"
                    value={editTeamModal.team.losses || 0}
                    onChange={(e) => setEditTeamModal({ ...editTeamModal, team: { ...editTeamModal.team, losses: e.target.value } })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/60">Team Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editTeamModal.team.color || '#000000'}
                    onChange={(e) => setEditTeamModal({ ...editTeamModal, team: { ...editTeamModal.team, color: e.target.value } })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={editTeamModal.team.color || ''}
                    onChange={(e) => setEditTeamModal({ ...editTeamModal, team: { ...editTeamModal.team, color: e.target.value } })}
                    placeholder="#000000"
                    className="bg-white/5 border-white/10 flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/60">Logo URL</Label>
                <Input
                  value={editTeamModal.team.logo || ''}
                  onChange={(e) => setEditTeamModal({ ...editTeamModal, team: { ...editTeamModal.team, logo: e.target.value } })}
                  placeholder="https://example.com/logo.png"
                  className="bg-white/5 border-white/10"
                />
                {editTeamModal.team.logo && (
                  <div className="mt-2 p-2 bg-white/5 rounded-lg">
                    <img src={editTeamModal.team.logo} alt="Logo preview" className="w-16 h-16 object-contain mx-auto" />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeamModal({ open: false, team: null })} className="border-white/20">Cancel</Button>
            <Button onClick={saveTeamEdit} className="bg-neon-blue hover:bg-neon-blue/80">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Game Modal */}
      <Dialog open={editGameModal.open} onOpenChange={(open) => setEditGameModal({ ...editGameModal, open })}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl uppercase">Edit Game</DialogTitle>
          </DialogHeader>
          {editGameModal.game && (
            <div className="space-y-4 py-4">
              <div className="text-center mb-4">
                <span className="font-heading font-bold text-white">
                  {getTeamName(editGameModal.game.home_team_id)} vs {getTeamName(editGameModal.game.away_team_id)}
                </span>
                <div className="text-sm text-white/40">Week {editGameModal.game.week}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/60">Home Score</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editGameModal.game.home_score || 0}
                    onChange={(e) => setEditGameModal({ ...editGameModal, game: { ...editGameModal.game, home_score: e.target.value } })}
                    className="bg-white/5 border-white/10 text-center text-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60">Away Score</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editGameModal.game.away_score || 0}
                    onChange={(e) => setEditGameModal({ ...editGameModal, game: { ...editGameModal.game, away_score: e.target.value } })}
                    className="bg-white/5 border-white/10 text-center text-xl font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/60">Player of the Game</Label>
                <Input
                  value={editGameModal.game.player_of_game || ''}
                  onChange={(e) => setEditGameModal({ ...editGameModal, game: { ...editGameModal.game, player_of_game: e.target.value } })}
                  placeholder="Player name"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60">Player of Game Stats</Label>
                <Input
                  value={editGameModal.game.player_of_game_stats || ''}
                  onChange={(e) => setEditGameModal({ ...editGameModal, game: { ...editGameModal.game, player_of_game_stats: e.target.value } })}
                  placeholder="e.g., 25 pts, 3 TD"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="game-completed"
                  checked={editGameModal.game.is_completed || false}
                  onChange={(e) => setEditGameModal({ ...editGameModal, game: { ...editGameModal.game, is_completed: e.target.checked } })}
                  className="w-4 h-4"
                />
                <Label htmlFor="game-completed" className="text-white/60">Game Completed</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGameModal({ open: false, game: null })} className="border-white/20">Cancel</Button>
            <Button onClick={saveGameEdit} className="bg-neon-blue hover:bg-neon-blue/80">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Modal */}
      <Dialog open={editPlayerModal.open} onOpenChange={(open) => setEditPlayerModal({ ...editPlayerModal, open })}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl uppercase">Edit Player</DialogTitle>
          </DialogHeader>
          {editPlayerModal.player && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-white/60">Player Name</Label>
                <Input
                  value={editPlayerModal.player.name || ''}
                  onChange={(e) => setEditPlayerModal({ ...editPlayerModal, player: { ...editPlayerModal.player, name: e.target.value } })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/60">Position</Label>
                  <Select
                    value={editPlayerModal.player.position || ''}
                    onValueChange={(v) => setEditPlayerModal({ ...editPlayerModal, player: { ...editPlayerModal.player, position: v } })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QB">QB</SelectItem>
                      <SelectItem value="WR">WR</SelectItem>
                      <SelectItem value="RB">RB</SelectItem>
                      <SelectItem value="DEF">DEF</SelectItem>
                      <SelectItem value="K">K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60">Team</Label>
                  <Select
                    value={editPlayerModal.player.team_id || ''}
                    onValueChange={(v) => setEditPlayerModal({ ...editPlayerModal, player: { ...editPlayerModal.player, team_id: v } })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/60">Player Image URL</Label>
                <Input
                  value={editPlayerModal.player.image || ''}
                  onChange={(e) => setEditPlayerModal({ ...editPlayerModal, player: { ...editPlayerModal.player, image: e.target.value } })}
                  placeholder="https://example.com/player.png"
                  className="bg-white/5 border-white/10"
                />
                {editPlayerModal.player.image && (
                  <div className="mt-2 p-2 bg-white/5 rounded-lg">
                    <img src={editPlayerModal.player.image} alt="Player preview" className="w-20 h-20 object-cover rounded-full mx-auto" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/60">Roblox ID</Label>
                  <Input
                    value={editPlayerModal.player.roblox_id || ''}
                    onChange={(e) => setEditPlayerModal({ ...editPlayerModal, player: { ...editPlayerModal.player, roblox_id: e.target.value } })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/60">Roblox Username</Label>
                  <Input
                    value={editPlayerModal.player.roblox_username || ''}
                    onChange={(e) => setEditPlayerModal({ ...editPlayerModal, player: { ...editPlayerModal.player, roblox_username: e.target.value } })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="player-elite"
                  checked={editPlayerModal.player.is_elite || false}
                  onChange={(e) => setEditPlayerModal({ ...editPlayerModal, player: { ...editPlayerModal.player, is_elite: e.target.checked } })}
                  className="w-4 h-4"
                />
                <Label htmlFor="player-elite" className="text-white/60">Elite Player</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlayerModal({ open: false, player: null })} className="border-white/20">Cancel</Button>
            <Button onClick={savePlayerEdit} className="bg-neon-blue hover:bg-neon-blue/80">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-neon-blue" />
                <span className="font-body text-xs uppercase tracking-widest text-white/50">League Management</span>
              </div>
              <h1 className="font-heading font-black text-3xl md:text-4xl tracking-tighter uppercase text-white">
                ADMIN <span className="text-neon-blue">PANEL</span>
              </h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={refreshStats} variant="outline" size="sm" className="border-white/20">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={validateData} variant="outline" size="sm" className="border-neon-volt/50 text-neon-volt">
                <Check className="w-4 h-4 mr-1" /> Validate
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="px-6 md:px-12 py-4 border-b border-white/5">
          <div className="max-w-7xl mx-auto grid grid-cols-4 md:grid-cols-8 gap-3">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="glass-panel rounded-lg p-3 text-center">
                <div className="font-body text-xs text-white/40 truncate">{key.replace(/_/g, ' ')}</div>
                <div className="font-heading font-black text-xl text-neon-blue">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-6 md:px-12 py-6">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-transparent flex flex-wrap gap-2 h-auto p-0">
              {[
                { value: 'overview', icon: BarChart3, label: 'Overview' },
                { value: 'players', icon: Users, label: 'Players' },
                { value: 'teams', icon: Shield, label: 'Teams' },
                { value: 'games', icon: Calendar, label: 'Games' },
                { value: 'trades', icon: ArrowRightLeft, label: 'Trades' },
                { value: 'playoffs', icon: Trophy, label: 'Playoffs' },
                { value: 'admins', icon: UserPlus, label: 'Admins' },
                { value: 'analytics', icon: Zap, label: 'Analytics' },
                { value: 'activity', icon: History, label: 'Activity' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-4 py-2 rounded-lg font-heading font-bold text-sm uppercase tracking-wider transition-all data-[state=active]:bg-neon-blue data-[state=active]:text-white data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white/60"
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <Card className="glass-panel border-white/10">
                  <CardHeader><CardTitle className="font-heading font-bold text-lg uppercase">Quick Actions</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={exportGames} className="w-full justify-start bg-white/5 hover:bg-white/10">
                      <Download className="w-4 h-4 mr-2" /> Export Games to CSV
                    </Button>
                    <Button onClick={validateData} className="w-full justify-start bg-white/5 hover:bg-white/10">
                      <Check className="w-4 h-4 mr-2" /> Validate All Data
                    </Button>
                    <Button onClick={resetSeason} className="w-full justify-start bg-red-500/10 hover:bg-red-500/20 text-red-500">
                      <RefreshCw className="w-4 h-4 mr-2" /> Reset Season
                    </Button>
                  </CardContent>
                </Card>

                {/* Roblox Player Search */}
                <Card className="glass-panel border-white/10">
                  <CardHeader><CardTitle className="font-heading font-bold text-lg uppercase">Roblox Player Search</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Roblox ID or Username..."
                        value={robloxSearch}
                        onChange={(e) => setRobloxSearch(e.target.value)}
                        className="bg-white/5 border-white/10"
                      />
                      <Button onClick={searchRoblox} className="bg-neon-blue">
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Player Merge */}
                <Card className="glass-panel border-white/10">
                  <CardHeader><CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2"><Merge className="w-5 h-5" /> Merge Players</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Select value={mergeForm.source_player_id} onValueChange={(v) => setMergeForm({...mergeForm, source_player_id: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Source Player (will be deleted)" /></SelectTrigger>
                      <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={mergeForm.target_player_id} onValueChange={(v) => setMergeForm({...mergeForm, target_player_id: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Target Player (will keep)" /></SelectTrigger>
                      <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={mergePlayers} className="w-full bg-neon-volt text-black hover:bg-neon-volt/80">Merge Players</Button>
                  </CardContent>
                </Card>

                {/* Bulk Delete Games */}
                <Card className="glass-panel border-white/10">
                  <CardHeader><CardTitle className="font-heading font-bold text-lg uppercase">Bulk Delete Games</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input type="number" placeholder="Start Week" value={bulkDeleteRange.start} onChange={(e) => setBulkDeleteRange({...bulkDeleteRange, start: parseInt(e.target.value)})} className="bg-white/5 border-white/10" />
                      <Input type="number" placeholder="End Week" value={bulkDeleteRange.end} onChange={(e) => setBulkDeleteRange({...bulkDeleteRange, end: parseInt(e.target.value)})} className="bg-white/5 border-white/10" />
                    </div>
                    <Button onClick={bulkDeleteGames} className="w-full bg-red-500/20 text-red-500 hover:bg-red-500/30">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Games
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Players Tab */}
            <TabsContent value="players">
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading font-bold text-lg uppercase">Manage Players</CardTitle>
                    <Input placeholder="Search players..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64 bg-white/5 border-white/10" />
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[600px] overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#0a0a0a]">
                      <tr className="border-b border-white/10">
                        <th className="p-3 text-left text-xs font-bold text-white/40 uppercase">Player</th>
                        <th className="p-3 text-left text-xs font-bold text-white/40 uppercase">Roblox</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Pos</th>
                        <th className="p-3 text-left text-xs font-bold text-white/40 uppercase">Team</th>
                        <th className="p-3 text-right text-xs font-bold text-white/40 uppercase">FP</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">GP</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(player => (
                        <tr key={player.id} className="border-b border-white/5 table-row-hover">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {player.image ? (
                                <img src={player.image} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                  <span className="text-xs font-bold">{player.name.charAt(0)}</span>
                                </div>
                              )}
                              <span className="font-heading font-bold text-white">{player.name}</span>
                              {player.is_elite && <Badge className="bg-neon-volt/20 text-neon-volt text-xs">ELITE</Badge>}
                            </div>
                          </td>
                          <td className="p-3 font-body text-xs text-white/50">{player.roblox_username || player.roblox_id || '-'}</td>
                          <td className="p-3 text-center"><Badge className={`${getPositionColor(player.position)} text-white text-xs`}>{player.position}</Badge></td>
                          <td className="p-3 text-white/60 text-sm">{player.team}</td>
                          <td className="p-3 text-right font-heading font-bold text-neon-blue">{player.stats?.fantasy_points?.toFixed(1)}</td>
                          <td className="p-3 text-center text-white/60">{player.games_played || 0}</td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" onClick={() => setEditPlayerModal({ open: true, player: { ...player } })}><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deletePlayer(player.id)} className="text-red-500 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams">
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="font-heading font-bold text-lg uppercase">Manage Teams</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="p-3 text-left text-xs font-bold text-white/40 uppercase">Team</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Conference</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Division</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Record</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Color</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Logo</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map(team => (
                        <tr key={team.id} className="border-b border-white/5 table-row-hover">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {team.logo ? (
                                <img src={team.logo} alt={team.name} className="w-8 h-8 rounded object-contain" />
                              ) : (
                                <div className="w-8 h-8 rounded" style={{ backgroundColor: team.color }} />
                              )}
                              <span className="font-heading font-bold text-white">{team.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-white/60">{team.conference}</td>
                          <td className="p-3 text-center text-white/60">{team.division || '-'}</td>
                          <td className="p-3 text-center font-heading font-bold text-white">{team.wins}-{team.losses}</td>
                          <td className="p-3 text-center">
                            <div className="w-6 h-6 rounded mx-auto" style={{ backgroundColor: team.color }} />
                          </td>
                          <td className="p-3 text-center">
                            {team.logo ? (
                              <Check className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-white/30 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button size="sm" variant="ghost" onClick={() => setEditTeamModal({ open: true, team: { ...team } })}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Games Tab */}
            <TabsContent value="games" className="space-y-6">
              {/* Create Game */}
              <Card className="glass-panel border-white/10">
                <CardHeader><CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2"><Plus className="w-5 h-5" /> Create Game</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Input type="number" placeholder="Week" value={gameForm.week} onChange={(e) => setGameForm({...gameForm, week: parseInt(e.target.value)})} className="bg-white/5 border-white/10" />
                    <Select value={gameForm.home_team_id} onValueChange={(v) => setGameForm({...gameForm, home_team_id: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Home Team" /></SelectTrigger>
                      <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={gameForm.away_team_id} onValueChange={(v) => setGameForm({...gameForm, away_team_id: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Away Team" /></SelectTrigger>
                      <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={gameForm.mode} onValueChange={(v) => setGameForm({...gameForm, mode: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Mode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={createGame} className="bg-neon-blue"><Plus className="w-4 h-4 mr-1" /> Create</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Games List */}
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading font-bold text-lg uppercase">Games ({games.length})</CardTitle>
                    <div className="flex gap-2">
                      <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(parseInt(v))}>
                        <SelectTrigger className="w-32 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>{[...Array(13)].map((_, i) => <SelectItem key={i+1} value={String(i+1)}>Week {i+1}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button onClick={exportGames} variant="outline" size="sm" className="border-white/20"><Download className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[400px] overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#0a0a0a]">
                      <tr className="border-b border-white/10">
                        <th className="p-3 text-left text-xs font-bold text-white/40 uppercase">Week</th>
                        <th className="p-3 text-left text-xs font-bold text-white/40 uppercase">Matchup</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Score</th>
                        <th className="p-3 text-left text-xs font-bold text-white/40 uppercase">POG</th>
                        <th className="p-3 text-center text-xs font-bold text-white/40 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {games.filter(g => g.week === selectedWeek).map(game => (
                        <tr key={game.id} className="border-b border-white/5 table-row-hover">
                          <td className="p-3 font-heading font-bold text-white">W{game.week}</td>
                          <td className="p-3 text-white/80">{getTeamName(game.home_team_id)} vs {getTeamName(game.away_team_id)}</td>
                          <td className="p-3 text-center font-heading font-bold text-neon-blue">{game.home_score} - {game.away_score}</td>
                          <td className="p-3 text-white/60 text-sm">{game.player_of_game || '-'}</td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" onClick={() => setEditGameModal({ open: true, game: { ...game } })}><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => cloneGame(game.id, selectedWeek + 1)}><Copy className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteGame(game.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trades Tab */}
            <TabsContent value="trades" className="space-y-6">
              <Card className="glass-panel border-white/10">
                <CardHeader><CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Setup Trade</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Select value={tradeForm.team1_id} onValueChange={(v) => setTradeForm({...tradeForm, team1_id: v})}>
                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Team 1" /></SelectTrigger>
                        <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input placeholder="Team 1 receives (comma separated)" value={tradeForm.team1_receives} onChange={(e) => setTradeForm({...tradeForm, team1_receives: e.target.value})} className="bg-white/5 border-white/10" />
                    </div>
                    <div className="space-y-3">
                      <Select value={tradeForm.team2_id} onValueChange={(v) => setTradeForm({...tradeForm, team2_id: v})}>
                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Team 2" /></SelectTrigger>
                        <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input placeholder="Team 2 receives (comma separated)" value={tradeForm.team2_receives} onChange={(e) => setTradeForm({...tradeForm, team2_receives: e.target.value})} className="bg-white/5 border-white/10" />
                    </div>
                  </div>
                  <Button onClick={createTrade} className="w-full mt-4 bg-neon-volt text-black">Execute Trade</Button>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5"><CardTitle className="font-heading font-bold text-lg uppercase">Trade History</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {trades.map(trade => (
                    <div key={trade.id} className="p-4 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-heading font-bold text-white">{trade.team1_name} ↔ {trade.team2_name}</div>
                        <div className="text-xs text-white/50">{trade.date}</div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-500">{trade.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Playoffs Tab */}
            <TabsContent value="playoffs">
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5"><CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2"><Trophy className="w-5 h-5 text-neon-volt" /> Playoff Bracket</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {playoffs.map(matchup => (
                    <div key={matchup.id} className="p-4 border-b border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Badge className="bg-white/10 text-white/60 mr-2">{matchup.round}</Badge>
                          <span className="font-heading font-bold text-white">{matchup.matchup_name}</span>
                        </div>
                        <Badge className={matchup.is_completed ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}>
                          {matchup.is_completed ? 'Complete' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="text-center">
                          <div className="font-heading font-bold text-white">{teams.find(t => t.id === matchup.team1_id)?.name || 'TBD'}</div>
                          <Input type="number" value={matchup.team1_score} onChange={(e) => updatePlayoff(matchup.id, { team1_score: parseFloat(e.target.value) })} className="mt-1 bg-white/5 border-white/10 text-center" />
                        </div>
                        <div className="text-center font-heading font-black text-2xl text-white/40">VS</div>
                        <div className="text-center">
                          <div className="font-heading font-bold text-white">{teams.find(t => t.id === matchup.team2_id)?.name || 'TBD'}</div>
                          <Input type="number" value={matchup.team2_score} onChange={(e) => updatePlayoff(matchup.id, { team2_score: parseFloat(e.target.value) })} className="mt-1 bg-white/5 border-white/10 text-center" />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Select value={matchup.winner_id || ''} onValueChange={(v) => updatePlayoff(matchup.id, { winner_id: v, is_completed: true })}>
                          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select Winner" /></SelectTrigger>
                          <SelectContent>
                            {matchup.team1_id && <SelectItem value={matchup.team1_id}>{teams.find(t => t.id === matchup.team1_id)?.name}</SelectItem>}
                            {matchup.team2_id && <SelectItem value={matchup.team2_id}>{teams.find(t => t.id === matchup.team2_id)?.name}</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Admins Tab */}
            <TabsContent value="admins" className="space-y-6">
              <Card className="glass-panel border-white/10">
                <CardHeader><CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2"><UserPlus className="w-5 h-5" /> Add Admin</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input placeholder="Username" value={newAdminForm.username} onChange={(e) => setNewAdminForm({...newAdminForm, username: e.target.value})} className="bg-white/5 border-white/10" />
                    <Input type="password" placeholder="Password" value={newAdminForm.password} onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})} className="bg-white/5 border-white/10" />
                    <Select value={newAdminForm.role} onValueChange={(v) => setNewAdminForm({...newAdminForm, role: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={createAdmin} className="bg-neon-blue"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5"><CardTitle className="font-heading font-bold text-lg uppercase">Admin List</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {admins.map(admin => (
                    <div key={admin.username} className="p-4 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-heading font-bold text-white">{admin.username}</div>
                        <div className="text-xs text-white/50">Created: {admin.created}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={admin.role === 'super_admin' ? 'bg-neon-volt/20 text-neon-volt' : 'bg-neon-blue/20 text-neon-blue'}>{admin.role}</Badge>
                        {admin.username !== 'admin' && (
                          <Button size="sm" variant="ghost" onClick={() => deleteAdmin(admin.username)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['passing', 'rushing', 'receiving', 'defense'].map(category => (
                    <Card key={category} className="glass-panel border-white/10">
                      <CardHeader className="border-b border-white/5">
                        <CardTitle className="font-heading font-bold text-lg uppercase">{category} Leaders</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {analytics[category]?.slice(0, 5).map((p, idx) => (
                          <div key={p.id} className="p-3 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-heading font-black text-lg text-white/30">{idx + 1}</span>
                              <div>
                                <div className="font-heading font-bold text-white">{p.name}</div>
                                <div className="text-xs text-white/50">{p.team} • {p.games_played} GP</div>
                              </div>
                            </div>
                            <div className="font-heading font-bold text-neon-blue">{p.fantasy_points?.toFixed(1)} FP</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5"><CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2"><History className="w-5 h-5" /> Recent Activity</CardTitle></CardHeader>
                <CardContent className="p-0 max-h-[600px] overflow-auto">
                  {activityLog.map(log => (
                    <div key={log.id} className="p-4 border-b border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className="bg-white/10 text-white/60">{log.action}</Badge>
                        <span className="text-xs text-white/40">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-white/80">{log.details}</div>
                      <div className="text-xs text-white/40 mt-1">by {log.admin}</div>
                    </div>
                  ))}
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
