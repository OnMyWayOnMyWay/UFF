from fastapi import FastAPI, APIRouter, HTTPException, Header, Query, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import csv
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import hashlib
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_KEY = os.environ.get('ADMIN_KEY', 'BacconIsCool1@')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Admin Management
ADMINS = {
    "admin": {"password_hash": hashlib.sha256("BacconIsCool1@".encode()).hexdigest(), "role": "super_admin", "created": "2024-01-01"},
}

# Activity Log
ADMIN_ACTIVITY_LOG = []

def log_admin_activity(admin: str, action: str, details: str):
    ADMIN_ACTIVITY_LOG.insert(0, {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "admin": admin,
        "action": action,
        "details": details
    })
    if len(ADMIN_ACTIVITY_LOG) > 100:
        ADMIN_ACTIVITY_LOG.pop()

# Models
class WatchlistItem(BaseModel):
    player_id: str

class NewAdmin(BaseModel):
    username: str
    password: str
    role: str = "admin"

class PlayerMerge(BaseModel):
    source_player_id: str
    target_player_id: str
    keep_name: str = "target"

class TradeSetup(BaseModel):
    team1_id: str
    team2_id: str
    team1_receives: List[str]
    team2_receives: List[str]

class GameCreate(BaseModel):
    week: int
    home_team_id: str
    away_team_id: str
    home_score: float = 0
    away_score: float = 0
    is_completed: bool = False
    player_of_game: Optional[str] = None
    player_of_game_stats: Optional[str] = None
    mode: str = "simple"

class BulkDeleteGames(BaseModel):
    start_week: int
    end_week: int

class CloneGame(BaseModel):
    game_id: str
    target_week: int

class PlayoffUpdate(BaseModel):
    matchup_id: str
    team1_score: Optional[float] = None
    team2_score: Optional[float] = None
    winner_id: Optional[str] = None
    is_completed: Optional[bool] = None

# ==================== TEAMS DATA ====================
TEAMS = [
    # Ridge Conference
    {"id": "rd1", "name": "Vicksburg Vortex", "abbreviation": "VIC", "conference": "Ridge", "division": "East", "color": "#8B5CF6", "logo": None, "wins": 7, "losses": 1, "points_for": 312.5, "points_against": 198.2, "seed": 1, "playoff_status": "x"},
    {"id": "rd2", "name": "New York Guardians", "abbreviation": "NYG", "conference": "Ridge", "division": "East", "color": "#3B82F6", "logo": None, "wins": 6, "losses": 2, "points_for": 289.4, "points_against": 212.1, "seed": 2, "playoff_status": "x"},
    {"id": "rd3", "name": "Saskatoon Stampede", "abbreviation": "SAS", "conference": "Ridge", "division": "West", "color": "#EAB308", "logo": None, "wins": 5, "losses": 3, "points_for": 267.8, "points_against": 234.5, "seed": 3, "playoff_status": "y"},
    {"id": "rd4", "name": "Boston Blitz", "abbreviation": "BOS", "conference": "Ridge", "division": "West", "color": "#DC2626", "logo": None, "wins": 5, "losses": 3, "points_for": 254.2, "points_against": 245.1, "seed": 4, "playoff_status": "y"},
    {"id": "rd5", "name": "Miami Surge", "abbreviation": "MIA", "conference": "Ridge", "division": "East", "color": "#06B6D4", "logo": None, "wins": 4, "losses": 4, "points_for": 241.6, "points_against": 252.3, "seed": 5, "playoff_status": "z"},
    {"id": "rd6", "name": "Denver Dynamos", "abbreviation": "DEN", "conference": "Ridge", "division": "West", "color": "#F97316", "logo": None, "wins": 3, "losses": 5, "points_for": 228.4, "points_against": 267.8, "seed": 6, "playoff_status": "z"},
    # Grand Central Conference
    {"id": "gc1", "name": "Columbus Colts", "abbreviation": "COL", "conference": "Grand Central", "division": "North", "color": "#10B981", "logo": None, "wins": 7, "losses": 1, "points_for": 298.7, "points_against": 187.3, "seed": 1, "playoff_status": "x"},
    {"id": "gc2", "name": "Evergreen Stags", "abbreviation": "EVG", "conference": "Grand Central", "division": "North", "color": "#22C55E", "logo": None, "wins": 6, "losses": 2, "points_for": 276.3, "points_against": 198.4, "seed": 2, "playoff_status": "x"},
    {"id": "gc3", "name": "Nashville Nightmares", "abbreviation": "NAS", "conference": "Grand Central", "division": "South", "color": "#1F2937", "logo": None, "wins": 5, "losses": 3, "points_for": 258.9, "points_against": 223.5, "seed": 3, "playoff_status": "y"},
    {"id": "gc4", "name": "Seattle Skyclaws", "abbreviation": "SEA", "conference": "Grand Central", "division": "South", "color": "#7C3AED", "logo": None, "wins": 4, "losses": 4, "points_for": 234.5, "points_against": 245.2, "seed": 4, "playoff_status": "y"},
    {"id": "gc5", "name": "Phoenix Flames", "abbreviation": "PHX", "conference": "Grand Central", "division": "North", "color": "#EF4444", "logo": None, "wins": 3, "losses": 5, "points_for": 212.8, "points_against": 256.4, "seed": 5, "playoff_status": "z"},
    {"id": "gc6", "name": "Chicago Wolves", "abbreviation": "CHI", "conference": "Grand Central", "division": "South", "color": "#64748B", "logo": None, "wins": 2, "losses": 6, "points_for": 198.2, "points_against": 278.9, "seed": 6, "playoff_status": "z"},
]

