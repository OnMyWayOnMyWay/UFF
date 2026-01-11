import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, X, BarChart3, ArrowRight, Trophy } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const PlayerStatsLookup = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState(null);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!normalizedQuery || normalizedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const res = await axios.get(`${API}/player-names`, {
          params: { query: normalizedQuery, limit: 10 }
        });
        const players = res?.data?.players;
        setSuggestions(Array.isArray(players) ? players : []);
      } catch (e) {
        console.error('Failed to fetch player names:', e);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [normalizedQuery]);

  const fetchPlayer = async (playerName) => {
    setPlayerError(null);
    setPlayerLoading(true);
    try {
      const res = await axios.get(`${API}/players/${encodeURIComponent(playerName)}`);
      setSelectedPlayer(res.data);
    } catch (e) {
      setSelectedPlayer(null);
      setPlayerError(e?.response?.data?.detail || 'Player not found');
    } finally {
      setPlayerLoading(false);
    }
  };

  const handleSelect = (playerName) => {
    setQuery(playerName);
    setSuggestionsOpen(false);
    fetchPlayer(playerName);
  };

  const clearAll = () => {
    setQuery('');
    setSuggestions([]);
    setSuggestionsOpen(false);
    setSelectedPlayer(null);
    setPlayerError(null);
    inputRef.current?.focus();
  };

  const stats = selectedPlayer?.total_stats;

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2 flex items-center">
          <BarChart3 className="w-10 h-10 mr-3" />
          Player Stats Lookup
        </h1>
        <p className="text-gray-400">Search any player and view their season totals</p>
      </div>

      {/* Search */}
      <div className="glass-card mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a player name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSuggestionsOpen(false);
              if (e.key === 'Enter') {
                const exact = suggestions.find((p) => p.toLowerCase() === normalizedQuery.toLowerCase());
                if (exact) handleSelect(exact);
              }
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            data-testid="player-stats-search"
          />
          {(query || selectedPlayer) && (
            <button
              onClick={clearAll}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Clear"
            >
              <X className="w-4 h-4 text-gray-300" />
            </button>
          )}

          {suggestionsOpen && (normalizedQuery.length >= 2 || suggestionsLoading) && (
            <div
              className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden"
              onMouseDown={(e) => e.preventDefault()}
            >
              {suggestionsLoading && (
                <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>
              )}

              {!suggestionsLoading && suggestions.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400">No players found</div>
              )}

              {!suggestionsLoading && suggestions.length > 0 && (
                <div className="max-h-72 overflow-y-auto">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between"
                      onClick={() => handleSelect(name)}
                      data-testid={`player-suggestion-${name}`}
                    >
                      <span className="text-white">{name}</span>
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Tip: type 2+ characters to search</span>
          <span>Press Enter to select exact match</span>
        </div>
      </div>

      {/* Results */}
      {playerLoading && (
        <div className="glass-card text-center py-10">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading player stats...</p>
        </div>
      )}

      {!playerLoading && playerError && (
        <div className="glass-card text-center py-10">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300">{playerError}</p>
        </div>
      )}

      {!playerLoading && !playerError && selectedPlayer && (
        <>
          <div className="glass-card mb-6 animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white glow-emerald">
                  {selectedPlayer.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedPlayer.name}</h2>
                  <div className="text-sm text-gray-400 flex items-center gap-3 flex-wrap">
                    <span>{selectedPlayer.games_played || 0} games</span>
                    <span className="text-yellow-500 font-semibold flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {(selectedPlayer.fantasy_points || 0).toFixed(1)} FP
                    </span>
                    {selectedPlayer.current_team && (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-semibold">
                        Current: {selectedPlayer.current_team}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/player/${encodeURIComponent(selectedPlayer.name)}`)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-gray-100 flex items-center gap-2"
                data-testid="open-full-profile"
              >
                Open full profile
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Passing</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stats?.passing?.yards || 0}</p>
              <p className="text-sm text-gray-400">{stats?.passing?.tds || 0} TD • {stats?.passing?.ints || 0} INT</p>
              <p className="text-xs text-gray-500 mt-2">
                {(stats?.passing?.comp || 0)}/{(stats?.passing?.att || 0)} ({(stats?.passing?.completion_pct || 0).toFixed(1)}%)
              </p>
            </div>

            <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Rushing</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stats?.rushing?.yards || 0}</p>
              <p className="text-sm text-gray-400">{stats?.rushing?.tds || 0} TD • {stats?.rushing?.att || 0} Att</p>
              <p className="text-xs text-emerald-500 font-semibold mt-2">{(stats?.rushing?.ypc || 0).toFixed(1)} YPC</p>
            </div>

            <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Receiving</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stats?.receiving?.yards || 0}</p>
              <p className="text-sm text-gray-400">{stats?.receiving?.tds || 0} TD • {stats?.receiving?.rec || 0} Rec</p>
              {(stats?.receiving?.drops || 0) > 0 && (
                <p className="text-xs text-red-400 mt-2">Drops: {stats?.receiving?.drops || 0}</p>
              )}
            </div>

            <div className="stat-card-modern animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Defense</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stats?.defense?.tak || 0}</p>
              <p className="text-sm text-gray-400">{stats?.defense?.sck || 0} SCK • {stats?.defense?.int || 0} INT</p>
              {(stats?.defense?.td || 0) > 0 && (
                <p className="text-xs text-emerald-500 font-semibold mt-2">{stats?.defense?.td || 0} TD</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerStatsLookup;
