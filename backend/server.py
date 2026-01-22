from fastapi import FastAPI, APIRouter, HTTPException, Header, Query, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import csv
import httpx
import re
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
STATIC_DIR = (ROOT_DIR / ".." / "static").resolve()
UPLOADS_DIR = (ROOT_DIR / ".." / "uploads").resolve()
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB Setup
mongo_url = os.environ.get('MONGO_URL', 'mongodb+srv://UFFstats:KamIsCool1@cluster0.5qos1zx.mongodb.net/')
db_name = os.environ.get('DB_NAME', 'uffstats')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

ADMIN_KEY = os.environ.get('ADMIN_KEY', 'BacconIsCool1@').strip()
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')

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

# ==================== GAME-CENTRIC MODELS ====================
class PlayerGameStats(BaseModel):
    """Stats for a single player in a single game"""
    player_id: str
    # Passing
    pass_completions: int = 0
    pass_attempts: int = 0
    pass_yards: int = 0
    pass_tds: int = 0
    interceptions: int = 0
    longest_pass: int = 0
    # Rushing
    rush_attempts: int = 0
    rush_yards: int = 0
    rush_tds: int = 0
    fumbles: int = 0
    longest_rush: int = 0
    # Receiving
    receptions: int = 0
    rec_yards: int = 0
    rec_tds: int = 0
    drops: int = 0
    longest_rec: int = 0
    # Defense
    tackles: int = 0
    tackles_for_loss: int = 0
    sacks: float = 0
    swat: int = 0
    def_interceptions: int = 0
    pass_deflections: int = 0
    def_tds: int = 0
    safeties: int = 0

class GameWithStats(BaseModel):
    """Create a game with full player stats"""
    week: int
    home_team_id: str
    away_team_id: str
    home_score: float = 0
    away_score: float = 0
    is_completed: bool = True
    player_of_game: Optional[str] = None
    player_of_game_stats: Optional[str] = None
    date: Optional[str] = None
    # Player performances in this game
    player_stats: List[PlayerGameStats] = Field(default_factory=list)

class RobloxGamePayload(BaseModel):
    """Game payload submitted from Roblox stats manager"""
    week: int
    home_team: str
    away_team: str
    home_score: float = 0
    away_score: float = 0
    player_of_game: Optional[str] = None
    game_date: Optional[str] = None
    home_stats: Dict[str, Dict[str, Dict[str, float]]] = Field(default_factory=dict)
    away_stats: Dict[str, Dict[str, Dict[str, float]]] = Field(default_factory=dict)


# ==================== HELPER FUNCTIONS ====================
def verify_admin(admin_key: Optional[str]):
    if not admin_key:
        return None
    normalized = admin_key.strip()
    if normalized.lower().startswith("bearer "):
        normalized = normalized[7:].strip()
    if normalized == ADMIN_KEY:
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

def calculate_game_fantasy_points(stats: dict) -> float:
    """Calculate fantasy points for a single game performance"""
    fp = 0.0
    # Passing: 1 pt per 25 yards, 4 pts per TD, -2 per INT
    fp += stats.get("pass_yards", 0) / 25
    fp += stats.get("pass_tds", 0) * 4
    fp -= stats.get("interceptions", 0) * 2
    # Rushing: 1 pt per 10 yards, 6 pts per TD, -2 per fumble
    fp += stats.get("rush_yards", 0) / 10
    fp += stats.get("rush_tds", 0) * 6
    fp -= stats.get("fumbles", 0) * 2
    # Receiving: 1 pt per reception, 1 pt per 10 yards, 6 pts per TD
    fp += stats.get("receptions", 0)
    fp += stats.get("rec_yards", 0) / 10
    fp += stats.get("rec_tds", 0) * 6
    # Defense: 1 pt per tackle, 2 pts per sack, 3 pts per INT, 6 pts per TD, 2 pts per safety
    fp += stats.get("tackles", 0)
    fp += stats.get("sacks", 0) * 2
    fp += stats.get("def_interceptions", 0) * 3
    fp += stats.get("def_tds", 0) * 6
    fp += stats.get("safeties", 0) * 2
    return round(fp, 1)

def map_roblox_stats(category: str, stats: Dict[str, Any]) -> Dict[str, Any]:
    """Map Roblox stats manager fields to API game stat fields."""
    if not isinstance(stats, dict):
        return {}

    normalized = {str(k).strip().lower(): v for k, v in stats.items()}
    mapping = {
        "passing": {
            "completions": "pass_completions",
            "attempts": "pass_attempts",
            "yards": "pass_yards",
            "touchdowns": "pass_tds",
            "interceptions": "interceptions",
            "longest": "longest_pass",
        },
        "rushing": {
            "attempts": "rush_attempts",
            "yards": "rush_yards",
            "touchdowns": "rush_tds",
            "fumbles": "fumbles",
            "longest": "longest_rush",
        },
        "receiving": {
            "receptions": "receptions",
            "yards": "rec_yards",
            "touchdowns": "rec_tds",
            "drops": "drops",
            "longest": "longest_rec",
        },
        "defense": {
            "tackles": "tackles",
            "tackles for loss": "tackles_for_loss",
            "sacks": "sacks",
            "safeties": "safeties",
            "swat": "swat",
            "interceptions": "def_interceptions",
            "pass deflections": "pass_deflections",
            "td": "def_tds",
        },
    }

    category_key = str(category).strip().lower()
    key_map = mapping.get(category_key, {})
    mapped: Dict[str, Any] = {}
    for roblox_key, api_key in key_map.items():
        if roblox_key in normalized:
            mapped[api_key] = normalized[roblox_key]
    return mapped

