import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Award, TrendingUp, Shield, Zap, Target, Star } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SeasonAwards = () => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leadersRes, standingsRes] = await Promise.all([
        axios.get(`${API}/stats/leaders`),
        axios.get(`${API}/teams/standings`)
      ]);
      setLeaders(leadersRes.data);
      setStandings(standingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const awards = [
    {
      title: 'MVP (Most Valuable Player)',
      icon: Trophy,
      color: 'from-yellow-500 to-orange-500',
      winner: leaders?.points[0],
      description: 'Highest fantasy points'
    },
    {
      title: 'Offensive Player of the Year',
      icon: Zap,
      color: 'from-orange-500 to-red-500',
      winner: leaders?.passing_yards[0],
      description: 'Top passing yards'
    },
    {
      title: 'Defensive Player of the Year',
      icon: Shield,
      color: 'from-red-500 to-rose-600',
      winner: leaders?.tackles[0],
      description: 'Most tackles'
    },
    {
      title: 'Rookie of the Year',
      icon: Star,
      color: 'from-purple-500 to-pink-500',
      winner: leaders?.receiving_yards[0],
      description: 'Top receiving yards'
    },
    {
      title: 'Offensive Rookie',
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      winner: leaders?.rushing_yards[0],
      description: 'Top rushing yards'
    },
    {
      title: 'Defensive Rookie',
      icon: Award,
      color: 'from-emerald-500 to-teal-500',
      winner: leaders?.sacks[0],
      description: 'Most sacks'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading awards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2 flex items-center">
          <Trophy className="w-10 h-10 mr-3" />
          Season Awards
        </h1>
        <p className="text-gray-400">Honoring the best performers of the season</p>
      </div>

      {/* Championship Banner */}
      <div className="glass-card mb-8 overflow-hidden relative animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10"></div>
        <div className="relative p-8 text-center">
          <div className="inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center glow-emerald animate-float">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">Season Champions</h2>
          <p className="text-5xl lg:text-6xl font-bold gradient-text mb-4">{standings[0]?.team || 'TBD'}</p>
          <div className="flex items-center justify-center space-x-8 text-sm">
            <div>
              <p className="text-gray-400">Record</p>
              <p className="text-white font-bold text-lg">{standings[0]?.wins}-{standings[0]?.losses}</p>
            </div>
            <div>
              <p className="text-gray-400">Win %</p>
              <p className="text-emerald-400 font-bold text-lg">{(standings[0]?.win_pct * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-gray-400">Point Diff</p>
              <p className="text-blue-400 font-bold text-lg">+{standings[0]?.point_diff}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Awards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {awards.map((award, idx) => {
          const Icon = award.icon;
          return (
            <div
              key={idx}
              className="stat-card-modern cursor-pointer"
              onClick={() => award.winner && navigate(`/player/${award.winner.name}`)}
              style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
            >
              <div className="text-center mb-4">
                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center bg-gradient-to-br ${award.color}`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-white text-lg mb-1">{award.title}</h3>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{award.description}</p>
              </div>
              {award.winner && (
                <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-2xl font-bold gradient-text mb-1">{award.winner.name}</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {award.winner.value} {award.title.includes('MVP') || award.title.includes('Rookie') ? 'pts' : ''}
                  </p>
                  {award.winner.tds !== undefined && (
                    <p className="text-sm text-gray-400 mt-1">{award.winner.tds} TDs</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All-Star Team */}
      <div className="glass-card animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Star className="w-6 h-6 mr-2 text-yellow-500" />
          All-Star Team
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-blue-400 uppercase tracking-wide mb-2">Quarterback</p>
            <p className="text-lg font-bold text-white">{leaders?.passing_yards[0]?.name}</p>
            <p className="text-sm text-gray-400">{leaders?.passing_yards[0]?.value} yards</p>
          </div>
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <p className="text-xs text-orange-400 uppercase tracking-wide mb-2">Running Back</p>
            <p className="text-lg font-bold text-white">{leaders?.rushing_yards[0]?.name}</p>
            <p className="text-sm text-gray-400">{leaders?.rushing_yards[0]?.value} yards</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <p className="text-xs text-purple-400 uppercase tracking-wide mb-2">Wide Receiver</p>
            <p className="text-lg font-bold text-white">{leaders?.receiving_yards[0]?.name}</p>
            <p className="text-sm text-gray-400">{leaders?.receiving_yards[0]?.value} yards</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-400 uppercase tracking-wide mb-2">Linebacker</p>
            <p className="text-lg font-bold text-white">{leaders?.tackles[0]?.name}</p>
            <p className="text-sm text-gray-400">{leaders?.tackles[0]?.value} tackles</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs text-emerald-400 uppercase tracking-wide mb-2">Defensive End</p>
            <p className="text-lg font-bold text-white">{leaders?.sacks[0]?.name}</p>
            <p className="text-sm text-gray-400">{leaders?.sacks[0]?.value} sacks</p>
          </div>
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <p className="text-xs text-cyan-400 uppercase tracking-wide mb-2">Defensive Back</p>
            <p className="text-lg font-bold text-white">{leaders?.interceptions[0]?.name}</p>
            <p className="text-sm text-gray-400">{leaders?.interceptions[0]?.value} interceptions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonAwards;