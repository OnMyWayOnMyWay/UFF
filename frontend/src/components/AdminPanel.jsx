import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, RefreshCw, X, Edit, UserPlus, Users, Search, Trash2, Plus, Minus, Database, BarChart3, Download, ArrowRightLeft, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const AdminPanel = ({ isOpen, onClose }) => {
  const [adminKey, setAdminKey] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('reset'); // reset, edit, games, roblox, admins, merge, weekstats
  const [isVerified, setIsVerified] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  
  // Player Edit State
  const [playerEdit, setPlayerEdit] = useState({
    oldName: '',
    newName: '',
    newTeam: '',
    statsToAdd: {},
    statsToRemove: {}
  });
  const [newStatCategory, setNewStatCategory] = useState('');
  const [newStatKey, setNewStatKey] = useState('');
  const [newStatValue, setNewStatValue] = useState('');
  const [removeStatCategory, setRemoveStatCategory] = useState('');
  const [removeStatKey, setRemoveStatKey] = useState('');
  
  // Stat options by category
  const statOptions = {
    passing: ['Comp', 'Att', 'Yards', 'TD', 'Int', 'SCKED', 'Rating'],
    rushing: ['Att', 'Yards', 'TD', 'YPC'],
    receiving: ['Rec', 'Yards', 'TD'],
    defense: ['TAK', 'TFL', 'SCK', 'SAF', 'SWAT', 'INT', 'PBU', 'TD']
  };
  
  // Admin Management State
  const [newAdminKey, setNewAdminKey] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [adminsList, setAdminsList] = useState([]);
  
  // Roblox Lookup State
  const [robloxInput, setRobloxInput] = useState('');
  const [robloxResult, setRobloxResult] = useState(null);
  
  // Games Management State
  const [gamesList, setGamesList] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  
  // Database Info State
  const [dbStats, setDbStats] = useState(null);
  
  // Player Search State
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSearchResults, setPlayerSearchResults] = useState([]);
  
  // Game Edit/Delete State
  const [editingGame, setEditingGame] = useState(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAOperation, setTwoFAOperation] = useState(null); // { type: 'edit' | 'delete', gameId: string }
  const [generatedCode, setGeneratedCode] = useState('');
  const [gameEditData, setGameEditData] = useState({});
  
  // New features state
  const [allPlayerNames, setAllPlayerNames] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [isDetectingUserIds, setIsDetectingUserIds] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeData, setTradeData] = useState({
    playerName: '',
    fromTeam: '',
    toTeam: '',
    week: '',
    notes: ''
  });
  const [isFixingTeams, setIsFixingTeams] = useState(false);
  
  // Player Merge State
  const [mergeOldNames, setMergeOldNames] = useState('');
  const [mergeNewName, setMergeNewName] = useState('');
  
  // Week-Specific Stat Edit State
  const [weekStatEdit, setWeekStatEdit] = useState({
    playerName: '',
    week: '',
    teamSide: 'home', // 'home' or 'away'
    category: 'passing',
    stats: {}
  });
  const [tempStatKey, setTempStatKey] = useState('');
  const [tempStatValue, setTempStatValue] = useState('');

  // Verify admin key
  const verifyAdmin = async () => {
    if (!adminKey.trim()) return;
    
    try {
      console.log('Verifying admin with URL:', `${API}/admin/verify`);
      console.log('Admin key:', adminKey);
      const response = await axios.get(`${API}/admin/verify`, {
        headers: { 'admin-key': adminKey }
      });
      console.log('Verify response:', response.data);
      setIsVerified(true);
      setAdminInfo(response.data);
      toast.success('Admin verified!');
    } catch (error) {
      console.error('Verify error:', error.response?.data || error.message);
      setIsVerified(false);
      setAdminInfo(null);
      toast.error(error.response?.data?.detail || 'Invalid admin key');
    }
  };

  // Load admins list
  const loadAdmins = async () => {
    if (!isVerified || !adminInfo?.is_master) return;
    
    try {
      const response = await axios.get(`${API}/admin/list`, {
        headers: { 'admin-key': adminKey }
      });
      setAdminsList(response.data.admins);
    } catch (error) {
      toast.error('Failed to load admins');
    }
  };

  useEffect(() => {
    if (isVerified && activeTab === 'admins' && adminInfo?.is_master) {
      loadAdmins();
    }
    if (isVerified && activeTab === 'games') {
      loadGames();
    }
    if (isVerified && activeTab === 'edit') {
      loadPlayerNames();
      loadTeams();
    }
  }, [isVerified, activeTab]);
  
  // Load player names for autocomplete
  const loadPlayerNames = async () => {
    try {
      const response = await axios.get(`${API}/admin/player-names`, {
        headers: { 'admin-key': adminKey }
      });
      setAllPlayerNames(response.data.players || []);
    } catch (error) {
      console.error('Failed to load player names:', error);
    }
  };
  
  // Load teams for dropdown
  const loadTeams = async () => {
    try {
      const response = await axios.get(`${API}/admin/teams`, {
        headers: { 'admin-key': adminKey }
      });
      setAllTeams(response.data.teams || []);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };
  
  // Filter players as user types
  const handlePlayerSearchInput = (value) => {
    setPlayerEdit({...playerEdit, oldName: value});
    if (value.trim().length > 0) {
      const filtered = allPlayerNames.filter(name => 
        name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setFilteredPlayers(filtered);
      setShowPlayerSuggestions(filtered.length > 0);
    } else {
      setShowPlayerSuggestions(false);
    }
  };
  
  // Select player from suggestions
  const selectPlayer = (name) => {
    setPlayerEdit({...playerEdit, oldName: name});
    setShowPlayerSuggestions(false);
  };
  
  // Load recent games
  const loadGames = async () => {
    setGamesLoading(true);
    try {
      const response = await axios.get(`${API}/games`);
      const games = Array.isArray(response.data) ? response.data : (response.data.games || []);
      setGamesList(games);
      
      // Calculate database stats
      const allPlayers = new Set();
      const allTeams = new Set();
      
      games.forEach(game => {
        if (!game) return;
        if (game.home_team) allTeams.add(game.home_team);
        if (game.away_team) allTeams.add(game.away_team);
        
        ['home_stats', 'away_stats'].forEach(statsKey => {
          const stats = game[statsKey];
          if (stats && typeof stats === 'object') {
            Object.keys(stats).forEach(category => {
              if (Array.isArray(stats[category])) {
                stats[category].forEach(p => {
                  if (p && p.name) allPlayers.add(p.name);
                });
              }
            });
          }
        });
      });
      
      setDbStats({
        total_games: games.length,
        total_players: allPlayers.size,
        total_teams: allTeams.size,
        latest_week: games.length > 0 ? Math.max(...games.map(g => g.week)) : 0
      });
    } catch (error) {
      toast.error('Failed to load games');
    } finally {
      setGamesLoading(false);
    }
  };
  
  // Delete specific game
  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game? This will require 2FA.')) {
      return;
    }
    
    try {
      // Request 2FA code
      const response = await axios.post(`${API}/admin/2fa/request`, {
        operation: 'delete_game',
        game_id: gameId
      }, {
        headers: { 'admin-key': adminKey }
      });
      
      setGeneratedCode(response.data.code);
      setTwoFAOperation({ type: 'delete', gameId });
      setShow2FAModal(true);
      toast.success('2FA code generated. Please check the console/modal.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to request 2FA code');
    }
  };
  
  // Execute delete with 2FA
  const executeDeleteGame = async () => {
    if (!twoFAOperation || twoFAOperation.type !== 'delete') return;
    
    try {
      await axios.delete(`${API}/admin/game/${twoFAOperation.gameId}`, {
        params: { twofa_code: twoFACode },
        headers: { 'admin-key': adminKey }
      });
      toast.success('Game deleted!');
      setShow2FAModal(false);
      setTwoFACode('');
      setGeneratedCode('');
      setTwoFAOperation(null);
      loadGames();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete game');
    }
  };
  
  // Start editing a game
  const startEditGame = async (game) => {
    setEditingGame(game);
    setGameEditData({
      week: game.week,
      home_team: game.home_team,
      away_team: game.away_team,
      home_score: game.home_score,
      away_score: game.away_score,
      player_of_game: game.player_of_game,
      game_date: game.game_date
    });
  };
  
  // Request 2FA for game edit
  const requestEditGame = async () => {
    if (!editingGame) return;
    
    try {
      // Request 2FA code
      const response = await axios.post(`${API}/admin/2fa/request`, {
        operation: 'edit_game',
        game_id: editingGame.id
      }, {
        headers: { 'admin-key': adminKey }
      });
      
      setGeneratedCode(response.data.code);
      setTwoFAOperation({ type: 'edit', gameId: editingGame.id });
      setShow2FAModal(true);
      toast.success('2FA code generated. Please check the console/modal.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to request 2FA code');
    }
  };
  
  // Execute edit with 2FA
  const executeEditGame = async () => {
    if (!twoFAOperation || twoFAOperation.type !== 'edit') return;
    
    try {
      await axios.put(`${API}/admin/game/${twoFAOperation.gameId}`, gameEditData, {
        params: { twofa_code: twoFACode },
        headers: { 'admin-key': adminKey }
      });
      toast.success('Game updated!');
      setShow2FAModal(false);
      setTwoFACode('');
      setGeneratedCode('');
      setTwoFAOperation(null);
      setEditingGame(null);
      setGameEditData({});
      loadGames();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update game');
    }
  };
  
  // Cancel editing
  const cancelEditGame = () => {
    setEditingGame(null);
    setGameEditData({});
  };
  
  // Detect and update user IDs
  const handleDetectUserIds = async () => {
    if (!window.confirm('This will scan all games and convert numeric player names to usernames. Continue?')) {
      return;
    }
    
    setIsDetectingUserIds(true);
    try {
      const response = await axios.post(`${API}/admin/detect-userids`, {}, {
        headers: { 'admin-key': adminKey }
      });
      
      if (response.data.mappings && Object.keys(response.data.mappings).length > 0) {
        const mappingList = Object.entries(response.data.mappings)
          .map(([id, name]) => `${id} → ${name}`)
          .join(', ');
        toast.success(`${response.data.message}\nMappings: ${mappingList}`, { duration: 5000 });
      } else {
        toast.info(response.data.message);
      }
      
      // Reload player names
      loadPlayerNames();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to detect user IDs');
    } finally {
      setIsDetectingUserIds(false);
    }
  };
  
  // Record trade
  const handleRecordTrade = async () => {
    if (!tradeData.playerName || !tradeData.fromTeam || !tradeData.toTeam) {
      toast.error('Please fill in player name, from team, and to team');
      return;
    }
    
    try {
      const payload = {
        player_name: tradeData.playerName,
        from_team: tradeData.fromTeam,
        to_team: tradeData.toTeam,
        week: tradeData.week ? parseInt(tradeData.week) : null,
        notes: tradeData.notes || null
      };
      
      const response = await axios.post(`${API}/admin/trade`, payload, {
        headers: { 'admin-key': adminKey }
      });
      
      toast.success(response.data.message);
      setShowTradeModal(false);
      setTradeData({
        playerName: '',
        fromTeam: '',
        toTeam: '',
        week: '',
        notes: ''
      });
      loadPlayerNames();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record trade');
    }
  };
  
  // Copy game CSV
  const handleCopyCSV = async (gameId) => {
    try {
      const response = await axios.get(`${API}/admin/game/${gameId}/csv`, {
        headers: { 'admin-key': adminKey }
      });
      
      await navigator.clipboard.writeText(response.data.csv);
      toast.success('CSV copied to clipboard!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to copy CSV');
    }
  };
  
  // Fix team assignments
  const handleFixTeamAssignments = async () => {
    if (!window.confirm('This will scan all games and fix team assignments for players. Players will be assigned to the correct team based on which section (home_stats or away_stats) they appear in. Continue?')) {
      return;
    }
    
    setIsFixingTeams(true);
    try {
      const response = await axios.post(`${API}/admin/fix-team-assignments`, {}, {
        headers: { 'admin-key': adminKey }
      });
      
      toast.success(`${response.data.message}\nTotal fixes: ${response.data.total_fixes}`, { duration: 5000 });
      
      if (response.data.fixes_made && response.data.fixes_made.length > 0) {
        console.log('Fixes made:', response.data.fixes_made);
      }
      
      // Reload games
      loadGames();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fix team assignments');
    } finally {
      setIsFixingTeams(false);
    }
  };
  
  // Search players
  const handlePlayerSearch = async () => {
    if (!playerSearch.trim()) {
      setPlayerSearchResults([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/games`);
      const games = Array.isArray(response.data) ? response.data : (response.data.games || []);
      const playerData = {};
      
      games.forEach(game => {
        ['home_stats', 'away_stats'].forEach(statsKey => {
          const stats = game[statsKey];
          if (stats) {
            Object.keys(stats).forEach(category => {
              if (Array.isArray(stats[category])) {
                stats[category].forEach(p => {
                  const name = p.name.toLowerCase();
                  if (name.includes(playerSearch.toLowerCase())) {
                    if (!playerData[p.name]) {
                      playerData[p.name] = { name: p.name, games: 0, teams: new Set() };
                    }
                    playerData[p.name].games++;
                    playerData[p.name].teams.add(statsKey === 'home_stats' ? game.home_team : game.away_team);
                  }
                });
              }
            });
          }
        });
      });
      
      const results = Object.values(playerData).map(p => ({
        ...p,
        teams: Array.from(p.teams).join(', ')
      }));
      
      setPlayerSearchResults(results);
    } catch (error) {
      toast.error('Failed to search players');
    }
  };


  const handleReset = async () => {
    if (!adminKey.trim()) {
      toast.error('Please enter admin key');
      return;
    }

    setIsResetting(true);
    try {
      const response = await axios.post(
        `${API}/admin/reset-season?admin_key=${encodeURIComponent(adminKey)}`
      );
      
      toast.success(`Season reset! ${response.data.deleted_count} games deleted.`);
      setShowConfirm(false);
      onClose();
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset season');
    } finally {
      setIsResetting(false);
    }
  };

  // Player Edit Functions
  const handleEditPlayer = async () => {
    if (!playerEdit.oldName.trim()) {
      toast.error('Please enter a player name');
      return;
    }

    try {
      const payload = {
        old_name: playerEdit.oldName,
        new_name: playerEdit.newName || null,
        new_team: playerEdit.newTeam || null,
        stats_to_add: Object.keys(playerEdit.statsToAdd).length > 0 ? playerEdit.statsToAdd : null,
        stats_to_remove: Object.keys(playerEdit.statsToRemove).length > 0 ? playerEdit.statsToRemove : null
      };

      const response = await axios.put(`${API}/admin/player/edit`, payload, {
        headers: { 'admin-key': adminKey }
      });

      toast.success(response.data.message);
      setPlayerEdit({ oldName: '', newName: '', newTeam: '', statsToAdd: {}, statsToRemove: {} });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to edit player');
    }
  };

  const handleDeletePlayer = async () => {
    if (!playerEdit.oldName.trim()) {
      toast.error('Please enter a player name');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${playerEdit.oldName}" from all games?`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API}/admin/player/${encodeURIComponent(playerEdit.oldName)}`, {
        headers: { 'admin-key': adminKey }
      });

      toast.success(response.data.message);
      setPlayerEdit({ oldName: '', newName: '', newTeam: '', statsToAdd: {}, statsToRemove: {} });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete player');
    }
  };

  const addStat = () => {
    if (!newStatCategory || !newStatKey || !newStatValue) {
      toast.error('Please fill all stat fields');
      return;
    }

    setPlayerEdit(prev => ({
      ...prev,
      statsToAdd: {
        ...prev.statsToAdd,
        [newStatCategory]: {
          ...(prev.statsToAdd[newStatCategory] || {}),
          [newStatKey]: parseFloat(newStatValue) || 0
        }
      }
    }));

    setNewStatCategory('');
    setNewStatKey('');
    setNewStatValue('');
    toast.success('Stat added to queue');
  };

  const addStatToRemove = () => {
    if (!removeStatCategory || !removeStatKey) {
      toast.error('Please fill category and stat key');
      return;
    }

    setPlayerEdit(prev => ({
      ...prev,
      statsToRemove: {
        ...prev.statsToRemove,
        [removeStatCategory]: [
          ...(prev.statsToRemove[removeStatCategory] || []),
          removeStatKey
        ]
      }
    }));

    setRemoveStatCategory('');
    setRemoveStatKey('');
    toast.success('Stat marked for removal');
  };

  // Admin Management Functions
  const handleAddAdmin = async () => {
    if (!newAdminKey.trim() || !newAdminUsername.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const response = await axios.post(`${API}/admin/add-admin`, {
        new_admin_key: newAdminKey,
        username: newAdminUsername
      }, {
        headers: { 'admin-key': adminKey }
      });

      toast.success(response.data.message);
      setNewAdminKey('');
      setNewAdminUsername('');
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (adminKeyToRemove) => {
    if (!window.confirm('Are you sure you want to remove this admin?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API}/admin/remove-admin/${encodeURIComponent(adminKeyToRemove)}`, {
        headers: { 'admin-key': adminKey }
      });

      toast.success(response.data.message);
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove admin');
    }
  };

  // Roblox Lookup Function
  const handleRobloxLookup = async () => {
    if (!robloxInput.trim()) {
      toast.error('Please enter a Roblox user ID or username');
      return;
    }

    try {
      const response = await axios.get(`${API}/roblox/username/${encodeURIComponent(robloxInput)}`);
      setRobloxResult(response.data);
      toast.success('Roblox user found!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to lookup Roblox user');
      setRobloxResult(null);
    }
  };
  
  // Player Merge Function
  const handleMergePlayers = async () => {
    if (!mergeOldNames.trim() || !mergeNewName.trim()) {
      toast.error('Please fill all merge fields');
      return;
    }

    const oldNamesArray = mergeOldNames.split(',').map(name => name.trim()).filter(name => name);
    
    if (oldNamesArray.length === 0) {
      toast.error('Please enter at least one old player name');
      return;
    }

    if (!window.confirm(`Merge ${oldNamesArray.join(', ')} into "${mergeNewName}"? This will update all games.`)) {
      return;
    }

    try {
      const response = await axios.post(`${API}/admin/player/merge`, {
        old_names: oldNamesArray,
        new_name: mergeNewName
      }, {
        headers: { 'admin-key': adminKey }
      });

      toast.success(response.data.message);
      setMergeOldNames('');
      setMergeNewName('');
      loadGames(); // Refresh games list
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to merge players');
    }
  };
  
  // Week-Specific Stat Edit Functions
  const addWeekStat = () => {
    if (!tempStatKey || !tempStatValue) {
      toast.error('Please fill stat key and value');
      return;
    }

    setWeekStatEdit(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [tempStatKey]: parseFloat(tempStatValue) || 0
      }
    }));

    setTempStatKey('');
    setTempStatValue('');
    toast.success('Stat added');
  };
  
  const removeWeekStat = (key) => {
    setWeekStatEdit(prev => {
      const newStats = { ...prev.stats };
      delete newStats[key];
      return { ...prev, stats: newStats };
    });
    toast.success('Stat removed');
  };
  
  const handleWeekStatEdit = async () => {
    if (!weekStatEdit.playerName.trim() || !weekStatEdit.week) {
      toast.error('Please enter player name and week');
      return;
    }
    
    if (Object.keys(weekStatEdit.stats).length === 0) {
      toast.error('Please add at least one stat');
      return;
    }

    try {
      const response = await axios.put(`${API}/admin/player/week-stats`, {
        player_name: weekStatEdit.playerName,
        week: parseInt(weekStatEdit.week),
        team_side: weekStatEdit.teamSide,
        category: weekStatEdit.category,
        stats: weekStatEdit.stats
      }, {
        headers: { 'admin-key': adminKey }
      });

      toast.success(response.data.message);
      setWeekStatEdit({
        playerName: '',
        week: '',
        teamSide: 'home',
        category: 'passing',
        stats: {}
      });
      loadGames(); // Refresh games list
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to edit week stats');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="stat-card max-w-4xl w-full mx-4 my-8 border-red-500/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Admin Panel
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Admin Key Input */}
        {!isVerified && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Admin Key
              </label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key"
                  className="flex-1 bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={verifyAdmin}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition-all"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {isVerified && (
          <>
            {/* Admin Info */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6">
              <p className="text-emerald-400 text-sm">
                ✓ Logged in as: <strong>{adminInfo?.admin_info?.username}</strong>
                {adminInfo?.is_master && <span className="ml-2 text-xs bg-emerald-500/20 px-2 py-1 rounded">Master Admin</span>}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('reset')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'reset' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Reset Season
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'edit' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Edit className="w-4 h-4 inline mr-2" />
                Edit Player
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'games' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Manage Games
              </button>
              <button
                onClick={() => setActiveTab('roblox')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'roblox' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Search className="w-4 h-4 inline mr-2" />
                Roblox Lookup
              </button>
              {adminInfo?.is_master && (
                <button
                  onClick={() => setActiveTab('admins')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === 'admins' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Manage Admins
                </button>
              )}
              <button
                onClick={() => setActiveTab('merge')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'merge' 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4 inline mr-2" />
                Merge Players
              </button>
              <button
                onClick={() => setActiveTab('weekstats')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'weekstats' 
                    ? 'bg-pink-500 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Wand2 className="w-4 h-4 inline mr-2" />
                Week Stats Edit
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {/* Reset Season Tab */}
              {activeTab === 'reset' && (
                <div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                    <p className="text-red-400 text-sm">
                      <strong>Warning:</strong> Resetting the season will permanently delete all game data, stats, and records. This action cannot be undone.
                    </p>
                  </div>

                  {!showConfirm ? (
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      <span>Reset Season</span>
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-white text-center">
                        Are you absolutely sure you want to reset the season?
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setShowConfirm(false)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleReset}
                          disabled={isResetting}
                          className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                        >
                          {isResetting ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              <span>Resetting...</span>
                            </>
                          ) : (
                            <span>Yes, Reset Now</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Player Tab */}
              {activeTab === 'edit' && (
                <div className="space-y-4">
                  {/* Utility Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={handleDetectUserIds}
                      disabled={isDetectingUserIds}
                      className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                    >
                      {isDetectingUserIds ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Detecting...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          <span>Auto-Convert User IDs to Usernames</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowTradeModal(true)}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                      <span>Record Trade</span>
                    </button>
                  </div>
                  
                  {/* Player Search Helper */}
                  <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-500/5">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Search className="w-4 h-4 mr-2" />
                      Search Players
                    </h3>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePlayerSearch()}
                        placeholder="Search for a player..."
                        className="flex-1 bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handlePlayerSearch}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-all"
                      >
                        Search
                      </button>
                    </div>
                    {playerSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {playerSearchResults.map((player, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setPlayerEdit({ ...playerEdit, oldName: player.name });
                              setShowPlayerSuggestions(false);
                            }}
                            className="bg-[#1a1a1b] rounded-lg px-4 py-2 cursor-pointer hover:bg-gray-800 transition-colors"
                          >
                            <p className="text-white font-medium">{player.name}</p>
                            <p className="text-xs text-gray-400">{player.games} games • {player.teams}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <label className="block text-gray-400 text-sm font-medium mb-2">
                      Player Name (Current)
                    </label>
                    <input
                      type="text"
                      value={playerEdit.oldName}
                      onChange={(e) => handlePlayerSearchInput(e.target.value)}
                      onFocus={() => playerEdit.oldName && setShowPlayerSuggestions(filteredPlayers.length > 0)}
                      placeholder="Start typing player name..."
                      className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                    {showPlayerSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-[#1a1a1b] border border-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredPlayers.map((name, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectPlayer(name)}
                            className="px-4 py-2 text-white hover:bg-gray-800 cursor-pointer"
                          >
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm font-medium mb-2">
                        New Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={playerEdit.newName}
                        onChange={(e) => setPlayerEdit({ ...playerEdit, newName: e.target.value })}
                        placeholder="Leave blank to keep current"
                        className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm font-medium mb-2">
                        New Team (Optional - tracked as trade)
                      </label>
                      <select
                        value={playerEdit.newTeam}
                        onChange={(e) => setPlayerEdit({ ...playerEdit, newTeam: e.target.value })}
                        className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Keep current team</option>
                        {allTeams.map((team, idx) => (
                          <option key={idx} value={team}>{team}</option>
                        ))}
                      </select>
                      {playerEdit.newTeam && (
                        <p className="text-xs text-cyan-400 mt-1">
                          ℹ️ This will be tracked as a trade
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Add Stats */}
                  <div className="border border-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Stats
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <select
                        value={newStatCategory}
                        onChange={(e) => {
                          setNewStatCategory(e.target.value);
                          setNewStatKey(''); // Reset stat key when category changes
                        }}
                        className="bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Category</option>
                        <option value="passing">Passing</option>
                        <option value="rushing">Rushing</option>
                        <option value="receiving">Receiving</option>
                        <option value="defense">Defense</option>
                      </select>
                      <select
                        value={newStatKey}
                        onChange={(e) => setNewStatKey(e.target.value)}
                        disabled={!newStatCategory}
                        className="bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Stat</option>
                        {newStatCategory && statOptions[newStatCategory]?.map(stat => (
                          <option key={stat} value={stat}>{stat}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={newStatValue}
                        onChange={(e) => setNewStatValue(e.target.value)}
                        placeholder="Value"
                        className="bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={addStat}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-all"
                    >
                      Add Stat
                    </button>
                    {Object.keys(playerEdit.statsToAdd).length > 0 && (
                      <div className="mt-3 text-sm text-gray-400">
                        <p>Queued stats: {JSON.stringify(playerEdit.statsToAdd)}</p>
                      </div>
                    )}
                  </div>

                  {/* Remove Stats */}
                  <div className="border border-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <Minus className="w-4 h-4 mr-2" />
                      Remove Stats
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <select
                        value={removeStatCategory}
                        onChange={(e) => {
                          setRemoveStatCategory(e.target.value);
                          setRemoveStatKey(''); // Reset stat key when category changes
                        }}
                        className="bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Category</option>
                        <option value="passing">Passing</option>
                        <option value="rushing">Rushing</option>
                        <option value="receiving">Receiving</option>
                        <option value="defense">Defense</option>
                      </select>
                      <select
                        value={removeStatKey}
                        onChange={(e) => setRemoveStatKey(e.target.value)}
                        disabled={!removeStatCategory}
                        className="bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Stat</option>
                        {removeStatCategory && statOptions[removeStatCategory]?.map(stat => (
                          <option key={stat} value={stat}>{stat}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={addStatToRemove}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-all"
                    >
                      Mark for Removal
                    </button>
                    {Object.keys(playerEdit.statsToRemove).length > 0 && (
                      <div className="mt-3 text-sm text-gray-400">
                        <p>Stats to remove: {JSON.stringify(playerEdit.statsToRemove)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleEditPlayer}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <Edit className="w-5 h-5" />
                      <span>Update Player</span>
                    </button>
                    <button
                      onClick={handleDeletePlayer}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-all flex items-center space-x-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Manage Games Tab */}
              {activeTab === 'games' && (
                <div className="space-y-4">
                  {/* Fix Team Assignments Button */}
                  <button
                    onClick={handleFixTeamAssignments}
                    disabled={isFixingTeams}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2 mb-4"
                  >
                    {isFixingTeams ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Fixing Team Assignments...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        <span>Fix All Team Assignments</span>
                      </>
                    )}
                  </button>
                  
                  {/* Database Stats */}
                  {dbStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <p className="text-emerald-400 text-sm mb-1">Total Games</p>
                        <p className="text-2xl font-bold text-white">{dbStats.total_games}</p>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-blue-400 text-sm mb-1">Total Players</p>
                        <p className="text-2xl font-bold text-white">{dbStats.total_players}</p>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <p className="text-purple-400 text-sm mb-1">Total Teams</p>
                        <p className="text-2xl font-bold text-white">{dbStats.total_teams}</p>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <p className="text-yellow-400 text-sm mb-1">Latest Week</p>
                        <p className="text-2xl font-bold text-white">{dbStats.latest_week}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Game Edit Modal */}
                  {editingGame && (
                    <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-500/5 mb-4">
                      <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                        <span className="flex items-center">
                          <Edit className="w-4 h-4 mr-2" />
                          Editing Game: Week {editingGame.week}
                        </span>
                        <button onClick={cancelEditGame} className="text-gray-400 hover:text-white">
                          <X className="w-5 h-5" />
                        </button>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Week</label>
                          <input
                            type="number"
                            value={gameEditData.week || ''}
                            onChange={(e) => setGameEditData({...gameEditData, week: parseInt(e.target.value)})}
                            className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Game Date</label>
                          <input
                            type="date"
                            value={gameEditData.game_date || ''}
                            onChange={(e) => setGameEditData({...gameEditData, game_date: e.target.value})}
                            className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Home Team</label>
                          <input
                            type="text"
                            value={gameEditData.home_team || ''}
                            onChange={(e) => setGameEditData({...gameEditData, home_team: e.target.value})}
                            className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Home Score</label>
                          <input
                            type="number"
                            value={gameEditData.home_score || ''}
                            onChange={(e) => setGameEditData({...gameEditData, home_score: parseInt(e.target.value)})}
                            className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Away Team</label>
                          <input
                            type="text"
                            value={gameEditData.away_team || ''}
                            onChange={(e) => setGameEditData({...gameEditData, away_team: e.target.value})}
                            className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Away Score</label>
                          <input
                            type="number"
                            value={gameEditData.away_score || ''}
                            onChange={(e) => setGameEditData({...gameEditData, away_score: parseInt(e.target.value)})}
                            className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-gray-400 text-sm mb-1">Player of Game</label>
                          <input
                            type="text"
                            value={gameEditData.player_of_game || ''}
                            onChange={(e) => setGameEditData({...gameEditData, player_of_game: e.target.value})}
                            className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                      </div>
                      <button
                        onClick={requestEditGame}
                        className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-all"
                      >
                        Save Changes (Requires 2FA)
                      </button>
                    </div>
                  )}
                  
                  <div className="border border-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Recent Games</h3>
                    {gamesLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400">Loading games...</p>
                      </div>
                    ) : gamesList.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No games found</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {gamesList.map((game, idx) => (
                          <div key={idx} className="bg-[#1a1a1b] rounded-lg px-4 py-3 flex items-center justify-between hover:bg-gray-800 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-1">
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-semibold">
                                  Week {game.week}
                                </span>
                                <span className="text-white font-medium">
                                  {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {game.game_date} • POG: {game.player_of_game}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => handleCopyCSV(game.id)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                                title="Copy CSV"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => startEditGame(game)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="Edit game"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteGame(game.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Delete game"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Roblox Lookup Tab */}
              {activeTab === 'roblox' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-2">
                      Roblox User ID or Username
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={robloxInput}
                        onChange={(e) => setRobloxInput(e.target.value)}
                        placeholder="Enter Roblox user ID or username"
                        className="flex-1 bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={handleRobloxLookup}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg transition-all flex items-center space-x-2"
                      >
                        <Search className="w-5 h-5" />
                        <span>Lookup</span>
                      </button>
                    </div>
                  </div>

                  {robloxResult && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                      <h3 className="text-purple-400 font-semibold mb-2">Roblox User Found:</h3>
                      <div className="text-white space-y-1">
                        {robloxResult.username && <p><strong>Username:</strong> {robloxResult.username}</p>}
                        {robloxResult.display_name && <p><strong>Display Name:</strong> {robloxResult.display_name}</p>}
                        {robloxResult.user_id && <p><strong>User ID:</strong> {robloxResult.user_id}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manage Admins Tab */}
              {activeTab === 'admins' && adminInfo?.is_master && (
                <div className="space-y-4">
                  <div className="border border-emerald-500/20 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add New Admin
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        placeholder="Admin username"
                        className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        value={newAdminKey}
                        onChange={(e) => setNewAdminKey(e.target.value)}
                        placeholder="Admin key (password)"
                        className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={handleAddAdmin}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-all"
                      >
                        Add Admin
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Current Admins</h3>
                    <div className="space-y-2">
                      {adminsList.length === 0 ? (
                        <p className="text-gray-400 text-sm">No additional admins</p>
                      ) : (
                        adminsList.map((admin, index) => (
                          <div key={index} className="flex items-center justify-between bg-[#1a1a1b] rounded-lg px-4 py-3">
                            <div>
                              <p className="text-white font-medium">{admin.username}</p>
                              <p className="text-gray-400 text-xs">{admin.created_at}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveAdmin(admin.admin_key)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Merge Players Tab */}
              {activeTab === 'merge' && (
                <div className="space-y-4">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 mb-4">
                    <p className="text-cyan-400 text-sm">
                      <strong>Merge Player Accounts:</strong> Combine stats from multiple player names (e.g., different accounts) into one primary name. All games will be updated.
                    </p>
                  </div>
                  
                  <div className="border border-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Merge Configuration</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          Old Player Names (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={mergeOldNames}
                          onChange={(e) => setMergeOldNames(e.target.value)}
                          placeholder="PlayerOldName1, PlayerOldName2, PlayerOldName3"
                          className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter multiple player names separated by commas</p>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          New Primary Name
                        </label>
                        <input
                          type="text"
                          value={mergeNewName}
                          onChange={(e) => setMergeNewName(e.target.value)}
                          placeholder="FinalPlayerName"
                          className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">This will be the unified player name</p>
                      </div>
                      
                      <button
                        onClick={handleMergePlayers}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                      >
                        <ArrowRightLeft className="w-5 h-5" />
                        <span>Merge Players</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Week-Specific Stats Edit Tab */}
              {activeTab === 'weekstats' && (
                <div className="space-y-4">
                  <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4 mb-4">
                    <p className="text-pink-400 text-sm">
                      <strong>Edit Week-Specific Stats:</strong> Manually correct or add stats for a specific player in a specific week. This allows you to fix stat errors without affecting other weeks.
                    </p>
                  </div>
                  
                  <div className="border border-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Week Stats Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Player Name</label>
                        <input
                          type="text"
                          value={weekStatEdit.playerName}
                          onChange={(e) => setWeekStatEdit({...weekStatEdit, playerName: e.target.value})}
                          placeholder="Player name"
                          className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Week Number</label>
                        <input
                          type="number"
                          value={weekStatEdit.week}
                          onChange={(e) => setWeekStatEdit({...weekStatEdit, week: e.target.value})}
                          placeholder="Week #"
                          min="1"
                          className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Team Side</label>
                        <select
                          value={weekStatEdit.teamSide}
                          onChange={(e) => setWeekStatEdit({...weekStatEdit, teamSide: e.target.value})}
                          className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                        >
                          <option value="home">Home Team</option>
                          <option value="away">Away Team</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Category</label>
                        <select
                          value={weekStatEdit.category}
                          onChange={(e) => setWeekStatEdit({...weekStatEdit, category: e.target.value})}
                          className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                        >
                          <option value="passing">Passing</option>
                          <option value="rushing">Rushing</option>
                          <option value="receiving">Receiving</option>
                          <option value="defense">Defense</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Stats Builder */}
                    <div className="border border-gray-700 rounded-lg p-3 mb-3">
                      <h4 className="text-white text-sm font-semibold mb-2">Build Stats</h4>
                      <div className="flex space-x-2 mb-3">
                        <input
                          type="text"
                          value={tempStatKey}
                          onChange={(e) => setTempStatKey(e.target.value)}
                          placeholder="Stat key (e.g., yards, td)"
                          className="flex-1 bg-[#1a1a1b] border border-gray-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                        />
                        <input
                          type="number"
                          value={tempStatValue}
                          onChange={(e) => setTempStatValue(e.target.value)}
                          placeholder="Value"
                          className="w-24 bg-[#1a1a1b] border border-gray-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                        />
                        <button
                          onClick={addWeekStat}
                          className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Current Stats */}
                      {Object.keys(weekStatEdit.stats).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-gray-400 text-xs mb-2">Current Stats:</p>
                          {Object.entries(weekStatEdit.stats).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between bg-[#0d0d0e] rounded px-3 py-2">
                              <span className="text-white text-sm">
                                <span className="text-pink-400 font-mono">{key}</span>: {value}
                              </span>
                              <button
                                onClick={() => removeWeekStat(key)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleWeekStatEdit}
                      disabled={!weekStatEdit.playerName || !weekStatEdit.week || Object.keys(weekStatEdit.stats).length === 0}
                      className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <Wand2 className="w-5 h-5" />
                      <span>Update Week Stats</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShow2FAModal(false)}>
          <div className="bg-[#1a1a1b] border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Two-Factor Authentication</h3>
              <button onClick={() => setShow2FAModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <p className="text-yellow-400 text-sm mb-2 font-semibold">Generated 2FA Code:</p>
                <p className="text-white text-2xl font-mono font-bold text-center tracking-wider">{generatedCode}</p>
                <p className="text-gray-400 text-xs mt-2 text-center">Code expires in 5 minutes</p>
              </div>
              
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Enter 2FA Code to Confirm
              </label>
              <input
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full bg-[#0d0d0e] border border-gray-800 rounded-lg px-4 py-3 text-white text-center text-xl font-mono tracking-wider focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShow2FAModal(false);
                  setTwoFACode('');
                  setGeneratedCode('');
                  setTwoFAOperation(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (twoFAOperation?.type === 'edit') {
                    executeEditGame();
                  } else if (twoFAOperation?.type === 'delete') {
                    executeDeleteGame();
                  }
                }}
                disabled={twoFACode.length !== 6}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
              >
                {twoFAOperation?.type === 'edit' ? 'Confirm Edit' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowTradeModal(false)}>
          <div className="bg-[#1a1a1b] border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2" />
                Record Player Trade
              </h3>
              <button onClick={() => setShowTradeModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Player Name</label>
                <input
                  type="text"
                  value={tradeData.playerName}
                  onChange={(e) => setTradeData({...tradeData, playerName: e.target.value})}
                  placeholder="Enter player name"
                  className="w-full bg-[#0d0d0e] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">From Team</label>
                  <select
                    value={tradeData.fromTeam}
                    onChange={(e) => setTradeData({...tradeData, fromTeam: e.target.value})}
                    className="w-full bg-[#0d0d0e] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select team</option>
                    {allTeams.map((team, idx) => (
                      <option key={idx} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">To Team</label>
                  <select
                    value={tradeData.toTeam}
                    onChange={(e) => setTradeData({...tradeData, toTeam: e.target.value})}
                    className="w-full bg-[#0d0d0e] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select team</option>
                    {allTeams.map((team, idx) => (
                      <option key={idx} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Effective Week (Optional)</label>
                <input
                  type="number"
                  value={tradeData.week}
                  onChange={(e) => setTradeData({...tradeData, week: e.target.value})}
                  placeholder="Leave blank for immediate effect"
                  className="w-full bg-[#0d0d0e] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-gray-400 mt-1">Trade will apply to games after this week</p>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Notes (Optional)</label>
                <textarea
                  value={tradeData.notes}
                  onChange={(e) => setTradeData({...tradeData, notes: e.target.value})}
                  placeholder="Add any notes about this trade..."
                  rows={3}
                  className="w-full bg-[#0d0d0e] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowTradeModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordTrade}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Record Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;