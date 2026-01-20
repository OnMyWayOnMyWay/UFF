import { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, Trophy, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Schedule = () => {
  const [scheduleData, setScheduleData] = useState({ games: [], weekly_stats: {} });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(13);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scheduleRes, teamsRes] = await Promise.all([
          axios.get(`${API}/schedule`),
          axios.get(`${API}/teams`)
        ]);
        setScheduleData(scheduleRes.data);
        setTeams(teamsRes.data);
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTeamById = (id) => teams.find(t => t.id === id) || { name: id, abbreviation: id.toUpperCase(), color: '#333' };

  const weekGames = scheduleData.games.filter(g => g.week === selectedWeek);
  const weekStats = scheduleData.weekly_stats[selectedWeek] || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="schedule-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <Calendar className="w-6 h-6 text-neon-blue" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Season Schedule</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            WEEKLY <span className="text-neon-blue">SCHEDULE</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            Game results, scores, and weekly statistics.
          </p>
        </div>
      </div>

      {/* Week Selector */}
      <div className="px-6 md:px-12 py-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2" data-testid="week-selector">
              {Array.from({ length: 13 }, (_, i) => i + 1).map((week) => (
                <button
                  key={week}
                  onClick={() => setSelectedWeek(week)}
                  data-testid={`week-btn-${week}`}
                  className={`px-4 py-2 rounded-lg font-heading font-bold text-sm transition-all ${
                    selectedWeek === week
                      ? 'bg-neon-blue text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Week {week}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Weekly Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-neon-blue" />
                  <span className="font-body text-xs uppercase tracking-widest text-white/40">Total Points</span>
                </div>
                <div className="font-heading font-black text-3xl text-white">{weekStats.total_points?.toFixed(1) || '-'}</div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-neon-blue" />
                  <span className="font-body text-xs uppercase tracking-widest text-white/40">Avg Points</span>
                </div>
                <div className="font-heading font-black text-3xl text-white">{weekStats.avg_points?.toFixed(1) || '-'}</div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-neon-volt" />
                  <span className="font-body text-xs uppercase tracking-widest text-white/40">High Score</span>
                </div>
                <div className="font-heading font-black text-3xl text-neon-volt">{weekStats.high_score?.toFixed(1) || '-'}</div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-neon-volt" />
                  <span className="font-body text-xs uppercase tracking-widest text-white/40">High Scorer</span>
                </div>
                <div className="font-heading font-bold text-lg text-white truncate">{weekStats.high_scorer || '-'}</div>
              </CardContent>
            </Card>
          </div>

          {/* Game Cards */}
          <div className="space-y-4">
            <h2 className="font-heading font-bold text-xl uppercase tracking-tight text-white flex items-center gap-2">
              <span>Week {selectedWeek} Matchups</span>
              <Badge className="bg-white/10 text-white/60">{weekGames.length} Games</Badge>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekGames.map((game, idx) => {
                const homeTeam = getTeamById(game.home_team_id);
                const awayTeam = getTeamById(game.away_team_id);
                const homeWins = game.home_score > game.away_score;
                
                return (
                  <Card 
                    key={game.id} 
                    className="glass-panel border-white/10 overflow-hidden hover:-translate-y-1 transition-transform animate-slide-up"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                    data-testid={`game-card-${idx}`}
                  >
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="flex items-center justify-between p-3 border-b border-white/5">
                        <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                          {game.is_completed ? 'FINAL' : 'Scheduled'}
                        </Badge>
                        {game.player_of_game && (
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 text-neon-volt" />
                            <span className="text-neon-volt font-semibold">POG</span>
                          </div>
                        )}
                      </div>

                      {/* Teams */}
                      <div className="p-4 space-y-3">
                        {/* Away Team */}
                        <div className={`flex items-center justify-between ${!homeWins ? 'opacity-100' : 'opacity-50'}`}>
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold text-white"
                              style={{ backgroundColor: awayTeam.color }}
                            >
                              {awayTeam.abbreviation?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-heading font-bold text-white">{awayTeam.name}</div>
                              <div className="font-body text-xs text-white/40">{awayTeam.wins}-{awayTeam.losses}</div>
                            </div>
                          </div>
                          <div className={`font-heading font-black text-2xl ${!homeWins ? 'text-neon-volt' : 'text-white/40'}`}>
                            {game.away_score.toFixed(1)}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/5" />

                        {/* Home Team */}
                        <div className={`flex items-center justify-between ${homeWins ? 'opacity-100' : 'opacity-50'}`}>
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold text-white"
                              style={{ backgroundColor: homeTeam.color }}
                            >
                              {homeTeam.abbreviation?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-heading font-bold text-white">{homeTeam.name}</div>
                              <div className="font-body text-xs text-white/40">{homeTeam.wins}-{homeTeam.losses}</div>
                            </div>
                          </div>
                          <div className={`font-heading font-black text-2xl ${homeWins ? 'text-neon-volt' : 'text-white/40'}`}>
                            {game.home_score.toFixed(1)}
                          </div>
                        </div>
                      </div>

                      {/* Player of Game */}
                      {game.player_of_game && (
                        <div className="px-4 py-3 bg-white/5 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-body text-xs text-white/40 uppercase tracking-widest">Player of the Game</div>
                              <div className="font-heading font-bold text-white">{game.player_of_game}</div>
                            </div>
                            <Badge className="bg-neon-volt/20 text-neon-volt">{game.player_of_game_stats}</Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
