import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star, X, Search, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import useWatchlist from '@/hooks/useWatchlist';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const Watchlist = () => {
  const navigate = useNavigate();
  const { watchlist, addPlayer, removePlayer, clearWatchlist } = useWatchlist();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      const q = trimmed;
      if (!q) {
        setSuggestions([]);
        setSuggestionsOpen(false);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const res = await axios.get(`${API}/player-names`, {
          params: { query: q, limit: 10 }
        });
        const players = Array.isArray(res.data?.players) ? res.data.players : [];
        if (!isCancelled) {
          setSuggestions(players);
          setSuggestionsOpen(players.length > 0);
        }
      } catch {
        if (!isCancelled) {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
      } finally {
        if (!isCancelled) setLoadingSuggestions(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => {
      isCancelled = true;
      clearTimeout(t);
    };
  }, [trimmed]);

  const handleAdd = (name) => {
    const n = (name || '').trim();
    if (!n) return;

    addPlayer(n);
    setQuery('');
    setSuggestions([]);
    setSuggestionsOpen(false);
    toast.success(`Added ${n} to Watchlist`);
  };

  return (
    <div className="glass-card animate-fadeInUp">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Star className="w-6 h-6 mr-2 text-yellow-500" />
          Watchlist
        </h2>
        <button
          onClick={() => {
            if (watchlist.length === 0) return;
            if (!window.confirm('Clear your Watchlist?')) return;
            clearWatchlist();
            toast.success('Watchlist cleared');
          }}
          disabled={watchlist.length === 0}
          className="text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors flex items-center"
          title="Clear Watchlist"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="relative mb-4">
        <label className="block text-gray-400 text-xs uppercase tracking-wide mb-2">Add Player</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSuggestionsOpen(suggestions.length > 0)}
              placeholder="Type a player name..."
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500/40"
            />
          </div>
          <button
            onClick={() => handleAdd(query)}
            disabled={!trimmed}
            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {suggestionsOpen && (
          <div className="absolute z-20 mt-2 w-full bg-[#0d0d0e] border border-white/10 rounded-xl overflow-hidden">
            {loadingSuggestions ? (
              <div className="px-3 py-2 text-sm text-gray-400">Searching…</div>
            ) : (
              <>
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleAdd(name)}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                  >
                    {name}
                  </button>
                ))}
                <button
                  onClick={() => setSuggestionsOpen(false)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <X className="w-3 h-3" />
                  Close
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400">No players saved yet.</p>
          <p className="text-gray-500 text-sm mt-1">Add players to pin them here for quick access.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {watchlist.slice(0, 20).map((name) => (
            <div
              key={name}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <button
                onClick={() => navigate(`/player/${encodeURIComponent(name)}`)}
                className="text-left flex-1"
              >
                <p className="text-white font-semibold">{name}</p>
                <p className="text-xs text-gray-400">View profile →</p>
              </button>
              <button
                onClick={() => {
                  removePlayer(name);
                  toast.success(`Removed ${name}`);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                title="Remove"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
          {watchlist.length > 20 && (
            <p className="text-xs text-gray-500 mt-2">Showing first 20 players.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Watchlist;
