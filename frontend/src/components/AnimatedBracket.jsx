import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Zap } from 'lucide-react';
import { TeamLogoAvatar, TEAM_COLORS } from '../lib/teamLogos';

const AnimatedBracket = ({ playoffSeeds, games, logoMap }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [animatedTeams, setAnimatedTeams] = useState(new Set());
  
  // Get team colors for helmet tint
  const getTeamColor = (teamName) => {
    return TEAM_COLORS[teamName]?.primary || '#3b82f6';
  };

  const rounds = [
    { name: 'Play-Ins', week: 9, duration: 0.8 },
    { name: 'Divisional', week: 10, duration: 1 },
    { name: 'Conference Championship', week: 11, duration: 1.2 },
    { name: 'Championship', week: 12, duration: 1.5 }
  ];

  const startAnimation = () => {
    setIsAnimating(true);
    setAnimatedTeams(new Set());
    setCurrentRound(0);
    animateRounds();
  };

  const animateRounds = async () => {
    for (let i = 0; i < rounds.length; i++) {
      setCurrentRound(i);
      await new Promise(resolve => setTimeout(resolve, rounds[i].duration * 1000 + 500));
      setAnimatedTeams(prev => new Set([...prev, rounds[i].week]));
    }
    setIsAnimating(false);
  };

  const resetAnimation = () => {
    setAnimatedTeams(new Set());
    setCurrentRound(0);
    setIsAnimating(false);
  };

  // 3D Helmet Animation Card
  const AnimatedTeamCard = ({ team, seed, isWinner, roundIndex }) => {
    const shouldAnimate = isAnimating && currentRound >= roundIndex;
    const teamColor = getTeamColor(team);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20, rotateY: 90 }}
        animate={
          shouldAnimate
            ? {
                opacity: 1,
                y: 0,
                rotateY: 0,
                scale: isWinner ? 1.05 : 1,
                transition: { duration: 0.6, delay: 0.1 }
              }
            : { opacity: 0.6, y: 0, rotateY: 0 }
        }
        className={`bg-gradient-to-br rounded-xl overflow-hidden border-2 transition-all ${
          isWinner
            ? 'border-yellow-500 from-yellow-500/20 to-orange-500/20 shadow-lg shadow-yellow-500/50'
            : 'border-gray-600/50 from-white/5 to-white/10 hover:border-gray-500'
        }`}
        style={{ perspective: 1000 }}
      >
        {/* 3D Helmet Container */}
        <motion.div
          className="relative p-4"
          style={{ perspective: 1200 }}
        >
          <div className="flex flex-col items-center gap-3 mb-2">
            {/* 3D Helmet SVG */}
            <motion.div
              animate={shouldAnimate && isWinner ? { 
                rotateY: [0, 30, -30, 0],
                rotateX: [0, 10, -10, 0]
              } : {}}
              transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
              className="w-16 h-16 flex items-center justify-center"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: `drop-shadow(0 0 10px ${teamColor}80)` }}>
                {/* Helmet outer shell */}
                <defs>
                  <filter id={`helmet-glow-${team}`}>
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id={`helmet-gradient-${team}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: teamColor, stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: teamColor, stopOpacity: 0.6}} />
                  </linearGradient>
                </defs>
                
                {/* Main helmet shape */}
                <path
                  d="M 30 35 Q 30 15 50 15 Q 70 15 70 35 L 70 55 Q 70 65 60 70 L 40 70 Q 30 65 30 55 Z"
                  fill={`url(#helmet-gradient-${team})`}
                  filter={`url(#helmet-glow-${team})`}
                />
                
                {/* Helmet shine/reflection */}
                <ellipse cx="45" cy="30" rx="8" ry="10" fill="white" opacity="0.3"/>
                
                {/* Face mask (cage) */}
                <g stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none">
                  <line x1="40" y1="45" x2="40" y2="62"/>
                  <line x1="50" y1="45" x2="50" y2="62"/>
                  <line x1="60" y1="45" x2="60" y2="62"/>
                  <line x1="38" y1="50" x2="62" y2="50"/>
                  <line x1="38" y1="55" x2="62" y2="55"/>
                  <line x1="38" y1="60" x2="62" y2="60"/>
                </g>
                
                {/* Chin strap */}
                <path
                  d="M 35 68 Q 50 75 65 68"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </motion.div>

            {/* Seed Badge */}
            {seed && (
              <motion.div
                animate={shouldAnimate ? { scale: [1, 1.2, 1] } : {}}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  seed === 1
                    ? 'bg-yellow-500 text-black'
                    : seed === 2
                    ? 'bg-gray-400 text-black'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {seed}
              </motion.div>
            )}
          </div>
          
          <div className="text-sm font-bold text-white text-center truncate">{team}</div>
        </motion.div>

        {/* Winner Badge */}
        {isWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={shouldAnimate ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Win
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Animated connector line
  const AnimatedLine = ({ isActive, roundIndex }) => {
    return (
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={
          isAnimating && currentRound >= roundIndex
            ? { scaleX: 1, opacity: 1 }
            : { scaleX: 0, opacity: 0 }
        }
        transition={{ duration: 0.5, delay: 0.3 }}
        className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-transparent"
      />
    );
  };

  // Round Container
  const RoundContainer = ({ roundIndex, roundName, gamesList }) => {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="space-y-4"
      >
        <motion.h3
          animate={
            isAnimating && currentRound === roundIndex
              ? { scale: 1.1, color: '#fbbf24' }
              : { scale: 1, color: '#9ca3af' }
          }
          className="text-lg font-bold text-gray-400 flex items-center gap-2"
        >
          {roundName}
          {isAnimating && currentRound === roundIndex && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block"
            >
              ⚡
            </motion.span>
          )}
        </motion.h3>

        <div className="space-y-6">
          {gamesList.map((game, gameIdx) => {
            const homeWin = game.home_score > game.away_score;
            const awayWin = game.away_score > game.home_score;

            return (
              <motion.div
                key={gameIdx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="space-y-2"
              >
                <AnimatedTeamCard
                  team={game.home_team}
                  isWinner={homeWin}
                  roundIndex={roundIndex}
                />

                {/* Score Display */}
                <motion.div
                  animate={
                    isAnimating && currentRound >= roundIndex
                      ? { scale: 1, opacity: 1 }
                      : { scale: 0.5, opacity: 0 }
                  }
                  className="flex items-center justify-center py-2"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {game.home_score} - {game.away_score}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {game.game_date
                        ? new Date(game.game_date).toLocaleDateString()
                        : 'TBD'}
                    </div>
                  </div>
                </motion.div>

                <AnimatedTeamCard
                  team={game.away_team}
                  isWinner={awayWin}
                  roundIndex={roundIndex}
                />

                {/* Connector Line */}
                <div className="flex justify-center pt-2">
                  <AnimatedLine isActive={true} roundIndex={roundIndex} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // Get games by week
  const getGamesByWeek = (week) => {
    return games.filter(g => g.week === week && g.home_score !== undefined);
  };

  return (
    <div className="w-full space-y-8">
      {/* Animation Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 justify-center items-center flex-wrap"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startAnimation}
          disabled={isAnimating}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
        >
          <Play className="w-5 h-5" />
          {isAnimating ? 'Animating...' : 'Play Animation'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetAnimation}
          disabled={isAnimating}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </motion.button>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          {rounds.map((round, idx) => (
            <motion.div
              key={idx}
              animate={{
                backgroundColor:
                  currentRound === idx
                    ? '#fbbf24'
                    : animatedTeams.has(round.week)
                    ? '#10b981'
                    : '#4b5563',
                scale: currentRound === idx ? 1.2 : 1
              }}
              className="w-3 h-3 rounded-full"
              title={round.name}
            />
          ))}
        </div>
      </motion.div>

      {/* Animated Bracket Rounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {rounds.map((round, roundIndex) => (
          <RoundContainer
            key={roundIndex}
            roundIndex={roundIndex}
            roundName={round.name}
            gamesList={getGamesByWeek(round.week)}
          />
        ))}
      </div>

      {/* Championship Highlight */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto"
      >
        <motion.div
          animate={
            animatedTeams.has(12)
              ? {
                  boxShadow: [
                    '0 0 0px rgba(251, 191, 36, 0)',
                    '0 0 30px rgba(251, 191, 36, 0.8)',
                    '0 0 0px rgba(251, 191, 36, 0)'
                  ]
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
          className="rounded-3xl bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 shadow-2xl p-1"
        >
          <div className="bg-gray-900 rounded-3xl p-8 text-center">
            <motion.div
              animate={
                animatedTeams.has(12)
                  ? { rotate: [0, 360], scale: [1, 1.1, 1] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              🏆
            </motion.div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
              UNITED FLAG BOWL
            </h2>
            <p className="text-gray-300 text-lg">Champion Crowned</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Animation Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-gray-400 text-sm"
      >
        <p>👆 Click "Play Animation" to watch teams advance through the bracket with 3D effects</p>
      </motion.div>
    </div>
  );
};

export default AnimatedBracket;