async def recalculate_player_stats(player_id: str):
    """Recalculate a player's season stats from all their game performances"""
    # Get all game stats for this player
    game_stats = await db.game_player_stats.find({"player_id": player_id}).to_list(100)
    
    if not game_stats:
        return
    
    # Aggregate stats
    totals = {
        "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "longest": 0},
        "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "fumbles": 0, "longest": 0, "twenty_plus": 0},
        "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
        "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0, "safeties": 0}
    }
    
    weekly_scores = []
    games_played = 0
    
    for gs in game_stats:
        games_played += 1
        game_fp = calculate_game_fantasy_points(gs)
        weekly_scores.append({"week": gs.get("week", games_played), "points": game_fp})
        
        # Passing
        totals["passing"]["completions"] += gs.get("pass_completions", 0)
        totals["passing"]["attempts"] += gs.get("pass_attempts", 0)
        totals["passing"]["yards"] += gs.get("pass_yards", 0)
        totals["passing"]["touchdowns"] += gs.get("pass_tds", 0)
        totals["passing"]["interceptions"] += gs.get("interceptions", 0)
        totals["passing"]["longest"] = max(totals["passing"]["longest"], gs.get("longest_pass", 0))
        
        # Rushing
        totals["rushing"]["attempts"] += gs.get("rush_attempts", 0)
        totals["rushing"]["yards"] += gs.get("rush_yards", 0)
        totals["rushing"]["touchdowns"] += gs.get("rush_tds", 0)
        totals["rushing"]["fumbles"] += gs.get("fumbles", 0)
        totals["rushing"]["longest"] = max(totals["rushing"]["longest"], gs.get("longest_rush", 0))
        if gs.get("rush_yards", 0) >= 20:
            totals["rushing"]["twenty_plus"] += 1
        
        # Receiving
        totals["receiving"]["receptions"] += gs.get("receptions", 0)
        totals["receiving"]["yards"] += gs.get("rec_yards", 0)
        totals["receiving"]["touchdowns"] += gs.get("rec_tds", 0)
        totals["receiving"]["drops"] += gs.get("drops", 0)
        totals["receiving"]["longest"] = max(totals["receiving"]["longest"], gs.get("longest_rec", 0))
        
        # Defense
        totals["defense"]["tackles"] += gs.get("tackles", 0)
        totals["defense"]["tackles_for_loss"] += gs.get("tackles_for_loss", 0)
        totals["defense"]["sacks"] += gs.get("sacks", 0)
        totals["defense"]["swat"] += gs.get("swat", 0)
        totals["defense"]["interceptions"] += gs.get("def_interceptions", 0)
        totals["defense"]["pass_deflections"] += gs.get("pass_deflections", 0)
        totals["defense"]["td"] += gs.get("def_tds", 0)
        totals["defense"]["safeties"] += gs.get("safeties", 0)
    
    # Calculate derived stats
    if totals["passing"]["attempts"] > 0:
        totals["passing"]["completion_pct"] = round(totals["passing"]["completions"] / totals["passing"]["attempts"] * 100, 1)
        totals["passing"]["average"] = round(totals["passing"]["yards"] / totals["passing"]["attempts"], 1)
        # Simplified passer rating
        totals["passing"]["rating"] = round(
            ((totals["passing"]["completion_pct"] - 30) * 0.05 +
             (totals["passing"]["touchdowns"] / totals["passing"]["attempts"] * 100) * 0.2 +
             (totals["passing"]["yards"] / totals["passing"]["attempts"]) * 0.083 -
             (totals["passing"]["interceptions"] / totals["passing"]["attempts"] * 100) * 0.1) * 10, 1
        )
    
    if totals["rushing"]["attempts"] > 0:
        totals["rushing"]["yards_per_carry"] = round(totals["rushing"]["yards"] / totals["rushing"]["attempts"], 1)
    
    total_fp = sum(ws["points"] for ws in weekly_scores)
    
    # Update player document
    await db.players.update_one(
        {"id": player_id},
        {"$set": {
            "passing": totals["passing"],
            "rushing": totals["rushing"],
            "receiving": totals["receiving"],
            "defense": totals["defense"],
            "fantasy_points": round(total_fp, 1),
            "games_played": games_played
        }}
    )
    
    # Update weekly stats
    await db.weekly_stats.delete_many({"player_id": player_id})
    if weekly_scores:
        await db.weekly_stats.insert_many([{"player_id": player_id, **ws} for ws in weekly_scores])

