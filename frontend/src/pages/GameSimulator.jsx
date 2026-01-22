import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Pause, SkipForward, RefreshCw, Trophy, Zap, Target, Flag, Timer, Volume2, VolumeX, Flame, Snowflake, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import TeamLogo from '../components/TeamLogo';

import API from '../lib/api';

const playTypes = [
  { type: 'pass_short', text: '{qb} throws short to {wr}', yards: [3, 12], success: 0.7 },
  { type: 'pass_medium', text: '{qb} finds {wr} over the middle', yards: [10, 25], success: 0.55 },
  { type: 'pass_deep', text: '{qb} launches deep to {wr}', yards: [25, 60], success: 0.35 },
  { type: 'run_inside', text: '{rb} runs up the middle', yards: [1, 8], success: 0.65 },
  { type: 'run_outside', text: '{rb} bounces it outside', yards: [2, 15], success: 0.5 },
  { type: 'sack', text: '{def} sacks {qb}!', yards: [-8, -3], success: 0.15 },
  { type: 'interception', text: '{def} picks off {qb}!', yards: [0, 0], success: 0.08 },
  { type: 'touchdown', text: 'TOUCHDOWN! {player} scores!', yards: [0, 0], success: 0.1 },
  { type: 'field_goal', text: 'Field goal attempt...', yards: [0, 0], success: 0.85 },
  { type: 'scramble', text: '{qb} scrambles for yards', yards: [2, 18], success: 0.6 },
];

