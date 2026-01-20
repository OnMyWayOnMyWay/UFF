from fastapi import FastAPI, APIRouter, HTTPException
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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

class Game(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week: int
    home_team_id: str
    away_team_id: str
    home_score: float = 0
    away_score: float = 0
    is_completed: bool = False
    player_of_game: Optional[str] = None
    player_of_game_stats: Optional[str] = None

class Award(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    winner_id: Optional[str] = None
    winner_name: Optional[str] = None
    winner_team: Optional[str] = None
    stat_value: Optional[str] = None

class PlayoffMatchup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    round: int
    position: int
    team1_id: Optional[str] = None
    team2_id: Optional[str] = None
    team1_score: float = 0
    team2_score: float = 0
    winner_id: Optional[str] = None
    is_completed: bool = False

# Mock Data
TEAMS = [
    # Grand Central Conference
    {"id": "gc1", "name": "Thunder Hawks", "abbreviation": "THK", "conference": "Grand Central", "color": "#FF6B35", "wins": 10, "losses": 3, "points_for": 1842.5, "points_against": 1523.2},
    {"id": "gc2", "name": "Steel Titans", "abbreviation": "STT", "conference": "Grand Central", "color": "#4ECDC4", "wins": 9, "losses": 4, "points_for": 1756.8, "points_against": 1612.4},
    {"id": "gc3", "name": "Crimson Wolves", "abbreviation": "CRW", "conference": "Grand Central", "color": "#C41E3A", "wins": 8, "losses": 5, "points_for": 1698.2, "points_against": 1654.1},
    {"id": "gc4", "name": "Night Owls", "abbreviation": "NOW", "conference": "Grand Central", "color": "#2C3E50", "wins": 7, "losses": 6, "points_for": 1621.5, "points_against": 1687.3},
    {"id": "gc5", "name": "Golden Eagles", "abbreviation": "GEA", "conference": "Grand Central", "color": "#F39C12", "wins": 5, "losses": 8, "points_for": 1534.7, "points_against": 1721.8},
    {"id": "gc6", "name": "Storm Chasers", "abbreviation": "STC", "conference": "Grand Central", "color": "#9B59B6", "wins": 4, "losses": 9, "points_for": 1489.2, "points_against": 1798.5},
    # Ridge Conference
    {"id": "rd1", "name": "Mountain Lions", "abbreviation": "MTL", "conference": "Ridge", "color": "#27AE60", "wins": 11, "losses": 2, "points_for": 1923.4, "points_against": 1456.7},
    {"id": "rd2", "name": "Ice Bears", "abbreviation": "ICB", "conference": "Ridge", "color": "#3498DB", "wins": 9, "losses": 4, "points_for": 1812.6, "points_against": 1589.3},
    {"id": "rd3", "name": "Desert Vipers", "abbreviation": "DVP", "conference": "Ridge", "color": "#E67E22", "wins": 8, "losses": 5, "points_for": 1745.8, "points_against": 1634.2},
    {"id": "rd4", "name": "River Sharks", "abbreviation": "RSK", "conference": "Ridge", "color": "#1ABC9C", "wins": 6, "losses": 7, "points_for": 1598.4, "points_against": 1678.9},
    {"id": "rd5", "name": "Canyon Kings", "abbreviation": "CNK", "conference": "Ridge", "color": "#8E44AD", "wins": 5, "losses": 8, "points_for": 1512.3, "points_against": 1745.6},
    {"id": "rd6", "name": "Prairie Wolves", "abbreviation": "PRW", "conference": "Ridge", "color": "#D35400", "wins": 3, "losses": 10, "points_for": 1423.1, "points_against": 1867.4},
]

PLAYERS = [
    # QBs
    {"id": "p1", "name": "Marcus Williams", "position": "QB", "team": "Mountain Lions", "team_id": "rd1", "is_elite": True, "stats": {"passing_yards": 4521, "touchdowns": 38, "interceptions": 8, "fantasy_points": 412.5}},
    {"id": "p2", "name": "Jake Thompson", "position": "QB", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": True, "stats": {"passing_yards": 4234, "touchdowns": 35, "interceptions": 10, "fantasy_points": 385.2}},
    {"id": "p3", "name": "Ryan Mitchell", "position": "QB", "team": "Steel Titans", "team_id": "gc2", "is_elite": False, "stats": {"passing_yards": 3856, "touchdowns": 29, "interceptions": 12, "fantasy_points": 342.8}},
    {"id": "p4", "name": "Derek Johnson", "position": "QB", "team": "Ice Bears", "team_id": "rd2", "is_elite": False, "stats": {"passing_yards": 3654, "touchdowns": 27, "interceptions": 14, "fantasy_points": 318.4}},
    # WRs
    {"id": "p5", "name": "Chris Anderson", "position": "WR", "team": "Mountain Lions", "team_id": "rd1", "is_elite": True, "stats": {"receptions": 112, "receiving_yards": 1654, "touchdowns": 14, "fantasy_points": 298.4}},
    {"id": "p6", "name": "Mike Davis", "position": "WR", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": True, "stats": {"receptions": 98, "receiving_yards": 1487, "touchdowns": 12, "fantasy_points": 267.2}},
    {"id": "p7", "name": "Tony Brown", "position": "WR", "team": "Crimson Wolves", "team_id": "gc3", "is_elite": False, "stats": {"receptions": 89, "receiving_yards": 1234, "touchdowns": 9, "fantasy_points": 221.8}},
    {"id": "p8", "name": "James Wilson", "position": "WR", "team": "Desert Vipers", "team_id": "rd3", "is_elite": False, "stats": {"receptions": 82, "receiving_yards": 1156, "touchdowns": 8, "fantasy_points": 198.6}},
    # RBs
    {"id": "p9", "name": "David Martinez", "position": "RB", "team": "Ice Bears", "team_id": "rd2", "is_elite": True, "stats": {"rushing_yards": 1456, "touchdowns": 16, "receptions": 45, "fantasy_points": 312.6}},
    {"id": "p10", "name": "Kevin Harris", "position": "RB", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": True, "stats": {"rushing_yards": 1324, "touchdowns": 14, "receptions": 38, "fantasy_points": 278.4}},
    {"id": "p11", "name": "Brandon Lee", "position": "RB", "team": "Steel Titans", "team_id": "gc2", "is_elite": False, "stats": {"rushing_yards": 1178, "touchdowns": 11, "receptions": 32, "fantasy_points": 234.8}},
    {"id": "p12", "name": "Jason Taylor", "position": "RB", "team": "River Sharks", "team_id": "rd4", "is_elite": False, "stats": {"rushing_yards": 1045, "touchdowns": 9, "receptions": 28, "fantasy_points": 198.2}},
    # TEs
    {"id": "p13", "name": "Tyler Scott", "position": "TE", "team": "Mountain Lions", "team_id": "rd1", "is_elite": True, "stats": {"receptions": 78, "receiving_yards": 987, "touchdowns": 11, "fantasy_points": 178.7}},
    {"id": "p14", "name": "Adam Clark", "position": "TE", "team": "Crimson Wolves", "team_id": "gc3", "is_elite": False, "stats": {"receptions": 65, "receiving_yards": 812, "touchdowns": 8, "fantasy_points": 145.2}},
    # Kickers
    {"id": "p15", "name": "Matt Reynolds", "position": "K", "team": "Thunder Hawks", "team_id": "gc1", "is_elite": True, "stats": {"field_goals": 32, "extra_points": 45, "fantasy_points": 156.0}},
    {"id": "p16", "name": "Sam Cooper", "position": "K", "team": "Ice Bears", "team_id": "rd2", "is_elite": False, "stats": {"field_goals": 28, "extra_points": 41, "fantasy_points": 138.0}},
    # DEF
    {"id": "p17", "name": "Steel Titans DEF", "position": "DEF", "team": "Steel Titans", "team_id": "gc2", "is_elite": True, "stats": {"sacks": 48, "interceptions": 18, "touchdowns": 4, "fantasy_points": 168.0}},
    {"id": "p18", "name": "Mountain Lions DEF", "position": "DEF", "team": "Mountain Lions", "team_id": "rd1", "is_elite": False, "stats": {"sacks": 42, "interceptions": 15, "touchdowns": 3, "fantasy_points": 152.0}},
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
    # Round 1 (Quarterfinals)
    {"id": "pf1", "round": 1, "position": 1, "team1_id": "rd1", "team2_id": "gc4", "team1_score": 156.8, "team2_score": 128.4, "winner_id": "rd1", "is_completed": True},
    {"id": "pf2", "round": 1, "position": 2, "team1_id": "gc1", "team2_id": "rd4", "team1_score": 148.2, "team2_score": 132.6, "winner_id": "gc1", "is_completed": True},
    {"id": "pf3", "round": 1, "position": 3, "team1_id": "rd2", "team2_id": "gc3", "team1_score": 142.5, "team2_score": 138.9, "winner_id": "rd2", "is_completed": True},
    {"id": "pf4", "round": 1, "position": 4, "team1_id": "gc2", "team2_id": "rd3", "team1_score": 135.8, "team2_score": 141.2, "winner_id": "rd3", "is_completed": True},
    # Round 2 (Semifinals)
    {"id": "pf5", "round": 2, "position": 1, "team1_id": "rd1", "team2_id": "gc1", "team1_score": 162.4, "team2_score": 154.8, "winner_id": "rd1", "is_completed": True},
    {"id": "pf6", "round": 2, "position": 2, "team1_id": "rd2", "team2_id": "rd3", "team1_score": 145.6, "team2_score": 139.2, "winner_id": "rd2", "is_completed": True},
    # Championship
    {"id": "pf7", "round": 3, "position": 1, "team1_id": "rd1", "team2_id": "rd2", "team1_score": 168.5, "team2_score": 152.3, "winner_id": "rd1", "is_completed": True},
]

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Gridiron Elite API", "version": "1.0.0"}

@api_router.get("/teams", response_model=List[dict])
async def get_teams():
    return TEAMS

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str):
    team = next((t for t in TEAMS if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.get("/players", response_model=List[dict])
async def get_players(position: Optional[str] = None, elite_only: bool = False):
    players = PLAYERS
    if position:
        players = [p for p in players if p["position"] == position]
    if elite_only:
        players = [p for p in players if p["is_elite"]]
    return players

@api_router.get("/players/{player_id}")
async def get_player(player_id: str):
    player = next((p for p in PLAYERS if p["id"] == player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@api_router.get("/standings")
async def get_standings():
    gc_teams = sorted([t for t in TEAMS if t["conference"] == "Grand Central"], key=lambda x: (-x["wins"], x["losses"]))
    rd_teams = sorted([t for t in TEAMS if t["conference"] == "Ridge"], key=lambda x: (-x["wins"], x["losses"]))
    return {"grand_central": gc_teams, "ridge": rd_teams}

@api_router.get("/schedule")
async def get_schedule(week: Optional[int] = None):
    schedule = SCHEDULE
    if week:
        schedule = [g for g in schedule if g["week"] == week]
    
    # Calculate weekly stats
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

@api_router.get("/dashboard")
async def get_dashboard():
    # Top performers
    top_players = sorted(PLAYERS, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)[:5]
    
    # Recent games (last week)
    recent_games = [g for g in SCHEDULE if g["week"] == 13]
    
    # League leaders by position
    leaders = {}
    for pos in ["QB", "WR", "RB", "TE", "K", "DEF"]:
        pos_players = [p for p in PLAYERS if p["position"] == pos]
        if pos_players:
            leaders[pos] = max(pos_players, key=lambda x: x["stats"].get("fantasy_points", 0))
    
    return {
        "top_performers": top_players,
        "recent_games": recent_games,
        "leaders": leaders,
        "standings_preview": {
            "grand_central_leader": next((t for t in sorted([t for t in TEAMS if t["conference"] == "Grand Central"], key=lambda x: -x["wins"])), None),
            "ridge_leader": next((t for t in sorted([t for t in TEAMS if t["conference"] == "Ridge"], key=lambda x: -x["wins"])), None)
        }
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
