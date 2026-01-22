from fastapi import FastAPI, APIRouter, HTTPException, Header, Query, BackgroundTasks
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
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB Setup
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'uffstats')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

ADMIN_KEY = os.environ.get('ADMIN_KEY', 'BacconIsCool1@')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================
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

class PlayerCreate(BaseModel):
    roblox_id: Optional[str] = None
    roblox_username: str
    position: str = "QB"
    team: str = ""
    team_id: str = ""
    is_elite: bool = False
    image: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================
def verify_admin(admin_key: str):
    if admin_key == ADMIN_KEY:
        return "admin"
    return None

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if k == '_id':
                continue  # Skip MongoDB _id
            result[k] = serialize_doc(v)
        return result
    return doc

async def log_admin_activity(admin: str, action: str, details: str):
    """Log admin activity to database"""
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "admin": admin,
        "action": action,
        "details": details
    })

async def fetch_roblox_avatar(roblox_id: str) -> Optional[str]:
    """Fetch Roblox user avatar URL"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds={roblox_id}&size=150x150&format=Png",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    return data["data"][0].get("imageUrl")
    except Exception as e:
        logger.error(f"Failed to fetch Roblox avatar: {e}")
    return None

async def fetch_roblox_user_by_username(username: str) -> Optional[dict]:
    """Fetch Roblox user info by username"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://users.roblox.com/v1/usernames/users",
                json={"usernames": [username], "excludeBannedUsers": True},
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    user = data["data"][0]
                    # Get avatar
                    avatar_url = await fetch_roblox_avatar(str(user["id"]))
                    return {
                        "id": str(user["id"]),
                        "name": user.get("name"),
                        "displayName": user.get("displayName"),
                        "avatar_url": avatar_url
                    }
    except Exception as e:
        logger.error(f"Failed to fetch Roblox user: {e}")
    return None

def calculate_fantasy_points(player: dict) -> float:
    """Calculate fantasy points based on stats"""
    fp = 0.0
    passing = player.get("passing", {})
    fp += passing.get("yards", 0) / 25
    fp += passing.get("touchdowns", 0) * 4
    fp -= passing.get("interceptions", 0) * 2
    
    rushing = player.get("rushing", {})
    fp += rushing.get("yards", 0) / 10
    fp += rushing.get("touchdowns", 0) * 6
    fp -= rushing.get("fumbles", 0) * 2
    
    receiving = player.get("receiving", {})
    fp += receiving.get("yards", 0) / 10
    fp += receiving.get("touchdowns", 0) * 6
    fp += receiving.get("receptions", 0)
    
    defense = player.get("defense", {})
    fp += defense.get("tackles", 0)
    fp += defense.get("sacks", 0) * 2
    fp += defense.get("interceptions", 0) * 3
    fp += defense.get("td", 0) * 6
    fp += defense.get("safeties", 0) * 2
    
    return round(fp, 1)

# ==================== DATABASE INITIALIZATION ====================
async def init_database():
    """Initialize database with seed data if empty"""
    teams_count = await db.teams.count_documents({})
    if teams_count == 0:
        logger.info("Initializing database with seed data...")
        await seed_database()
        logger.info("Database initialized!")

