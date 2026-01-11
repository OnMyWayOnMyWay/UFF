import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRightLeft, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

function formatTimestamp(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
}

const RecentTrades = ({ limit = 6 }) => {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/trades`, { params: { limit } });
      setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="glass-card animate-fadeInUp">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <ArrowRightLeft className="w-6 h-6 mr-2 text-cyan-400" />
          Recent Trades
        </h2>
        <button
          onClick={load}
          className="text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">Loading trades...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400">No trades yet.</p>
          <p className="text-gray-500 text-sm mt-1">Trades will appear here once recorded.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trades.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => navigate(`/player/${encodeURIComponent(t.player_name)}`)}
                  className="text-left"
                >
                  <p className="text-white font-semibold">{t.player_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.from_team} <span className="text-gray-500">→</span> {t.to_team}
                    {t.week !== null && t.week !== undefined ? (
                      <span className="text-gray-500"> • effective W{Number(t.week) + 1}</span>
                    ) : null}
                  </p>
                </button>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{formatTimestamp(t.timestamp)}</p>
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <button
                      onClick={() => navigate(`/team/${encodeURIComponent(t.from_team)}`)}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      From
                    </button>
                    <span className="text-gray-600">·</span>
                    <button
                      onClick={() => navigate(`/team/${encodeURIComponent(t.to_team)}`)}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      To
                    </button>
                  </div>
                </div>
              </div>
              {t.notes ? (
                <p className="mt-2 text-xs text-gray-400 bg-black/30 border border-white/10 rounded-lg p-2">
                  {t.notes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentTrades;
