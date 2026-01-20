from fastapi import FastAPI, APIRouter, HTTPException, Header, Query, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import csv
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import hashlib

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

class AdminLogin(BaseModel):
    username: str
    password: str

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
    mode: str = "simple"  # simple or full

class BulkDeleteGames(BaseModel):
    start_week: int
    end_week: int

class CloneGame(BaseModel):
    game_id: str
    target_week: int

class WeeklyPlayerStats(BaseModel):
    player_id: str
    week: int
    team_id: str
    stats: Dict[str, Any]

class PlayoffMatchupUpdate(BaseModel):
    matchup_id: str
    team1_id: Optional[str] = None
    team2_id: Optional[str] = None
    team1_score: float = 0
    team2_score: float = 0
    winner_id: Optional[str] = None
    is_completed: bool = False

# UFF Teams Data
TEAMS = [
    {"id": "gc1", "name": "Columbus Colts", "abbreviation": "COL", "conference": "Grand Central", "division": "East", "color": "#1E3A8A", "logo": "", "wins": 7, "losses": 1, "points_for": 1842.5, "points_against": 1523.2, "seed": 2, "playoff_status": "x"},
    {"id": "gc2", "name": "Evergreen Stags", "abbreviation": "EVG", "conference": "Grand Central", "division": "East", "color": "#166534", "logo": "", "wins": 5, "losses": 3, "points_for": 1756.8, "points_against": 1612.4, "seed": 4, "playoff_status": "x"},
    {"id": "gc3", "name": "Nashville Nightmares", "abbreviation": "NSH", "conference": "Grand Central", "division": "West", "color": "#7C3AED", "logo": "", "wins": 5, "losses": 3, "points_for": 1698.2, "points_against": 1654.1, "seed": 5, "playoff_status": "y"},
    {"id": "gc4", "name": "Seattle Skyclaws", "abbreviation": "SEA", "conference": "Grand Central", "division": "West", "color": "#0891B2", "logo": "", "wins": 5, "losses": 3, "points_for": 1621.5, "points_against": 1687.3, "seed": 7, "playoff_status": "z"},
    {"id": "gc5", "name": "Portland Steel", "abbreviation": "POR", "conference": "Grand Central", "division": "West", "color": "#64748B", "logo": "", "wins": 4, "losses": 4, "points_for": 1534.7, "points_against": 1721.8, "seed": 8, "playoff_status": "z"},
    {"id": "gc6", "name": "Richmond Rebellion", "abbreviation": "RIC", "conference": "Grand Central", "division": "East", "color": "#DC2626", "logo": "", "wins": 4, "losses": 4, "points_for": 1489.2, "points_against": 1798.5, "seed": 9, "playoff_status": "z"},
    {"id": "rd1", "name": "Vicksburg Vortex", "abbreviation": "VIC", "conference": "Ridge", "division": "North", "color": "#EA580C", "logo": "", "wins": 8, "losses": 0, "points_for": 1923.4, "points_against": 1456.7, "seed": 1, "playoff_status": "x"},
    {"id": "rd2", "name": "New York Guardians", "abbreviation": "NYG", "conference": "Ridge", "division": "North", "color": "#0369A1", "logo": "", "wins": 7, "losses": 1, "points_for": 1812.6, "points_against": 1589.3, "seed": 3, "playoff_status": "x"},
    {"id": "rd3", "name": "Saskatoon Stampede", "abbreviation": "SAS", "conference": "Ridge", "division": "South", "color": "#B91C1C", "logo": "", "wins": 6, "losses": 2, "points_for": 1745.8, "points_against": 1634.2, "seed": 6, "playoff_status": "y"},
    {"id": "rd4", "name": "Valor City Spartans", "abbreviation": "VAL", "conference": "Ridge", "division": "South", "color": "#CA8A04", "logo": "", "wins": 4, "losses": 4, "points_for": 1598.4, "points_against": 1678.9, "seed": 10, "playoff_status": "z"},
    {"id": "rd5", "name": "Austin Outlaws", "abbreviation": "AUS", "conference": "Ridge", "division": "South", "color": "#059669", "logo": "", "wins": 3, "losses": 5, "points_for": 1512.3, "points_against": 1745.6, "seed": None, "playoff_status": None},
    {"id": "rd6", "name": "Denver Mustangs", "abbreviation": "DEN", "conference": "Ridge", "division": "North", "color": "#7C2D12", "logo": "", "wins": 2, "losses": 6, "points_for": 1423.1, "points_against": 1867.4, "seed": None, "playoff_status": None},
]