async def seed_database():
    """Seed the database with initial data"""
    # Teams
    teams = [
        {"id": "rd1", "name": "Vicksburg Vortex", "abbreviation": "VIC", "conference": "Ridge", "division": "East", "color": "#8B5CF6", "logo": None, "wins": 7, "losses": 1, "points_for": 312.5, "points_against": 198.2, "seed": 1, "playoff_status": "x"},
        {"id": "rd2", "name": "New York Guardians", "abbreviation": "NYG", "conference": "Ridge", "division": "East", "color": "#3B82F6", "logo": None, "wins": 6, "losses": 2, "points_for": 289.4, "points_against": 212.1, "seed": 2, "playoff_status": "x"},
        {"id": "rd3", "name": "Saskatoon Stampede", "abbreviation": "SAS", "conference": "Ridge", "division": "West", "color": "#EAB308", "logo": None, "wins": 5, "losses": 3, "points_for": 267.8, "points_against": 234.5, "seed": 3, "playoff_status": "y"},
        {"id": "rd4", "name": "Boston Blitz", "abbreviation": "BOS", "conference": "Ridge", "division": "West", "color": "#DC2626", "logo": None, "wins": 5, "losses": 3, "points_for": 254.2, "points_against": 245.1, "seed": 4, "playoff_status": "y"},
        {"id": "rd5", "name": "Miami Surge", "abbreviation": "MIA", "conference": "Ridge", "division": "East", "color": "#06B6D4", "logo": None, "wins": 4, "losses": 4, "points_for": 241.6, "points_against": 252.3, "seed": 5, "playoff_status": "z"},
        {"id": "rd6", "name": "Denver Dynamos", "abbreviation": "DEN", "conference": "Ridge", "division": "West", "color": "#F97316", "logo": None, "wins": 3, "losses": 5, "points_for": 228.4, "points_against": 267.8, "seed": 6, "playoff_status": "z"},
        {"id": "gc1", "name": "Columbus Colts", "abbreviation": "COL", "conference": "Grand Central", "division": "North", "color": "#10B981", "logo": None, "wins": 7, "losses": 1, "points_for": 298.7, "points_against": 187.3, "seed": 1, "playoff_status": "x"},
        {"id": "gc2", "name": "Evergreen Stags", "abbreviation": "EVG", "conference": "Grand Central", "division": "North", "color": "#22C55E", "logo": None, "wins": 6, "losses": 2, "points_for": 276.3, "points_against": 198.4, "seed": 2, "playoff_status": "x"},
        {"id": "gc3", "name": "Nashville Nightmares", "abbreviation": "NAS", "conference": "Grand Central", "division": "South", "color": "#1F2937", "logo": None, "wins": 5, "losses": 3, "points_for": 258.9, "points_against": 223.5, "seed": 3, "playoff_status": "y"},
        {"id": "gc4", "name": "Seattle Skyclaws", "abbreviation": "SEA", "conference": "Grand Central", "division": "South", "color": "#7C3AED", "logo": None, "wins": 4, "losses": 4, "points_for": 234.5, "points_against": 245.2, "seed": 4, "playoff_status": "y"},
        {"id": "gc5", "name": "Phoenix Flames", "abbreviation": "PHX", "conference": "Grand Central", "division": "North", "color": "#EF4444", "logo": None, "wins": 3, "losses": 5, "points_for": 212.8, "points_against": 256.4, "seed": 5, "playoff_status": "z"},
        {"id": "gc6", "name": "Chicago Wolves", "abbreviation": "CHI", "conference": "Grand Central", "division": "South", "color": "#64748B", "logo": None, "wins": 2, "losses": 6, "points_for": 198.2, "points_against": 278.9, "seed": 6, "playoff_status": "z"},
    ]
    await db.teams.insert_many(teams)

    # Players with Roblox usernames
    players = [
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
    await db.players.insert_many(players)

    # Generate weekly stats
    weekly_stats = []
    for p in players:
        base_fp = p["fantasy_points"] / p["games_played"] if p["games_played"] > 0 else 0
        for week in range(1, p["games_played"] + 1):
            variance = random.uniform(0.7, 1.3)
            weekly_stats.append({
                "player_id": p["id"],
                "week": week,
                "points": round(base_fp * variance, 1)
            })
    await db.weekly_stats.insert_many(weekly_stats)

    # Generate games
    games = []
    game_id = 1
    team_list = [t["id"] for t in teams]
    for week in range(1, 9):
        team_pairs = [(team_list[i], team_list[(i + week) % len(team_list)]) for i in range(0, len(team_list), 2)]
        for home_id, away_id in team_pairs[:6]:
            home_score = round(random.uniform(18, 45), 1)
            away_score = round(random.uniform(14, 42), 1)
            winning_team_id = home_id if home_score > away_score else away_id
            pog = random.choice([p for p in players if p["team_id"] == winning_team_id]) if any(p["team_id"] == winning_team_id for p in players) else None
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
    await db.games.insert_many(games)

    # Playoffs
    playoffs = [
        {"id": "po1", "round": "Playins", "matchup_name": "Play-In Game 1", "team1_id": "rd5", "team2_id": "rd6", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po2", "round": "Playins", "matchup_name": "Play-In Game 2", "team1_id": "gc5", "team2_id": "gc6", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po3", "round": "Wildcard", "matchup_name": "Wildcard 1", "team1_id": "rd3", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po4", "round": "Wildcard", "matchup_name": "Wildcard 2", "team1_id": "gc3", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po5", "round": "Divisional", "matchup_name": "Divisional 1", "team1_id": "rd1", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po6", "round": "Divisional", "matchup_name": "Divisional 2", "team1_id": "gc1", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po7", "round": "Conference", "matchup_name": "Ridge Championship", "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po8", "round": "Conference", "matchup_name": "Grand Central Championship", "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po9", "round": "Championship", "matchup_name": "United Flag Bowl", "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
    ]
    await db.playoffs.insert_many(playoffs)

    # Trades
    trades = [
        {"id": "t1", "team1_id": "rd1", "team1_name": "Vicksburg Vortex", "team2_id": "gc1", "team2_name": "Columbus Colts",
         "team1_receives": ["Draft Pick #12"], "team2_receives": ["Future 1st"], "date": datetime.now(timezone.utc).isoformat(), "status": "completed"},
        {"id": "t2", "team1_id": "rd2", "team1_name": "New York Guardians", "team2_id": "gc3", "team2_name": "Nashville Nightmares",
         "team1_receives": ["Backup QB"], "team2_receives": ["Draft Pick #24"], "date": datetime.now(timezone.utc).isoformat(), "status": "completed"},
    ]
    await db.trades.insert_many(trades)

    # Awards
    awards = [
        {"id": "a1", "name": "League MVP", "player_id": "p1", "player_name": "n4w", "team": "Vicksburg Vortex", "season": "2025"},
        {"id": "a2", "name": "Offensive Player of the Year", "player_id": "p9", "player_name": "RushKing_RB", "team": "New York Guardians", "season": "2025"},
        {"id": "a3", "name": "Defensive Player of the Year", "player_id": "p13", "player_name": "VortexDefender", "team": "Vicksburg Vortex", "season": "2025"},
        {"id": "a4", "name": "Rookie of the Year", "player_id": "p7", "player_name": "NightmareWR1", "team": "Nashville Nightmares", "season": "2025"},
    ]
    await db.awards.insert_many(awards)

    # Power Rankings
    power_rankings = [
        {"rank": 1, "team_id": "rd1", "team_name": "Vicksburg Vortex", "previous_rank": 1, "change": 0, "analysis": "Dominant on both sides. n4w is MVP caliber."},
        {"rank": 2, "team_id": "gc1", "team_name": "Columbus Colts", "previous_rank": 2, "change": 0, "analysis": "Strong contender with excellent balance."},
        {"rank": 3, "team_id": "rd2", "team_name": "New York Guardians", "previous_rank": 4, "change": 1, "analysis": "RushKing_RB unstoppable in recent weeks."},
        {"rank": 4, "team_id": "gc2", "team_name": "Evergreen Stags", "previous_rank": 3, "change": -1, "analysis": "Slight dip but playoff contender."},
        {"rank": 5, "team_id": "rd3", "team_name": "Saskatoon Stampede", "previous_rank": 5, "change": 0, "analysis": "Consistent performer."},
        {"rank": 6, "team_id": "gc3", "team_name": "Nashville Nightmares", "previous_rank": 7, "change": 1, "analysis": "Rising team with improving offense."},
        {"rank": 7, "team_id": "rd4", "team_name": "Boston Blitz", "previous_rank": 6, "change": -1, "analysis": "Struggling with consistency."},
        {"rank": 8, "team_id": "gc4", "team_name": "Seattle Skyclaws", "previous_rank": 8, "change": 0, "analysis": "Middle of the pack."},
        {"rank": 9, "team_id": "rd5", "team_name": "Miami Surge", "previous_rank": 9, "change": 0, "analysis": "Fighting for playoff spot."},
        {"rank": 10, "team_id": "gc5", "team_name": "Phoenix Flames", "previous_rank": 10, "change": 0, "analysis": "Rebuilding season."},
        {"rank": 11, "team_id": "rd6", "team_name": "Denver Dynamos", "previous_rank": 11, "change": 0, "analysis": "Young team developing."},
        {"rank": 12, "team_id": "gc6", "team_name": "Chicago Wolves", "previous_rank": 12, "change": 0, "analysis": "Tough season."},
    ]
    await db.power_rankings.insert_many(power_rankings)

    # Admins
    await db.admins.insert_one({
        "username": "admin",
        "password_hash": hashlib.sha256("BacconIsCool1@".encode()).hexdigest(),
        "role": "super_admin",
        "created": datetime.now(timezone.utc).isoformat()
    })

# ==================== API ROUTES ====================
@api_router.get("/")
async def root():
    return {"message": "UFF - United Football League API", "version": "4.0.0", "database": "MongoDB"}

# Teams
@api_router.get("/teams")
async def get_teams():
    teams = await db.teams.find({}, {"_id": 0}).to_list(100)
    return teams

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.get("/teams/{team_id}/analysis")
async def get_team_analysis(team_id: str):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    players = await db.players.find({"team_id": team_id}, {"_id": 0}).to_list(50)
    total_fp = sum(p.get("fantasy_points", 0) for p in players)
    
    strengths, weaknesses = [], []
    if team["wins"] > team["losses"]:
        strengths.append("Winning record shows team cohesion")
    else:
        weaknesses.append("Struggling to close out games")
    if team.get("points_for", 0) > 250:
        strengths.append("High-powered offense")
    if team.get("points_against", 0) < 220:
        strengths.append("Stout defense")
    else:
        weaknesses.append("Defense allowing too many points")
    if any(p.get("is_elite") for p in players):
        strengths.append("Elite talent on roster")
    
    return {
        "team_id": team_id,
        "overview": f"The {team['name']} are {team['wins']}-{team['losses']} in the {team['conference']} Conference.",
        "strengths": strengths or ["Developing roster"],
        "weaknesses": weaknesses or ["No significant weaknesses"],
        "key_players": [{"name": p.get("roblox_username"), "position": p["position"], "fantasy_points": p.get("fantasy_points", 0)} for p in sorted(players, key=lambda x: x.get("fantasy_points", 0), reverse=True)[:3]],
        "playoff_outlook": f"{'In playoff position' if team.get('playoff_status') else 'Fighting for spot'}. Seed: #{team.get('seed', 'TBD')}",
        "total_fantasy_points": total_fp
    }

@api_router.get("/teams/{team_id}/roster")
async def get_team_roster(team_id: str):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    roster = await db.players.find({"team_id": team_id}, {"_id": 0}).to_list(50)
    return {"team": team, "roster": roster}

# Players
@api_router.get("/players")
async def get_players(position: Optional[str] = None, team_id: Optional[str] = None, elite_only: bool = False, search: Optional[str] = None, limit: int = 50, offset: int = 0):
    query = {}
    if position:
        query["position"] = position
    if team_id:
        query["team_id"] = team_id
    if elite_only:
        query["is_elite"] = True
    if search:
        query["$or"] = [{"roblox_username": {"$regex": search, "$options": "i"}}, {"roblox_id": {"$regex": search, "$options": "i"}}]
    
    players = await db.players.find(query, {"_id": 0}).sort("fantasy_points", -1).skip(offset).limit(limit).to_list(limit)
    
    # Add weekly scores
    for p in players:
        weekly = await db.weekly_stats.find({"player_id": p["id"]}, {"_id": 0}).to_list(20)
        p["weekly_scores"] = [{"week": w["week"], "points": w["points"]} for w in weekly]
        p["name"] = p.get("roblox_username", "Unknown")
    
    return players

@api_router.get("/players/{player_id}")
async def get_player(player_id: str):
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    weekly = await db.weekly_stats.find({"player_id": player_id}, {"_id": 0}).to_list(20)
    player["weekly_scores"] = [{"week": w["week"], "points": w["points"]} for w in weekly]
    player["name"] = player.get("roblox_username", "Unknown")
    return player

@api_router.get("/players/{player_id}/analysis")
async def get_player_analysis(player_id: str):
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"player_id": player_id, "name": player.get("roblox_username"), "position": player["position"], "team": player.get("team"), "fantasy_points": player.get("fantasy_points"), "is_elite": player.get("is_elite")}

# Standings
@api_router.get("/standings")
async def get_standings():
    ridge = await db.teams.find({"conference": "Ridge"}, {"_id": 0}).sort([("wins", -1), ("losses", 1)]).to_list(20)
    gc = await db.teams.find({"conference": "Grand Central"}, {"_id": 0}).sort([("wins", -1), ("losses", 1)]).to_list(20)
    return {
        "ridge": ridge,
        "grand_central": gc,
        "league_structure": {
            "conferences": ["Ridge", "Grand Central"],
            "divisions": {"Ridge": ["East", "West"], "Grand Central": ["North", "South"]},
            "format": "10-team playoff",
            "legend": {"x": "Division Leader", "y": "Wildcard", "z": "Playins"},
            "stats_legend": {"W": "Wins", "L": "Losses", "PCT": "Win Percentage", "PF": "Points For", "PA": "Points Against", "DIFF": "Differential"}
        }
    }

# Schedule
@api_router.get("/schedule")
async def get_schedule(week: Optional[int] = None):
    query = {"week": week} if week else {}
    games = await db.games.find(query, {"_id": 0}).to_list(100)
    total_weeks = max((g["week"] for g in games), default=0) if games else 0
    return {"games": games, "total_weeks": total_weeks}

# Playoffs with animation states
@api_router.get("/playoffs")
async def get_playoffs():
    matchups = await db.playoffs.find({}, {"_id": 0}).to_list(20)
    teams_list = await db.teams.find({}, {"_id": 0}).to_list(20)
    teams_map = {t["id"]: t for t in teams_list}
    
    for m in matchups:
        m["team1"] = teams_map.get(m.get("team1_id"))
        m["team2"] = teams_map.get(m.get("team2_id"))
    
    return {"matchups": matchups, "rounds": ["Playins", "Wildcard", "Divisional", "Conference", "Championship"]}

# Other endpoints
@api_router.get("/trades")
async def get_trades():
    return await db.trades.find({}, {"_id": 0}).sort("date", -1).to_list(50)

@api_router.get("/awards")
async def get_awards():
    return await db.awards.find({}, {"_id": 0}).to_list(20)

@api_router.get("/power-rankings")
async def get_power_rankings():
    return await db.power_rankings.find({}, {"_id": 0}).sort("rank", 1).to_list(20)

@api_router.get("/stat-leaders")
async def get_stat_leaders():
    players = await db.players.find({}, {"_id": 0}).to_list(100)
    qbs = [p for p in players if p["position"] == "QB"]
    return {
        "passing": sorted(qbs, key=lambda x: x.get("passing", {}).get("yards", 0), reverse=True)[:5],
        "rushing": sorted(players, key=lambda x: x.get("rushing", {}).get("yards", 0), reverse=True)[:5],
        "receiving": sorted([p for p in players if p["position"] == "WR"], key=lambda x: x.get("receiving", {}).get("yards", 0), reverse=True)[:5],
        "defense": sorted([p for p in players if p["position"] == "DEF"], key=lambda x: x.get("defense", {}).get("tackles", 0), reverse=True)[:5],
        "fantasy": sorted(players, key=lambda x: x.get("fantasy_points", 0), reverse=True)[:5]
    }

@api_router.get("/dashboard")
async def get_dashboard():
    games = await db.games.find({}, {"_id": 0}).sort("week", -1).to_list(100)
    latest_week = max((g["week"] for g in games), default=1) if games else 1
    weekly = await db.weekly_stats.find({"week": latest_week}, {"_id": 0}).sort("points", -1).to_list(10)
    players = await db.players.find({}, {"_id": 0}).to_list(100)
    players_map = {p["id"]: p for p in players}
    
    top_performers = []
    for ws in weekly[:5]:
        player = players_map.get(ws["player_id"])
        if player:
            top_performers.append({"player": player, "points": ws["points"], "week": ws["week"]})
    
    power_rankings = await db.power_rankings.find({}, {"_id": 0}).sort("rank", 1).to_list(5)
    trades = await db.trades.find({}, {"_id": 0}).sort("date", -1).to_list(3)
    
    return {
        "top_performers": top_performers,
        "recent_games": games[:6],
        "power_rankings": power_rankings,
        "recent_trades": trades,
        "league_stats": {"total_teams": 12, "total_players": len(players), "total_games": len(games), "current_week": latest_week}
    }

# Watchlist
@api_router.get("/watchlist")
async def get_watchlist():
    watchlist = await db.watchlist.find({}, {"_id": 0}).to_list(50)
    player_ids = [w["player_id"] for w in watchlist]
    players = await db.players.find({"id": {"$in": player_ids}}, {"_id": 0}).to_list(50)
    return players

@api_router.post("/watchlist")
async def add_to_watchlist(item: WatchlistItem):
    existing = await db.watchlist.find_one({"player_id": item.player_id})
    if not existing:
        await db.watchlist.insert_one({"player_id": item.player_id})
    return {"success": True}

@api_router.delete("/watchlist/{player_id}")
async def remove_from_watchlist(player_id: str):
    await db.watchlist.delete_one({"player_id": player_id})
    return {"success": True}

@api_router.get("/player-analytics")
async def get_player_analytics():
    players = await db.players.find({}, {"_id": 0}).to_list(100)
    return {
        "passing": sorted([p for p in players if p["position"] == "QB"], key=lambda x: x.get("fantasy_points", 0), reverse=True),
        "rushing": sorted([p for p in players if p["position"] == "RB"], key=lambda x: x.get("fantasy_points", 0), reverse=True),
        "receiving": sorted([p for p in players if p["position"] == "WR"], key=lambda x: x.get("fantasy_points", 0), reverse=True),
        "defense": sorted([p for p in players if p["position"] == "DEF"], key=lambda x: x.get("fantasy_points", 0), reverse=True)
    }

# ==================== ROBLOX API ====================
@api_router.get("/roblox/user/{user_id}")
async def get_roblox_user(user_id: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://users.roblox.com/v1/users/{user_id}", timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                avatar_url = await fetch_roblox_avatar(user_id)
                return {"id": data.get("id"), "name": data.get("name"), "displayName": data.get("displayName"), "avatar_url": avatar_url}
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/roblox/avatar/{user_id}")
async def get_roblox_avatar(user_id: str):
    avatar_url = await fetch_roblox_avatar(user_id)
    if avatar_url:
        return {"avatar_url": avatar_url}
    raise HTTPException(status_code=404, detail="Avatar not found")

@api_router.get("/roblox/search/{username}")
async def search_roblox_user(username: str):
    user = await fetch_roblox_user_by_username(username)
    if user:
        return user
    raise HTTPException(status_code=404, detail="User not found")

# ==================== ADMIN ENDPOINTS ====================
@api_router.get("/admin/stats")
async def get_admin_stats(admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    teams_count = await db.teams.count_documents({})
    players_count = await db.players.count_documents({})
    games_count = await db.games.count_documents({})
    trades_count = await db.trades.count_documents({})
    elite_count = await db.players.count_documents({"is_elite": True})
    playoff_count = await db.teams.count_documents({"playoff_status": {"$ne": None}})
    admins_count = await db.admins.count_documents({})
    return {"total_teams": teams_count, "total_players": players_count, "total_games": games_count, "total_trades": trades_count, "elite_players": elite_count, "playoff_teams": playoff_count, "total_admins": admins_count}

@api_router.get("/admin/admins")
async def get_admins(admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    admins = await db.admins.find({}, {"_id": 0, "password_hash": 0}).to_list(50)
    return admins

@api_router.post("/admin/admins")
async def create_admin(new_admin: NewAdmin, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    existing = await db.admins.find_one({"username": new_admin.username})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")
    await db.admins.insert_one({"username": new_admin.username, "password_hash": hashlib.sha256(new_admin.password.encode()).hexdigest(), "role": new_admin.role, "created": datetime.now(timezone.utc).isoformat()})
    await log_admin_activity("admin", "CREATE_ADMIN", f"Created admin: {new_admin.username}")
    return {"success": True}

@api_router.delete("/admin/admins/{username}")
async def delete_admin(username: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete super admin")
    await db.admins.delete_one({"username": username})
    await log_admin_activity("admin", "DELETE_ADMIN", f"Deleted admin: {username}")
    return {"success": True}

@api_router.get("/admin/activity-log")
async def get_activity_log(admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    logs = await db.activity_log.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return logs

@api_router.get("/admin/playoffs")
async def get_admin_playoffs(admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    matchups = await db.playoffs.find({}, {"_id": 0}).to_list(20)
    return {"matchups": matchups}

@api_router.put("/admin/playoff/{matchup_id}")
async def update_playoff(matchup_id: str, update: PlayoffUpdate, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    updates = {}
    if update.team1_score is not None:
        updates["team1_score"] = update.team1_score
    if update.team2_score is not None:
        updates["team2_score"] = update.team2_score
    if update.winner_id is not None:
        updates["winner_id"] = update.winner_id
        updates["animation_state"] = "advancing"  # Trigger animation
    if update.is_completed is not None:
        updates["is_completed"] = update.is_completed
        if update.is_completed:
            updates["animation_state"] = "completed"
    
    await db.playoffs.update_one({"id": matchup_id}, {"$set": updates})
    await log_admin_activity("admin", "UPDATE_PLAYOFF", f"Updated playoff: {matchup_id}")
    matchup = await db.playoffs.find_one({"id": matchup_id}, {"_id": 0})
    return matchup

# Player Admin
@api_router.post("/admin/player")
async def create_player(player: PlayerCreate, background_tasks: BackgroundTasks, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    count = await db.players.count_documents({})
    new_player = {
        "id": f"p{count + 1}",
        "roblox_id": player.roblox_id or "",
        "roblox_username": player.roblox_username,
        "position": player.position,
        "team": player.team,
        "team_id": player.team_id,
        "is_elite": player.is_elite,
        "image": player.image,
        "games_played": 0,
        "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
        "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "yards_per_carry": 0, "fumbles": 0, "twenty_plus": 0, "longest": 0},
        "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
        "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0},
        "fantasy_points": 0
    }
    
    # Auto-fetch Roblox avatar if roblox_id provided and no image
    if player.roblox_id and not player.image:
        avatar_url = await fetch_roblox_avatar(player.roblox_id)
        if avatar_url:
            new_player["image"] = avatar_url
    elif not player.roblox_id and player.roblox_username and not player.image:
        # Try to fetch by username
        roblox_user = await fetch_roblox_user_by_username(player.roblox_username)
        if roblox_user:
            new_player["roblox_id"] = roblox_user["id"]
            if roblox_user.get("avatar_url"):
                new_player["image"] = roblox_user["avatar_url"]
    
    await db.players.insert_one(new_player)
    await log_admin_activity("admin", "CREATE_PLAYER", f"Created player: {player.roblox_username}")
    new_player.pop("_id", None)
    return new_player

@api_router.put("/admin/player/{player_id}")
async def update_player(player_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    # Auto-fetch avatar if roblox_id changed and no image provided
    if updates.get("roblox_id") and not updates.get("image"):
        avatar_url = await fetch_roblox_avatar(updates["roblox_id"])
        if avatar_url:
            updates["image"] = avatar_url
    
    await db.players.update_one({"id": player_id}, {"$set": updates})
    await log_admin_activity("admin", "UPDATE_PLAYER", f"Updated player: {player_id}")
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    return player

@api_router.put("/admin/player/{player_id}/stats")
async def update_player_stats(player_id: str, stats: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    updates = {}
    for cat in ["passing", "rushing", "receiving", "defense"]:
        if cat in stats:
            updates[cat] = {**player.get(cat, {}), **stats[cat]}
    
    # Recalculate fantasy points
    updated_player = {**player, **updates}
    updates["fantasy_points"] = calculate_fantasy_points(updated_player)
    
    await db.players.update_one({"id": player_id}, {"$set": updates})
    await log_admin_activity("admin", "UPDATE_PLAYER_STATS", f"Updated stats: {player_id}")
    return await db.players.find_one({"id": player_id}, {"_id": 0})

@api_router.delete("/admin/player/{player_id}")
async def delete_player(player_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    await db.players.delete_one({"id": player_id})
    await db.weekly_stats.delete_many({"player_id": player_id})
    await log_admin_activity("admin", "DELETE_PLAYER", f"Deleted player: {player_id}")
    return {"success": True}

@api_router.get("/admin/player/search-roblox")
async def admin_search_roblox(roblox_id: Optional[str] = None, roblox_username: Optional[str] = None, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    query = {}
    if roblox_id:
        query["roblox_id"] = roblox_id
    if roblox_username:
        query["roblox_username"] = {"$regex": roblox_username, "$options": "i"}
    results = await db.players.find(query, {"_id": 0}).to_list(20)
    return results

@api_router.post("/admin/player/merge")
async def merge_players(merge: PlayerMerge, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    source = await db.players.find_one({"id": merge.source_player_id})
    target = await db.players.find_one({"id": merge.target_player_id})
    if not source or not target:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Merge stats
    updates = {}
    for cat in ["passing", "rushing", "receiving", "defense"]:
        merged = {}
        for key in set(list(target.get(cat, {}).keys()) + list(source.get(cat, {}).keys())):
            t_val = target.get(cat, {}).get(key, 0)
            s_val = source.get(cat, {}).get(key, 0)
            if isinstance(t_val, (int, float)) and isinstance(s_val, (int, float)):
                merged[key] = t_val + s_val
            else:
                merged[key] = t_val or s_val
        updates[cat] = merged
    
    updates["games_played"] = target.get("games_played", 0) + source.get("games_played", 0)
    if merge.keep_name == "source":
        updates["roblox_username"] = source["roblox_username"]
        updates["roblox_id"] = source.get("roblox_id")
    
    updated_target = {**target, **updates}
    updates["fantasy_points"] = calculate_fantasy_points(updated_target)
    
    await db.players.update_one({"id": merge.target_player_id}, {"$set": updates})
    await db.players.delete_one({"id": merge.source_player_id})
    await db.weekly_stats.update_many({"player_id": merge.source_player_id}, {"$set": {"player_id": merge.target_player_id}})
    await log_admin_activity("admin", "MERGE_PLAYERS", f"Merged {source.get('roblox_username')} into {target.get('roblox_username')}")
    
    return await db.players.find_one({"id": merge.target_player_id}, {"_id": 0})

@api_router.post("/admin/player/{player_id}/fetch-avatar")
async def fetch_player_avatar(player_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Fetch and update player's Roblox avatar"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    roblox_id = player.get("roblox_id")
    if not roblox_id:
        # Try to get ID from username
        roblox_user = await fetch_roblox_user_by_username(player.get("roblox_username", ""))
        if roblox_user:
            roblox_id = roblox_user["id"]
            await db.players.update_one({"id": player_id}, {"$set": {"roblox_id": roblox_id}})
    
    if roblox_id:
        avatar_url = await fetch_roblox_avatar(roblox_id)
        if avatar_url:
            await db.players.update_one({"id": player_id}, {"$set": {"image": avatar_url}})
            return {"success": True, "avatar_url": avatar_url}
    
    raise HTTPException(status_code=404, detail="Could not fetch avatar")

# Team Admin
@api_router.put("/admin/team/{team_id}")
async def update_team(team_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    await db.teams.update_one({"id": team_id}, {"$set": updates})
    await log_admin_activity("admin", "UPDATE_TEAM", f"Updated team: {team_id}")
    return await db.teams.find_one({"id": team_id}, {"_id": 0})

@api_router.put("/admin/team/{team_id}/branding")
async def update_team_branding(team_id: str, color: str = "", logo: str = "", admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    updates = {}
    if color:
        updates["color"] = color
    if logo:
        updates["logo"] = logo
    await db.teams.update_one({"id": team_id}, {"$set": updates})
    await log_admin_activity("admin", "UPDATE_TEAM_BRANDING", f"Updated branding: {team_id}")
    return await db.teams.find_one({"id": team_id}, {"_id": 0})

# Game Admin
@api_router.post("/admin/game")
async def create_game(game: GameCreate, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    count = await db.games.count_documents({})
    new_game = {"id": f"g{count + 1}", "week": game.week, "home_team_id": game.home_team_id, "away_team_id": game.away_team_id, "home_score": game.home_score, "away_score": game.away_score, "is_completed": game.is_completed, "player_of_game": game.player_of_game, "player_of_game_stats": game.player_of_game_stats, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    await db.games.insert_one(new_game)
    await log_admin_activity("admin", "CREATE_GAME", f"Created game: Week {game.week}")
    new_game.pop("_id", None)
    return new_game

@api_router.put("/admin/game/{game_id}")
async def update_game(game_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    await db.games.update_one({"id": game_id}, {"$set": updates})
    await log_admin_activity("admin", "UPDATE_GAME", f"Updated game: {game_id}")
    return await db.games.find_one({"id": game_id}, {"_id": 0})

@api_router.delete("/admin/game/{game_id}")
async def delete_game(game_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    await db.games.delete_one({"id": game_id})
    await log_admin_activity("admin", "DELETE_GAME", f"Deleted game: {game_id}")
    return {"success": True}

@api_router.post("/admin/game/bulk-delete")
async def bulk_delete_games(data: BulkDeleteGames, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    result = await db.games.delete_many({"week": {"$gte": data.start_week, "$lte": data.end_week}})
    await log_admin_activity("admin", "BULK_DELETE_GAMES", f"Deleted {result.deleted_count} games")
    return {"success": True, "deleted_count": result.deleted_count}

@api_router.post("/admin/game/clone")
async def clone_game(data: CloneGame, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    game = await db.games.find_one({"id": data.game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    count = await db.games.count_documents({})
    new_game = {**game, "id": f"g{count + 1}", "week": data.target_week, "home_score": 0, "away_score": 0, "is_completed": False, "player_of_game": None}
    await db.games.insert_one(new_game)
    await log_admin_activity("admin", "CLONE_GAME", f"Cloned to week {data.target_week}")
    new_game.pop("_id", None)
    return new_game

@api_router.get("/admin/games/export")
async def export_games(admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    games = await db.games.find({}, {"_id": 0}).to_list(500)
    teams = await db.teams.find({}, {"_id": 0}).to_list(20)
    teams_map = {t["id"]: t["name"] for t in teams}
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Week", "Home Team", "Away Team", "Home Score", "Away Score", "Completed", "Player of Game"])
    for g in games:
        writer.writerow([g["id"], g["week"], teams_map.get(g["home_team_id"], g["home_team_id"]), teams_map.get(g["away_team_id"], g["away_team_id"]), g["home_score"], g["away_score"], g["is_completed"], g.get("player_of_game", "")])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=games_export.csv"})

# Trade Admin
@api_router.post("/admin/trade")
async def create_trade(trade: TradeSetup, admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    team1 = await db.teams.find_one({"id": trade.team1_id}, {"_id": 0})
    team2 = await db.teams.find_one({"id": trade.team2_id}, {"_id": 0})
    if not team1 or not team2:
        raise HTTPException(status_code=404, detail="Team not found")
    count = await db.trades.count_documents({})
    new_trade = {"id": f"t{count + 1}", "team1_id": trade.team1_id, "team1_name": team1["name"], "team2_id": trade.team2_id, "team2_name": team2["name"], "team1_receives": trade.team1_receives, "team2_receives": trade.team2_receives, "date": datetime.now(timezone.utc).isoformat(), "status": "completed"}
    await db.trades.insert_one(new_trade)
    await log_admin_activity("admin", "CREATE_TRADE", f"Trade: {team1['name']} ↔ {team2['name']}")
    new_trade.pop("_id", None)
    return new_trade

# Season Admin
@api_router.post("/admin/season/reset")
async def reset_season(admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    await db.teams.update_many({}, {"$set": {"wins": 0, "losses": 0, "points_for": 0, "points_against": 0}})
    await db.players.update_many({}, {"$set": {"games_played": 0, "fantasy_points": 0, "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0}, "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "yards_per_carry": 0, "fumbles": 0, "twenty_plus": 0, "longest": 0}, "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0}, "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "safeties": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0}}})
    await db.games.delete_many({})
    await db.trades.delete_many({})
    await db.weekly_stats.delete_many({})
    await db.playoffs.update_many({}, {"$set": {"team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"}})
    await log_admin_activity("admin", "RESET_SEASON", "Season data reset")
    return {"success": True, "message": "Season reset complete"}

@api_router.get("/admin/validate")
async def validate_data(admin_key: str = Header(None, alias="X-Admin-Key")):
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    issues = []
    players = await db.players.find({}, {"_id": 0}).to_list(200)
    teams = await db.teams.find({}, {"_id": 0}).to_list(20)
    team_ids = {t["id"] for t in teams}
    for p in players:
        if p.get("team_id") and p["team_id"] not in team_ids:
            issues.append(f"Player {p.get('roblox_username')} has invalid team")
    return {"valid": len(issues) == 0, "issues": issues}

# ==================== APP SETUP ====================
@app.on_event("startup")
async def startup_event():
    await init_database()

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