async def recalculate_team_record(team_id: str):
    """Recalculate a team's W-L record from games"""
    # Get all completed games for this team
    games = await db.games.find({
        "$or": [{"home_team_id": team_id}, {"away_team_id": team_id}],
        "is_completed": True
    }).to_list(100)
    
    wins = 0
    losses = 0
    points_for = 0
    points_against = 0
    
    for game in games:
        is_home = game["home_team_id"] == team_id
        team_score = game["home_score"] if is_home else game["away_score"]
        opp_score = game["away_score"] if is_home else game["home_score"]
        
        points_for += team_score
        points_against += opp_score
        
        if team_score > opp_score:
            wins += 1
        else:
            losses += 1
    
    # Update team
    await db.teams.update_one(
        {"id": team_id},
        {"$set": {
            "wins": wins,
            "losses": losses,
            "points_for": round(points_for, 1),
            "points_against": round(points_against, 1)
        }}
    )

async def recalculate_all_standings():
    """Recalculate standings for all teams and update seeds"""
    teams = await db.teams.find().to_list(100)
    
    # Recalculate each team's record
    for team in teams:
        await recalculate_team_record(team["id"])
    
    # Fetch updated teams and assign seeds by conference
    updated_teams = await db.teams.find().to_list(100)
    
    for conference in ["Ridge", "Grand Central"]:
        conf_teams = [t for t in updated_teams if t.get("conference") == conference]
        # Sort by wins (desc), then points_for (desc)
        conf_teams.sort(key=lambda t: (t.get("wins", 0), t.get("points_for", 0)), reverse=True)
        
        for i, team in enumerate(conf_teams):
            seed = i + 1
            playoff_status = "x" if seed <= 2 else "y" if seed <= 6 else "z" if seed <= 8 else ""
            await db.teams.update_one(
                {"id": team["id"]},
                {"$set": {"seed": seed, "playoff_status": playoff_status}}
            )
    
    # Update power rankings
    all_teams = await db.teams.find().to_list(100)
    all_teams.sort(key=lambda t: (t.get("wins", 0), t.get("points_for", 0)), reverse=True)
    
    await db.power_rankings.delete_many({})
    rankings = []
    for i, team in enumerate(all_teams):
        rankings.append({
            "rank": i + 1,
            "team_id": team["id"],
            "team_name": team.get("name"),
            "team_abbr": team.get("abbreviation", team.get("name", "")[:3].upper()),
            "team_color": team.get("color", "#3B82F6"),
            "previous_rank": i + 1,
            "prev_rank": i + 1,  # Alias for frontend compatibility
            "record": f"{team.get('wins', 0)}-{team.get('losses', 0)}",
            "trend": "same",
            "analysis": f"{team.get('name')} currently ranked #{i+1} with a {team.get('wins', 0)}-{team.get('losses', 0)} record"
        })
    if rankings:
        await db.power_rankings.insert_many(rankings)
    
    # Auto-update awards
    await calculate_awards()