const GameSimulator = () => {
  const [teams, setTeams] = useState([]);
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);
  const [gameState, setGameState] = useState({
    quarter: 1,
    time: '8:00',
    score1: 0,
    score2: 0,
    possession: 1,
    down: 1,
    yardsToGo: 10,
    ballPosition: 25,
    plays: [],
    isRunning: false,
    gameOver: false,
    momentum: 50, // 0-100, 50 is neutral
    conversionAttempts: 0, // Track 2-point conversion attempts (max 2)
    inOvertime: false,
    overtimeQuarter: 0,
  });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get(`${API}/teams`);
        setTeams(res.data);
        if (res.data.length >= 2) {
          setTeam1(res.data[0]);
          setTeam2(res.data[1]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTeams();
  }, []);

  const generatePlay = () => {
    if (!team1 || !team2) return null;
    const offenseTeam = gameState.possession === 1 ? team1 : team2;
    const defenseTeam = gameState.possession === 1 ? team2 : team1;
    
    // Weight play selection based on situation
    let playPool = [...playTypes];
    if (gameState.down === 4) {
      // 4th down - punt or go for it
      if (gameState.yardsToGo <= 2) {
        playPool = playPool.filter(p => !['pass_deep', 'sack', 'interception'].includes(p.type));
      } else {
        // Punt (simplified as turnover)
        return {
          type: 'punt',
          text: `${offenseTeam?.name || 'Team'} punts the ball`,
          yards: 0,
          turnover: true,
          newPosition: 100 - gameState.ballPosition - 40,
        };
      }
    }
    
    // Random play selection
    const rand = Math.random();
    let play;
    if (rand < 0.08) play = playTypes.find(p => p.type === 'interception');
    else if (rand < 0.12) play = playTypes.find(p => p.type === 'sack');
    else if (rand < 0.35) play = playTypes.filter(p => p.type.includes('run'))[Math.floor(Math.random() * 2)];
    else play = playTypes.filter(p => p.type.includes('pass'))[Math.floor(Math.random() * 3)];

    const success = Math.random() < play.success;
    let yards = success ? Math.floor(Math.random() * (play.yards[1] - play.yards[0])) + play.yards[0] : Math.floor(Math.random() * 3) - 1;
    
    // Check for touchdown
    const newPosition = gameState.ballPosition + (yards || 0);
    let touchdown = false;
    let fieldGoal = false;
    
    if (newPosition >= 100) {
      touchdown = true;
      yards = 100 - gameState.ballPosition;
    }
    
    // Generate play text
    let text = play.text
      .replace('{qb}', `${offenseTeam?.abbreviation || 'OFF'} QB`)
      .replace('{wr}', `${offenseTeam?.abbreviation || 'OFF'} WR`)
      .replace('{rb}', `${offenseTeam?.abbreviation || 'OFF'} RB`)
      .replace('{def}', `${defenseTeam?.abbreviation || 'DEF'} DEF`)
      .replace('{player}', `${offenseTeam?.abbreviation || 'OFF'}`);

    if (success && !touchdown && !['sack', 'interception'].includes(play.type)) {
      text += ` for ${yards} yards!`;
    } else if (!success && !['sack', 'interception'].includes(play.type)) {
      text += ` - incomplete!`;
      yards = 0;
    }

    return {
      type: play.type,
      text,
      yards,
      success,
      touchdown,
      turnover: play.type === 'interception',
    };
  };

  const simulatePlay = () => {
    if (gameState.gameOver || !team1 || !team2) return;

    const play = generatePlay();
    if (!play) return;
    
    const newBallPosition = Math.max(0, Math.min(100, gameState.ballPosition + (play.yards || 0)));
    
    let newState = { ...gameState };
    let playText = play.text;
    
    if (play.touchdown) {
      // Touchdown! - Flag Football: Can attempt 2-point conversion (max 2 times)
      const baseScore = 6; // Touchdown is 6 points
      let conversionPoints = 0;
      
      // Attempt 2-point conversion if under limit (50% success rate)
      if (newState.conversionAttempts < 2 && Math.random() < 0.5) {
        conversionPoints = 2;
        newState.conversionAttempts += 1;
        playText += ' + 2-point conversion good!';
      } else if (newState.conversionAttempts < 2) {
        // Failed conversion attempt still counts
        newState.conversionAttempts += 1;
        playText += ' (2-point conversion failed)';
      }
      
      if (gameState.possession === 1) {
        newState.score1 += baseScore + conversionPoints;
      } else {
        newState.score2 += baseScore + conversionPoints;
      }
      
      newState.ballPosition = 25;
      newState.possession = gameState.possession === 1 ? 2 : 1;
      newState.down = 1;
      newState.yardsToGo = 10;
      newState.momentum = gameState.possession === 1 ? Math.min(100, gameState.momentum + 15) : Math.max(0, gameState.momentum - 15);
    } else if (play.turnover) {
      // Turnover
      newState.possession = gameState.possession === 1 ? 2 : 1;
      newState.ballPosition = 100 - newBallPosition;
      newState.down = 1;
      newState.yardsToGo = 10;
      newState.momentum = gameState.possession === 1 ? Math.max(0, gameState.momentum - 20) : Math.min(100, gameState.momentum + 20);
    } else {
      // Normal play - Flag Football Rules
      newState.ballPosition = newBallPosition;
      
      // Flag Football: Middle of field (50 yard line) = automatic first down
      if (gameState.ballPosition < 50 && newBallPosition >= 50) {
        // Crossed midfield - automatic first down
        newState.ballPosition = 50;
        newState.down = 1;
        newState.yardsToGo = 10;
        playText += ' - First down at midfield!';
      } else {
        const newYardsToGo = gameState.yardsToGo - play.yards;
        
        if (newYardsToGo <= 0) {
          // First down!
          newState.down = 1;
          newState.yardsToGo = 10;
        } else if (gameState.down >= 4) {
          // Turnover on downs
          newState.possession = gameState.possession === 1 ? 2 : 1;
          newState.ballPosition = 100 - newBallPosition;
          newState.down = 1;
          newState.yardsToGo = 10;
        } else {
          newState.down = gameState.down + 1;
          newState.yardsToGo = newYardsToGo;
        }
      }
    }

    // Update time - Flag Football: 8 min quarters, 2 min overtime
    const [mins, secs] = gameState.time.split(':').map(Number);
    let newMins = mins;
    let newSecs = secs - Math.floor(Math.random() * 20 + 10); // 10-30 seconds per play
    
    if (newSecs < 0) {
      newMins -= 1;
      newSecs += 60;
    }
    
    if (newMins < 0) {
      if (newState.inOvertime) {
        // Overtime: 2 minute quarters, max 3 overtime quarters
        if (newState.overtimeQuarter < 3) {
          newState.overtimeQuarter += 1;
          newMins = 2;
          newSecs = 0;
        } else {
          // Game ends after 3 overtime quarters (or if someone is ahead)
          if (newState.score1 !== newState.score2) {
            newState.gameOver = true;
            newState.isRunning = false;
          } else {
            // Still tied after 3 OTs - game ends
            newState.gameOver = true;
            newState.isRunning = false;
          }
        }
      } else if (newState.quarter < 2) {
        // Regular game: 2 quarters of 8 minutes
        newState.quarter += 1;
        newMins = 8;
        newSecs = 0;
      } else {
        // End of regulation (Q2) - check for tie
        if (newState.score1 === newState.score2) {
          // Tie game - go to overtime
          newState.inOvertime = true;
          newState.overtimeQuarter = 1;
          newMins = 2;
          newSecs = 0;
        } else {
          // Game over - someone won
          newState.gameOver = true;
          newState.isRunning = false;
        }
      }
    }
    
    newState.time = `${newMins}:${newSecs.toString().padStart(2, '0')}`;
    
    // Add play to history with updated text (use current quarter/time before updates)
    const currentQuarterDisplay = gameState.inOvertime ? `OT${gameState.overtimeQuarter}` : `Q${gameState.quarter}`;
    const playWithText = { ...play, text: playText, time: gameState.time, quarter: currentQuarterDisplay };
    newState.plays = [playWithText, ...gameState.plays].slice(0, 100); // Keep more plays for scrolling
    
    setGameState(newState);
  };

  const startGame = () => {
    setGameState(prev => ({ ...prev, isRunning: true }));
    intervalRef.current = setInterval(simulatePlay, 2000 / speed);
  };

  const pauseGame = () => {
    setGameState(prev => ({ ...prev, isRunning: false }));
    clearInterval(intervalRef.current);
  };

  const resetGame = () => {
    clearInterval(intervalRef.current);
    setGameState({
      quarter: 1,
      time: '8:00',
      score1: 0,
      score2: 0,
      possession: 1,
      down: 1,
      yardsToGo: 10,
      ballPosition: 25,
      plays: [],
      isRunning: false,
      gameOver: false,
      momentum: 50,
      conversionAttempts: 0,
      inOvertime: false,
      overtimeQuarter: 0,
    });
  };

  const skipPlay = () => {
    simulatePlay();
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (gameState.isRunning) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(simulatePlay, 2000 / speed);
    }
  }, [speed]);

  const getMomentumColor = () => {
    if (gameState.momentum > 65) return team1?.color || '#3B82F6';
    if (gameState.momentum < 35) return team2?.color || '#EF4444';
    return '#6B7280';
  };

  const getPlayIcon = (type) => {
    if (type === 'touchdown') return <Trophy className="w-4 h-4 text-yellow-400" />;
    if (type === 'interception') return <Target className="w-4 h-4 text-red-400" />;
    if (type === 'sack') return <Zap className="w-4 h-4 text-orange-400" />;
    if (type?.includes('pass')) return <Wind className="w-4 h-4 text-blue-400" />;
    if (type?.includes('run')) return <Flame className="w-4 h-4 text-green-400" />;
    return <Flag className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div data-testid="simulator-page" className="min-h-screen">
      {/* Header */}
      <div className="hero-bg px-6 md:px-12 pt-8 pb-12">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Play className="w-6 h-6 text-neon-volt" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Live Simulation</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tight">
            <span className="text-white">GAME</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-volt to-neon-blue">SIMULATOR</span>
          </h1>
          <p className="text-white/50 mt-3">Watch AI-powered games unfold in real-time</p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 -mt-8">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Team Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Home Team</label>
              <Select 
                value={team1?.id || ''} 
                onValueChange={(value) => setTeam1(teams.find(t => t.id === value))}
                disabled={gameState.isRunning}
              >
                <SelectTrigger className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-heading hover:bg-white/10">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-white/10 text-white">
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id} className="hover:bg-white/10 focus:bg-white/10">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Away Team</label>
              <Select 
                value={team2?.id || ''} 
                onValueChange={(value) => setTeam2(teams.find(t => t.id === value))}
                disabled={gameState.isRunning}
              >
                <SelectTrigger className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-heading hover:bg-white/10">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-white/10 text-white">
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id} className="hover:bg-white/10 focus:bg-white/10">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scoreboard */}
          <Card className="glass-panel border-white/10 overflow-hidden">
            <div className="bg-gradient-to-r from-black via-[#111] to-black p-6">
              <div className="flex items-center justify-between">
                {/* Team 1 */}
                <div className="flex items-center gap-4">
                  {team1 ? (
                    <>
                      <TeamLogo team={team1} size="xl" />
                      <div>
                        <div className="font-heading font-bold text-xl text-white">{team1.name || 'Team 1'}</div>
                        <div className="text-white/50 text-sm">{team1.wins || 0}-{team1.losses || 0}</div>
                      </div>
                      <div className="font-heading font-black text-6xl text-white ml-4" style={{ textShadow: `0 0 30px ${team1.color || '#3B82F6'}50` }}>
                        {gameState.score1}
                      </div>
                    </>
                  ) : (
                    <div className="text-white/50">Select Team 1</div>
                  )}
                </div>

                {/* Game Info */}
                <div className="text-center">
                  <div className="text-3xl font-heading font-bold text-white mb-1">{gameState.time}</div>
                  <Badge className={`${gameState.gameOver ? 'bg-red-500' : gameState.inOvertime ? 'bg-orange-500' : 'bg-neon-volt'} text-black font-bold`}>
                    {gameState.gameOver ? 'FINAL' : gameState.inOvertime ? `OT${gameState.overtimeQuarter}` : `Q${gameState.quarter}`}
                  </Badge>
                  <div className="text-white/40 text-xs mt-2">
                    {gameState.down && !gameState.gameOver && `${gameState.down}${['st','nd','rd','th'][gameState.down-1] || 'th'} & ${gameState.yardsToGo}`}
                  </div>
                  {gameState.conversionAttempts > 0 && (
                    <div className="text-white/40 text-xs mt-1">
                      Conversions: {gameState.conversionAttempts}/2
                    </div>
                  )}
                </div>

                {/* Team 2 */}
                <div className="flex items-center gap-4">
                  {team2 ? (
                    <>
                      <div className="font-heading font-black text-6xl text-white mr-4" style={{ textShadow: `0 0 30px ${team2.color || '#EF4444'}50` }}>
                        {gameState.score2}
                      </div>
                      <div className="text-right">
                        <div className="font-heading font-bold text-xl text-white">{team2.name || 'Team 2'}</div>
                        <div className="text-white/50 text-sm">{team2.wins || 0}-{team2.losses || 0}</div>
                      </div>
                      <TeamLogo team={team2} size="xl" />
                    </>
                  ) : (
                    <div className="text-white/50">Select Team 2</div>
                  )}
                </div>
              </div>

              {/* Field Visualization */}
              <div className="mt-6 relative">
                <div className="h-8 bg-green-900/50 rounded-lg overflow-hidden relative">
                  {/* Yard lines */}
                  {[10,20,30,40,50,60,70,80,90].map(yard => (
                    <div 
                      key={yard} 
                      className="absolute top-0 bottom-0 w-px bg-white/20"
                      style={{ left: `${yard}%` }}
                    />
                  ))}
                  {/* End zones */}
                  {team1 && <div className="absolute left-0 top-0 bottom-0 w-[10%] bg-blue-600/30" style={{ backgroundColor: `${team1.color || '#3B82F6'}30` }} />}
                  {team2 && <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-red-600/30" style={{ backgroundColor: `${team2.color || '#EF4444'}30` }} />}
                  {/* Ball marker */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-yellow-500 shadow-lg transition-all duration-500"
                    style={{ left: `calc(${gameState.ballPosition}% - 8px)` }}
                  >
                    <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-50" />
                  </div>
                  {/* Possession indicator */}
                  <div 
                    className="absolute top-0 h-1 transition-all duration-300"
                    style={{ 
                      left: gameState.possession === 1 ? '0' : '50%',
                      width: '50%',
                      backgroundColor: gameState.possession === 1 ? (team1?.color || '#3B82F6') : (team2?.color || '#EF4444') 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/30 mt-1 px-2">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {/* Momentum Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>{team1?.abbreviation || 'Team 1'} Momentum</span>
                  <span>{team2?.abbreviation} Momentum</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500 rounded-full"
                    style={{ 
                      width: `${gameState.momentum}%`,
                      backgroundColor: getMomentumColor(),
                      boxShadow: `0 0 10px ${getMomentumColor()}`
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button 
              onClick={resetGame}
              variant="outline"
              className="border-white/20"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </Button>
            
            {!gameState.isRunning ? (
              <Button 
                onClick={startGame}
                className="bg-neon-volt text-black font-bold px-8"
                disabled={gameState.gameOver || !team1 || !team2}
              >
                <Play className="w-4 h-4 mr-2" /> {gameState.gameOver ? 'Game Over' : 'Start'}
              </Button>
            ) : (
              <Button 
                onClick={pauseGame}
                className="bg-orange-500 text-white font-bold px-8"
              >
                <Pause className="w-4 h-4 mr-2" /> Pause
              </Button>
            )}
            
            <Button 
              onClick={skipPlay}
              variant="outline"
              className="border-white/20"
              disabled={gameState.isRunning || gameState.gameOver}
            >
              <SkipForward className="w-4 h-4 mr-2" /> Next Play
            </Button>

            <div className="flex items-center gap-2 ml-4">
              <span className="text-white/50 text-sm">Speed:</span>
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                    speed === s ? 'bg-neon-volt text-black' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Play-by-Play */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="font-heading font-bold text-lg uppercase flex items-center gap-2">
                <Timer className="w-5 h-5 text-neon-volt" />
                Play-by-Play
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto overscroll-contain">
                {gameState.plays.length === 0 ? (
                  <div className="p-8 text-center text-white/40">
                    Press Start to begin the simulation
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {gameState.plays.map((play, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 flex items-start gap-3 ${idx === 0 ? 'bg-white/5' : ''}`}
                        style={{ animation: idx === 0 ? 'slideIn 0.3s ease-out' : 'none' }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          {getPlayIcon(play.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${play.touchdown ? 'text-yellow-400' : play.turnover ? 'text-red-400' : 'text-white'}`}>
                            {play.text}
                          </div>
                          <div className="text-white/40 text-xs mt-1">
                            {typeof play.quarter === 'string' ? play.quarter : `Q${play.quarter}`} · {play.time}
                          </div>
                        </div>
                        {play.yards !== undefined && play.yards !== 0 && (
                          <Badge className={play.yards > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                            {play.yards > 0 ? '+' : ''}{play.yards} YDS
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default GameSimulator;
