import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Trophy, ChevronRight, Award } from 'lucide-react';
import { TeamLogoAvatar, loadTeamLogos, loadTeamColors, getTeamColors } from '../lib/teamLogos';
import '../styles/schedule-cards.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

// 3D Card Component with animations
const GameCard = ({ game, logoMap, colorMap, navigate, delay }) => {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [light, setLight] = useState({ x: 50, y: 50 });
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrameId;
    
    const animate = () => {
      const current = currentRef.current;
      const target = targetRef.current;
      
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      
      const bend = Math.sin(current.x * Math.PI / 180) * 5;
      
      if (cardRef.current) {
        cardRef.current.style.transform = 
          `rotateX(${current.x}deg) rotateY(${current.y}deg) rotateX(${bend}deg)`;
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    targetRef.current = {
      x: ((y - cy) / cy) * 10,
      y: ((x - cx) / cx) * -10
    };

    setLight({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });

    // Magnetic effect for elements
    const magnets = cardRef.current.querySelectorAll('.magnet');
    magnets.forEach(m => {
      const r = m.getBoundingClientRect();
      const dx = r.left + r.width / 2 - e.clientX;
      const dy = r.top + r.height / 2 - e.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const strength = Math.min(20, 150 / dist);
      m.style.transform = `translate(${dx / dist * strength}px, ${dy / dist * strength}px)`;
    });
  };

  const handleMouseLeave = () => {
    targetRef.current = { x: 0, y: 0 };
    
    if (cardRef.current) {
      const magnets = cardRef.current.querySelectorAll('.magnet');
      magnets.forEach(m => {
        m.style.transform = 'translate(0, 0)';
      });
    }
  };

  return (
    <div 
      className="perspective-container"
      style={{ 
        animationDelay: `${delay}s`,
        perspective: '1600px'
      }}
    >
      <div
        ref={cardRef}
        className="game-card-3d"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => navigate(`/week/${game.week}`)}
        style={{
          '--light-x': `${light.x}%`,
          '--light-y': `${light.y}%`
        }}
      >
        {/* Light streak effect */}
        <div className="light-streak" />

        {/* Top Section - Teams and Scores */}
        <div className="card-top layer-mid">
          {/* Away Team */}
          <div className="team-section magnet">
            <TeamLogoAvatar 
              teamName={game.away_team} 
              logoMap={logoMap} 
              colorMap={colorMap} 
              size="lg" 
            />
            <div className="score-block">
              <div className="score">{game.away_score}</div>
              <div className="team-abbr">{game.away_team.substring(0, 3).toUpperCase()}</div>
            </div>
          </div>

          {/* Center - POTG */}
          {game.player_of_game && (
            <div className="potg-section layer-deep magnet">
              <div className="potg-label">POTG</div>
              <div className="potg-name">{game.player_of_game}</div>
            </div>
          )}

          {/* Home Team */}
          <div className="team-section magnet">
            <div className="score-block">
              <div className="score">{game.home_score}</div>
              <div className="team-abbr">{game.home_team.substring(0, 3).toUpperCase()}</div>
            </div>
            <TeamLogoAvatar 
              teamName={game.home_team} 
              logoMap={logoMap} 
              colorMap={colorMap} 
              size="lg" 
            />
          </div>
        </div>

        {/* Bottom Section - Player Stats */}
        <div className="card-bottom layer-shallow">
          {/* Away QB Stats */}
          {game.away_stats && Object.keys(game.away_stats).length > 0 && (
            <div className="player-stats magnet">
              <TeamLogoAvatar 
                teamName={game.away_team} 
                logoMap={logoMap} 
                colorMap={colorMap} 
                size="sm" 
              />
              <div className="player-name">{Object.keys(game.away_stats)[0]}</div>
              {Object.values(game.away_stats)[0] && typeof Object.values(game.away_stats)[0] === 'object' && (
                <>
                  <div className="stat-line">
                    {Object.values(game.away_stats)[0].Completions || 0}–{Object.values(game.away_stats)[0].Attempts || 0}
                  </div>
                  <div className="stat-line">{Object.values(game.away_stats)[0].Yards || 0} YDS</div>
                  <div className="stat-line">
                    {Object.values(game.away_stats)[0].Touchdowns || 0} TD, {Object.values(game.away_stats)[0].Interceptions || 0} INT
                  </div>
                </>
              )}
            </div>
          )}

          {/* Home QB Stats */}
          {game.home_stats && Object.keys(game.home_stats).length > 0 && (
            <div className="player-stats magnet">
              <TeamLogoAvatar 
                teamName={game.home_team} 
                logoMap={logoMap} 
                colorMap={colorMap} 
                size="sm" 
              />
              <div className="player-name">{Object.keys(game.home_stats)[0]}</div>
              {Object.values(game.home_stats)[0] && typeof Object.values(game.home_stats)[0] === 'object' && (
                <>
                  <div className="stat-line">
                    {Object.values(game.home_stats)[0].Completions || 0}–{Object.values(game.home_stats)[0].Attempts || 0}
                  </div>
                  <div className="stat-line">{Object.values(game.home_stats)[0].Yards || 0} YDS</div>
                  <div className="stat-line">
                    {Object.values(game.home_stats)[0].Touchdowns || 0} TD, {Object.values(game.home_stats)[0].Interceptions || 0} INT
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Schedule = () => {
  const [games, setGames] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoMap, setLogoMap] = useState({});
  const [colorMap, setColorMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    loadTeamLogos().then(logos => setLogoMap(logos));
    loadTeamColors().then(colors => setColorMap(colors));
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, weeksRes] = await Promise.all([
        axios.get(`${API}/games`),
        axios.get(`${API}/weeks`)
      ]);
      const gamesData = gamesRes.data || [];
      const weeksData = weeksRes.data?.weeks || [];
      setGames(Array.isArray(gamesData) ? gamesData : []);
      setWeeks(Array.isArray(weeksData) ? weeksData : []);
      if (weeksData.length > 0) {
        setSelectedWeek(weeksData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setGames([]);
      setWeeks([]);
    } finally {
      setLoading(false);
    }
  };

  const getGamesForWeek = (week) => {
    if (!games || !Array.isArray(games)) return [];
    return games.filter(g => g && g.week === week);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-2">Season Schedule</h1>
        <p className="text-gray-400">Browse games by week</p>
      </div>

      {/* Week Selector */}
      <div className="glass-card mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center space-x-3 overflow-x-auto pb-2">
          {weeks.map(week => (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              data-testid={`week-selector-${week}`}
              className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedWeek === week
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white glow-emerald'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              Week {week}
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      {selectedWeek && (
        <div className="space-y-6">
          {getGamesForWeek(selectedWeek).map((game, idx) => (
            <GameCard
              key={game.id}
              game={game}
              logoMap={logoMap}
              colorMap={colorMap}
              navigate={navigate}
              delay={0.2 + idx * 0.1}
            />
          ))}

          {getGamesForWeek(selectedWeek).length === 0 && (
            <div className="glass-card text-center py-12">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No games scheduled for Week {selectedWeek}</p>
            </div>
          )}
        </div>
      )}

      {weeks.length === 0 && (
        <div className="glass-card text-center py-12">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No games scheduled yet</p>
        </div>
      )}
    </div>
  );
};

export default Schedule;