async def calculate_awards():
    """Automatically calculate awards based on current player and team stats"""
    players = await db.players.find({}, {"_id": 0}).to_list(200)
    teams = await db.teams.find({}, {"_id": 0}).to_list(20)
    
    if not players:
        return
    
    # Find MVP (highest fantasy points)
    mvp = max(players, key=lambda p: p.get("fantasy_points", 0))
    
    # Find Offensive Player of the Year (most total offensive yards + TDs)
    offensive_players = []
    for p in players:
        passing_yds = p.get("passing", {}).get("yards", 0)
        rushing_yds = p.get("rushing", {}).get("yards", 0)
        receiving_yds = p.get("receiving", {}).get("yards", 0)
        total_yds = passing_yds + rushing_yds + receiving_yds
        total_tds = (p.get("passing", {}).get("touchdowns", 0) + 
                     p.get("rushing", {}).get("touchdowns", 0) + 
                     p.get("receiving", {}).get("touchdowns", 0))
        offensive_score = total_yds + (total_tds * 100)
        offensive_players.append((p, offensive_score))
    
    opoy = max(offensive_players, key=lambda x: x[1])[0] if offensive_players else None
    
    # Find Defensive Player of the Year (most tackles + sacks + interceptions)
    defensive_players = [p for p in players if p.get("position") == "DEF"]
    if defensive_players:
        dpoy = max(defensive_players, key=lambda p: (
            p.get("defense", {}).get("tackles", 0) + 
            p.get("defense", {}).get("sacks", 0) * 2 + 
            p.get("defense", {}).get("interceptions", 0) * 3
        ))
    else:
        dpoy = None
    
    # Find Rookie of the Year (best player with fewest games played, if applicable)
    rookies = [p for p in players if p.get("games_played", 0) <= 8]
    roy = max(rookies, key=lambda p: p.get("fantasy_points", 0)) if rookies else None
    
    # Find Comeback Player (player with high stats after low games played)
    comeback_players = [p for p in players if p.get("games_played", 0) >= 4]
    if comeback_players:
        cpoy = max(comeback_players, key=lambda p: p.get("fantasy_points", 0) / max(p.get("games_played", 1), 1))
    else:
        cpoy = None
    
    # Get team names
    teams_map = {t["id"]: t for t in teams}
    
    awards = []
    if mvp and mvp.get("fantasy_points", 0) > 0:
        awards.append({
            "id": "a1",
            "name": "League MVP",
            "player_id": mvp["id"],
            "player_name": mvp.get("roblox_username", "Unknown"),
            "team": teams_map.get(mvp.get("team_id", ""), {}).get("name", mvp.get("team", "Unknown")),
            "season": "2025",
            "description": f"Led league with {mvp.get('fantasy_points', 0):.1f} fantasy points"
        })
    
    if opoy:
        passing_yds = opoy.get("passing", {}).get("yards", 0)
        rushing_yds = opoy.get("rushing", {}).get("yards", 0)
        receiving_yds = opoy.get("receiving", {}).get("yards", 0)
        total_yds = passing_yds + rushing_yds + receiving_yds
        total_tds = (opoy.get("passing", {}).get("touchdowns", 0) + 
                     opoy.get("rushing", {}).get("touchdowns", 0) + 
                     opoy.get("receiving", {}).get("touchdowns", 0))
        awards.append({
            "id": "a2",
            "name": "Offensive Player of the Year",
            "player_id": opoy["id"],
            "player_name": opoy.get("roblox_username", "Unknown"),
            "team": teams_map.get(opoy.get("team_id", ""), {}).get("name", opoy.get("team", "Unknown")),
            "season": "2025",
            "description": f"{total_yds} total yards, {total_tds} touchdowns"
        })
    
    if dpoy:
        tackles = dpoy.get("defense", {}).get("tackles", 0)
        sacks = dpoy.get("defense", {}).get("sacks", 0)
        ints = dpoy.get("defense", {}).get("interceptions", 0)
        awards.append({
            "id": "a3",
            "name": "Defensive Player of the Year",
            "player_id": dpoy["id"],
            "player_name": dpoy.get("roblox_username", "Unknown"),
            "team": teams_map.get(dpoy.get("team_id", ""), {}).get("name", dpoy.get("team", "Unknown")),
            "season": "2025",
            "description": f"{tackles} tackles, {sacks} sacks, {ints} interceptions"
        })
    
    if roy and roy.get("fantasy_points", 0) > 0:
        awards.append({
            "id": "a4",
            "name": "Rookie of the Year",
            "player_id": roy["id"],
            "player_name": roy.get("roblox_username", "Unknown"),
            "team": teams_map.get(roy.get("team_id", ""), {}).get("name", roy.get("team", "Unknown")),
            "season": "2025",
            "description": f"{roy.get('fantasy_points', 0):.1f} fantasy points in {roy.get('games_played', 0)} games"
        })
    
    if cpoy and cpoy.get("fantasy_points", 0) > 0:
        awards.append({
            "id": "a5",
            "name": "Comeback Player of the Year",
            "player_id": cpoy["id"],
            "player_name": cpoy.get("roblox_username", "Unknown"),
            "team": teams_map.get(cpoy.get("team_id", ""), {}).get("name", cpoy.get("team", "Unknown")),
            "season": "2025",
            "description": f"{cpoy.get('fantasy_points', 0):.1f} fantasy points"
        })
    
    # Update awards in database
    if awards:
        await db.awards.delete_many({})
        await db.awards.insert_many(awards)
        logger.info(f"Calculated {len(awards)} awards")

# ==================== DATABASE INITIALIZATION ====================
async def init_database():
    """Initialize database - seeding disabled for production"""
    try:
        teams_count = await db.teams.count_documents({})
        logger.info(f"Database connected. Teams: {teams_count}")
    except Exception as exc:
        logger.error(f"Database initialization failed: {exc}")
        return
    # Auto-seeding disabled - use Admin Panel to add data
    # if teams_count == 0:
    #     logger.info("Initializing database with seed data...")
    #     await seed_database()
    #     logger.info("Database initialized!")

async def seed_database():
    """Seed the database with initial data (no preset teams, trades, or power rankings)"""
    # Teams are created manually through admin panel - no preset teams
    # Players are created manually through admin panel or auto-created during game submission - no preset players
    # Games are created manually through admin panel - no preset games

    # Playoffs - Empty bracket structure (teams assigned when playoffs are set up)
    # Conference Championships: Week 9
    # Main Championship: Week 10
    playoffs = [
        {"id": "po1", "round": "Playins", "matchup_name": "Play-In Game 1", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po2", "round": "Playins", "matchup_name": "Play-In Game 2", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po3", "round": "Wildcard", "matchup_name": "Wildcard 1 (Ridge)", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po4", "round": "Wildcard", "matchup_name": "Wildcard 2 (Ridge)", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po5", "round": "Wildcard", "matchup_name": "Wildcard 3 (GC)", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po6", "round": "Wildcard", "matchup_name": "Wildcard 4 (GC)", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po7", "round": "Divisional", "matchup_name": "Divisional 1 (Ridge)", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po8", "round": "Divisional", "matchup_name": "Divisional 2 (Ridge)", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po9", "round": "Divisional", "matchup_name": "Divisional 3 (GC)", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po10", "round": "Divisional", "matchup_name": "Divisional 4 (GC)", "week": 8, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po11", "round": "Conference", "matchup_name": "Ridge Championship", "week": 9, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po12", "round": "Conference", "matchup_name": "Grand Central Championship", "week": 9, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
        {"id": "po13", "round": "Championship", "matchup_name": "United Flag Bowl", "week": 10, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "animation_state": "pending"},
    ]
    await db.playoffs.insert_many(playoffs)

    # Trades are created manually through admin panel - no preset trades
    # Awards are calculated automatically when games are played - no preset awards

    # Power Rankings are calculated automatically when games are played - no preset rankings

    # Admins
    await db.admins.insert_one({
        "username": "admin",
        "password_hash": hashlib.sha256("BacconIsCool1@".encode()).hexdigest(),
        "role": "super_admin",
        "created": datetime.now(timezone.utc).isoformat()
    })

async def resolve_team_id(team_label: str) -> Optional[dict]:
    """Resolve a team by name or abbreviation (case-insensitive)."""
    if not team_label:
        return None
    escaped = re.escape(team_label.strip())
    team = await db.teams.find_one({"name": {"$regex": f"^{escaped}$", "$options": "i"}}, {"_id": 0})
    if team:
        return team
    return await db.teams.find_one({"abbreviation": {"$regex": f"^{escaped}$", "$options": "i"}}, {"_id": 0})

def generate_team_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "", (name or "").lower())
    if not slug:
        slug = f"tm{uuid.uuid4().hex[:6]}"
    return slug[:8]