# ==================== PLAYERS DATA (Using Roblox Usernames) ====================
# Stats structure matching: Passing, Rushing, Receiving, Defense
PLAYERS = [
    # Quarterbacks
    {"id": "p1", "roblox_id": "123456789", "roblox_username": "n4w", "position": "QB", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "image": None, "games_played": 8,
     "passing": {"completions": 287, "attempts": 412, "yards": 4521, "touchdowns": 38, "interceptions": 8, "rating": 124.5, "completion_pct": 69.7, "average": 11.0, "longest": 78},
     "rushing": {"attempts": 45, "yards": 234, "touchdowns": 3, "yards_per_carry": 5.2, "fumbles": 1, "twenty_plus": 2, "longest": 28},
     "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 412.5},
    {"id": "p2", "roblox_id": "234567890", "roblox_username": "ThunderQB99", "position": "QB", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "image": None, "games_played": 8,
     "passing": {"completions": 265, "attempts": 389, "yards": 4234, "touchdowns": 35, "interceptions": 10, "rating": 118.2, "completion_pct": 68.1, "average": 10.9, "longest": 72},
     "rushing": {"attempts": 38, "yards": 189, "touchdowns": 2, "yards_per_carry": 5.0, "fumbles": 0, "twenty_plus": 1, "longest": 24},
     "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 385.2},
    {"id": "p3", "roblox_id": "345678901", "roblox_username": "GuardianElite", "position": "QB", "team": "New York Guardians", "team_id": "rd2", "is_elite": False, "image": None, "games_played": 7,
     "passing": {"completions": 234, "attempts": 345, "yards": 3856, "touchdowns": 29, "interceptions": 12, "rating": 108.4, "completion_pct": 67.8, "average": 11.2, "longest": 65},
     "rushing": {"attempts": 32, "yards": 156, "touchdowns": 2, "yards_per_carry": 4.9, "fumbles": 1, "twenty_plus": 1, "longest": 22},
     "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 342.8},
    {"id": "p4", "roblox_id": "456789012", "roblox_username": "StampedeKing", "position": "QB", "team": "Saskatoon Stampede", "team_id": "rd3", "is_elite": False, "image": None, "games_played": 8,
     "passing": {"completions": 212, "attempts": 312, "yards": 3654, "touchdowns": 27, "interceptions": 14, "rating": 102.6, "completion_pct": 67.9, "average": 11.7, "longest": 68},
     "rushing": {"attempts": 28, "yards": 134, "touchdowns": 1, "yards_per_carry": 4.8, "fumbles": 2, "twenty_plus": 1, "longest": 21},
     "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 318.4},
    # Wide Receivers
    {"id": "p5", "roblox_id": "567890123", "roblox_username": "SpeedDemon_WR", "position": "WR", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 12, "yards": 89, "touchdowns": 1, "yards_per_carry": 7.4, "fumbles": 0, "twenty_plus": 1, "longest": 34},
     "receiving": {"receptions": 112, "yards": 1654, "touchdowns": 14, "drops": 4, "longest": 82},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 298.4},
    {"id": "p6", "roblox_id": "678901234", "roblox_username": "ColtsCatcher", "position": "WR", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 8, "yards": 56, "touchdowns": 0, "yards_per_carry": 7.0, "fumbles": 0, "twenty_plus": 0, "longest": 18},
     "receiving": {"receptions": 98, "yards": 1487, "touchdowns": 12, "drops": 3, "longest": 76},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 267.2},
    {"id": "p7", "roblox_id": "789012345", "roblox_username": "NightmareWR1", "position": "WR", "team": "Nashville Nightmares", "team_id": "gc3", "is_elite": False, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 5, "yards": 32, "touchdowns": 0, "yards_per_carry": 6.4, "fumbles": 1, "twenty_plus": 0, "longest": 15},
     "receiving": {"receptions": 89, "yards": 1234, "touchdowns": 9, "drops": 5, "longest": 68},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 221.8},
    {"id": "p8", "roblox_id": "890123456", "roblox_username": "StagsReceiver", "position": "WR", "team": "Evergreen Stags", "team_id": "gc2", "is_elite": False, "image": None, "games_played": 7,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 3, "yards": 21, "touchdowns": 0, "yards_per_carry": 7.0, "fumbles": 0, "twenty_plus": 0, "longest": 12},
     "receiving": {"receptions": 82, "yards": 1156, "touchdowns": 8, "drops": 6, "longest": 62},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 198.6},
    # Running Backs
    {"id": "p9", "roblox_id": "901234567", "roblox_username": "RushKing_RB", "position": "RB", "team": "New York Guardians", "team_id": "rd2", "is_elite": True, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 280, "yards": 1456, "touchdowns": 16, "yards_per_carry": 5.2, "fumbles": 2, "twenty_plus": 12, "longest": 67},
     "receiving": {"receptions": 34, "yards": 289, "touchdowns": 2, "drops": 2, "longest": 34},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 312.6},
    {"id": "p10", "roblox_id": "012345678", "roblox_username": "ColtsPower", "position": "RB", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 256, "yards": 1324, "touchdowns": 14, "yards_per_carry": 5.2, "fumbles": 1, "twenty_plus": 10, "longest": 58},
     "receiving": {"receptions": 28, "yards": 234, "touchdowns": 1, "drops": 1, "longest": 28},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 278.4},
    {"id": "p11", "roblox_id": "112233445", "roblox_username": "StampedeRush", "position": "RB", "team": "Saskatoon Stampede", "team_id": "rd3", "is_elite": False, "image": None, "games_played": 7,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 234, "yards": 1178, "touchdowns": 11, "yards_per_carry": 5.0, "fumbles": 3, "twenty_plus": 8, "longest": 52},
     "receiving": {"receptions": 21, "yards": 178, "touchdowns": 1, "drops": 3, "longest": 24},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 234.8},
    {"id": "p12", "roblox_id": "223344556", "roblox_username": "SkyRB44", "position": "RB", "team": "Seattle Skyclaws", "team_id": "gc4", "is_elite": False, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 212, "yards": 1045, "touchdowns": 9, "yards_per_carry": 4.9, "fumbles": 2, "twenty_plus": 6, "longest": 48},
     "receiving": {"receptions": 18, "yards": 145, "touchdowns": 0, "drops": 2, "longest": 21},
     "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
     "fantasy_points": 198.2},
    # Defenders
    {"id": "p13", "roblox_id": "334455667", "roblox_username": "VortexDefender", "position": "DEF", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "yards_per_carry": 0, "fumbles": 0, "twenty_plus": 0, "longest": 0},
     "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
     "defense": {"tackles": 98, "tackles_for_loss": 18, "sacks": 14.5, "safeties": 1, "swat": 8, "interceptions": 3, "pass_deflections": 12, "td": 2},
     "fantasy_points": 178.7},
    {"id": "p14", "roblox_id": "445566778", "roblox_username": "ColtsD_Elite", "position": "DEF", "team": "Columbus Colts", "team_id": "gc1", "is_elite": False, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "yards_per_carry": 0, "fumbles": 0, "twenty_plus": 0, "longest": 0},
     "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
     "defense": {"tackles": 87, "tackles_for_loss": 15, "sacks": 12.0, "safeties": 0, "swat": 6, "interceptions": 4, "pass_deflections": 10, "td": 1},
     "fantasy_points": 145.2},
    {"id": "p15", "roblox_id": "556677889", "roblox_username": "NYG_Lockdown", "position": "DEF", "team": "New York Guardians", "team_id": "rd2", "is_elite": False, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "yards_per_carry": 0, "fumbles": 0, "twenty_plus": 0, "longest": 0},
     "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
     "defense": {"tackles": 76, "tackles_for_loss": 12, "sacks": 9.5, "safeties": 0, "swat": 5, "interceptions": 5, "pass_deflections": 8, "td": 1},
     "fantasy_points": 132.5},
    {"id": "p16", "roblox_id": "667788990", "roblox_username": "NightmareDEF", "position": "DEF", "team": "Nashville Nightmares", "team_id": "gc3", "is_elite": False, "image": None, "games_played": 8,
     "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
     "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "yards_per_carry": 0, "fumbles": 0, "twenty_plus": 0, "longest": 0},
     "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
     "defense": {"tackles": 72, "tackles_for_loss": 10, "sacks": 8.0, "safeties": 1, "swat": 4, "interceptions": 2, "pass_deflections": 7, "td": 0},
     "fantasy_points": 118.4},
]