PLAYERS = [
    {"id": "p1", "name": "Marcus Williams", "roblox_id": "123456789", "roblox_username": "MarcusW_UFF", "position": "QB", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None, "games_played": 8,
     "stats": {"completions": 287, "attempts": 412, "passing_yards": 4521, "touchdowns": 38, "interceptions": 8, "rating": 124.5, "completion_pct": 69.7, "avg_per_attempt": 11.0, "longest": 78, "fantasy_points": 412.5, "avg_points": 51.6}},
    {"id": "p2", "name": "Jake Thompson", "roblox_id": "234567890", "roblox_username": "JakeT_UFF", "position": "QB", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None, "games_played": 8,
     "stats": {"completions": 265, "attempts": 389, "passing_yards": 4234, "touchdowns": 35, "interceptions": 10, "rating": 118.2, "completion_pct": 68.1, "avg_per_attempt": 10.9, "longest": 72, "fantasy_points": 385.2, "avg_points": 48.2}},
    {"id": "p3", "name": "Ryan Mitchell", "roblox_id": "345678901", "roblox_username": "RyanM_UFF", "position": "QB", "team": "New York Guardians", "team_id": "rd2", "is_elite": False, "bye_week": 6, "injury_status": "Questionable", "games_played": 7,
     "stats": {"completions": 234, "attempts": 345, "passing_yards": 3856, "touchdowns": 29, "interceptions": 12, "rating": 108.4, "completion_pct": 67.8, "avg_per_attempt": 11.2, "longest": 65, "fantasy_points": 342.8, "avg_points": 42.9}},
    {"id": "p4", "name": "Derek Johnson", "roblox_id": "456789012", "roblox_username": "DerekJ_UFF", "position": "QB", "team": "Saskatoon Stampede", "team_id": "rd3", "is_elite": False, "bye_week": 8, "injury_status": None, "games_played": 8,
     "stats": {"completions": 212, "attempts": 312, "passing_yards": 3654, "touchdowns": 27, "interceptions": 14, "rating": 102.6, "completion_pct": 67.9, "avg_per_attempt": 11.7, "longest": 68, "fantasy_points": 318.4, "avg_points": 39.8}},
    {"id": "p5", "name": "Chris Anderson", "roblox_id": "567890123", "roblox_username": "ChrisA_UFF", "position": "WR", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None, "games_played": 8,
     "stats": {"receptions": 112, "receiving_yards": 1654, "touchdowns": 14, "drops": 4, "longest": 82, "fantasy_points": 298.4, "avg_points": 37.3}},
    {"id": "p6", "name": "Mike Davis", "roblox_id": "678901234", "roblox_username": "MikeD_UFF", "position": "WR", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None, "games_played": 8,
     "stats": {"receptions": 98, "receiving_yards": 1487, "touchdowns": 12, "drops": 3, "longest": 76, "fantasy_points": 267.2, "avg_points": 33.4}},
    {"id": "p7", "name": "Tony Brown", "roblox_id": "789012345", "roblox_username": "TonyB_UFF", "position": "WR", "team": "Nashville Nightmares", "team_id": "gc3", "is_elite": False, "bye_week": 5, "injury_status": None, "games_played": 8,
     "stats": {"receptions": 89, "receiving_yards": 1234, "touchdowns": 9, "drops": 5, "longest": 68, "fantasy_points": 221.8, "avg_points": 27.7}},
    {"id": "p8", "name": "James Wilson", "roblox_id": "890123456", "roblox_username": "JamesW_UFF", "position": "WR", "team": "Evergreen Stags", "team_id": "gc2", "is_elite": False, "bye_week": 10, "injury_status": "Questionable", "games_played": 7,
     "stats": {"receptions": 82, "receiving_yards": 1156, "touchdowns": 8, "drops": 6, "longest": 62, "fantasy_points": 198.6, "avg_points": 24.8}},
    {"id": "p9", "name": "David Martinez", "roblox_id": "901234567", "roblox_username": "DavidM_UFF", "position": "RB", "team": "New York Guardians", "team_id": "rd2", "is_elite": True, "bye_week": 8, "injury_status": None, "games_played": 8,
     "stats": {"attempts": 280, "rushing_yards": 1456, "touchdowns": 16, "yards_per_carry": 5.2, "fumbles": 2, "twenty_plus": 12, "longest": 67, "fantasy_points": 312.6, "avg_points": 39.1}},
    {"id": "p10", "name": "Kevin Harris", "roblox_id": "012345678", "roblox_username": "KevinH_UFF", "position": "RB", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None, "games_played": 8,
     "stats": {"attempts": 256, "rushing_yards": 1324, "touchdowns": 14, "yards_per_carry": 5.2, "fumbles": 1, "twenty_plus": 10, "longest": 58, "fantasy_points": 278.4, "avg_points": 34.8}},
    {"id": "p11", "name": "Brandon Lee", "roblox_id": "112233445", "roblox_username": "BrandonL_UFF", "position": "RB", "team": "Saskatoon Stampede", "team_id": "rd3", "is_elite": False, "bye_week": 6, "injury_status": "Questionable", "games_played": 7,
     "stats": {"attempts": 234, "rushing_yards": 1178, "touchdowns": 11, "yards_per_carry": 5.0, "fumbles": 3, "twenty_plus": 8, "longest": 52, "fantasy_points": 234.8, "avg_points": 29.4}},
    {"id": "p12", "name": "Jason Taylor", "roblox_id": "223344556", "roblox_username": "JasonT_UFF", "position": "RB", "team": "Seattle Skyclaws", "team_id": "gc4", "is_elite": False, "bye_week": 11, "injury_status": None, "games_played": 8,
     "stats": {"attempts": 212, "rushing_yards": 1045, "touchdowns": 9, "yards_per_carry": 4.9, "fumbles": 2, "twenty_plus": 6, "longest": 48, "fantasy_points": 198.2, "avg_points": 24.8}},
    {"id": "p13", "name": "Tyler Scott", "roblox_id": "334455667", "roblox_username": "TylerS_UFF", "position": "DEF", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None, "games_played": 8,
     "stats": {"tackles": 98, "tackles_for_loss": 18, "sacks": 14.5, "safeties": 1, "swat": 8, "interceptions": 3, "pass_deflections": 12, "defensive_td": 2, "fantasy_points": 178.7, "avg_points": 22.3}},
    {"id": "p14", "name": "Adam Clark", "roblox_id": "445566778", "roblox_username": "AdamC_UFF", "position": "DEF", "team": "Columbus Colts", "team_id": "gc1", "is_elite": False, "bye_week": 5, "injury_status": None, "games_played": 8,
     "stats": {"tackles": 87, "tackles_for_loss": 15, "sacks": 12.0, "safeties": 0, "swat": 6, "interceptions": 4, "pass_deflections": 10, "defensive_td": 1, "fantasy_points": 145.2, "avg_points": 18.2}},
    {"id": "p15", "name": "Matt Reynolds", "roblox_id": "556677889", "roblox_username": "MattR_UFF", "position": "K", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None, "games_played": 8,
     "stats": {"field_goals": 32, "field_goal_attempts": 36, "extra_points": 45, "longest": 56, "fantasy_points": 156.0, "avg_points": 19.5}},
    {"id": "p16", "name": "Sam Cooper", "roblox_id": "667788990", "roblox_username": "SamC_UFF", "position": "K", "team": "New York Guardians", "team_id": "rd2", "is_elite": False, "bye_week": 8, "injury_status": None, "games_played": 8,
     "stats": {"field_goals": 28, "field_goal_attempts": 32, "extra_points": 41, "longest": 52, "fantasy_points": 138.0, "avg_points": 17.3}},
]