async def ensure_team(team_label: str) -> Optional[dict]:
    """Resolve a team or create it if missing."""
    team = await resolve_team_id(team_label)
    if team:
        return team

    team_name = (team_label or "").strip()
    if not team_name:
        return None

    base_id = generate_team_id(team_name)
    team_id = base_id
    suffix = 1
    while await db.teams.find_one({"id": team_id}):
        team_id = f"{base_id}{suffix}"
        suffix += 1

    abbr = re.sub(r"[^A-Za-z]", "", team_name).upper()[:3] or "TM"
    team_doc = {
        "id": team_id,
        "name": team_name,
        "abbreviation": abbr,
        "conference": "Ridge",
        "division": "East",
        "color": "#111827",
        "logo": None,
        "wins": 0,
        "losses": 0,
        "points_for": 0,
        "points_against": 0,
        "seed": None,
        "playoff_status": ""
    }
    await db.teams.insert_one(team_doc)
    logger.info(f"Created missing team from submission: {team_name} ({team_id})")
    return team_doc

def default_player_stats() -> Dict[str, Any]:
    """Default stats structure for new players."""
    return {
        "passing": {"completions": 0, "attempts": 0, "yards": 0, "touchdowns": 0, "interceptions": 0, "rating": 0, "completion_pct": 0, "average": 0, "longest": 0},
        "rushing": {"attempts": 0, "yards": 0, "touchdowns": 0, "yards_per_carry": 0, "fumbles": 0, "twenty_plus": 0, "longest": 0},
        "receiving": {"receptions": 0, "yards": 0, "touchdowns": 0, "drops": 0, "longest": 0},
        "defense": {"tackles": 0, "tackles_for_loss": 0, "sacks": 0, "swat": 0, "interceptions": 0, "pass_deflections": 0, "td": 0, "safeties": 0}
    }

