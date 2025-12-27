import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, RefreshCw, X, Edit, UserPlus, Users, Search, Trash2, Plus, Minus, Database, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const AdminPanel = ({ isOpen, onClose }) => {
  const [adminKey, setAdminKey] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('reset'); // reset, edit, games, roblox, admins
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
  }, [isVerified, activeTab]);
  
  // Load recent games
  const loadGames = async () => {
    setGamesLoading(true);
    try {
      const response = await axios.get(`${API}/games`);
      setGamesList(response.data.games || []);
      
      // Also fetch database stats
      const statsResponse = await axios.get(`${API}/games`);
      if (statsResponse.data.games) {
        const games = statsResponse.data.games;
        const allPlayers = new Set();
        const allTeams = new Set();
        
        games.forEach(game => {
          allTeams.add(game.home_team);
          allTeams.add(game.away_team);
          
          ['home_stats', 'away_stats'].forEach(statsKey => {
            const stats = game[statsKey];
            if (stats) {
              Object.keys(stats).forEach(category => {
                if (Array.isArray(stats[category])) {
                  stats[category].forEach(p => allPlayers.add(p.name));
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
      }
    } catch (error) {
      toast.error('Failed to load games');
    } finally {
      setGamesLoading(false);
    }
  };
  
  // Delete specific game
  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/games/${gameId}`, {
        headers: { 'admin-key': adminKey }
      });
      toast.success('Game deleted!');
      loadGames();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete game');
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
      const games = response.data.games || [];
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
                            onClick={() => setPlayerEdit({ ...playerEdit, oldName: player.name })}
                            className="bg-[#1a1a1b] rounded-lg px-4 py-2 cursor-pointer hover:bg-gray-800 transition-colors"
                          >
                            <p className="text-white font-medium">{player.name}</p>
                            <p className="text-xs text-gray-400">{player.games} games • {player.teams}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm font-medium mb-2">
                      Player Name (Current)
                    </label>
                    <input
                      type="text"
                      value={playerEdit.oldName}
                      onChange={(e) => setPlayerEdit({ ...playerEdit, oldName: e.target.value })}
                      placeholder="Enter current player name"
                      className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
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
                        placeholder="Leave empty to keep name"
                        className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm font-medium mb-2">
                        New Team (Optional)
                      </label>
                      <input
                        type="text"
                        value={playerEdit.newTeam}
                        onChange={(e) => setPlayerEdit({ ...playerEdit, newTeam: e.target.value })}
                        placeholder="Leave empty to keep team"
                        className="w-full bg-[#1a1a1b] border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
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
                        {gamesList.slice(0, 20).map((game, idx) => (
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
                            <button
                              onClick={() => handleDeleteGame(game._id)}
                              className="text-red-400 hover:text-red-300 transition-colors ml-4"
                              title="Delete game"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;