# Weekly Player Stats (per week performance)
WEEKLY_PLAYER_STATS = []
for p in PLAYERS:
    for week in range(1, 9):
        base = p["stats"].get("avg_points", 20)
        variance = (week % 4) * 3 - 4
        WEEKLY_PLAYER_STATS.append({
            "id": f"wps_{p['id']}_{week}",
            "player_id": p["id"],
            "week": week,
            "team_id": p["team_id"],
            "points": round(base + variance, 1),
            "stats": {}
        })

TRADES = [
    {"id": "t1", "date": "2024-11-15", "team1_id": "gc1", "team2_id": "rd2", "team1_receives": ["David Martinez"], "team2_receives": ["Kevin Harris", "2025 2nd Round Pick"], "status": "completed"},
    {"id": "t2", "date": "2024-11-12", "team1_id": "gc3", "team2_id": "rd1", "team1_receives": ["Chris Anderson"], "team2_receives": ["Tony Brown", "Adam Clark"], "status": "completed"},
]

POWER_RANKINGS = [
    {"rank": 1, "team_id": "rd1", "prev_rank": 1, "trend": "same", "analysis": "Undefeated and dominant."},
    {"rank": 2, "team_id": "gc1", "prev_rank": 3, "trend": "up", "analysis": "Columbus Colts surge into second."},
    {"rank": 3, "team_id": "rd2", "prev_rank": 2, "trend": "down", "analysis": "New York Guardians slip but remain dangerous."},
    {"rank": 4, "team_id": "rd3", "prev_rank": 4, "trend": "same", "analysis": "Saskatoon Stampede holding steady."},
    {"rank": 5, "team_id": "gc2", "prev_rank": 6, "trend": "up", "analysis": "Evergreen Stags climbing."},
    {"rank": 6, "team_id": "gc3", "prev_rank": 5, "trend": "down", "analysis": "Nashville Nightmares fighting."},
    {"rank": 7, "team_id": "gc4", "prev_rank": 7, "trend": "same", "analysis": "Seattle Skyclaws in hunt."},
    {"rank": 8, "team_id": "gc5", "prev_rank": 9, "trend": "up", "analysis": "Portland Steel showing improvement."},
    {"rank": 9, "team_id": "gc6", "prev_rank": 8, "trend": "down", "analysis": "Richmond Rebellion struggling."},
    {"rank": 10, "team_id": "rd4", "prev_rank": 10, "trend": "same", "analysis": "Valor City on the bubble."},
    {"rank": 11, "team_id": "rd5", "prev_rank": 11, "trend": "same", "analysis": "Austin building for next season."},
    {"rank": 12, "team_id": "rd6", "prev_rank": 12, "trend": "same", "analysis": "Denver focusing on draft."},
]

SCHEDULE = []
for week in range(1, 9):
    matchups = [
        {"home": "gc1", "away": "rd1", "home_score": 142.5 + (week * 2.3), "away_score": 148.2 + (week * 1.8)},
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
            "is_completed": True,
            "player_of_game": player_names[i % len(player_names)],
            "player_of_game_stats": f"{25 + (i * 3)} pts"
        })

AWARDS = [
    {"id": "a1", "name": "League MVP", "description": "Most Valuable Player", "winner_id": "p1", "winner_name": "Marcus Williams", "winner_team": "Vicksburg Vortex", "stat_value": "412.5 pts"},
    {"id": "a2", "name": "Offensive Player of the Year", "description": "Best offensive performance", "winner_id": "p5", "winner_name": "Chris Anderson", "winner_team": "Vicksburg Vortex", "stat_value": "1,654 rec yds"},
]