async def create_game_with_stats_internal(game: GameWithStats, background_tasks: BackgroundTasks, admin_label: str):
    """Create a game with player stats and update standings."""
    count = await db.games.count_documents({})
    game_id = f"g{count + 1}"

    new_game = {
        "id": game_id,
        "week": game.week,
        "home_team_id": game.home_team_id,
        "away_team_id": game.away_team_id,
        "home_score": game.home_score,
        "away_score": game.away_score,
        "is_completed": game.is_completed,
        "player_of_game": game.player_of_game,
        "player_of_game_stats": game.player_of_game_stats,
        "date": game.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    await db.games.insert_one(new_game)

    affected_players = set()
    for ps in game.player_stats:
        game_stat = {
            "game_id": game_id,
            "week": game.week,
            "player_id": ps.player_id,
            "pass_completions": ps.pass_completions,
            "pass_attempts": ps.pass_attempts,
            "pass_yards": ps.pass_yards,
            "pass_tds": ps.pass_tds,
            "interceptions": ps.interceptions,
            "longest_pass": ps.longest_pass,
            "rush_attempts": ps.rush_attempts,
            "rush_yards": ps.rush_yards,
            "rush_tds": ps.rush_tds,
            "fumbles": ps.fumbles,
            "longest_rush": ps.longest_rush,
            "receptions": ps.receptions,
            "rec_yards": ps.rec_yards,
            "rec_tds": ps.rec_tds,
            "drops": ps.drops,
            "longest_rec": ps.longest_rec,
            "tackles": ps.tackles,
            "tackles_for_loss": ps.tackles_for_loss,
            "sacks": ps.sacks,
            "swat": ps.swat,
            "def_interceptions": ps.def_interceptions,
            "pass_deflections": ps.pass_deflections,
            "def_tds": ps.def_tds,
            "safeties": ps.safeties
        }
        await db.game_player_stats.insert_one(game_stat)
        affected_players.add(ps.player_id)

    for player_id in affected_players:
        await recalculate_player_stats(player_id)

    if game.is_completed:
        await recalculate_team_record(game.home_team_id)
        await recalculate_team_record(game.away_team_id)
        background_tasks.add_task(recalculate_all_standings)
        # Awards will be recalculated in recalculate_all_standings

    await log_admin_activity(admin_label, "CREATE_GAME", f"Created game: Week {game.week} ({len(game.player_stats)} player stats)")
    new_game.pop("_id", None)
    return new_game

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
    qbs = [p for p in players if p.get("position") == "QB"]
    
    # Calculate total touchdowns for each player
    for p in players:
        total_tds = (
            p.get("passing", {}).get("touchdowns", 0) +
            p.get("rushing", {}).get("touchdowns", 0) +
            p.get("receiving", {}).get("touchdowns", 0) +
            p.get("defense", {}).get("td", 0)
        )
        p["total_touchdowns"] = total_tds
    
    return {
        "fantasy_points": sorted(players, key=lambda x: x.get("fantasy_points", 0), reverse=True)[:5],
        "passing_yards": sorted(qbs, key=lambda x: x.get("passing", {}).get("yards", 0), reverse=True)[:5],
        "rushing_yards": sorted(players, key=lambda x: x.get("rushing", {}).get("yards", 0), reverse=True)[:5],
        "receiving_yards": sorted([p for p in players if p.get("position") == "WR"], key=lambda x: x.get("receiving", {}).get("yards", 0), reverse=True)[:5],
        "touchdowns": sorted(players, key=lambda x: x.get("total_touchdowns", 0), reverse=True)[:5],
        "sacks": sorted([p for p in players if p.get("position") == "DEF"], key=lambda x: x.get("defense", {}).get("sacks", 0), reverse=True)[:5]
    }

@api_router.get("/dashboard")
async def get_dashboard():
    games = await db.games.find({}, {"_id": 0}).sort("week", -1).to_list(100)
    latest_week = max((g["week"] for g in games), default=1) if games else 1
    
    # Get playoff weeks from playoff data
    playoffs = await db.playoffs.find({}, {"_id": 0}).to_list(20)
    conference_week = 9  # Default
    championship_week = 10  # Default
    if playoffs:
        conference_matchups = [p for p in playoffs if p.get("round") == "Conference"]
        championship_matchups = [p for p in playoffs if p.get("round") == "Championship"]
        if conference_matchups:
            conference_week = conference_matchups[0].get("week", 9)
        if championship_matchups:
            championship_week = championship_matchups[0].get("week", 10)
    
    playoff_week = conference_week  # Show conference week as playoff week
    
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
    
    # Get #1 seed team
    teams = await db.teams.find({}, {"_id": 0}).to_list(20)
    teams_sorted = sorted(teams, key=lambda t: (t.get("wins", 0), t.get("points_for", 0)), reverse=True)
    top_seed = teams_sorted[0] if teams_sorted else None
    top_seed_info = None
    if top_seed:
        top_seed_info = {
            "name": top_seed.get("name", ""),
            "abbreviation": top_seed.get("abbreviation", ""),
            "wins": top_seed.get("wins", 0),
            "losses": top_seed.get("losses", 0),
            "record": f"{top_seed.get('wins', 0)}-{top_seed.get('losses', 0)}"
        }
    
    return {
        "top_performers": top_performers,
        "recent_games": games[:6],
        "power_rankings": power_rankings,
        "recent_trades": trades,
        "league_stats": {
            "total_teams": len(teams) or 12,
            "total_players": len(players),
            "total_games": len(games),
            "current_week": latest_week,
            "playoff_week": playoff_week,
            "top_seed": top_seed_info
        }
    }

@api_router.post("/game")
async def submit_game(payload: RobloxGamePayload, background_tasks: BackgroundTasks):
    """Public game submission endpoint for Roblox stats manager."""
    home_team = await ensure_team(payload.home_team)
    away_team = await ensure_team(payload.away_team)
    if not home_team or not away_team:
        raise HTTPException(status_code=400, detail="Home or away team not found")

    players = await db.players.find({}, {"_id": 0, "id": 1, "roblox_username": 1}).to_list(2000)
    player_lookup = {
        str(p["roblox_username"]).lower(): p["id"] 
        for p in players 
        if p.get("roblox_username") and str(p["roblox_username"]).strip()
    }
    next_player_index = await db.players.count_documents({}) + 1

    player_stats: List[PlayerGameStats] = []
    missing_players: List[str] = []

    async def create_player_for_team(player_name: str, team: dict) -> Optional[str]:
        nonlocal next_player_index
        if not player_name or not team:
            return None

        player_id = f"p{next_player_index}"
        next_player_index += 1

        player_doc = {
            "id": player_id,
            "roblox_id": "",
            "roblox_username": player_name,
            "position": "QB",
            "team": team.get("name", ""),
            "team_id": team.get("id", ""),
            "is_elite": False,
            "image": None,
            "games_played": 0,
            "fantasy_points": 0,
            **default_player_stats()
        }

        try:
            roblox_user = await fetch_roblox_user_by_username(player_name)
            if roblox_user:
                player_doc["roblox_id"] = roblox_user.get("id", "")
                if roblox_user.get("avatar_url"):
                    player_doc["image"] = roblox_user["avatar_url"]
        except Exception as exc:
            logger.warning(f"Failed to fetch Roblox info for {player_name}: {exc}")

        await db.players.insert_one(player_doc)
        return player_id

    async def process_team_stats(team_stats: Dict[str, Any], team: dict):
        if not isinstance(team_stats, dict):
            return
        for player_name, categories in team_stats.items():
            player_key = str(player_name).strip()
            player_id = player_lookup.get(player_key.lower())
            if not player_id:
                player_id = await create_player_for_team(player_key, team)
                if not player_id:
                    missing_players.append(player_key)
                    continue
                player_lookup[player_key.lower()] = player_id

            stat_payload: Dict[str, Any] = {"player_id": player_id}
            if isinstance(categories, dict):
                for category, stats in categories.items():
                    mapped = map_roblox_stats(category, stats)
                    stat_payload.update(mapped)

            try:
                player_stats.append(PlayerGameStats(**stat_payload))
            except Exception as e:
                logger.warning(f"Failed to create PlayerGameStats for {player_key}: {e}, payload: {stat_payload}")
                missing_players.append(f"{player_key} (validation error)")

    await process_team_stats(payload.home_stats or {}, home_team)
    await process_team_stats(payload.away_stats or {}, away_team)

    game = GameWithStats(
        week=payload.week,
        home_team_id=home_team["id"],
        away_team_id=away_team["id"],
        home_score=payload.home_score,
        away_score=payload.away_score,
        is_completed=True,
        player_of_game=payload.player_of_game,
        player_of_game_stats=None,
        date=payload.game_date,
        player_stats=player_stats
    )

    new_game = await create_game_with_stats_internal(game, background_tasks, "roblox")
    response = {"success": True, "game": new_game, "player_stats_count": len(player_stats)}
    if missing_players:
        response["missing_players"] = sorted(set(missing_players))
    return response

@api_router.post("/game/submit")
async def submit_game_alias(payload: RobloxGamePayload, background_tasks: BackgroundTasks):
    """Alias for Roblox stats submission."""
    return await submit_game(payload, background_tasks)

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

@api_router.post("/admin/team/{team_id}/logo/upload")
async def upload_team_logo(
    team_id: str,
    file: UploadFile = File(...),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """Upload a logo file for a team"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate filename
    file_ext = Path(file.filename).suffix if file.filename else '.png'
    filename = f"team_{team_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = UPLOADS_DIR / filename
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Generate URL (relative to static/uploads)
        logo_url = f"/uploads/{filename}"
        
        # Update team
        await db.teams.update_one({"id": team_id}, {"$set": {"logo": logo_url}})
        await log_admin_activity("admin", "UPLOAD_TEAM_LOGO", f"Uploaded logo for team: {team_id}")
        
        return {"success": True, "logo_url": logo_url, "filename": filename}
    except Exception as e:
        logger.error(f"Error uploading logo: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload logo")

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
async def create_game(game: GameWithStats, background_tasks: BackgroundTasks, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Create a game with optional player stats in one request."""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return await create_game_with_stats_internal(game, background_tasks, "admin")

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
    """Reset ALL season data - wipe everything except admins. Fresh start."""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    # Delete ALL data except admins
    await db.teams.delete_many({})
    await db.players.delete_many({})
    await db.games.delete_many({})
    await db.game_player_stats.delete_many({})
    await db.weekly_stats.delete_many({})
    await db.trades.delete_many({})
    await db.watchlist.delete_many({})
    await db.power_rankings.delete_many({})
    await db.awards.delete_many({})
    await db.playoffs.delete_many({})
    await db.activity_log.delete_many({})
    
    # Note: Admins collection is NOT touched - admins remain intact
    await log_admin_activity("admin", "RESET_SEASON", "Season reset - ALL data wiped except admins")
    return {"success": True, "message": "Season reset complete - all data wiped except admins. Fresh start."}

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

# ==================== GAME-CENTRIC ENDPOINTS ====================
@api_router.post("/admin/game/{game_id}/player-stats")
async def add_player_game_stats(game_id: str, stats: PlayerGameStats, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Add or update player stats for an existing game"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    game = await db.games.find_one({"id": game_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if stats already exist for this player/game
    existing = await db.game_player_stats.find_one({"game_id": game_id, "player_id": stats.player_id})
    
    game_stat = {
        "game_id": game_id,
        "week": game["week"],
        "player_id": stats.player_id,
        "pass_completions": stats.pass_completions,
        "pass_attempts": stats.pass_attempts,
        "pass_yards": stats.pass_yards,
        "pass_tds": stats.pass_tds,
        "interceptions": stats.interceptions,
        "longest_pass": stats.longest_pass,
        "rush_attempts": stats.rush_attempts,
        "rush_yards": stats.rush_yards,
        "rush_tds": stats.rush_tds,
        "fumbles": stats.fumbles,
        "longest_rush": stats.longest_rush,
        "receptions": stats.receptions,
        "rec_yards": stats.rec_yards,
        "rec_tds": stats.rec_tds,
        "drops": stats.drops,
        "longest_rec": stats.longest_rec,
        "tackles": stats.tackles,
        "tackles_for_loss": stats.tackles_for_loss,
        "sacks": stats.sacks,
        "swat": stats.swat,
        "def_interceptions": stats.def_interceptions,
        "pass_deflections": stats.pass_deflections,
        "def_tds": stats.def_tds,
        "safeties": stats.safeties
    }
    
    if existing:
        await db.game_player_stats.replace_one({"game_id": game_id, "player_id": stats.player_id}, game_stat)
    else:
        await db.game_player_stats.insert_one(game_stat)
    
    # Recalculate player's season stats
    await recalculate_player_stats(stats.player_id)
    
    fp = calculate_game_fantasy_points(game_stat)
    await log_admin_activity("admin", "ADD_PLAYER_GAME_STATS", f"Player {stats.player_id} in game {game_id}: {fp} FP")
    
    return {"success": True, "fantasy_points": fp}

@api_router.get("/admin/game/{game_id}/stats")
async def get_game_stats(game_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Get all player stats for a specific game"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    stats = await db.game_player_stats.find({"game_id": game_id}, {"_id": 0}).to_list(50)
    
    # Enrich with player info
    player_ids = [s["player_id"] for s in stats]
    players = await db.players.find({"id": {"$in": player_ids}}, {"_id": 0}).to_list(50)
    players_map = {p["id"]: p for p in players}
    
    enriched_stats = []
    for s in stats:
        player = players_map.get(s["player_id"], {})
        s["player_name"] = player.get("roblox_username", "Unknown")
        s["position"] = player.get("position", "")
        s["team"] = player.get("team", "")
        s["fantasy_points"] = calculate_game_fantasy_points(s)
        enriched_stats.append(s)
    
    return {"game": game, "player_stats": enriched_stats}

@api_router.post("/admin/recalculate/all")
async def recalculate_all(background_tasks: BackgroundTasks, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Recalculate all player stats and team standings from games"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    # Get all players with game stats
    player_ids = await db.game_player_stats.distinct("player_id")
    
    # Recalculate each player
    for player_id in player_ids:
        await recalculate_player_stats(player_id)
    
    # Recalculate all standings (this also updates power rankings and awards)
    await recalculate_all_standings()
    
    await log_admin_activity("admin", "RECALCULATE_ALL", f"Recalculated {len(player_ids)} players")
    return {"success": True, "players_updated": len(player_ids)}

@api_router.post("/admin/recalculate/awards")
async def recalculate_awards_endpoint(admin_key: str = Header(None, alias="X-Admin-Key")):
    """Manually recalculate awards"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    await calculate_awards()
    awards = await db.awards.find({}, {"_id": 0}).to_list(20)
    await log_admin_activity("admin", "RECALCULATE_AWARDS", "Awards recalculated")
    return {"success": True, "awards": awards, "count": len(awards)}

@api_router.post("/admin/recalculate/player/{player_id}")
async def recalculate_single_player(player_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Recalculate a single player's stats from their game performances"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    await recalculate_player_stats(player_id)
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    return player

@api_router.post("/admin/recalculate/standings")
async def recalculate_standings_endpoint(admin_key: str = Header(None, alias="X-Admin-Key")):
    """Recalculate all team standings from games"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    await recalculate_all_standings()
    teams = await db.teams.find({}, {"_id": 0}).to_list(20)
    return {"success": True, "teams": teams}

@api_router.get("/admin/player/{player_id}/game-log")
async def get_player_game_log(player_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Get all game-by-game stats for a player"""
    if not verify_admin(admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    player = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    game_stats = await db.game_player_stats.find({"player_id": player_id}, {"_id": 0}).sort("week", 1).to_list(100)
    
    # Add fantasy points to each game
    for gs in game_stats:
        gs["fantasy_points"] = calculate_game_fantasy_points(gs)
    
    return {"player": player, "game_log": game_stats}

# ==================== APP SETUP ====================
@app.on_event("startup")
async def startup_event():
    await init_database()

def parse_cors_origins(raw: str) -> List[str]:
    """Parse comma-separated origins; '*' enables all."""
    if not raw or raw.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# IMPORTANT: API router must be included BEFORE static file mount
# so API routes take precedence
app.include_router(api_router)

# Serve static files and handle React Router
if STATIC_DIR.exists():
    index_path = STATIC_DIR / "index.html"
    static_assets_dir = STATIC_DIR / "static"
    
    # Mount static assets (JS, CSS, images) - these must be served first
    if static_assets_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_assets_dir)), name="static_assets")

# Mount uploads directory for team logos (outside the static check)
if UPLOADS_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

if STATIC_DIR.exists():
    # Serve index.html for root
    @app.get("/")
    async def serve_index():
        if index_path.exists():
            return FileResponse(str(index_path), media_type="text/html")
        raise HTTPException(status_code=404, detail="index.html not found")
    
    # Catch-all for React Router - serve index.html for all non-API, non-static routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Skip API routes (handled by api_router)
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        
        # Skip static assets (handled by mount)
        if full_path.startswith("static/"):
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Skip known root files that should be handled explicitly
        if full_path in ["manifest.json", "favicon.ico", "robots.txt", "asset-manifest.json"]:
            file_path = STATIC_DIR / full_path
            if file_path.exists():
                return FileResponse(str(file_path))
            raise HTTPException(status_code=404)
        
        # Serve index.html for all other routes (React Router handles routing)
        if index_path.exists():
            return FileResponse(str(index_path), media_type="text/html")
        raise HTTPException(status_code=404, detail="Frontend not built")
    
    logger.info(f"Serving static files from {STATIC_DIR}")
else:
    logger.warning(f"Static directory not found at {STATIC_DIR}")

    @app.get("/")
    async def root_fallback():
        return {
            "message": "Frontend build not found.",
            "hint": "Deploy frontend build or visit /api/ for API root."
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
