import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Activity, TrendingUp, ArrowRightLeft, Trophy, Star, Flame, Clock, ChevronRight, Zap, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

import API from '../lib/api';

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const feedRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tradesRes, playersRes, gamesRes, awardsRes] = await Promise.all([
          axios.get(`${API}/trades`),
          axios.get(`${API}/players?limit=50`),
          axios.get(`${API}/schedule`),
          axios.get(`${API}/awards`)
        ]);

        const feed = [];
        
        // Add trades
        tradesRes.data.forEach((trade, idx) => {
          feed.push({
            id: `trade-${trade.id}`,
            type: 'trade',
            icon: ArrowRightLeft,
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/20',
            title: 'Trade Completed',
            description: `${trade.team1_name} traded with ${trade.team2_name}`,
            detail: `${trade.team1_receives?.join(', ')} ↔ ${trade.team2_receives?.join(', ')}`,
            timestamp: new Date(Date.now() - idx * 3600000 * 2).toISOString(),
            link: '/trades'
          });
        });

        // Add top performers (hot streaks)
        const elitePlayers = playersRes.data.filter(p => p.is_elite || p.fantasy_points > 250);
        elitePlayers.slice(0, 5).forEach((player, idx) => {
          feed.push({
            id: `streak-${player.id}`,
            type: 'streak',
            icon: Flame,
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/20',
            title: '🔥 Hot Streak',
            description: `${player.roblox_username || player.name} is on fire!`,
            detail: `${player.fantasy_points?.toFixed(1)} fantasy points this season`,
            timestamp: new Date(Date.now() - idx * 3600000 * 4).toISOString(),
            link: `/player/${player.id}`,
            player
          });
        });

        // Add milestone achievements
        playersRes.data.forEach((player, idx) => {
          const passingYards = player.passing?.yards || 0;
          const rushingYards = player.rushing?.yards || 0;
          const receivingYards = player.receiving?.yards || 0;
          const totalTDs = (player.passing?.touchdowns || 0) + (player.rushing?.touchdowns || 0) + (player.receiving?.touchdowns || 0);
          
          if (passingYards >= 4000) {
            feed.push({
              id: `milestone-pass-${player.id}`,
              type: 'milestone',
              icon: Trophy,
              color: 'text-yellow-400',
              bgColor: 'bg-yellow-500/20',
              title: '🏆 Milestone Reached',
              description: `${player.roblox_username} hit 4,000 passing yards!`,
              detail: `${passingYards.toLocaleString()} passing yards`,
              timestamp: new Date(Date.now() - idx * 3600000 * 6).toISOString(),
              link: `/player/${player.id}`,
              player
            });
          }
          if (rushingYards >= 1000) {
            feed.push({
              id: `milestone-rush-${player.id}`,
              type: 'milestone',
              icon: Zap,
              color: 'text-blue-400',
              bgColor: 'bg-blue-500/20',
              title: '⚡ 1K Club',
              description: `${player.roblox_username} joined the 1,000 yard rushing club!`,
              detail: `${rushingYards.toLocaleString()} rushing yards`,
              timestamp: new Date(Date.now() - idx * 3600000 * 8).toISOString(),
              link: `/player/${player.id}`,
              player
            });
          }
          if (totalTDs >= 30) {
            feed.push({
              id: `milestone-td-${player.id}`,
              type: 'milestone',
              icon: Target,
              color: 'text-green-400',
              bgColor: 'bg-green-500/20',
              title: '🎯 TD Machine',
              description: `${player.roblox_username} scored 30+ touchdowns!`,
              detail: `${totalTDs} total touchdowns`,
              timestamp: new Date(Date.now() - idx * 3600000 * 10).toISOString(),
              link: `/player/${player.id}`,
              player
            });
          }
        });

        // Add awards
        awardsRes.data.forEach((award, idx) => {
          feed.push({
            id: `award-${award.id}`,
            type: 'award',
            icon: Award,
            color: 'text-neon-volt',
            bgColor: 'bg-neon-volt/20',
            title: '🏅 Award Winner',
            description: `${award.player_name} won ${award.name}`,
            detail: award.description || award.team,
            timestamp: new Date(Date.now() - idx * 3600000 * 12).toISOString(),
            link: '/awards'
          });
        });

        // Add recent games with big scores
        const recentGames = gamesRes.data.games?.slice(0, 10) || [];
        recentGames.forEach((game, idx) => {
          if (game.home_score > 40 || game.away_score > 40) {
            feed.push({
              id: `game-${game.id}`,
              type: 'game',
              icon: Star,
              color: 'text-cyan-400',
              bgColor: 'bg-cyan-500/20',
              title: '🌟 High Scoring Game',
              description: `Week ${game.week}: ${game.home_score?.toFixed(1)} - ${game.away_score?.toFixed(1)}`,
              detail: game.player_of_game ? `POG: ${game.player_of_game}` : 'Thriller matchup!',
              timestamp: new Date(Date.now() - idx * 3600000 * 5).toISOString(),
              link: '/schedule'
            });
          }
        });

        // Sort by timestamp
        feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setActivities(feed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  const filters = [
    { id: 'all', label: 'All', icon: Activity },
    { id: 'trade', label: 'Trades', icon: ArrowRightLeft },
    { id: 'streak', label: 'Hot Streaks', icon: Flame },
    { id: 'milestone', label: 'Milestones', icon: Trophy },
    { id: 'award', label: 'Awards', icon: Award },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-neon-volt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="activity-feed-page" className="min-h-screen">
      {/* Header */}
      <div className="hero-bg px-6 md:px-12 pt-8 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-6 h-6 text-neon-volt animate-pulse" />
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Real-Time Updates</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tight">
            <span className="text-white">ACTIVITY</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-volt to-neon-blue">FEED</span>
          </h1>
          <p className="text-white/50 mt-2">Latest trades, milestones, and league highlights</p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 -mt-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  filter === f.id 
                    ? 'bg-neon-volt text-black' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <f.icon className="w-4 h-4" />
                {f.label}
              </button>
            ))}
          </div>

          {/* Feed */}
          <div ref={feedRef} className="space-y-4">
            {filteredActivities.map((activity, idx) => (
              <Link
                key={activity.id}
                to={activity.link}
                className="block"
              >
                <Card 
                  className="glass-panel border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.01] overflow-hidden group"
                  style={{ 
                    animationDelay: `${idx * 50}ms`,
                    animation: 'slideUp 0.5s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl ${activity.bgColor} flex items-center justify-center shrink-0`}>
                        <activity.icon className={`w-6 h-6 ${activity.color}`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${activity.bgColor} ${activity.color} text-xs`}>
                            {activity.title}
                          </Badge>
                          <span className="text-white/30 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-white font-medium">{activity.description}</p>
                        <p className="text-white/50 text-sm mt-1">{activity.detail}</p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-neon-volt group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredActivities.length === 0 && (
            <Card className="glass-panel border-white/10 border-dashed">
              <CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="font-heading font-bold text-xl text-white/50">No Activities Yet</h3>
                <p className="text-white/30 mt-2">Check back later for updates</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Animation Keyframes */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ActivityFeed;
