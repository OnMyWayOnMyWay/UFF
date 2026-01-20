from fastapi import FastAPI, APIRouter, HTTPException, Header, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_KEY = os.environ.get('ADMIN_KEY', 'BacconIsCool1@')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    position: str
    team: str
    team_id: str
    avatar: str = ""
    stats: dict = {}
    is_elite: bool = False
    injury_status: Optional[str] = None
    bye_week: int = 0

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    abbreviation: str
    conference: str
    logo: str = ""
    color: str = "#007AFF"
    wins: int = 0
    losses: int = 0
    points_for: float = 0
    points_against: float = 0
    seed: Optional[int] = None
    playoff_status: Optional[str] = None  # x, y, z or None

class Trade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    team1_id: str
    team2_id: str
    team1_receives: List[str]
    team2_receives: List[str]
    status: str = "completed"

class WatchlistItem(BaseModel):
    player_id: str

# Mock Data - Enhanced
TEAMS = [
    # Grand Central Conference
    {"id": "gc1", "name": "Thunder Hawks", "abbreviation": "THK", "conference": "Grand Central", "color": "#FF6B35", "wins": 10, "losses": 3, "points_for": 1842.5, "points_against": 1523.2, "seed": 1, "playoff_status": "x"},
    {"id": "gc2", "name": "Steel Titans", "abbreviation": "STT", "conference": "Grand Central", "color": "#4ECDC4", "wins": 9, "losses": 4, "points_for": 1756.8, "points_against": 1612.4, "seed": 3, "playoff_status": "x"},
    {"id": "gc3", "name": "Crimson Wolves", "abbreviation": "CRW", "conference": "Grand Central", "color": "#C41E3A", "wins": 8, "losses": 5, "points_for": 1698.2, "points_against": 1654.1, "seed": 5, "playoff_status": "y"},
    {"id": "gc4", "name": "Night Owls", "abbreviation": "NOW", "conference": "Grand Central", "color": "#2C3E50", "wins": 7, "losses": 6, "points_for": 1621.5, "points_against": 1687.3, "seed": 7, "playoff_status": "z"},
    {"id": "gc5", "name": "Golden Eagles", "abbreviation": "GEA", "conference": "Grand Central", "color": "#F39C12", "wins": 5, "losses": 8, "points_for": 1534.7, "points_against": 1721.8, "seed": 9, "playoff_status": "z"},
    {"id": "gc6", "name": "Storm Chasers", "abbreviation": "STC", "conference": "Grand Central", "color": "#9B59B6", "wins": 4, "losses": 9, "points_for": 1489.2, "points_against": 1798.5, "seed": None, "playoff_status": None},
    # Ridge Conference
    {"id": "rd1", "name": "Mountain Lions", "abbreviation": "MTL", "conference": "Ridge", "color": "#27AE60", "wins": 11, "losses": 2, "points_for": 1923.4, "points_against": 1456.7, "seed": 2, "playoff_status": "x"},
    {"id": "rd2", "name": "Ice Bears", "abbreviation": "ICB", "conference": "Ridge", "color": "#3498DB", "wins": 9, "losses": 4, "points_for": 1812.6, "points_against": 1589.3, "seed": 4, "playoff_status": "x"},
    {"id": "rd3", "name": "Desert Vipers", "abbreviation": "DVP", "conference": "Ridge", "color": "#E67E22", "wins": 8, "losses": 5, "points_for": 1745.8, "points_against": 1634.2, "seed": 6, "playoff_status": "y"},
    {"id": "rd4", "name": "River Sharks", "abbreviation": "RSK", "conference": "Ridge", "color": "#1ABC9C", "wins": 6, "losses": 7, "points_for": 1598.4, "points_against": 1678.9, "seed": 8, "playoff_status": "z"},
    {"id": "rd5", "name": "Canyon Kings", "abbreviation": "CNK", "conference": "Ridge", "color": "#8E44AD", "wins": 5, "losses": 8, "points_for": 1512.3, "points_against": 1745.6, "seed": 10, "playoff_status": "z"},
    {"id": "rd6", "name": "Prairie Wolves", "abbreviation": "PRW", "conference": "Ridge", "color": "#D35400", "wins": 3, "losses": 10, "points_for": 1423.1, "points_against": 1867.4, "seed": None, "playoff_status": None},
]