PLAYOFFS = [
    {"id": "cc1", "round": "conference", "week": 9, "position": 1, "team1_id": "rd1", "team2_id": "rd2", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Ridge Conference Championship"},
    {"id": "cc2", "round": "conference", "week": 9, "position": 2, "team1_id": "gc1", "team2_id": "gc2", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Grand Central Conference Championship"},
    {"id": "wc1", "round": "wildcard", "week": 10, "position": 1, "team1_id": "gc3", "team2_id": "rd4", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "WC: #5 vs #10"},
    {"id": "wc2", "round": "wildcard", "week": 10, "position": 2, "team1_id": "rd3", "team2_id": "gc6", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "WC: #6 vs #9"},
    {"id": "wc3", "round": "wildcard", "week": 10, "position": 3, "team1_id": "gc4", "team2_id": "gc5", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "WC: #7 vs #8"},
    {"id": "div1", "round": "divisional", "week": 11, "position": 1, "team1_id": "rd2", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Seed #3 vs WC Winner"},
    {"id": "div2", "round": "divisional", "week": 11, "position": 2, "team1_id": "rd3", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Seed #4 vs WC Winner"},
    {"id": "sf1", "round": "semifinal", "week": 12, "position": 1, "team1_id": "rd1", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Semifinal #1"},
    {"id": "sf2", "round": "semifinal", "week": 12, "position": 2, "team1_id": "gc1", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Semifinal #2"},
    {"id": "final", "round": "championship", "week": 13, "position": 1, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "UFF Championship - The Final"},
]

user_watchlists = {}

# Helper Functions
def verify_admin(admin_key: str):
    if admin_key == ADMIN_KEY:
        return "admin"
    for username, data in ADMINS.items():
        if hashlib.sha256(admin_key.encode()).hexdigest() == data["password_hash"]:
            return username
    return None

def generate_player_analysis(player):
    pos = player["position"]
    stats = player["stats"]
    name = player["name"]
    analysis = {"overview": f"{name} has solid performance.", "strengths": [], "weaknesses": [], "outlook": "", "fantasy_advice": ""}
    if pos == "QB":
        if stats.get("rating", 0) > 110: analysis["strengths"].append("Elite passer rating")
        if stats.get("completion_pct", 0) > 67: analysis["strengths"].append("Excellent accuracy")
        if stats.get("interceptions", 0) > 12: analysis["weaknesses"].append("Turnover-prone")
        analysis["fantasy_advice"] = "Must-start" if stats.get("fantasy_points", 0) > 350 else "Solid option"
    elif pos == "RB":
        if stats.get("yards_per_carry", 0) > 5.0: analysis["strengths"].append("Excellent efficiency")
        if stats.get("fumbles", 0) > 2: analysis["weaknesses"].append("Ball security concern")
        analysis["fantasy_advice"] = "Set and forget" if stats.get("fantasy_points", 0) > 250 else "Good flex"
    elif pos == "WR":
        if stats.get("receiving_yards", 0) > 1400: analysis["strengths"].append("Elite yardage")
        if stats.get("drops", 0) > 5: analysis["weaknesses"].append("Drop issues")
        analysis["fantasy_advice"] = "Weekly must-start" if stats.get("fantasy_points", 0) > 220 else "Good starter"
    elif pos == "DEF":
        if stats.get("sacks", 0) > 12: analysis["strengths"].append("Elite pass rusher")
        analysis["fantasy_advice"] = "Top-tier IDP" if stats.get("fantasy_points", 0) > 150 else "Streaming option"
    else:
        analysis["strengths"].append("Consistent performer")
    analysis["outlook"] = "Strong playoff contributor" if stats.get("fantasy_points", 0) > 200 else "Developing player"
    return analysis

def generate_team_analysis(team_id):
    team = next((t for t in TEAMS if t["id"] == team_id), None)
    if not team: return None
    team_players = [p for p in PLAYERS if p["team_id"] == team_id]
    total_fp = sum(p["stats"].get("fantasy_points", 0) for p in team_players)
    elite_count = sum(1 for p in team_players if p.get("is_elite"))
    win_pct = team["wins"] / (team["wins"] + team["losses"]) if (team["wins"] + team["losses"]) > 0 else 0
    analysis = {
        "team_name": team["name"], "record": f"{team['wins']}-{team['losses']}", "conference": team["conference"],
        "playoff_status": team.get("playoff_status"), "seed": team.get("seed"),
        "overview": f"The {team['name']} have a {team['wins']}-{team['losses']} record.",
        "offense_grade": "A" if team["points_for"] > 1800 else "B+" if team["points_for"] > 1600 else "B",
        "defense_grade": "A" if team["points_against"] < 1550 else "B+" if team["points_against"] < 1700 else "B",
        "strengths": [], "weaknesses": [],
        "key_players": [{"name": p["name"], "position": p["position"], "fantasy_points": p["stats"].get("fantasy_points", 0), "is_elite": p.get("is_elite", False)} for p in sorted(team_players, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)[:3]],
        "playoff_outlook": "Strong contender" if team.get("playoff_status") == "x" else "In the hunt",
        "power_ranking": next((pr["rank"] for pr in POWER_RANKINGS if pr["team_id"] == team_id), None)
    }
    if elite_count >= 2: analysis["strengths"].append(f"{elite_count} elite players")
    if team["points_for"] > 1800: analysis["strengths"].append("High-powered offense")
    if team["points_against"] > 1700: analysis["weaknesses"].append("Defensive struggles")
    return analysis

# ============ PUBLIC API ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "UFF - United Football League API", "version": "3.0.0"}

@api_router.get("/league-info")
async def get_league_info():
    return {
        "name": "UFF - United Football League",
        "logo": "https://customer-assets.emergentagent.com/job_elite-league-hub/artifacts/g9a4t1r6_image.png",
        "conferences": ["Grand Central", "Ridge"],
        "total_teams": len(TEAMS),
        "current_week": 8
    }

@api_router.get("/teams")
async def get_teams():
    return TEAMS

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str):
    team = next((t for t in TEAMS if t["id"] == team_id), None)
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.get("/teams/{team_id}/analysis")
async def get_team_analysis(team_id: str):
    analysis = generate_team_analysis(team_id)
    if not analysis: raise HTTPException(status_code=404, detail="Team not found")
    return analysis

@api_router.get("/players")
async def get_players(position: Optional[str] = None, elite_only: bool = False, search: Optional[str] = None, team_id: Optional[str] = None, roblox_id: Optional[str] = None, roblox_username: Optional[str] = None, limit: int = 100):
    players = PLAYERS.copy()
    if position: players = [p for p in players if p["position"] == position]
    if elite_only: players = [p for p in players if p["is_elite"]]
    if team_id: players = [p for p in players if p["team_id"] == team_id]
    if roblox_id: players = [p for p in players if p.get("roblox_id") == roblox_id]
    if roblox_username: players = [p for p in players if roblox_username.lower() in p.get("roblox_username", "").lower()]
    if search:
        search_lower = search.lower()
        players = [p for p in players if search_lower in p["name"].lower() or search_lower in p["team"].lower() or search_lower in p.get("roblox_username", "").lower() or search_lower in p.get("roblox_id", "")]
    players = sorted(players, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)
    return players[:limit]

@api_router.get("/players/{player_id}")
async def get_player(player_id: str):
    player = next((p for p in PLAYERS if p["id"] == player_id), None)
    if not player: raise HTTPException(status_code=404, detail="Player not found")
    weekly_scores = [ws for ws in WEEKLY_PLAYER_STATS if ws["player_id"] == player_id]
    return {**player, "weekly_scores": weekly_scores}

@api_router.get("/players/{player_id}/analysis")
async def get_player_analysis(player_id: str):
    player = next((p for p in PLAYERS if p["id"] == player_id), None)
    if not player: raise HTTPException(status_code=404, detail="Player not found")
    analysis = generate_player_analysis(player)
    return {"player_id": player_id, "player_name": player["name"], "position": player["position"], "team": player["team"], **analysis}

@api_router.get("/standings")
async def get_standings():
    gc_teams = sorted([t for t in TEAMS if t["conference"] == "Grand Central"], key=lambda x: (-x["wins"], x["losses"]))
    rd_teams = sorted([t for t in TEAMS if t["conference"] == "Ridge"], key=lambda x: (-x["wins"], x["losses"]))
    return {"grand_central": gc_teams, "ridge": rd_teams, "league_structure": {"format": "10-team playoff", "legend": {"x": "Division Leader", "y": "Wildcard", "z": "Playins"}, "stats_legend": {"W": "Wins", "L": "Losses", "PCT": "Win %", "PF": "Points For", "PA": "Points Against", "DIFF": "Differential"}}}

@api_router.get("/schedule")
async def get_schedule(week: Optional[int] = None):
    schedule = SCHEDULE if not week else [g for g in SCHEDULE if g["week"] == week]
    weekly_stats = {}
    for game in SCHEDULE:
        w = game["week"]
        if w not in weekly_stats: weekly_stats[w] = {"total_points": 0, "games": 0, "high_score": 0, "high_scorer": ""}
        weekly_stats[w]["total_points"] += game["home_score"] + game["away_score"]
        weekly_stats[w]["games"] += 1
        for score, tid in [(game["home_score"], game["home_team_id"]), (game["away_score"], game["away_team_id"])]:
            if score > weekly_stats[w]["high_score"]:
                weekly_stats[w]["high_score"] = score
                team = next((t for t in TEAMS if t["id"] == tid), None)
                weekly_stats[w]["high_scorer"] = team["name"] if team else ""
    for w in weekly_stats:
        weekly_stats[w]["avg_points"] = round(weekly_stats[w]["total_points"] / (weekly_stats[w]["games"] * 2), 1) if weekly_stats[w]["games"] > 0 else 0
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
        trades_with_teams.append({**trade, "team1_name": team1["name"] if team1 else "Unknown", "team1_abbr": team1["abbreviation"] if team1 else "???", "team1_color": team1["color"] if team1 else "#333", "team2_name": team2["name"] if team2 else "Unknown", "team2_abbr": team2["abbreviation"] if team2 else "???", "team2_color": team2["color"] if team2 else "#333"})
    return trades_with_teams

@api_router.get("/power-rankings")
async def get_power_rankings():
    rankings = []
    for pr in POWER_RANKINGS:
        team = next((t for t in TEAMS if t["id"] == pr["team_id"]), None)
        if team: rankings.append({**pr, "team_name": team["name"], "team_abbr": team["abbreviation"], "team_color": team["color"], "record": f"{team['wins']}-{team['losses']}"})
    return rankings

@api_router.get("/stat-leaders")
async def get_stat_leaders():
    return {
        "passing_yards": sorted([p for p in PLAYERS if p["position"] == "QB"], key=lambda x: x["stats"].get("passing_yards", 0), reverse=True)[:5],
        "rushing_yards": sorted([p for p in PLAYERS if p["position"] == "RB"], key=lambda x: x["stats"].get("rushing_yards", 0), reverse=True)[:5],
        "receiving_yards": sorted([p for p in PLAYERS if p["position"] == "WR"], key=lambda x: x["stats"].get("receiving_yards", 0), reverse=True)[:5],
        "touchdowns": sorted(PLAYERS, key=lambda x: x["stats"].get("touchdowns", 0), reverse=True)[:5],
        "fantasy_points": sorted(PLAYERS, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)[:5],
        "sacks": sorted([p for p in PLAYERS if p["position"] == "DEF"], key=lambda x: x["stats"].get("sacks", 0), reverse=True)[:5],
    }

@api_router.get("/watchlist")
async def get_watchlist(user_id: str = "default"):
    watchlist = user_watchlists.get(user_id, [])
    return [p for p in PLAYERS if p["id"] in watchlist]

@api_router.post("/watchlist")
async def add_to_watchlist(item: WatchlistItem, user_id: str = "default"):
    if user_id not in user_watchlists: user_watchlists[user_id] = []
    if item.player_id not in user_watchlists[user_id]: user_watchlists[user_id].append(item.player_id)
    return {"success": True, "watchlist": user_watchlists[user_id]}

@api_router.delete("/watchlist/{player_id}")
async def remove_from_watchlist(player_id: str, user_id: str = "default"):
    if user_id in user_watchlists and player_id in user_watchlists[user_id]: user_watchlists[user_id].remove(player_id)
    return {"success": True}

@api_router.get("/dashboard")
async def get_dashboard():
    return {
        "league_info": {"name": "UFF - United Football League", "logo": "https://customer-assets.emergentagent.com/job_elite-league-hub/artifacts/g9a4t1r6_image.png"},
        "top_performers": sorted(PLAYERS, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)[:5],
        "recent_games": [g for g in SCHEDULE if g["week"] == 8],
        "recent_trades": TRADES[:3],
        "leaders": {pos: max([p for p in PLAYERS if p["position"] == pos], key=lambda x: x["stats"].get("fantasy_points", 0)) for pos in ["QB", "WR", "RB", "DEF", "K"] if any(p["position"] == pos for p in PLAYERS)},
        "standings_preview": {"grand_central_leader": next((t for t in sorted([t for t in TEAMS if t["conference"] == "Grand Central"], key=lambda x: -x["wins"])), None), "ridge_leader": next((t for t in sorted([t for t in TEAMS if t["conference"] == "Ridge"], key=lambda x: -x["wins"])), None)},
        "power_rankings_preview": POWER_RANKINGS[:5]
    }

@api_router.get("/player-analytics")
async def get_player_analytics():
    analytics = {"passing": [], "rushing": [], "receiving": [], "defense": [], "all_players": []}
    for p in PLAYERS:
        base = {"id": p["id"], "name": p["name"], "team": p["team"], "position": p["position"], "games_played": p.get("games_played", 8), "fantasy_points": p["stats"].get("fantasy_points", 0)}
        analytics["all_players"].append(base)
        if p["position"] == "QB":
            analytics["passing"].append({**base, "completions": p["stats"].get("completions", 0), "attempts": p["stats"].get("attempts", 0), "yards": p["stats"].get("passing_yards", 0), "tds": p["stats"].get("touchdowns", 0), "ints": p["stats"].get("interceptions", 0), "rating": p["stats"].get("rating", 0)})
        elif p["position"] == "RB":
            analytics["rushing"].append({**base, "attempts": p["stats"].get("attempts", 0), "yards": p["stats"].get("rushing_yards", 0), "tds": p["stats"].get("touchdowns", 0), "ypc": p["stats"].get("yards_per_carry", 0), "fumbles": p["stats"].get("fumbles", 0)})
        elif p["position"] == "WR":
            analytics["receiving"].append({**base, "receptions": p["stats"].get("receptions", 0), "yards": p["stats"].get("receiving_yards", 0), "tds": p["stats"].get("touchdowns", 0), "drops": p["stats"].get("drops", 0)})
        elif p["position"] == "DEF":
            analytics["defense"].append({**base, "tackles": p["stats"].get("tackles", 0), "tfl": p["stats"].get("tackles_for_loss", 0), "sacks": p["stats"].get("sacks", 0), "ints": p["stats"].get("interceptions", 0), "def_tds": p["stats"].get("defensive_td", 0)})
    return analytics

# ============ ADMIN API ENDPOINTS ============

@api_router.post("/admin/login")
async def admin_login(login: AdminLogin):
    password_hash = hashlib.sha256(login.password.encode()).hexdigest()
    if login.username in ADMINS and ADMINS[login.username]["password_hash"] == password_hash:
        log_admin_activity(login.username, "LOGIN", "Admin logged in")
        return {"success": True, "username": login.username, "role": ADMINS[login.username]["role"], "token": ADMINS[login.username]["password_hash"][:32]}
    if login.password == ADMIN_KEY:
        log_admin_activity("admin", "LOGIN", "Admin logged in with master key")
        return {"success": True, "username": "admin", "role": "super_admin", "token": hashlib.sha256(ADMIN_KEY.encode()).hexdigest()[:32]}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/admin/stats")
async def admin_stats(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    return {"total_teams": len(TEAMS), "total_players": len(PLAYERS), "total_games": len(SCHEDULE), "total_trades": len(TRADES), "elite_players": len([p for p in PLAYERS if p["is_elite"]]), "injured_players": len([p for p in PLAYERS if p.get("injury_status")]), "playoff_teams": len([t for t in TEAMS if t.get("playoff_status")]), "total_admins": len(ADMINS)}

@api_router.get("/admin/activity-log")
async def get_activity_log(admin_key: str = Header(None, alias="X-Admin-Key"), limit: int = 50):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    return ADMIN_ACTIVITY_LOG[:limit]

# Admin Management
@api_router.get("/admin/admins")
async def get_admins(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    return [{"username": k, "role": v["role"], "created": v.get("created", "N/A")} for k, v in ADMINS.items()]

@api_router.post("/admin/admins")
async def create_admin(new_admin: NewAdmin, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    if new_admin.username in ADMINS: raise HTTPException(status_code=400, detail="Username exists")
    ADMINS[new_admin.username] = {"password_hash": hashlib.sha256(new_admin.password.encode()).hexdigest(), "role": new_admin.role, "created": datetime.now(timezone.utc).isoformat()}
    log_admin_activity(admin, "CREATE_ADMIN", f"Created admin: {new_admin.username}")
    return {"success": True, "username": new_admin.username}

@api_router.delete("/admin/admins/{username}")
async def delete_admin(username: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    if username not in ADMINS: raise HTTPException(status_code=404, detail="Admin not found")
    if username == "admin": raise HTTPException(status_code=400, detail="Cannot delete super admin")
    del ADMINS[username]
    log_admin_activity(admin, "DELETE_ADMIN", f"Deleted admin: {username}")
    return {"success": True}

# Player Management
@api_router.post("/admin/player")
async def create_player(player: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    new_player = {"id": str(uuid.uuid4()), **player, "stats": player.get("stats", {}), "games_played": 0}
    PLAYERS.append(new_player)
    log_admin_activity(admin, "CREATE_PLAYER", f"Created player: {player.get('name')}")
    return new_player

@api_router.put("/admin/player/{player_id}")
async def update_player(player_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, p in enumerate(PLAYERS):
        if p["id"] == player_id:
            PLAYERS[i] = {**p, **updates}
            log_admin_activity(admin, "UPDATE_PLAYER", f"Updated player: {p['name']}")
            return PLAYERS[i]
    raise HTTPException(status_code=404, detail="Player not found")

@api_router.put("/admin/player/{player_id}/stats")
async def update_player_stats(player_id: str, stats: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, p in enumerate(PLAYERS):
        if p["id"] == player_id:
            PLAYERS[i]["stats"] = {**PLAYERS[i].get("stats", {}), **stats}
            log_admin_activity(admin, "UPDATE_PLAYER_STATS", f"Updated stats for: {p['name']}")
            return PLAYERS[i]
    raise HTTPException(status_code=404, detail="Player not found")

@api_router.delete("/admin/player/{player_id}")
async def delete_player(player_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, p in enumerate(PLAYERS):
        if p["id"] == player_id:
            deleted = PLAYERS.pop(i)
            log_admin_activity(admin, "DELETE_PLAYER", f"Deleted player: {deleted['name']}")
            return {"success": True}
    raise HTTPException(status_code=404, detail="Player not found")

@api_router.post("/admin/player/merge")
async def merge_players(merge: PlayerMerge, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    source = next((p for p in PLAYERS if p["id"] == merge.source_player_id), None)
    target = next((p for p in PLAYERS if p["id"] == merge.target_player_id), None)
    if not source or not target: raise HTTPException(status_code=404, detail="Player not found")
    for key, val in source["stats"].items():
        if isinstance(val, (int, float)):
            target["stats"][key] = target["stats"].get(key, 0) + val
    target["games_played"] = target.get("games_played", 0) + source.get("games_played", 0)
    if merge.keep_name == "source": target["name"] = source["name"]
    PLAYERS.remove(source)
    log_admin_activity(admin, "MERGE_PLAYERS", f"Merged {source['name']} into {target['name']}")
    return target

@api_router.get("/admin/player/search-roblox")
async def search_player_roblox(roblox_id: Optional[str] = None, roblox_username: Optional[str] = None, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    results = []
    for p in PLAYERS:
        if roblox_id and p.get("roblox_id") == roblox_id: results.append(p)
        elif roblox_username and roblox_username.lower() in p.get("roblox_username", "").lower(): results.append(p)
    return results

@api_router.get("/admin/player/convert-id/{roblox_id}")
async def convert_roblox_id(roblox_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    player = next((p for p in PLAYERS if p.get("roblox_id") == roblox_id), None)
    if player: return {"roblox_id": roblox_id, "roblox_username": player.get("roblox_username"), "player_name": player["name"], "player_id": player["id"]}
    return {"roblox_id": roblox_id, "roblox_username": None, "player_name": None, "message": "No player found with this Roblox ID"}

# Team Management
@api_router.put("/admin/team/{team_id}")
async def update_team(team_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, t in enumerate(TEAMS):
        if t["id"] == team_id:
            TEAMS[i] = {**t, **updates}
            log_admin_activity(admin, "UPDATE_TEAM", f"Updated team: {t['name']}")
            return TEAMS[i]
    raise HTTPException(status_code=404, detail="Team not found")

@api_router.put("/admin/team/{team_id}/conference")
async def update_team_conference(team_id: str, conference: str, division: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, t in enumerate(TEAMS):
        if t["id"] == team_id:
            TEAMS[i]["conference"] = conference
            TEAMS[i]["division"] = division
            log_admin_activity(admin, "UPDATE_TEAM_CONFERENCE", f"Changed {t['name']} to {conference}/{division}")
            return TEAMS[i]
    raise HTTPException(status_code=404, detail="Team not found")

@api_router.put("/admin/team/{team_id}/branding")
async def update_team_branding(team_id: str, color: Optional[str] = None, logo: Optional[str] = None, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, t in enumerate(TEAMS):
        if t["id"] == team_id:
            if color: TEAMS[i]["color"] = color
            if logo: TEAMS[i]["logo"] = logo
            log_admin_activity(admin, "UPDATE_TEAM_BRANDING", f"Updated branding for: {t['name']}")
            return TEAMS[i]
    raise HTTPException(status_code=404, detail="Team not found")

# Game Management
@api_router.post("/admin/game")
async def create_game(game: GameCreate, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    new_game = {"id": f"g{game.week}_{len(SCHEDULE)}", "week": game.week, "home_team_id": game.home_team_id, "away_team_id": game.away_team_id, "home_score": game.home_score, "away_score": game.away_score, "is_completed": game.is_completed, "player_of_game": game.player_of_game, "player_of_game_stats": game.player_of_game_stats}
    SCHEDULE.append(new_game)
    log_admin_activity(admin, "CREATE_GAME", f"Created game: Week {game.week}")
    return new_game

@api_router.put("/admin/game/{game_id}")
async def update_game(game_id: str, updates: dict, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, g in enumerate(SCHEDULE):
        if g["id"] == game_id:
            SCHEDULE[i] = {**g, **updates}
            log_admin_activity(admin, "UPDATE_GAME", f"Updated game: {game_id}")
            return SCHEDULE[i]
    raise HTTPException(status_code=404, detail="Game not found")

@api_router.delete("/admin/game/{game_id}")
async def delete_game(game_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, g in enumerate(SCHEDULE):
        if g["id"] == game_id:
            SCHEDULE.pop(i)
            log_admin_activity(admin, "DELETE_GAME", f"Deleted game: {game_id}")
            return {"success": True}
    raise HTTPException(status_code=404, detail="Game not found")

@api_router.post("/admin/game/bulk-delete")
async def bulk_delete_games(data: BulkDeleteGames, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    global SCHEDULE
    before = len(SCHEDULE)
    SCHEDULE = [g for g in SCHEDULE if not (data.start_week <= g["week"] <= data.end_week)]
    deleted = before - len(SCHEDULE)
    log_admin_activity(admin, "BULK_DELETE_GAMES", f"Deleted {deleted} games from weeks {data.start_week}-{data.end_week}")
    return {"success": True, "deleted_count": deleted}

@api_router.post("/admin/game/clone")
async def clone_game(data: CloneGame, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    game = next((g for g in SCHEDULE if g["id"] == data.game_id), None)
    if not game: raise HTTPException(status_code=404, detail="Game not found")
    new_game = {**game, "id": f"g{data.target_week}_{len(SCHEDULE)}", "week": data.target_week, "is_completed": False, "home_score": 0, "away_score": 0, "player_of_game": None}
    SCHEDULE.append(new_game)
    log_admin_activity(admin, "CLONE_GAME", f"Cloned game to week {data.target_week}")
    return new_game

@api_router.get("/admin/games/export")
async def export_games_csv(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id", "week", "home_team_id", "away_team_id", "home_score", "away_score", "is_completed", "player_of_game", "player_of_game_stats"])
    writer.writeheader()
    writer.writerows(SCHEDULE)
    output.seek(0)
    log_admin_activity(admin, "EXPORT_GAMES", "Exported games to CSV")
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=games_export.csv"})

# Weekly Stats Management
@api_router.get("/admin/weekly-stats")
async def get_weekly_stats(player_id: Optional[str] = None, week: Optional[int] = None, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    stats = WEEKLY_PLAYER_STATS.copy()
    if player_id: stats = [s for s in stats if s["player_id"] == player_id]
    if week: stats = [s for s in stats if s["week"] == week]
    return stats

@api_router.put("/admin/weekly-stats")
async def update_weekly_stats(data: WeeklyPlayerStats, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    stat_id = f"wps_{data.player_id}_{data.week}"
    for i, s in enumerate(WEEKLY_PLAYER_STATS):
        if s["id"] == stat_id:
            WEEKLY_PLAYER_STATS[i] = {"id": stat_id, "player_id": data.player_id, "week": data.week, "team_id": data.team_id, "stats": data.stats, "points": data.stats.get("fantasy_points", 0)}
            log_admin_activity(admin, "UPDATE_WEEKLY_STATS", f"Updated week {data.week} stats for player {data.player_id}")
            return WEEKLY_PLAYER_STATS[i]
    new_stat = {"id": stat_id, "player_id": data.player_id, "week": data.week, "team_id": data.team_id, "stats": data.stats, "points": data.stats.get("fantasy_points", 0)}
    WEEKLY_PLAYER_STATS.append(new_stat)
    log_admin_activity(admin, "CREATE_WEEKLY_STATS", f"Created week {data.week} stats for player {data.player_id}")
    return new_stat

# Trade Management
@api_router.post("/admin/trade")
async def create_trade(trade: TradeSetup, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    new_trade = {"id": f"t{len(TRADES)+1}", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "team1_id": trade.team1_id, "team2_id": trade.team2_id, "team1_receives": trade.team1_receives, "team2_receives": trade.team2_receives, "status": "completed"}
    TRADES.insert(0, new_trade)
    log_admin_activity(admin, "CREATE_TRADE", f"Created trade between {trade.team1_id} and {trade.team2_id}")
    return new_trade

@api_router.delete("/admin/trade/{trade_id}")
async def delete_trade(trade_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, t in enumerate(TRADES):
        if t["id"] == trade_id:
            TRADES.pop(i)
            log_admin_activity(admin, "DELETE_TRADE", f"Deleted trade: {trade_id}")
            return {"success": True}
    raise HTTPException(status_code=404, detail="Trade not found")

# Playoff Management
@api_router.get("/admin/playoffs")
async def get_admin_playoffs(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    return {"matchups": PLAYOFFS, "teams": TEAMS}

@api_router.put("/admin/playoff/{matchup_id}")
async def update_playoff(matchup_id: str, updates: PlayoffMatchupUpdate, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    for i, m in enumerate(PLAYOFFS):
        if m["id"] == matchup_id:
            if updates.team1_id is not None: PLAYOFFS[i]["team1_id"] = updates.team1_id
            if updates.team2_id is not None: PLAYOFFS[i]["team2_id"] = updates.team2_id
            PLAYOFFS[i]["team1_score"] = updates.team1_score
            PLAYOFFS[i]["team2_score"] = updates.team2_score
            PLAYOFFS[i]["winner_id"] = updates.winner_id
            PLAYOFFS[i]["is_completed"] = updates.is_completed
            log_admin_activity(admin, "UPDATE_PLAYOFF", f"Updated playoff matchup: {matchup_id}")
            return PLAYOFFS[i]
    raise HTTPException(status_code=404, detail="Matchup not found")

@api_router.post("/admin/playoff/advance")
async def advance_playoff_winner(matchup_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    matchup = next((m for m in PLAYOFFS if m["id"] == matchup_id), None)
    if not matchup: raise HTTPException(status_code=404, detail="Matchup not found")
    if not matchup["winner_id"]: raise HTTPException(status_code=400, detail="No winner set")
    log_admin_activity(admin, "ADVANCE_PLAYOFF", f"Advanced winner from {matchup_id}")
    return {"success": True, "winner_id": matchup["winner_id"]}

# Season Reset
@api_router.post("/admin/season/reset")
async def reset_season(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    global SCHEDULE, PLAYOFFS, WEEKLY_PLAYER_STATS
    for t in TEAMS:
        t["wins"] = 0
        t["losses"] = 0
        t["points_for"] = 0
        t["points_against"] = 0
        t["seed"] = None
        t["playoff_status"] = None
    for p in PLAYERS:
        for key in p["stats"]: p["stats"][key] = 0
        p["games_played"] = 0
    SCHEDULE = []
    WEEKLY_PLAYER_STATS = []
    for m in PLAYOFFS:
        m["team1_score"] = 0
        m["team2_score"] = 0
        m["winner_id"] = None
        m["is_completed"] = False
    log_admin_activity(admin, "RESET_SEASON", "Full season reset performed")
    return {"success": True, "message": "Season has been reset"}

# Data Validation
@api_router.get("/admin/validate")
async def validate_data(admin_key: str = Header(None, alias="X-Admin-Key")):
    admin = verify_admin(admin_key)
    if not admin: raise HTTPException(status_code=401, detail="Invalid admin key")
    issues = []
    team_ids = {t["id"] for t in TEAMS}
    player_ids = {p["id"] for p in PLAYERS}
    for p in PLAYERS:
        if p["team_id"] not in team_ids: issues.append({"type": "player", "id": p["id"], "issue": f"Invalid team_id: {p['team_id']}"})
        if not p.get("name"): issues.append({"type": "player", "id": p["id"], "issue": "Missing name"})
    for g in SCHEDULE:
        if g["home_team_id"] not in team_ids: issues.append({"type": "game", "id": g["id"], "issue": f"Invalid home_team_id: {g['home_team_id']}"})
        if g["away_team_id"] not in team_ids: issues.append({"type": "game", "id": g["id"], "issue": f"Invalid away_team_id: {g['away_team_id']}"})
    for m in PLAYOFFS:
        if m["team1_id"] and m["team1_id"] not in team_ids: issues.append({"type": "playoff", "id": m["id"], "issue": f"Invalid team1_id: {m['team1_id']}"})
    return {"valid": len(issues) == 0, "issues": issues, "stats": {"teams": len(TEAMS), "players": len(PLAYERS), "games": len(SCHEDULE), "playoffs": len(PLAYOFFS)}}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
