import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeftRight, Scale, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Sparkles, Plus, X, Search, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TradeMachine = () => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [team1Offers, setTeam1Offers] = useState([]);
  const [team2Offers, setTeam2Offers] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedPlayer, setDraggedPlayer] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, playersRes] = await Promise.all([
          axios.get(`${API}/teams`),
          axios.get(`${API}/players?limit=100`)
        ]);
        setTeams(teamsRes.data);
        setPlayers(playersRes.data);
        if (teamsRes.data.length >= 2) {
          setTeam1(teamsRes.data[0]);
          setTeam2(teamsRes.data[1]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (team1) {
      setTeam1Players(players.filter(p => p.team_id === team1.id || p.team === team1.name));
    }
    if (team2) {
      setTeam2Players(players.filter(p => p.team_id === team2.id || p.team === team2.name));
    }
  }, [team1, team2, players]);

  const calculatePlayerValue = (player) => {
    let value = player.fantasy_points || 0;
    
    // Position multipliers
    const posMultipliers = { QB: 1.3, RB: 1.2, WR: 1.15, TE: 1.0, DEF: 0.9, K: 0.7 };
    value *= posMultipliers[player.position] || 1.0;
    
    // Elite bonus
    if (player.is_elite) value *= 1.25;
    
    // Performance bonuses
    if (player.passing?.touchdowns > 30) value *= 1.15;
    if (player.rushing?.yards > 1000) value *= 1.1;
    if (player.receiving?.yards > 1200) value *= 1.1;
    
    return Math.round(value);
  };

  const analyzeTrade = () => {
    const team1Value = team1Offers.reduce((sum, p) => sum + calculatePlayerValue(p), 0);
    const team2Value = team2Offers.reduce((sum, p) => sum + calculatePlayerValue(p), 0);
    
    const difference = team1Value - team2Value;
    const percentDiff = team1Value > 0 ? Math.abs(difference / team1Value * 100) : 0;
    
    let verdict, grade, winner;
    
    if (percentDiff < 5) {
      verdict = "Fair Trade";
      grade = "A";
      winner = null;
    } else if (percentDiff < 15) {
      verdict = "Slightly Uneven";
      grade = "B";
      winner = difference > 0 ? 2 : 1;
    } else if (percentDiff < 30) {
      verdict = "Unbalanced Trade";
      grade = "C";
      winner = difference > 0 ? 2 : 1;
    } else {
      verdict = "Lopsided Trade";
      grade = "F";
      winner = difference > 0 ? 2 : 1;
    }

    setAnalysis({
      team1Value,
      team2Value,
      difference: Math.abs(difference),
      percentDiff,
      verdict,
      grade,
      winner,
      team1Needs: getTeamNeeds(team1, team1Players.filter(p => !team1Offers.includes(p)).concat(team2Offers)),
      team2Needs: getTeamNeeds(team2, team2Players.filter(p => !team2Offers.includes(p)).concat(team1Offers)),
    });
  };

  const getTeamNeeds = (team, roster) => {
    const positions = { QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0, K: 0 };
    roster.forEach(p => { if (positions[p.position] !== undefined) positions[p.position]++; });
    
    const needs = [];
    if (positions.QB < 1) needs.push('QB');
    if (positions.RB < 2) needs.push('RB');
    if (positions.WR < 2) needs.push('WR');
    if (positions.DEF < 1) needs.push('DEF');
    return needs;
  };

  const addToOffer = (player, team) => {
    if (team === 1 && !team1Offers.includes(player)) {
      setTeam1Offers([...team1Offers, player]);
    } else if (team === 2 && !team2Offers.includes(player)) {
      setTeam2Offers([...team2Offers, player]);
    }
    setAnalysis(null);
  };

  const removeFromOffer = (player, team) => {
    if (team === 1) {
      setTeam1Offers(team1Offers.filter(p => p.id !== player.id));
    } else {
      setTeam2Offers(team2Offers.filter(p => p.id !== player.id));
    }
    setAnalysis(null);
  };

  const handleDragStart = (player, team) => {
    setDraggedPlayer({ player, team });
  };

  const handleDrop = (targetTeam) => {
    if (draggedPlayer && draggedPlayer.team !== targetTeam) {
      addToOffer(draggedPlayer.player, targetTeam);
    }
    setDraggedPlayer(null);
  };

  const getPositionColor = (pos) => {
    const colors = { QB: '#F97316', WR: '#14B8A6', RB: '#3B82F6', DEF: '#EF4444', K: '#8B5CF6', TE: '#10B981' };
    return colors[pos] || '#6B7280';
  };

  const getGradeColor = (grade) => {
    const colors = { A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500' };
    return colors[grade] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-neon-volt border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="trade-machine-page" className="min-h-screen">
      {/* Header */}
      <div className="hero-bg px-6 md:px-12 pt-8 pb-12">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-6 h-6 text-neon-volt" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Build & Analyze</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tight">
            <span className="text-white">TRADE</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-volt to-neon-blue">MACHINE</span>
          </h1>
          <p className="text-white/50 mt-3">Drag players to build trades and see instant analysis</p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 -mt-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Team Selection */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Team 1</label>
              <select 
                value={team1?.id || ''} 
                onChange={(e) => { setTeam1(teams.find(t => t.id === e.target.value)); setTeam1Offers([]); setAnalysis(null); }}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-heading"
              >
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Team 2</label>
              <select 
                value={team2?.id || ''} 
                onChange={(e) => { setTeam2(teams.find(t => t.id === e.target.value)); setTeam2Offers([]); setAnalysis(null); }}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-heading"
              >
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Trade Builder */}
          <div className="grid grid-cols-2 gap-8">
            {/* Team 1 Side */}
            <div className="space-y-4">
              {/* Team 1 Roster */}
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5 py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading font-bold text-sm uppercase" style={{ color: team1?.color }}>
                      {team1?.name} Roster
                    </CardTitle>
                    <Badge className="bg-white/10">{team1Players.length} players</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 max-h-[200px] overflow-auto">
                  {team1Players.filter(p => !team1Offers.includes(p)).map(player => (
                    <div
                      key={player.id}
                      draggable
                      onDragStart={() => handleDragStart(player, 1)}
                      onClick={() => addToOffer(player, 1)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-grab active:cursor-grabbing transition-all group"
                    >
                      <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/40" />
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: getPositionColor(player.position) }}>
                        {player.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">{player.roblox_username || player.name}</div>
                      </div>
                      <div className="text-neon-volt font-bold text-sm">{calculatePlayerValue(player)}</div>
                      <Plus className="w-4 h-4 text-white/30 group-hover:text-neon-volt" />
                    </div>
                  ))}
                  {team1Players.length === 0 && (
                    <div className="p-4 text-center text-white/40 text-sm">No players on this team</div>
                  )}
                </CardContent>
              </Card>

              {/* Team 1 Offers */}
              <Card 
                className={`glass-panel border-2 transition-all ${draggedPlayer?.team === 2 ? 'border-neon-volt' : 'border-white/10'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(1)}
              >
                <CardHeader className="border-b border-white/5 py-3">
                  <CardTitle className="font-heading font-bold text-sm uppercase text-white/60">
                    {team1?.abbreviation} Receives
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 min-h-[100px]">
                  {team2Offers.length === 0 ? (
                    <div className="h-[80px] flex items-center justify-center text-white/30 text-sm border-2 border-dashed border-white/10 rounded-lg">
                      Drag players here
                    </div>
                  ) : (
                    team2Offers.map(player => (
                      <div key={player.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: getPositionColor(player.position) }}>
                          {player.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm truncate">{player.roblox_username || player.name}</div>
                        </div>
                        <div className="text-neon-volt font-bold text-sm">{calculatePlayerValue(player)}</div>
                        <button onClick={() => removeFromOffer(player, 2)} className="p-1 hover:bg-white/10 rounded">
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Team 2 Side */}
            <div className="space-y-4">
              {/* Team 2 Roster */}
              <Card className="glass-panel border-white/10">
                <CardHeader className="border-b border-white/5 py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading font-bold text-sm uppercase" style={{ color: team2?.color }}>
                      {team2?.name} Roster
                    </CardTitle>
                    <Badge className="bg-white/10">{team2Players.length} players</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 max-h-[200px] overflow-auto">
                  {team2Players.filter(p => !team2Offers.includes(p)).map(player => (
                    <div
                      key={player.id}
                      draggable
                      onDragStart={() => handleDragStart(player, 2)}
                      onClick={() => addToOffer(player, 2)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-grab active:cursor-grabbing transition-all group"
                    >
                      <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/40" />
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: getPositionColor(player.position) }}>
                        {player.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">{player.roblox_username || player.name}</div>
                      </div>
                      <div className="text-neon-volt font-bold text-sm">{calculatePlayerValue(player)}</div>
                      <Plus className="w-4 h-4 text-white/30 group-hover:text-neon-volt" />
                    </div>
                  ))}
                  {team2Players.length === 0 && (
                    <div className="p-4 text-center text-white/40 text-sm">No players on this team</div>
                  )}
                </CardContent>
              </Card>

              {/* Team 2 Offers */}
              <Card 
                className={`glass-panel border-2 transition-all ${draggedPlayer?.team === 1 ? 'border-neon-volt' : 'border-white/10'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(2)}
              >
                <CardHeader className="border-b border-white/5 py-3">
                  <CardTitle className="font-heading font-bold text-sm uppercase text-white/60">
                    {team2?.abbreviation} Receives
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 min-h-[100px]">
                  {team1Offers.length === 0 ? (
                    <div className="h-[80px] flex items-center justify-center text-white/30 text-sm border-2 border-dashed border-white/10 rounded-lg">
                      Drag players here
                    </div>
                  ) : (
                    team1Offers.map(player => (
                      <div key={player.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: getPositionColor(player.position) }}>
                          {player.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm truncate">{player.roblox_username || player.name}</div>
                        </div>
                        <div className="text-neon-volt font-bold text-sm">{calculatePlayerValue(player)}</div>
                        <button onClick={() => removeFromOffer(player, 1)} className="p-1 hover:bg-white/10 rounded">
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Analyze Button */}
          <div className="text-center">
            <Button 
              onClick={analyzeTrade}
              disabled={team1Offers.length === 0 && team2Offers.length === 0}
              className="bg-gradient-to-r from-neon-volt to-neon-blue text-black font-bold px-12 py-6 text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Analyze Trade
            </Button>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <Card className="glass-panel border-neon-volt/30 overflow-hidden animate-slide-up">
              <CardHeader className="bg-gradient-to-r from-neon-volt/20 to-transparent border-b border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading font-bold text-xl uppercase flex items-center gap-2">
                    <Scale className="w-5 h-5 text-neon-volt" />
                    Trade Analysis
                  </CardTitle>
                  <div className={`w-12 h-12 rounded-xl ${getGradeColor(analysis.grade)} flex items-center justify-center font-heading font-black text-2xl text-white`}>
                    {analysis.grade}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Team 1 Value */}
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-white/50 text-sm mb-1">{team1?.name} Gives</div>
                    <div className="font-heading font-black text-3xl" style={{ color: team1?.color }}>
                      {analysis.team1Value}
                    </div>
                    <div className="text-white/40 text-xs">Trade Value</div>
                  </div>
                  
                  {/* Verdict */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                    <div className="text-3xl mb-2">
                      {analysis.winner === null ? '⚖️' : analysis.winner === 1 ? '🏆' : '🏆'}
                    </div>
                    <div className="font-heading font-bold text-xl text-white">{analysis.verdict}</div>
                    {analysis.winner && (
                      <div className="text-neon-volt text-sm mt-1">
                        {analysis.winner === 1 ? team1?.name : team2?.name} wins by {analysis.difference} pts
                      </div>
                    )}
                  </div>
                  
                  {/* Team 2 Value */}
                  <div className="text-center p-4 rounded-xl bg-white/5">
                    <div className="text-white/50 text-sm mb-1">{team2?.name} Gives</div>
                    <div className="font-heading font-black text-3xl" style={{ color: team2?.color }}>
                      {analysis.team2Value}
                    </div>
                    <div className="text-white/40 text-xs">Trade Value</div>
                  </div>
                </div>

                {/* Value Bar */}
                <div className="mt-6">
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${(analysis.team1Value / (analysis.team1Value + analysis.team2Value)) * 100}%`,
                        backgroundColor: team1?.color
                      }}
                    />
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${(analysis.team2Value / (analysis.team1Value + analysis.team2Value)) * 100}%`,
                        backgroundColor: team2?.color
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>{team1?.abbreviation}: {((analysis.team1Value / (analysis.team1Value + analysis.team2Value)) * 100).toFixed(0)}%</span>
                    <span>{team2?.abbreviation}: {((analysis.team2Value / (analysis.team1Value + analysis.team2Value)) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Team Needs */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-white/50 text-xs mb-2">{team1?.name} Needs After Trade:</div>
                    <div className="flex gap-2">
                      {analysis.team1Needs.length > 0 ? analysis.team1Needs.map(pos => (
                        <Badge key={pos} className="bg-orange-500/20 text-orange-400">{pos}</Badge>
                      )) : <Badge className="bg-green-500/20 text-green-400">Roster Complete</Badge>}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-white/50 text-xs mb-2">{team2?.name} Needs After Trade:</div>
                    <div className="flex gap-2">
                      {analysis.team2Needs.length > 0 ? analysis.team2Needs.map(pos => (
                        <Badge key={pos} className="bg-orange-500/20 text-orange-400">{pos}</Badge>
                      )) : <Badge className="bg-green-500/20 text-green-400">Roster Complete</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.5s ease-out; }
      `}</style>
    </div>
  );
};

export default TradeMachine;
