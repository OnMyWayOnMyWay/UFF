import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, TrendingUp, Users, Trophy } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ players: [], teams: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (query.length > 1) {
      searchData();
    } else {
      setResults({ players: [], teams: [] });
    }
  }, [query]);

  const searchData = async () => {
    setLoading(true);
    try {
      const [leadersRes, standingsRes] = await Promise.all([
        axios.get(`${API}/stats/leaders`),
        axios.get(`${API}/teams/standings`)
      ]);

      const allPlayers = new Set();
      Object.values(leadersRes.data).forEach(category => {
        category.forEach(player => allPlayers.add(player.name));
      });

      const filteredPlayers = Array.from(allPlayers)
        .filter(name => name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      const filteredTeams = standingsRes.data
        .filter(team => team.team.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      setResults({ players: filteredPlayers, teams: filteredTeams });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (type, value) => {
    setIsOpen(false);
    setQuery('');
    if (type === 'player') {
      navigate(`/player/${value}`);
    } else if (type === 'team') {
      navigate(`/team/${value.team}`);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="glass-modern px-4 py-2 flex items-center space-x-2 hover-lift-smooth"
        data-testid="search-button"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline text-sm text-gray-400">Search...</span>
        <kbd className="hidden md:inline px-2 py-1 text-xs bg-white/5 rounded">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="glass-modern w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-3 p-4 border-b border-white/10">
          <Search className="w-5 h-5 text-emerald-400" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, teams..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
            autoFocus
          />
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8">
              <div className="spinner-advanced w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}

          {!loading && results.players.length === 0 && results.teams.length === 0 && query.length > 1 && (
            <div className="text-center py-8 text-gray-400">No results found</div>
          )}

          {results.players.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Players
              </h3>
              {results.players.map((player, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect('player', player)}
                  className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-all flex items-center space-x-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center font-bold">
                    {player.charAt(0)}
                  </div>
                  <span className="text-white">{player}</span>
                </button>
              ))}
            </div>
          )}

          {results.teams.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Teams
              </h3>
              {results.teams.map((team, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect('team', team)}
                  className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-white font-semibold">{team.team}</span>
                  </div>
                  <span className="text-sm text-gray-400">{team.wins}-{team.losses}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;