# Generate weekly stats for each player
WEEKLY_PLAYER_STATS = []
for p in PLAYERS:
    base_fp = p["fantasy_points"] / p["games_played"] if p["games_played"] > 0 else 0
    for week in range(1, p["games_played"] + 1):
        variance = random.uniform(0.7, 1.3)
        WEEKLY_PLAYER_STATS.append({
            "player_id": p["id"],
            "week": week,
            "points": round(base_fp * variance, 1),
            "passing": {k: int(v * variance / p["games_played"]) if isinstance(v, (int, float)) else v for k, v in p.get("passing", {}).items()},
            "rushing": {k: int(v * variance / p["games_played"]) if isinstance(v, (int, float)) else v for k, v in p.get("rushing", {}).items()},
            "receiving": {k: int(v * variance / p["games_played"]) if isinstance(v, (int, float)) else v for k, v in p.get("receiving", {}).items()},
            "defense": {k: int(v * variance / p["games_played"]) if isinstance(v, (int, float)) else v for k, v in p.get("defense", {}).items()},
        })

# ==================== GAMES DATA ====================
def generate_games():
    games = []
    game_id = 1
    for week in range(1, 9):
        # Generate 6 games per week (12 teams / 2)
        team_pairs = [
            ("rd1", "gc1"), ("rd2", "gc2"), ("rd3", "gc3"),
            ("rd4", "gc4"), ("rd5", "gc5"), ("rd6", "gc6")
        ]
        random.shuffle(team_pairs)
        for home_id, away_id in team_pairs:
            home_team = next((t for t in TEAMS if t["id"] == home_id), None)
            away_team = next((t for t in TEAMS if t["id"] == away_id), None)
            if home_team and away_team:
                home_score = round(random.uniform(18, 45), 1)
                away_score = round(random.uniform(14, 42), 1)
                # Get a random player from winning team as POG
                winning_team_id = home_id if home_score > away_score else away_id
                team_players = [p for p in PLAYERS if p["team_id"] == winning_team_id]
                pog = random.choice(team_players) if team_players else None
                games.append({
                    "id": f"g{game_id}",
                    "week": week,
                    "home_team_id": home_id,
                    "away_team_id": away_id,
                    "home_score": home_score,
                    "away_score": away_score,
                    "is_completed": True,
                    "player_of_game": pog["roblox_username"] if pog else None,
                    "player_of_game_stats": f"{random.randint(15, 35)} pts, {random.randint(1, 4)} TD" if pog else None,
                    "date": f"2025-{10 + (week // 5):02d}-{(week * 3) % 28 + 1:02d}"
                })
                game_id += 1
    return games

GAMES = generate_games()

# ==================== TRADES DATA ====================
TRADES = [
    {"id": "t1", "team1_id": "rd1", "team1_name": "Vicksburg Vortex", "team2_id": "gc1", "team2_name": "Columbus Colts",
     "team1_receives": ["Draft Pick #12"], "team2_receives": ["Future 1st"], "date": datetime.now(timezone.utc).isoformat(), "status": "completed"},
    {"id": "t2", "team1_id": "rd2", "team1_name": "New York Guardians", "team2_id": "gc3", "team2_name": "Nashville Nightmares",
     "team1_receives": ["Backup QB"], "team2_receives": ["Draft Pick #24"], "date": datetime.now(timezone.utc).isoformat(), "status": "completed"},
]