PLAYERS = [
    # QBs
    {"id": "p1", "name": "Marcus Williams", "position": "QB", "team": "Mountain Lions", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None, "stats": {"passing_yards": 4521, "touchdowns": 38, "interceptions": 8, "completions": 412, "attempts": 589, "rushing_yards": 234, "fantasy_points": 412.5, "avg_points": 31.7}},
    {"id": "p2", "name": "Jake Thompson", "position": "QB", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None, "stats": {"passing_yards": 4234, "touchdowns": 35, "interceptions": 10, "completions": 389, "attempts": 567, "rushing_yards": 156, "fantasy_points": 385.2, "avg_points": 29.6}},
    {"id": "p3", "name": "Ryan Mitchell", "position": "QB", "team": "Steel Titans", "team_id": "gc2", "is_elite": False, "bye_week": 6, "injury_status": "Questionable", "stats": {"passing_yards": 3856, "touchdowns": 29, "interceptions": 12, "completions": 345, "attempts": 512, "rushing_yards": 89, "fantasy_points": 342.8, "avg_points": 26.4}},
    {"id": "p4", "name": "Derek Johnson", "position": "QB", "team": "Ice Bears", "team_id": "rd2", "is_elite": False, "bye_week": 8, "injury_status": None, "stats": {"passing_yards": 3654, "touchdowns": 27, "interceptions": 14, "completions": 312, "attempts": 489, "rushing_yards": 67, "fantasy_points": 318.4, "avg_points": 24.5}},
    {"id": "p19", "name": "Trevor Lance", "position": "QB", "team": "Crimson Wolves", "team_id": "gc3", "is_elite": False, "bye_week": 5, "injury_status": None, "stats": {"passing_yards": 3421, "touchdowns": 24, "interceptions": 11, "completions": 298, "attempts": 456, "rushing_yards": 312, "fantasy_points": 298.6, "avg_points": 23.0}},
    {"id": "p20", "name": "Caleb Murray", "position": "QB", "team": "Desert Vipers", "team_id": "rd3", "is_elite": False, "bye_week": 10, "injury_status": "Out", "stats": {"passing_yards": 3156, "touchdowns": 21, "interceptions": 9, "completions": 278, "attempts": 423, "rushing_yards": 198, "fantasy_points": 276.4, "avg_points": 21.3}},
    # WRs
    {"id": "p5", "name": "Chris Anderson", "position": "WR", "team": "Mountain Lions", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None, "stats": {"receptions": 112, "targets": 156, "receiving_yards": 1654, "touchdowns": 14, "yards_per_catch": 14.8, "fantasy_points": 298.4, "avg_points": 23.0}},
    {"id": "p6", "name": "Mike Davis", "position": "WR", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None, "stats": {"receptions": 98, "targets": 142, "receiving_yards": 1487, "touchdowns": 12, "yards_per_catch": 15.2, "fantasy_points": 267.2, "avg_points": 20.6}},
    {"id": "p7", "name": "Tony Brown", "position": "WR", "team": "Crimson Wolves", "team_id": "gc3", "is_elite": False, "bye_week": 5, "injury_status": None, "stats": {"receptions": 89, "targets": 128, "receiving_yards": 1234, "touchdowns": 9, "yards_per_catch": 13.9, "fantasy_points": 221.8, "avg_points": 17.1}},
    {"id": "p8", "name": "James Wilson", "position": "WR", "team": "Desert Vipers", "team_id": "rd3", "is_elite": False, "bye_week": 10, "injury_status": "Questionable", "stats": {"receptions": 82, "targets": 118, "receiving_yards": 1156, "touchdowns": 8, "yards_per_catch": 14.1, "fantasy_points": 198.6, "avg_points": 15.3}},
    {"id": "p21", "name": "Jaylen Cooper", "position": "WR", "team": "Ice Bears", "team_id": "rd2", "is_elite": False, "bye_week": 8, "injury_status": None, "stats": {"receptions": 76, "targets": 112, "receiving_yards": 1089, "touchdowns": 7, "yards_per_catch": 14.3, "fantasy_points": 185.4, "avg_points": 14.3}},
    {"id": "p22", "name": "DeShawn Harris", "position": "WR", "team": "Steel Titans", "team_id": "gc2", "is_elite": False, "bye_week": 6, "injury_status": None, "stats": {"receptions": 71, "targets": 105, "receiving_yards": 998, "touchdowns": 6, "yards_per_catch": 14.1, "fantasy_points": 168.8, "avg_points": 13.0}},
    # RBs
    {"id": "p9", "name": "David Martinez", "position": "RB", "team": "Ice Bears", "team_id": "rd2", "is_elite": True, "bye_week": 8, "injury_status": None, "stats": {"rushing_yards": 1456, "rushing_tds": 16, "receptions": 45, "receiving_yards": 389, "touchdowns": 18, "yards_per_carry": 5.2, "fantasy_points": 312.6, "avg_points": 24.0}},
    {"id": "p10", "name": "Kevin Harris", "position": "RB", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None, "stats": {"rushing_yards": 1324, "rushing_tds": 14, "receptions": 38, "receiving_yards": 312, "touchdowns": 16, "yards_per_carry": 4.8, "fantasy_points": 278.4, "avg_points": 21.4}},
    {"id": "p11", "name": "Brandon Lee", "position": "RB", "team": "Steel Titans", "team_id": "gc2", "is_elite": False, "bye_week": 6, "injury_status": "Questionable", "stats": {"rushing_yards": 1178, "rushing_tds": 11, "receptions": 32, "receiving_yards": 245, "touchdowns": 12, "yards_per_carry": 4.5, "fantasy_points": 234.8, "avg_points": 18.1}},
    {"id": "p12", "name": "Jason Taylor", "position": "RB", "team": "River Sharks", "team_id": "rd4", "is_elite": False, "bye_week": 11, "injury_status": None, "stats": {"rushing_yards": 1045, "rushing_tds": 9, "receptions": 28, "receiving_yards": 198, "touchdowns": 10, "yards_per_carry": 4.3, "fantasy_points": 198.2, "avg_points": 15.2}},
    {"id": "p23", "name": "Marcus Johnson", "position": "RB", "team": "Crimson Wolves", "team_id": "gc3", "is_elite": False, "bye_week": 5, "injury_status": None, "stats": {"rushing_yards": 978, "rushing_tds": 8, "receptions": 41, "receiving_yards": 356, "touchdowns": 10, "yards_per_carry": 4.1, "fantasy_points": 187.4, "avg_points": 14.4}},
    {"id": "p24", "name": "Terrell Williams", "position": "RB", "team": "Mountain Lions", "team_id": "rd1", "is_elite": False, "bye_week": 7, "injury_status": None, "stats": {"rushing_yards": 856, "rushing_tds": 7, "receptions": 52, "receiving_yards": 478, "touchdowns": 9, "yards_per_carry": 4.4, "fantasy_points": 176.8, "avg_points": 13.6}},
    # TEs
    {"id": "p13", "name": "Tyler Scott", "position": "TE", "team": "Mountain Lions", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None, "stats": {"receptions": 78, "targets": 102, "receiving_yards": 987, "touchdowns": 11, "yards_per_catch": 12.7, "fantasy_points": 178.7, "avg_points": 13.7}},
    {"id": "p14", "name": "Adam Clark", "position": "TE", "team": "Crimson Wolves", "team_id": "gc3", "is_elite": False, "bye_week": 5, "injury_status": None, "stats": {"receptions": 65, "targets": 89, "receiving_yards": 812, "touchdowns": 8, "yards_per_catch": 12.5, "fantasy_points": 145.2, "avg_points": 11.2}},
    {"id": "p25", "name": "Jordan Mitchell", "position": "TE", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": False, "bye_week": 9, "injury_status": None, "stats": {"receptions": 58, "targets": 78, "receiving_yards": 723, "touchdowns": 6, "yards_per_catch": 12.5, "fantasy_points": 126.3, "avg_points": 9.7}},
    {"id": "p26", "name": "Kyle Roberts", "position": "TE", "team": "Ice Bears", "team_id": "rd2", "is_elite": False, "bye_week": 8, "injury_status": "Out", "stats": {"receptions": 52, "targets": 71, "receiving_yards": 645, "touchdowns": 5, "yards_per_catch": 12.4, "fantasy_points": 112.5, "avg_points": 8.7}},
    # Kickers
    {"id": "p15", "name": "Matt Reynolds", "position": "K", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None, "stats": {"field_goals": 32, "field_goal_attempts": 36, "extra_points": 45, "extra_point_attempts": 47, "long": 56, "fantasy_points": 156.0, "avg_points": 12.0}},
    {"id": "p16", "name": "Sam Cooper", "position": "K", "team": "Ice Bears", "team_id": "rd2", "is_elite": False, "bye_week": 8, "injury_status": None, "stats": {"field_goals": 28, "field_goal_attempts": 32, "extra_points": 41, "extra_point_attempts": 43, "long": 52, "fantasy_points": 138.0, "avg_points": 10.6}},
    {"id": "p27", "name": "Chris Palmer", "position": "K", "team": "Mountain Lions", "team_id": "rd1", "is_elite": False, "bye_week": 7, "injury_status": None, "stats": {"field_goals": 26, "field_goal_attempts": 29, "extra_points": 48, "extra_point_attempts": 49, "long": 54, "fantasy_points": 134.0, "avg_points": 10.3}},
    {"id": "p28", "name": "Justin Moore", "position": "K", "team": "Steel Titans", "team_id": "gc2", "is_elite": False, "bye_week": 6, "injury_status": None, "stats": {"field_goals": 24, "field_goal_attempts": 28, "extra_points": 38, "extra_point_attempts": 40, "long": 51, "fantasy_points": 124.0, "avg_points": 9.5}},
    # DEF
    {"id": "p17", "name": "Steel Titans DEF", "position": "DEF", "team": "Steel Titans", "team_id": "gc2", "is_elite": True, "bye_week": 6, "injury_status": None, "stats": {"sacks": 48, "interceptions": 18, "fumbles_recovered": 12, "touchdowns": 4, "points_allowed": 298, "fantasy_points": 168.0, "avg_points": 12.9}},
    {"id": "p18", "name": "Mountain Lions DEF", "position": "DEF", "team": "Mountain Lions", "team_id": "rd1", "is_elite": False, "bye_week": 7, "injury_status": None, "stats": {"sacks": 42, "interceptions": 15, "fumbles_recovered": 9, "touchdowns": 3, "points_allowed": 312, "fantasy_points": 152.0, "avg_points": 11.7}},
    {"id": "p29", "name": "Thunder Hawks DEF", "position": "DEF", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": False, "bye_week": 9, "injury_status": None, "stats": {"sacks": 39, "interceptions": 14, "fumbles_recovered": 8, "touchdowns": 2, "points_allowed": 324, "fantasy_points": 142.0, "avg_points": 10.9}},
    {"id": "p30", "name": "Ice Bears DEF", "position": "DEF", "team": "Ice Bears", "team_id": "rd2", "is_elite": False, "bye_week": 8, "injury_status": None, "stats": {"sacks": 36, "interceptions": 12, "fumbles_recovered": 7, "touchdowns": 2, "points_allowed": 342, "fantasy_points": 132.0, "avg_points": 10.2}},
]

# Recent Trades
TRADES = [
    {"id": "t1", "date": "2024-11-15", "team1_id": "gc1", "team2_id": "rd2", "team1_receives": ["David Martinez"], "team2_receives": ["Kevin Harris", "2025 2nd Round Pick"], "status": "completed"},
    {"id": "t2", "date": "2024-11-12", "team1_id": "gc3", "team2_id": "rd1", "team1_receives": ["Chris Anderson"], "team2_receives": ["Tony Brown", "Adam Clark"], "status": "completed"},
    {"id": "t3", "date": "2024-11-08", "team1_id": "gc2", "team2_id": "rd3", "team1_receives": ["James Wilson"], "team2_receives": ["DeShawn Harris", "2025 3rd Round Pick"], "status": "completed"},
    {"id": "t4", "date": "2024-11-05", "team1_id": "rd4", "team2_id": "gc4", "team1_receives": ["2025 1st Round Pick"], "team2_receives": ["Jason Taylor"], "status": "completed"},
    {"id": "t5", "date": "2024-10-28", "team1_id": "gc1", "team2_id": "rd1", "team1_receives": ["Tyler Scott"], "team2_receives": ["Jordan Mitchell", "Matt Reynolds"], "status": "completed"},
]

# Power Rankings
POWER_RANKINGS = [
    {"rank": 1, "team_id": "rd1", "prev_rank": 1, "trend": "same", "analysis": "Dominant offense continues to roll. Marcus Williams is the MVP favorite."},
    {"rank": 2, "team_id": "gc1", "prev_rank": 3, "trend": "up", "analysis": "Thunder Hawks surge with 3-game win streak. Jake Thompson heating up."},
    {"rank": 3, "team_id": "rd2", "prev_rank": 2, "trend": "down", "analysis": "Slight dip but still playoff bound. David Martinez carrying the load."},
    {"rank": 4, "team_id": "gc2", "prev_rank": 4, "trend": "same", "analysis": "Consistent performance. Elite defense making plays when it matters."},
    {"rank": 5, "team_id": "gc3", "prev_rank": 6, "trend": "up", "analysis": "Climbing up with improved rushing attack. Wildcard contender."},
    {"rank": 6, "team_id": "rd3", "prev_rank": 5, "trend": "down", "analysis": "QB injury concerns. Need Caleb Murray back for playoff push."},
    {"rank": 7, "team_id": "gc4", "prev_rank": 7, "trend": "same", "analysis": "Fighting for playin spot. Must win out to secure position."},
    {"rank": 8, "team_id": "rd4", "prev_rank": 9, "trend": "up", "analysis": "Surprising playoff push. Young roster showing growth."},
    {"rank": 9, "team_id": "gc5", "prev_rank": 8, "trend": "down", "analysis": "Fading late. Need a miracle for playoffs."},
    {"rank": 10, "team_id": "rd5", "prev_rank": 10, "trend": "same", "analysis": "On the bubble. One win away from securing playin berth."},
    {"rank": 11, "team_id": "gc6", "prev_rank": 11, "trend": "same", "analysis": "Building for next season. Focus on player development."},
    {"rank": 12, "team_id": "rd6", "prev_rank": 12, "trend": "same", "analysis": "Tough season but bright future with draft picks."},
]

# Generate schedule (13 weeks)
SCHEDULE = []
for week in range(1, 14):
    matchups = [
        {"home": "gc1", "away": "rd1", "home_score": 142.5 + (week * 2.3), "away_score": 138.2 + (week * 1.8)},
        {"home": "gc2", "away": "rd2", "home_score": 128.4 + (week * 1.5), "away_score": 135.6 + (week * 2.1)},
        {"home": "gc3", "away": "rd3", "home_score": 121.8 + (week * 1.2), "away_score": 124.3 + (week * 1.4)},
        {"home": "gc4", "away": "rd4", "home_score": 115.2 + (week * 0.8), "away_score": 118.7 + (week * 1.1)},
        {"home": "gc5", "away": "rd5", "home_score": 108.6 + (week * 0.5), "away_score": 112.4 + (week * 0.9)},
        {"home": "gc6", "away": "rd6", "home_score": 98.4 + (week * 0.3), "away_score": 105.8 + (week * 0.6)},
    ]
    for i, m in enumerate(matchups):
        player_names = ["Marcus Williams", "Jake Thompson", "Chris Anderson", "David Martinez", "Mike Davis", "Kevin Harris"]
        SCHEDULE.append({
            "id": f"g{week}_{i}",
            "week": week,
            "home_team_id": m["home"],
            "away_team_id": m["away"],
            "home_score": round(m["home_score"], 1),
            "away_score": round(m["away_score"], 1),
            "is_completed": week <= 13,
            "player_of_game": player_names[i % len(player_names)],
            "player_of_game_stats": f"{25 + (i * 3)} pts"
        })

AWARDS = [
    {"id": "a1", "name": "League MVP", "description": "Most Valuable Player of the season", "winner_id": "p1", "winner_name": "Marcus Williams", "winner_team": "Mountain Lions", "stat_value": "412.5 fantasy points"},
    {"id": "a2", "name": "Offensive Player of the Year", "description": "Best offensive performance", "winner_id": "p5", "winner_name": "Chris Anderson", "winner_team": "Mountain Lions", "stat_value": "1,654 receiving yards"},
    {"id": "a3", "name": "Rookie of the Year", "description": "Best first-year player", "winner_id": "p10", "winner_name": "Kevin Harris", "winner_team": "Thunder Hawks", "stat_value": "278.4 fantasy points"},
    {"id": "a4", "name": "Comeback Player", "description": "Best comeback performance", "winner_id": "p9", "winner_name": "David Martinez", "winner_team": "Ice Bears", "stat_value": "312.6 fantasy points"},
    {"id": "a5", "name": "Manager of the Year", "description": "Best team management", "winner_id": None, "winner_name": "Coach Stevens", "winner_team": "Mountain Lions", "stat_value": "11-2 record"},
    {"id": "a6", "name": "Weekly High Scorer", "description": "Most weekly high scores", "winner_id": "gc1", "winner_name": "Thunder Hawks", "winner_team": "Thunder Hawks", "stat_value": "6 weekly wins"},
]

PLAYOFFS = [
    {"id": "pf1", "round": 1, "position": 1, "team1_id": "rd1", "team2_id": "gc4", "team1_score": 156.8, "team2_score": 128.4, "winner_id": "rd1", "is_completed": True},
    {"id": "pf2", "round": 1, "position": 2, "team1_id": "gc1", "team2_id": "rd4", "team1_score": 148.2, "team2_score": 132.6, "winner_id": "gc1", "is_completed": True},
    {"id": "pf3", "round": 1, "position": 3, "team1_id": "rd2", "team2_id": "gc3", "team1_score": 142.5, "team2_score": 138.9, "winner_id": "rd2", "is_completed": True},
    {"id": "pf4", "round": 1, "position": 4, "team1_id": "gc2", "team2_id": "rd3", "team1_score": 135.8, "team2_score": 141.2, "winner_id": "rd3", "is_completed": True},
    {"id": "pf5", "round": 2, "position": 1, "team1_id": "rd1", "team2_id": "gc1", "team1_score": 162.4, "team2_score": 154.8, "winner_id": "rd1", "is_completed": True},
    {"id": "pf6", "round": 2, "position": 2, "team1_id": "rd2", "team2_id": "rd3", "team1_score": 145.6, "team2_score": 139.2, "winner_id": "rd2", "is_completed": True},
    {"id": "pf7", "round": 3, "position": 1, "team1_id": "rd1", "team2_id": "rd2", "team1_score": 168.5, "team2_score": 152.3, "winner_id": "rd1", "is_completed": True},
]

# In-memory watchlist storage (per session - would use DB in production)
user_watchlists = {}

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Gridiron Elite API", "version": "2.0.0"}

@api_router.get("/teams")
async def get_teams():
    return TEAMS

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str):
    team = next((t for t in TEAMS if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.get("/players")
async def get_players(
    position: Optional[str] = None, 
    elite_only: bool = False,
    search: Optional[str] = None,
    team_id: Optional[str] = None,
    sort_by: str = "fantasy_points",
    limit: int = 100
):
    players = PLAYERS.copy()
    
    if position:
        players = [p for p in players if p["position"] == position]
    if elite_only:
        players = [p for p in players if p["is_elite"]]
    if team_id:
        players = [p for p in players if p["team_id"] == team_id]
    if search:
        search_lower = search.lower()
        players = [p for p in players if search_lower in p["name"].lower() or search_lower in p["team"].lower()]
    
    # Sort players
    if sort_by in ["fantasy_points", "avg_points"]:
        players = sorted(players, key=lambda x: x["stats"].get(sort_by, 0), reverse=True)
    
    return players[:limit]

@api_router.get("/players/{player_id}")
async def get_player(player_id: str):
    player = next((p for p in PLAYERS if p["id"] == player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Add weekly scores for individual player view
    weekly_scores = []
    for week in range(1, 14):
        base_score = player["stats"].get("avg_points", 15)
        variance = (week % 5) * 2 - 4
        weekly_scores.append({
            "week": week,
            "points": round(base_score + variance, 1),
            "opponent": TEAMS[(week + hash(player_id)) % len(TEAMS)]["abbreviation"]
        })
    
    return {**player, "weekly_scores": weekly_scores}

@api_router.get("/standings")
async def get_standings():
    gc_teams = sorted([t for t in TEAMS if t["conference"] == "Grand Central"], key=lambda x: (-x["wins"], x["losses"]))
    rd_teams = sorted([t for t in TEAMS if t["conference"] == "Ridge"], key=lambda x: (-x["wins"], x["losses"]))
    
    league_structure = {
        "format": "10-team playoff bracket",
        "rounds": ["Playins", "Elite 8", "Final 4", "United Flag Bowl"],
        "seeding": {
            "division_leaders": "Seeds 1-4 (bye to Elite 8)",
            "wildcards": "Seeds 5-6 (straight to Elite 8)",
            "playins": "Seeds 7-10 (playin round)"
        },
        "legend": {
            "x": "Division Leader (#1-4 Seed, Bye to Elite 8)",
            "y": "Wildcard (#5-6 Seed, Elite 8)",
            "z": "Playins (#7-10 Seed)"
        },
        "stats_legend": {
            "W": "Wins",
            "L": "Losses",
            "PCT": "Winning Percentage",
            "PF": "Points For",
            "PA": "Points Against",
            "DIFF": "Point Differential"
        }
    }
    
    return {
        "grand_central": gc_teams, 
        "ridge": rd_teams,
        "league_structure": league_structure
    }

@api_router.get("/schedule")
async def get_schedule(week: Optional[int] = None):
    schedule = SCHEDULE
    if week:
        schedule = [g for g in schedule if g["week"] == week]
    
    weekly_stats = {}
    for game in SCHEDULE:
        w = game["week"]
        if w not in weekly_stats:
            weekly_stats[w] = {"total_points": 0, "games": 0, "high_score": 0, "high_scorer": ""}
        weekly_stats[w]["total_points"] += game["home_score"] + game["away_score"]
        weekly_stats[w]["games"] += 1
        if game["home_score"] > weekly_stats[w]["high_score"]:
            weekly_stats[w]["high_score"] = game["home_score"]
            home_team = next((t for t in TEAMS if t["id"] == game["home_team_id"]), None)
            weekly_stats[w]["high_scorer"] = home_team["name"] if home_team else ""
        if game["away_score"] > weekly_stats[w]["high_score"]:
            weekly_stats[w]["high_score"] = game["away_score"]
            away_team = next((t for t in TEAMS if t["id"] == game["away_team_id"]), None)
            weekly_stats[w]["high_scorer"] = away_team["name"] if away_team else ""
    
    for w in weekly_stats:
        weekly_stats[w]["avg_points"] = round(weekly_stats[w]["total_points"] / (weekly_stats[w]["games"] * 2), 1)
        weekly_stats[w]["total_points"] = round(weekly_stats[w]["total_points"], 1)
        weekly_stats[w]["high_score"] = round(weekly_stats[w]["high_score"], 1)
    
    return {"games": schedule, "weekly_stats": weekly_stats}

@api_router.get("/playoffs")
async def get_playoffs():
    return {"matchups": PLAYOFFS, "teams": TEAMS}

@api_router.get("/awards")
async def get_awards():
    return AWARDS

@api_router.get("/trades")
async def get_trades():
    trades_with_teams = []
    for trade in TRADES:
        team1 = next((t for t in TEAMS if t["id"] == trade["team1_id"]), None)
        team2 = next((t for t in TEAMS if t["id"] == trade["team2_id"]), None)
        trades_with_teams.append({
            **trade,
            "team1_name": team1["name"] if team1 else "Unknown",
            "team1_abbr": team1["abbreviation"] if team1 else "???",
            "team1_color": team1["color"] if team1 else "#333",
            "team2_name": team2["name"] if team2 else "Unknown",
            "team2_abbr": team2["abbreviation"] if team2 else "???",
            "team2_color": team2["color"] if team2 else "#333",
        })
    return trades_with_teams

@api_router.get("/power-rankings")
async def get_power_rankings():
    rankings_with_teams = []
    for pr in POWER_RANKINGS:
        team = next((t for t in TEAMS if t["id"] == pr["team_id"]), None)
        if team:
            rankings_with_teams.append({
                **pr,
                "team_name": team["name"],
                "team_abbr": team["abbreviation"],
                "team_color": team["color"],
                "record": f"{team['wins']}-{team['losses']}"
            })
    return rankings_with_teams

@api_router.get("/stat-leaders")
async def get_stat_leaders():
    leaders = {
        "passing_yards": sorted([p for p in PLAYERS if p["position"] == "QB"], key=lambda x: x["stats"].get("passing_yards", 0), reverse=True)[:5],
        "rushing_yards": sorted([p for p in PLAYERS if p["position"] == "RB"], key=lambda x: x["stats"].get("rushing_yards", 0), reverse=True)[:5],
        "receiving_yards": sorted([p for p in PLAYERS if p["position"] in ["WR", "TE"]], key=lambda x: x["stats"].get("receiving_yards", 0), reverse=True)[:5],
        "touchdowns": sorted(PLAYERS, key=lambda x: x["stats"].get("touchdowns", 0), reverse=True)[:5],
        "fantasy_points": sorted(PLAYERS, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)[:5],
        "sacks": sorted([p for p in PLAYERS if p["position"] == "DEF"], key=lambda x: x["stats"].get("sacks", 0), reverse=True)[:5],
    }
    return leaders

@api_router.get("/watchlist")
async def get_watchlist(user_id: str = "default"):
    watchlist = user_watchlists.get(user_id, [])
    players = [p for p in PLAYERS if p["id"] in watchlist]
    return players

@api_router.post("/watchlist")
async def add_to_watchlist(item: WatchlistItem, user_id: str = "default"):
    if user_id not in user_watchlists:
        user_watchlists[user_id] = []
    if item.player_id not in user_watchlists[user_id]:
        user_watchlists[user_id].append(item.player_id)
    return {"success": True, "watchlist": user_watchlists[user_id]}

@api_router.delete("/watchlist/{player_id}")
async def remove_from_watchlist(player_id: str, user_id: str = "default"):
    if user_id in user_watchlists and player_id in user_watchlists[user_id]:
        user_watchlists[user_id].remove(player_id)
    return {"success": True, "watchlist": user_watchlists.get(user_id, [])}

@api_router.get("/dashboard")
async def get_dashboard():
    top_players = sorted(PLAYERS, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)[:5]
    recent_games = [g for g in SCHEDULE if g["week"] == 13]
    
    leaders = {}
    for pos in ["QB", "WR", "RB", "TE", "K", "DEF"]:
        pos_players = [p for p in PLAYERS if p["position"] == pos]
        if pos_players:
            leaders[pos] = max(pos_players, key=lambda x: x["stats"].get("fantasy_points", 0))
    
    # Top performers this week
    top_performers_week = sorted(PLAYERS, key=lambda x: x["stats"].get("avg_points", 0), reverse=True)[:10]
    
    return {
        "top_performers": top_players,
        "top_performers_week": top_performers_week,
        "recent_games": recent_games,
        "recent_trades": TRADES[:3],
        "leaders": leaders,
        "standings_preview": {
            "grand_central_leader": next((t for t in sorted([t for t in TEAMS if t["conference"] == "Grand Central"], key=lambda x: -x["wins"])), None),
            "ridge_leader": next((t for t in sorted([t for t in TEAMS if t["conference"] == "Ridge"], key=lambda x: -x["wins"])), None)
        },
        "power_rankings_preview": POWER_RANKINGS[:5]
    }

# Admin Endpoints
def verify_admin(admin_key: str = Header(None, alias="X-Admin-Key")):
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return True

@api_router.get("/admin/stats")
async def admin_stats(admin_key: str = Header(None, alias="X-Admin-Key")):
    verify_admin(admin_key)
    return {
        "total_teams": len(TEAMS),
        "total_players": len(PLAYERS),
        "total_games": len(SCHEDULE),
        "total_trades": len(TRADES),
        "elite_players": len([p for p in PLAYERS if p["is_elite"]]),
        "injured_players": len([p for p in PLAYERS if p.get("injury_status")]),
        "playoff_teams": len([t for t in TEAMS if t.get("playoff_status")]),
    }

@api_router.post("/admin/player")
async def admin_create_player(player: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    verify_admin(admin_key)
    new_player = {
        "id": str(uuid.uuid4()),
        **player,
        "stats": player.get("stats", {}),
        "is_elite": player.get("is_elite", False)
    }
    PLAYERS.append(new_player)
    return new_player

@api_router.put("/admin/player/{player_id}")
async def admin_update_player(player_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    verify_admin(admin_key)
    for i, p in enumerate(PLAYERS):
        if p["id"] == player_id:
            PLAYERS[i] = {**p, **updates}
            return PLAYERS[i]
    raise HTTPException(status_code=404, detail="Player not found")

@api_router.delete("/admin/player/{player_id}")
async def admin_delete_player(player_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    verify_admin(admin_key)
    for i, p in enumerate(PLAYERS):
        if p["id"] == player_id:
            deleted = PLAYERS.pop(i)
            return {"success": True, "deleted": deleted}
    raise HTTPException(status_code=404, detail="Player not found")

@api_router.put("/admin/team/{team_id}")
async def admin_update_team(team_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    verify_admin(admin_key)
    for i, t in enumerate(TEAMS):
        if t["id"] == team_id:
            TEAMS[i] = {**t, **updates}
            return TEAMS[i]
    raise HTTPException(status_code=404, detail="Team not found")

@api_router.post("/admin/trade")
async def admin_create_trade(trade: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    verify_admin(admin_key)
    new_trade = {
        "id": str(uuid.uuid4()),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        **trade,
        "status": "completed"
    }
    TRADES.insert(0, new_trade)
    return new_trade

@api_router.post("/admin/game")
async def admin_update_game(game_update: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    verify_admin(admin_key)
    game_id = game_update.get("id")
    for i, g in enumerate(SCHEDULE):
        if g["id"] == game_id:
            SCHEDULE[i] = {**g, **game_update}
            return SCHEDULE[i]
    raise HTTPException(status_code=404, detail="Game not found")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