# ==================== PLAYOFFS DATA ====================
PLAYOFFS = [
    # Playins
    {"id": "po1", "round": "Playins", "matchup_name": "Play-In Game 1", "team1_id": "rd5", "team2_id": "rd6", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
    {"id": "po2", "round": "Playins", "matchup_name": "Play-In Game 2", "team1_id": "gc5", "team2_id": "gc6", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
    # Wildcards
    {"id": "po3", "round": "Wildcard", "matchup_name": "Wildcard 1", "team1_id": "rd3", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
    {"id": "po4", "round": "Wildcard", "matchup_name": "Wildcard 2", "team1_id": "gc3", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
    # Divisionals
    {"id": "po5", "round": "Divisional", "matchup_name": "Divisional 1", "team1_id": "rd1", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
    {"id": "po6", "round": "Divisional", "matchup_name": "Divisional 2", "team1_id": "gc1", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
    # Conference Championships
    {"id": "po7", "round": "Conference", "matchup_name": "Ridge Championship", "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
    {"id": "po8", "round": "Conference", "matchup_name": "Grand Central Championship", "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
    # United Flag Bowl
    {"id": "po9", "round": "Championship", "matchup_name": "United Flag Bowl", "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False},
]

# ==================== AWARDS DATA ====================
AWARDS = [
    {"id": "a1", "name": "League MVP", "player_id": "p1", "player_name": "n4w", "team": "Vicksburg Vortex", "season": "2025", "description": "Most Valuable Player"},
    {"id": "a2", "name": "Offensive Player of the Year", "player_id": "p9", "player_name": "RushKing_RB", "team": "New York Guardians", "season": "2025", "description": "Best offensive performance"},
    {"id": "a3", "name": "Defensive Player of the Year", "player_id": "p13", "player_name": "VortexDefender", "team": "Vicksburg Vortex", "season": "2025", "description": "Best defensive performance"},
    {"id": "a4", "name": "Rookie of the Year", "player_id": "p7", "player_name": "NightmareWR1", "team": "Nashville Nightmares", "season": "2025", "description": "Best rookie performance"},
]

# ==================== WATCHLIST ====================
WATCHLIST = []

# ==================== POWER RANKINGS ====================
POWER_RANKINGS = [
    {"rank": 1, "team_id": "rd1", "team_name": "Vicksburg Vortex", "previous_rank": 1, "change": 0, "analysis": "Dominant on both sides of the ball. n4w is playing at an MVP level."},
    {"rank": 2, "team_id": "gc1", "team_name": "Columbus Colts", "previous_rank": 2, "change": 0, "analysis": "Strong contender with excellent balance between offense and defense."},
    {"rank": 3, "team_id": "rd2", "team_name": "New York Guardians", "previous_rank": 4, "change": 1, "analysis": "RushKing_RB has been unstoppable in recent weeks."},
    {"rank": 4, "team_id": "gc2", "team_name": "Evergreen Stags", "previous_rank": 3, "change": -1, "analysis": "Slight dip but still a playoff contender."},
    {"rank": 5, "team_id": "rd3", "team_name": "Saskatoon Stampede", "previous_rank": 5, "change": 0, "analysis": "Consistent performer with playoff potential."},
    {"rank": 6, "team_id": "gc3", "team_name": "Nashville Nightmares", "previous_rank": 7, "change": 1, "analysis": "Rising team with improving offense."},
    {"rank": 7, "team_id": "rd4", "team_name": "Boston Blitz", "previous_rank": 6, "change": -1, "analysis": "Struggling with consistency lately."},
    {"rank": 8, "team_id": "gc4", "team_name": "Seattle Skyclaws", "previous_rank": 8, "change": 0, "analysis": "Middle of the pack, needs improvement."},
    {"rank": 9, "team_id": "rd5", "team_name": "Miami Surge", "previous_rank": 9, "change": 0, "analysis": "Fighting for playoff spot."},
    {"rank": 10, "team_id": "gc5", "team_name": "Phoenix Flames", "previous_rank": 10, "change": 0, "analysis": "Rebuilding season."},
    {"rank": 11, "team_id": "rd6", "team_name": "Denver Dynamos", "previous_rank": 11, "change": 0, "analysis": "Young team developing."},
    {"rank": 12, "team_id": "gc6", "team_name": "Chicago Wolves", "previous_rank": 12, "change": 0, "analysis": "Tough season but showing flashes."},
]

# ==================== HELPER FUNCTIONS ====================
def verify_admin(admin_key: str):
    if admin_key == ADMIN_KEY:
        return "admin"
    return None

def get_player_name(player):
    """Get display name (Roblox username)"""
    return player.get("roblox_username", player.get("name", "Unknown"))

def calculate_fantasy_points(player):
    """Calculate fantasy points based on stats"""
    fp = 0
    # Passing: 1 pt per 25 yards, 4 pts per TD, -2 per INT
    passing = player.get("passing", {})
    fp += passing.get("yards", 0) / 25
    fp += passing.get("touchdowns", 0) * 4
    fp -= passing.get("interceptions", 0) * 2
    
    # Rushing: 1 pt per 10 yards, 6 pts per TD, -2 per fumble
    rushing = player.get("rushing", {})
    fp += rushing.get("yards", 0) / 10
    fp += rushing.get("touchdowns", 0) * 6
    fp -= rushing.get("fumbles", 0) * 2
    
    # Receiving: 1 pt per 10 yards, 6 pts per TD, 1 pt per reception (PPR)
    receiving = player.get("receiving", {})
    fp += receiving.get("yards", 0) / 10
    fp += receiving.get("touchdowns", 0) * 6
    fp += receiving.get("receptions", 0)
    
    # Defense: 1 pt per tackle, 2 pts per sack, 3 pts per INT, 6 pts per TD
    defense = player.get("defense", {})
    fp += defense.get("tackles", 0)
    fp += defense.get("sacks", 0) * 2
    fp += defense.get("interceptions", 0) * 3
    fp += defense.get("td", 0) * 6
    fp += defense.get("safeties", 0) * 2
    
    return round(fp, 1)

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "UFF - United Football League API", "version": "3.0.0"}

# ==================== TEAMS ====================
@api_router.get("/teams")
async def get_teams():
    return TEAMS

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str):
    team = next((t for t in TEAMS if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.get("/teams/{team_id}/analysis")
async def get_team_analysis(team_id: str):
    team = next((t for t in TEAMS if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team_players = [p for p in PLAYERS if p["team_id"] == team_id]
    total_fp = sum(p["fantasy_points"] for p in team_players)
    
    strengths = []
    weaknesses = []
    
    if team["wins"] > team["losses"]:
        strengths.append("Winning record shows team cohesion")
    else:
        weaknesses.append("Struggling to close out games")
    
    if team["points_for"] > 250:
        strengths.append("High-powered offense averaging strong points per game")
    if team["points_against"] < 220:
        strengths.append("Stout defense limiting opponent scoring")
    else:
        weaknesses.append("Defense allowing too many points")
    
    if any(p["is_elite"] for p in team_players):
        strengths.append("Elite talent on roster provides game-changing ability")
    
    return {
        "team_id": team_id,
        "overview": f"The {team['name']} are currently {team['wins']}-{team['losses']} and ranked in the {team['conference']} Conference.",
        "strengths": strengths if strengths else ["Developing young roster"],
        "weaknesses": weaknesses if weaknesses else ["No significant weaknesses"],
        "key_players": [{"name": get_player_name(p), "position": p["position"], "fantasy_points": p["fantasy_points"]} for p in sorted(team_players, key=lambda x: x["fantasy_points"], reverse=True)[:3]],
        "playoff_outlook": f"Currently {'in playoff position' if team.get('playoff_status') else 'fighting for playoff spot'}. Seed: #{team.get('seed', 'TBD')}",
        "total_fantasy_points": total_fp
    }

@api_router.get("/teams/{team_id}/roster")
async def get_team_roster(team_id: str):
    team = next((t for t in TEAMS if t["id"] == team_id), None)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    roster = [p for p in PLAYERS if p["team_id"] == team_id]
    return {
        "team": team,
        "roster": [{
            "id": p["id"],
            "name": get_player_name(p),
            "roblox_username": p["roblox_username"],
            "position": p["position"],
            "is_elite": p["is_elite"],
            "fantasy_points": p["fantasy_points"],
            "games_played": p["games_played"],
            "image": p.get("image")
        } for p in roster]
    }

# ==================== PLAYERS ====================
@api_router.get("/players")
async def get_players(
    position: Optional[str] = None,
    team_id: Optional[str] = None,
    elite_only: bool = False,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    filtered = PLAYERS.copy()
    
    if position:
        filtered = [p for p in filtered if p["position"] == position]
    if team_id:
        filtered = [p for p in filtered if p["team_id"] == team_id]
    if elite_only:
        filtered = [p for p in filtered if p["is_elite"]]
    if search:
        search_lower = search.lower()
        filtered = [p for p in filtered if search_lower in get_player_name(p).lower() or search_lower in p.get("roblox_id", "").lower()]
    
    # Sort by fantasy points
    filtered = sorted(filtered, key=lambda x: x["fantasy_points"], reverse=True)
    
    return [{
        **p,
        "name": get_player_name(p),
        "weekly_scores": [{"week": ws["week"], "points": ws["points"]} for ws in WEEKLY_PLAYER_STATS if ws["player_id"] == p["id"]]
    } for p in filtered[offset:offset + limit]]

@api_router.get("/players/{player_id}")
async def get_player(player_id: str):
    player = next((p for p in PLAYERS if p["id"] == player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    weekly = [ws for ws in WEEKLY_PLAYER_STATS if ws["player_id"] == player_id]
    
    return {
        **player,
        "name": get_player_name(player),
        "weekly_scores": [{"week": ws["week"], "points": ws["points"]} for ws in weekly],
        "weekly_stats": weekly
    }

@api_router.get("/players/{player_id}/analysis")
async def get_player_analysis(player_id: str):
    player = next((p for p in PLAYERS if p["id"] == player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    position = player["position"]
    weekly = [ws for ws in WEEKLY_PLAYER_STATS if ws["player_id"] == player_id]
    
    analysis = {
        "player_id": player_id,
        "name": get_player_name(player),
        "position": position,
        "team": player["team"],
        "fantasy_points": player["fantasy_points"],
        "avg_points": player["fantasy_points"] / player["games_played"] if player["games_played"] > 0 else 0,
        "games_played": player["games_played"],
        "is_elite": player["is_elite"],
        "strengths": [],
        "areas_to_improve": []
    }
    
    if position == "QB":
        passing = player.get("passing", {})
        if passing.get("completion_pct", 0) > 65:
            analysis["strengths"].append("Excellent accuracy")
        if passing.get("touchdowns", 0) > 25:
            analysis["strengths"].append("Elite touchdown producer")
        if passing.get("interceptions", 0) > 10:
            analysis["areas_to_improve"].append("Ball security needs work")
    elif position == "RB":
        rushing = player.get("rushing", {})
        if rushing.get("yards_per_carry", 0) > 5:
            analysis["strengths"].append("Efficient runner")
        if rushing.get("touchdowns", 0) > 10:
            analysis["strengths"].append("Goal line threat")
        if rushing.get("fumbles", 0) > 2:
            analysis["areas_to_improve"].append("Ball security concerns")
    elif position == "WR":
        receiving = player.get("receiving", {})
        if receiving.get("yards", 0) > 1000:
            analysis["strengths"].append("Elite yardage producer")
        if receiving.get("drops", 0) > 4:
            analysis["areas_to_improve"].append("Concentration drops")
    elif position == "DEF":
        defense = player.get("defense", {})
        if defense.get("sacks", 0) > 10:
            analysis["strengths"].append("Elite pass rusher")
        if defense.get("interceptions", 0) > 3:
            analysis["strengths"].append("Ball hawk in coverage")
    
    return analysis

# ==================== STANDINGS ====================
@api_router.get("/standings")
async def get_standings():
    ridge_teams = sorted([t for t in TEAMS if t["conference"] == "Ridge"], key=lambda x: (-x["wins"], x["losses"]))
    gc_teams = sorted([t for t in TEAMS if t["conference"] == "Grand Central"], key=lambda x: (-x["wins"], x["losses"]))
    
    return {
        "ridge": ridge_teams,
        "grand_central": gc_teams,
        "league_structure": {
            "conferences": ["Ridge", "Grand Central"],
            "divisions": {"Ridge": ["East", "West"], "Grand Central": ["North", "South"]},
            "format": "10-team playoff",
            "legend": {"x": "Division Leader", "y": "Wildcard", "z": "Playins"},
            "stats_legend": {"W": "Wins", "L": "Losses", "PCT": "Win Percentage", "PF": "Points For", "PA": "Points Against", "DIFF": "Differential"},
            "playoff_seeds": {
                "1-4": "Division Leaders (Bye to Elite 8)",
                "5-6": "Wildcards (Elite 8)",
                "7-10": "Playins Round"
            }
        }
    }

# ==================== SCHEDULE ====================
@api_router.get("/schedule")
async def get_schedule(week: Optional[int] = None):
    if week:
        return {"week": week, "games": [g for g in GAMES if g["week"] == week]}
    return {"games": GAMES, "total_weeks": max(g["week"] for g in GAMES) if GAMES else 0}

@api_router.get("/schedule/week/{week}")
async def get_week_schedule(week: int):
    week_games = [g for g in GAMES if g["week"] == week]
    return {
        "week": week,
        "games": [{
            **g,
            "home_team": next((t for t in TEAMS if t["id"] == g["home_team_id"]), None),
            "away_team": next((t for t in TEAMS if t["id"] == g["away_team_id"]), None)
        } for g in week_games]
    }

# ==================== PLAYOFFS ====================
@api_router.get("/playoffs")
async def get_playoffs():
    matchups = []
    for p in PLAYOFFS:
        team1 = next((t for t in TEAMS if t["id"] == p["team1_id"]), None) if p["team1_id"] else None
        team2 = next((t for t in TEAMS if t["id"] == p["team2_id"]), None) if p["team2_id"] else None
        matchups.append({
            **p,
            "team1": team1,
            "team2": team2
        })
    return {"matchups": matchups, "rounds": ["Playins", "Wildcard", "Divisional", "Conference", "Championship"]}

# ==================== STAT LEADERS ====================
@api_router.get("/stat-leaders")
async def get_stat_leaders():
    # Passing leaders
    qbs = [p for p in PLAYERS if p["position"] == "QB"]
    passing_leaders = sorted(qbs, key=lambda x: x.get("passing", {}).get("yards", 0), reverse=True)[:5]
    
    # Rushing leaders
    rushing_leaders = sorted(PLAYERS, key=lambda x: x.get("rushing", {}).get("yards", 0), reverse=True)[:5]
    
    # Receiving leaders
    receivers = [p for p in PLAYERS if p["position"] == "WR"]
    receiving_leaders = sorted(receivers, key=lambda x: x.get("receiving", {}).get("yards", 0), reverse=True)[:5]
    
    # Defensive leaders
    defenders = [p for p in PLAYERS if p["position"] == "DEF"]
    defense_leaders = sorted(defenders, key=lambda x: x.get("defense", {}).get("tackles", 0), reverse=True)[:5]
    
    # Fantasy leaders
    fantasy_leaders = sorted(PLAYERS, key=lambda x: x.get("fantasy_points", 0), reverse=True)[:5]
    
    return {
        "passing": [{
            "id": p["id"],
            "name": get_player_name(p),
            "team": p["team"],
            "yards": p.get("passing", {}).get("yards", 0),
            "touchdowns": p.get("passing", {}).get("touchdowns", 0),
            "rating": p.get("passing", {}).get("rating", 0)
        } for p in passing_leaders],
        "rushing": [{
            "id": p["id"],
            "name": get_player_name(p),
            "team": p["team"],
            "yards": p.get("rushing", {}).get("yards", 0),
            "touchdowns": p.get("rushing", {}).get("touchdowns", 0),
            "yards_per_carry": p.get("rushing", {}).get("yards_per_carry", 0)
        } for p in rushing_leaders],
        "receiving": [{
            "id": p["id"],
            "name": get_player_name(p),
            "team": p["team"],
            "yards": p.get("receiving", {}).get("yards", 0),
            "receptions": p.get("receiving", {}).get("receptions", 0),
            "touchdowns": p.get("receiving", {}).get("touchdowns", 0)
        } for p in receiving_leaders],
        "defense": [{
            "id": p["id"],
            "name": get_player_name(p),
            "team": p["team"],
            "tackles": p.get("defense", {}).get("tackles", 0),
            "sacks": p.get("defense", {}).get("sacks", 0),
            "interceptions": p.get("defense", {}).get("interceptions", 0)
        } for p in defense_leaders],
        "fantasy": [{
            "id": p["id"],
            "name": get_player_name(p),
            "team": p["team"],
            "position": p["position"],
            "fantasy_points": p.get("fantasy_points", 0)
        } for p in fantasy_leaders]
    }

# ==================== DASHBOARD ====================
@api_router.get("/dashboard")
async def get_dashboard():
    # Top performers this week
    latest_week = max(g["week"] for g in GAMES) if GAMES else 1
    week_stats = [ws for ws in WEEKLY_PLAYER_STATS if ws["week"] == latest_week]
    top_performers = sorted(week_stats, key=lambda x: x["points"], reverse=True)[:5]
    
    return {
        "top_performers": [{
            "player": next((p for p in PLAYERS if p["id"] == tp["player_id"]), {}),
            "points": tp["points"],
            "week": tp["week"]
        } for tp in top_performers],
        "recent_games": GAMES[-6:],
        "power_rankings": POWER_RANKINGS[:5],
        "recent_trades": TRADES[:3],
        "league_stats": {
            "total_teams": len(TEAMS),
            "total_players": len(PLAYERS),
            "total_games": len(GAMES),
            "current_week": latest_week
        }
    }

# ==================== OTHER ENDPOINTS ====================
@api_router.get("/trades")
async def get_trades():
    return TRADES

@api_router.get("/awards")
async def get_awards():
    return AWARDS

@api_router.get("/power-rankings")
async def get_power_rankings():
    return POWER_RANKINGS

@api_router.get("/watchlist")
async def get_watchlist():
    return [next((p for p in PLAYERS if p["id"] == w), None) for w in WATCHLIST if next((p for p in PLAYERS if p["id"] == w), None)]

@api_router.post("/watchlist")
async def add_to_watchlist(item: WatchlistItem):
    if item.player_id not in WATCHLIST:
        WATCHLIST.append(item.player_id)
    return {"success": True, "watchlist": WATCHLIST}

@api_router.delete("/watchlist/{player_id}")
async def remove_from_watchlist(player_id: str):
    if player_id in WATCHLIST:
        WATCHLIST.remove(player_id)
    return {"success": True, "watchlist": WATCHLIST}

@api_router.get("/player-analytics")
async def get_player_analytics():
    return {
        "passing": sorted([p for p in PLAYERS if p["position"] == "QB"], key=lambda x: x["fantasy_points"], reverse=True),
        "rushing": sorted([p for p in PLAYERS if p["position"] == "RB"], key=lambda x: x["fantasy_points"], reverse=True),
        "receiving": sorted([p for p in PLAYERS if p["position"] == "WR"], key=lambda x: x["fantasy_points"], reverse=True),
        "defense": sorted([p for p in PLAYERS if p["position"] == "DEF"], key=lambda x: x["fantasy_points"], reverse=True)
    }

# ==================== ROBLOX API INTEGRATION ====================
@api_router.get("/roblox/user/{user_id}")
async def get_roblox_user(user_id: str):
    """Fetch Roblox user info by ID"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://users.roblox.com/v1/users/{user_id}")
            if response.status_code == 200:
                data = response.json()
                return {
                    "id": data.get("id"),
                    "name": data.get("name"),
                    "displayName": data.get("displayName"),
                    "created": data.get("created")
                }
            else:
                raise HTTPException(status_code=404, detail="Roblox user not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Roblox user: {str(e)}")

@api_router.get("/roblox/avatar/{user_id}")
async def get_roblox_avatar(user_id: str):
    """Fetch Roblox user avatar by ID"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds={user_id}&size=150x150&format=Png")
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    return {"avatar_url": data["data"][0].get("imageUrl")}
            raise HTTPException(status_code=404, detail="Avatar not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch avatar: {str(e)}")

@api_router.get("/roblox/search/{username}")
async def search_roblox_user(username: str):
    """Search for Roblox user by username"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://users.roblox.com/v1/usernames/users",
                json={"usernames": [username], "excludeBannedUsers": True}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    user = data["data"][0]
                    # Get avatar too
                    avatar_resp = await client.get(f"https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds={user['id']}&size=150x150&format=Png")
                    avatar_url = None
                    if avatar_resp.status_code == 200:
                        avatar_data = avatar_resp.json()
                        if avatar_data.get("data") and len(avatar_data["data"]) > 0:
                            avatar_url = avatar_data["data"][0].get("imageUrl")
                    return {
                        "id": user.get("id"),
                        "name": user.get("name"),
                        "displayName": user.get("displayName"),
                        "avatar_url": avatar_url
                    }
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search user: {str(e)}")

# ==================== ADMIN ENDPOINTS ====================
@api_router.get("/admin/stats")
async def get_admin_stats(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return {
        "total_teams": len(TEAMS),
        "total_players": len(PLAYERS),
        "total_games": len(GAMES),
        "total_trades": len(TRADES),
        "elite_players": len([p for p in PLAYERS if p["is_elite"]]),
        "playoff_teams": len([t for t in TEAMS if t.get("playoff_status")]),
        "total_admins": len(ADMINS)
    }

@api_router.get("/admin/admins")
async def get_admins(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return [{"username": k, "role": v["role"], "created": v["created"]} for k, v in ADMINS.items()]

@api_router.post("/admin/admins")
async def create_admin(new_admin: NewAdmin, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    if new_admin.username in ADMINS:
        raise HTTPException(status_code=400, detail="Admin already exists")
    ADMINS[new_admin.username] = {
        "password_hash": hashlib.sha256(new_admin.password.encode()).hexdigest(),
        "role": new_admin.role,
        "created": datetime.now(timezone.utc).isoformat()
    }
    log_admin_activity(admin, "CREATE_ADMIN", f"Created admin: {new_admin.username}")
    return {"success": True}

@api_router.delete("/admin/admins/{username}")
async def delete_admin(username: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete super admin")
    if username in ADMINS:
        del ADMINS[username]
        log_admin_activity(admin, "DELETE_ADMIN", f"Deleted admin: {username}")
    return {"success": True}

@api_router.get("/admin/activity-log")
async def get_activity_log(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return ADMIN_ACTIVITY_LOG

@api_router.get("/admin/playoffs")
async def get_admin_playoffs(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return {"matchups": PLAYOFFS}

@api_router.put("/admin/playoff/{matchup_id}")
async def update_playoff(matchup_id: str, update: PlayoffUpdate, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, p in enumerate(PLAYOFFS):
        if p["id"] == matchup_id:
            if update.team1_score is not None:
                PLAYOFFS[i]["team1_score"] = update.team1_score
            if update.team2_score is not None:
                PLAYOFFS[i]["team2_score"] = update.team2_score
            if update.winner_id is not None:
                PLAYOFFS[i]["winner_id"] = update.winner_id
            if update.is_completed is not None:
                PLAYOFFS[i]["is_completed"] = update.is_completed
            log_admin_activity(admin, "UPDATE_PLAYOFF", f"Updated playoff: {p['matchup_name']}")
            return PLAYOFFS[i]
    raise HTTPException(status_code=404, detail="Matchup not found")

# Player Management
@api_router.post("/admin/player")
async def create_player(player: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    new_player = {
        "id": f"p{len(PLAYERS) + 1}",
        "roblox_id": player.get("roblox_id", ""),
        "roblox_username": player.get("roblox_username", player.get("name", "Unknown")),
        "position": player.get("position", "QB"),
        "team": player.get("team", ""),
        "team_id": player.get("team_id", ""),
        "is_elite": player.get("is_elite", False),
        "image": player.get("image"),
        "games_played": 0,
        "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
        "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "yards_per_carry": 0, "fumbles": 0, "twenty_plus": 0, "longest": 0},
        "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
        "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
        "fantasy_points": 0
    }
    PLAYERS.append(new_player)
    log_admin_activity(admin, "CREATE_PLAYER", f"Created player: {new_player['roblox_username']}")
    return new_player

@api_router.put("/admin/player/{player_id}")
async def update_player(player_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, p in enumerate(PLAYERS):
        if p["id"] == player_id:
            # Handle name -> roblox_username
            if "name" in updates and "roblox_username" not in updates:
                updates["roblox_username"] = updates.pop("name")
            PLAYERS[i] = {**p, **updates}
            log_admin_activity(admin, "UPDATE_PLAYER", f"Updated player: {get_player_name(p)}")
            return PLAYERS[i]
    raise HTTPException(status_code=404, detail="Player not found")

@api_router.put("/admin/player/{player_id}/stats")
async def update_player_stats(player_id: str, stats: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, p in enumerate(PLAYERS):
        if p["id"] == player_id:
            # Update individual stat categories
            for category in ["passing", "rushing", "receiving", "defense"]:
                if category in stats:
                    PLAYERS[i][category] = {**PLAYERS[i].get(category, {}), **stats[category]}
            # Recalculate fantasy points
            PLAYERS[i]["fantasy_points"] = calculate_fantasy_points(PLAYERS[i])
            log_admin_activity(admin, "UPDATE_PLAYER_STATS", f"Updated stats for: {get_player_name(p)}")
            return PLAYERS[i]
    raise HTTPException(status_code=404, detail="Player not found")

@api_router.delete("/admin/player/{player_id}")
async def delete_player(player_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, p in enumerate(PLAYERS):
        if p["id"] == player_id:
            player_name = get_player_name(p)
            PLAYERS.pop(i)
            log_admin_activity(admin, "DELETE_PLAYER", f"Deleted player: {player_name}")
            return {"success": True}
    raise HTTPException(status_code=404, detail="Player not found")

@api_router.get("/admin/player/search-roblox")
async def search_player_by_roblox(
    roblox_id: Optional[str] = None,
    roblox_username: Optional[str] = None,
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    results = []
    for p in PLAYERS:
        if roblox_id and p.get("roblox_id") == roblox_id:
            results.append(p)
        elif roblox_username and roblox_username.lower() in p.get("roblox_username", "").lower():
            results.append(p)
    return results

@api_router.post("/admin/player/merge")
async def merge_players(merge: PlayerMerge, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    source = next((p for p in PLAYERS if p["id"] == merge.source_player_id), None)
    target = next((p for p in PLAYERS if p["id"] == merge.target_player_id), None)
    
    if not source or not target:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Merge stats
    for category in ["passing", "rushing", "receiving", "defense"]:
        for key in target.get(category, {}):
            if isinstance(target[category].get(key), (int, float)):
                target[category][key] = target[category].get(key, 0) + source.get(category, {}).get(key, 0)
    
    target["games_played"] = target.get("games_played", 0) + source.get("games_played", 0)
    target["fantasy_points"] = calculate_fantasy_points(target)
    
    if merge.keep_name == "source":
        target["roblox_username"] = source["roblox_username"]
        target["roblox_id"] = source.get("roblox_id")
    
    # Remove source player
    PLAYERS.remove(source)
    log_admin_activity(admin, "MERGE_PLAYERS", f"Merged {get_player_name(source)} into {get_player_name(target)}")
    
    return target

# Team Management
@api_router.put("/admin/team/{team_id}")
async def update_team(team_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, t in enumerate(TEAMS):
        if t["id"] == team_id:
            TEAMS[i] = {**t, **updates}
            log_admin_activity(admin, "UPDATE_TEAM", f"Updated team: {t['name']}")
            return TEAMS[i]
    raise HTTPException(status_code=404, detail="Team not found")

@api_router.put("/admin/team/{team_id}/branding")
async def update_team_branding(team_id: str, color: str = "", logo: str = "", admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, t in enumerate(TEAMS):
        if t["id"] == team_id:
            if color:
                TEAMS[i]["color"] = color
            if logo:
                TEAMS[i]["logo"] = logo
            log_admin_activity(admin, "UPDATE_TEAM_BRANDING", f"Updated branding for: {t['name']}")
            return TEAMS[i]
    raise HTTPException(status_code=404, detail="Team not found")

# Game Management
@api_router.post("/admin/game")
async def create_game(game: GameCreate, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    new_game = {
        "id": f"g{len(GAMES) + 1}",
        "week": game.week,
        "home_team_id": game.home_team_id,
        "away_team_id": game.away_team_id,
        "home_score": game.home_score,
        "away_score": game.away_score,
        "is_completed": game.is_completed,
        "player_of_game": game.player_of_game,
        "player_of_game_stats": game.player_of_game_stats,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    GAMES.append(new_game)
    log_admin_activity(admin, "CREATE_GAME", f"Created game: Week {game.week}")
    return new_game

@api_router.put("/admin/game/{game_id}")
async def update_game(game_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, g in enumerate(GAMES):
        if g["id"] == game_id:
            GAMES[i] = {**g, **updates}
            log_admin_activity(admin, "UPDATE_GAME", f"Updated game: {game_id}")
            return GAMES[i]
    raise HTTPException(status_code=404, detail="Game not found")

@api_router.delete("/admin/game/{game_id}")
async def delete_game(game_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, g in enumerate(GAMES):
        if g["id"] == game_id:
            GAMES.pop(i)
            log_admin_activity(admin, "DELETE_GAME", f"Deleted game: {game_id}")
            return {"success": True}
    raise HTTPException(status_code=404, detail="Game not found")

@api_router.post("/admin/game/bulk-delete")
async def bulk_delete_games(data: BulkDeleteGames, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    global GAMES
    original_count = len(GAMES)
    GAMES = [g for g in GAMES if not (data.start_week <= g["week"] <= data.end_week)]
    deleted_count = original_count - len(GAMES)
    log_admin_activity(admin, "BULK_DELETE_GAMES", f"Deleted {deleted_count} games from week {data.start_week} to {data.end_week}")
    return {"success": True, "deleted_count": deleted_count}

@api_router.post("/admin/game/clone")
async def clone_game(data: CloneGame, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    game = next((g for g in GAMES if g["id"] == data.game_id), None)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    new_game = {**game, "id": f"g{len(GAMES) + 1}", "week": data.target_week, "home_score": 0, "away_score": 0, "is_completed": False, "player_of_game": None}
    GAMES.append(new_game)
    log_admin_activity(admin, "CLONE_GAME", f"Cloned game to week {data.target_week}")
    return new_game

@api_router.get("/admin/games/export")
async def export_games(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Week", "Home Team", "Away Team", "Home Score", "Away Score", "Completed", "Player of Game"])
    for g in GAMES:
        home = next((t["name"] for t in TEAMS if t["id"] == g["home_team_id"]), g["home_team_id"])
        away = next((t["name"] for t in TEAMS if t["id"] == g["away_team_id"]), g["away_team_id"])
        writer.writerow([g["id"], g["week"], home, away, g["home_score"], g["away_score"], g["is_completed"], g.get("player_of_game", "")])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=games_export.csv"})

# Trade Management
@api_router.post("/admin/trade")
async def create_trade(trade: TradeSetup, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    team1 = next((t for t in TEAMS if t["id"] == trade.team1_id), None)
    team2 = next((t for t in TEAMS if t["id"] == trade.team2_id), None)
    if not team1 or not team2:
        raise HTTPException(status_code=404, detail="Team not found")
    new_trade = {
        "id": f"t{len(TRADES) + 1}",
        "team1_id": trade.team1_id,
        "team1_name": team1["name"],
        "team2_id": trade.team2_id,
        "team2_name": team2["name"],
        "team1_receives": trade.team1_receives,
        "team2_receives": trade.team2_receives,
        "date": datetime.now(timezone.utc).isoformat(),
        "status": "completed"
    }
    TRADES.insert(0, new_trade)
    log_admin_activity(admin, "CREATE_TRADE", f"Trade: {team1['name']} ↔ {team2['name']}")
    return new_trade

# Season Management
@api_router.post("/admin/season/reset")
async def reset_season(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    global GAMES, TRADES, PLAYOFFS, WEEKLY_PLAYER_STATS
    # Reset team records
    for i in range(len(TEAMS)):
        TEAMS[i]["wins"] = 0
        TEAMS[i]["losses"] = 0
        TEAMS[i]["points_for"] = 0
        TEAMS[i]["points_against"] = 0
    # Reset player stats
    for i in range(len(PLAYERS)):
        PLAYERS[i]["games_played"] = 0
        PLAYERS[i]["fantasy_points"] = 0
        for cat in ["passing", "rushing", "receiving", "defense"]:
            for key in PLAYERS[i].get(cat, {}):
                if isinstance(PLAYERS[i][cat].get(key), (int, float)):
                    PLAYERS[i][cat][key] = 0
    GAMES = []
    TRADES = []
    WEEKLY_PLAYER_STATS = []
    # Reset playoffs
    for i in range(len(PLAYOFFS)):
        PLAYOFFS[i]["team1_score"] = 0
        PLAYOFFS[i]["team2_score"] = 0
        PLAYOFFS[i]["winner_id"] = None
        PLAYOFFS[i]["is_completed"] = False
    log_admin_activity(admin, "RESET_SEASON", "Season data reset")
    return {"success": True, "message": "Season reset complete"}

@api_router.get("/admin/validate")
async def validate_data(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    issues = []
    # Check for players without teams
    for p in PLAYERS:
        if not p.get("team_id") or not any(t["id"] == p["team_id"] for t in TEAMS):
            issues.append(f"Player {get_player_name(p)} has invalid team")
    # Check for duplicate IDs
    player_ids = [p["id"] for p in PLAYERS]
    if len(player_ids) != len(set(player_ids)):
        issues.append("Duplicate player IDs found")
    team_ids = [t["id"] for t in TEAMS]
    if len(team_ids) != len(set(team_ids)):
        issues.append("Duplicate team IDs found")
    return {"valid": len(issues) == 0, "issues": issues}

# ==================== APP SETUP ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
