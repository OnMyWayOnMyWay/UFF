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
class WatchlistItem(BaseModel):
    player_id: str

# UFF Teams Data
TEAMS = [
    # Grand Central Conference
    {"id": "gc1", "name": "Columbus Colts", "abbreviation": "COL", "conference": "Grand Central", "color": "#1E3A8A", "wins": 7, "losses": 1, "points_for": 1842.5, "points_against": 1523.2, "seed": 2, "playoff_status": "x"},
    {"id": "gc2", "name": "Evergreen Stags", "abbreviation": "EVG", "conference": "Grand Central", "color": "#166534", "wins": 5, "losses": 3, "points_for": 1756.8, "points_against": 1612.4, "seed": 4, "playoff_status": "x"},
    {"id": "gc3", "name": "Nashville Nightmares", "abbreviation": "NSH", "conference": "Grand Central", "color": "#7C3AED", "wins": 5, "losses": 3, "points_for": 1698.2, "points_against": 1654.1, "seed": 5, "playoff_status": "y"},
    {"id": "gc4", "name": "Seattle Skyclaws", "abbreviation": "SEA", "conference": "Grand Central", "color": "#0891B2", "wins": 5, "losses": 3, "points_for": 1621.5, "points_against": 1687.3, "seed": 7, "playoff_status": "z"},
    {"id": "gc5", "name": "Portland Steel", "abbreviation": "POR", "conference": "Grand Central", "color": "#64748B", "wins": 4, "losses": 4, "points_for": 1534.7, "points_against": 1721.8, "seed": 8, "playoff_status": "z"},
    {"id": "gc6", "name": "Richmond Rebellion", "abbreviation": "RIC", "conference": "Grand Central", "color": "#DC2626", "wins": 4, "losses": 4, "points_for": 1489.2, "points_against": 1798.5, "seed": 9, "playoff_status": "z"},
    # Ridge Conference
    {"id": "rd1", "name": "Vicksburg Vortex", "abbreviation": "VIC", "conference": "Ridge", "color": "#EA580C", "wins": 8, "losses": 0, "points_for": 1923.4, "points_against": 1456.7, "seed": 1, "playoff_status": "x"},
    {"id": "rd2", "name": "New York Guardians", "abbreviation": "NYG", "conference": "Ridge", "color": "#0369A1", "wins": 7, "losses": 1, "points_for": 1812.6, "points_against": 1589.3, "seed": 3, "playoff_status": "x"},
    {"id": "rd3", "name": "Saskatoon Stampede", "abbreviation": "SAS", "conference": "Ridge", "color": "#B91C1C", "wins": 6, "losses": 2, "points_for": 1745.8, "points_against": 1634.2, "seed": 6, "playoff_status": "y"},
    {"id": "rd4", "name": "Valor City Spartans", "abbreviation": "VAL", "conference": "Ridge", "color": "#CA8A04", "wins": 4, "losses": 4, "points_for": 1598.4, "points_against": 1678.9, "seed": 10, "playoff_status": "z"},
    {"id": "rd5", "name": "Austin Outlaws", "abbreviation": "AUS", "conference": "Ridge", "color": "#059669", "wins": 3, "losses": 5, "points_for": 1512.3, "points_against": 1745.6, "seed": None, "playoff_status": None},
    {"id": "rd6", "name": "Denver Mustangs", "abbreviation": "DEN", "conference": "Ridge", "color": "#7C2D12", "wins": 2, "losses": 6, "points_for": 1423.1, "points_against": 1867.4, "seed": None, "playoff_status": None},
]

PLAYERS = [
    # QBs - Passing stats
    {"id": "p1", "name": "Marcus Williams", "position": "QB", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None, 
     "stats": {"completions": 287, "attempts": 412, "passing_yards": 4521, "touchdowns": 38, "interceptions": 8, "rating": 124.5, "completion_pct": 69.7, "avg_per_attempt": 11.0, "longest": 78, "fantasy_points": 412.5, "avg_points": 51.6}},
    {"id": "p2", "name": "Jake Thompson", "position": "QB", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None,
     "stats": {"completions": 265, "attempts": 389, "passing_yards": 4234, "touchdowns": 35, "interceptions": 10, "rating": 118.2, "completion_pct": 68.1, "avg_per_attempt": 10.9, "longest": 72, "fantasy_points": 385.2, "avg_points": 48.2}},
    {"id": "p3", "name": "Ryan Mitchell", "position": "QB", "team": "New York Guardians", "team_id": "rd2", "is_elite": False, "bye_week": 6, "injury_status": "Questionable",
     "stats": {"completions": 234, "attempts": 345, "passing_yards": 3856, "touchdowns": 29, "interceptions": 12, "rating": 108.4, "completion_pct": 67.8, "avg_per_attempt": 11.2, "longest": 65, "fantasy_points": 342.8, "avg_points": 42.9}},
    {"id": "p4", "name": "Derek Johnson", "position": "QB", "team": "Saskatoon Stampede", "team_id": "rd3", "is_elite": False, "bye_week": 8, "injury_status": None,
     "stats": {"completions": 212, "attempts": 312, "passing_yards": 3654, "touchdowns": 27, "interceptions": 14, "rating": 102.6, "completion_pct": 67.9, "avg_per_attempt": 11.7, "longest": 68, "fantasy_points": 318.4, "avg_points": 39.8}},
    {"id": "p19", "name": "Trevor Lance", "position": "QB", "team": "Nashville Nightmares", "team_id": "gc3", "is_elite": False, "bye_week": 5, "injury_status": None,
     "stats": {"completions": 198, "attempts": 298, "passing_yards": 3421, "touchdowns": 24, "interceptions": 11, "rating": 98.4, "completion_pct": 66.4, "avg_per_attempt": 11.5, "longest": 61, "fantasy_points": 298.6, "avg_points": 37.3}},
    {"id": "p20", "name": "Caleb Murray", "position": "QB", "team": "Evergreen Stags", "team_id": "gc2", "is_elite": False, "bye_week": 10, "injury_status": "Out",
     "stats": {"completions": 178, "attempts": 278, "passing_yards": 3156, "touchdowns": 21, "interceptions": 9, "rating": 94.8, "completion_pct": 64.0, "avg_per_attempt": 11.4, "longest": 58, "fantasy_points": 276.4, "avg_points": 34.6}},
    # WRs - Receiving stats
    {"id": "p5", "name": "Chris Anderson", "position": "WR", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None,
     "stats": {"receptions": 112, "receiving_yards": 1654, "touchdowns": 14, "drops": 4, "longest": 82, "fantasy_points": 298.4, "avg_points": 37.3}},
    {"id": "p6", "name": "Mike Davis", "position": "WR", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None,
     "stats": {"receptions": 98, "receiving_yards": 1487, "touchdowns": 12, "drops": 3, "longest": 76, "fantasy_points": 267.2, "avg_points": 33.4}},
    {"id": "p7", "name": "Tony Brown", "position": "WR", "team": "Nashville Nightmares", "team_id": "gc3", "is_elite": False, "bye_week": 5, "injury_status": None,
     "stats": {"receptions": 89, "receiving_yards": 1234, "touchdowns": 9, "drops": 5, "longest": 68, "fantasy_points": 221.8, "avg_points": 27.7}},
    {"id": "p8", "name": "James Wilson", "position": "WR", "team": "Evergreen Stags", "team_id": "gc2", "is_elite": False, "bye_week": 10, "injury_status": "Questionable",
     "stats": {"receptions": 82, "receiving_yards": 1156, "touchdowns": 8, "drops": 6, "longest": 62, "fantasy_points": 198.6, "avg_points": 24.8}},
    {"id": "p21", "name": "Jaylen Cooper", "position": "WR", "team": "New York Guardians", "team_id": "rd2", "is_elite": False, "bye_week": 8, "injury_status": None,
     "stats": {"receptions": 76, "receiving_yards": 1089, "touchdowns": 7, "drops": 4, "longest": 58, "fantasy_points": 185.4, "avg_points": 23.2}},
    {"id": "p22", "name": "DeShawn Harris", "position": "WR", "team": "Saskatoon Stampede", "team_id": "rd3", "is_elite": False, "bye_week": 6, "injury_status": None,
     "stats": {"receptions": 71, "receiving_yards": 998, "touchdowns": 6, "drops": 3, "longest": 54, "fantasy_points": 168.8, "avg_points": 21.1}},
    # RBs - Rushing stats
    {"id": "p9", "name": "David Martinez", "position": "RB", "team": "New York Guardians", "team_id": "rd2", "is_elite": True, "bye_week": 8, "injury_status": None,
     "stats": {"attempts": 280, "rushing_yards": 1456, "touchdowns": 16, "yards_per_carry": 5.2, "fumbles": 2, "twenty_plus": 12, "longest": 67, "fantasy_points": 312.6, "avg_points": 39.1}},
    {"id": "p10", "name": "Kevin Harris", "position": "RB", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None,
     "stats": {"attempts": 256, "rushing_yards": 1324, "touchdowns": 14, "yards_per_carry": 5.2, "fumbles": 1, "twenty_plus": 10, "longest": 58, "fantasy_points": 278.4, "avg_points": 34.8}},
    {"id": "p11", "name": "Brandon Lee", "position": "RB", "team": "Saskatoon Stampede", "team_id": "rd3", "is_elite": False, "bye_week": 6, "injury_status": "Questionable",
     "stats": {"attempts": 234, "rushing_yards": 1178, "touchdowns": 11, "yards_per_carry": 5.0, "fumbles": 3, "twenty_plus": 8, "longest": 52, "fantasy_points": 234.8, "avg_points": 29.4}},
    {"id": "p12", "name": "Jason Taylor", "position": "RB", "team": "Seattle Skyclaws", "team_id": "gc4", "is_elite": False, "bye_week": 11, "injury_status": None,
     "stats": {"attempts": 212, "rushing_yards": 1045, "touchdowns": 9, "yards_per_carry": 4.9, "fumbles": 2, "twenty_plus": 6, "longest": 48, "fantasy_points": 198.2, "avg_points": 24.8}},
    {"id": "p23", "name": "Marcus Johnson", "position": "RB", "team": "Nashville Nightmares", "team_id": "gc3", "is_elite": False, "bye_week": 5, "injury_status": None,
     "stats": {"attempts": 198, "rushing_yards": 978, "touchdowns": 8, "yards_per_carry": 4.9, "fumbles": 1, "twenty_plus": 5, "longest": 45, "fantasy_points": 187.4, "avg_points": 23.4}},
    {"id": "p24", "name": "Terrell Williams", "position": "RB", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": False, "bye_week": 7, "injury_status": None,
     "stats": {"attempts": 178, "rushing_yards": 856, "touchdowns": 7, "yards_per_carry": 4.8, "fumbles": 2, "twenty_plus": 4, "longest": 42, "fantasy_points": 176.8, "avg_points": 22.1}},
    # Defensive Players
    {"id": "p13", "name": "Tyler Scott", "position": "DEF", "team": "Vicksburg Vortex", "team_id": "rd1", "is_elite": True, "bye_week": 7, "injury_status": None,
     "stats": {"tackles": 98, "tackles_for_loss": 18, "sacks": 14.5, "safeties": 1, "swat": 8, "interceptions": 3, "pass_deflections": 12, "defensive_td": 2, "fantasy_points": 178.7, "avg_points": 22.3}},
    {"id": "p14", "name": "Adam Clark", "position": "DEF", "team": "Columbus Colts", "team_id": "gc1", "is_elite": False, "bye_week": 5, "injury_status": None,
     "stats": {"tackles": 87, "tackles_for_loss": 15, "sacks": 12.0, "safeties": 0, "swat": 6, "interceptions": 4, "pass_deflections": 10, "defensive_td": 1, "fantasy_points": 145.2, "avg_points": 18.2}},
    {"id": "p25", "name": "Jordan Mitchell", "position": "DEF", "team": "New York Guardians", "team_id": "rd2", "is_elite": False, "bye_week": 9, "injury_status": None,
     "stats": {"tackles": 82, "tackles_for_loss": 12, "sacks": 10.5, "safeties": 0, "swat": 5, "interceptions": 2, "pass_deflections": 8, "defensive_td": 1, "fantasy_points": 126.3, "avg_points": 15.8}},
    {"id": "p26", "name": "Kyle Roberts", "position": "DEF", "team": "Saskatoon Stampede", "team_id": "rd3", "is_elite": False, "bye_week": 8, "injury_status": "Out",
     "stats": {"tackles": 76, "tackles_for_loss": 10, "sacks": 8.5, "safeties": 1, "swat": 4, "interceptions": 1, "pass_deflections": 6, "defensive_td": 0, "fantasy_points": 112.5, "avg_points": 14.1}},
    # Kickers
    {"id": "p15", "name": "Matt Reynolds", "position": "K", "team": "Columbus Colts", "team_id": "gc1", "is_elite": True, "bye_week": 9, "injury_status": None,
     "stats": {"field_goals": 32, "field_goal_attempts": 36, "extra_points": 45, "longest": 56, "fantasy_points": 156.0, "avg_points": 19.5}},
    {"id": "p16", "name": "Sam Cooper", "position": "K", "team": "New York Guardians", "team_id": "rd2", "is_elite": False, "bye_week": 8, "injury_status": None,
     "stats": {"field_goals": 28, "field_goal_attempts": 32, "extra_points": 41, "longest": 52, "fantasy_points": 138.0, "avg_points": 17.3}},
]

# Recent Trades
TRADES = [
    {"id": "t1", "date": "2024-11-15", "team1_id": "gc1", "team2_id": "rd2", "team1_receives": ["David Martinez"], "team2_receives": ["Kevin Harris", "2025 2nd Round Pick"], "status": "completed"},
    {"id": "t2", "date": "2024-11-12", "team1_id": "gc3", "team2_id": "rd1", "team1_receives": ["Chris Anderson"], "team2_receives": ["Tony Brown", "Adam Clark"], "status": "completed"},
    {"id": "t3", "date": "2024-11-08", "team1_id": "rd3", "team2_id": "gc2", "team1_receives": ["James Wilson"], "team2_receives": ["DeShawn Harris", "2025 3rd Round Pick"], "status": "completed"},
    {"id": "t4", "date": "2024-11-05", "team1_id": "gc4", "team2_id": "gc5", "team1_receives": ["2025 1st Round Pick"], "team2_receives": ["Jason Taylor"], "status": "completed"},
    {"id": "t5", "date": "2024-10-28", "team1_id": "gc1", "team2_id": "rd1", "team1_receives": ["Tyler Scott"], "team2_receives": ["Jordan Mitchell", "Matt Reynolds"], "status": "completed"},
]

# Power Rankings
POWER_RANKINGS = [
    {"rank": 1, "team_id": "rd1", "prev_rank": 1, "trend": "same", "analysis": "Undefeated and dominant. Vicksburg's offense is unstoppable with Marcus Williams leading the charge."},
    {"rank": 2, "team_id": "gc1", "prev_rank": 3, "trend": "up", "analysis": "Columbus Colts surge into second place. Jake Thompson's consistency is key to their success."},
    {"rank": 3, "team_id": "rd2", "prev_rank": 2, "trend": "down", "analysis": "New York Guardians slip but remain dangerous. David Martinez is a game-changer."},
    {"rank": 4, "team_id": "rd3", "prev_rank": 4, "trend": "same", "analysis": "Saskatoon Stampede holding steady. Need Derek Johnson healthy for playoff push."},
    {"rank": 5, "team_id": "gc2", "prev_rank": 6, "trend": "up", "analysis": "Evergreen Stags climbing with improved defense. Murray's health is crucial."},
    {"rank": 6, "team_id": "gc3", "prev_rank": 5, "trend": "down", "analysis": "Nashville Nightmares fighting for wildcard. Trevor Lance needs more weapons."},
    {"rank": 7, "team_id": "gc4", "prev_rank": 7, "trend": "same", "analysis": "Seattle Skyclaws in playoff hunt. Inconsistent but talented roster."},
    {"rank": 8, "team_id": "gc5", "prev_rank": 9, "trend": "up", "analysis": "Portland Steel showing improvement. Young team with potential."},
    {"rank": 9, "team_id": "gc6", "prev_rank": 8, "trend": "down", "analysis": "Richmond Rebellion struggling but still in playin contention."},
    {"rank": 10, "team_id": "rd4", "prev_rank": 10, "trend": "same", "analysis": "Valor City Spartans on the bubble. Need strong finish."},
    {"rank": 11, "team_id": "rd5", "prev_rank": 11, "trend": "same", "analysis": "Austin Outlaws building for next season."},
    {"rank": 12, "team_id": "rd6", "prev_rank": 12, "trend": "same", "analysis": "Denver Mustangs focusing on draft position."},
]

# Playoff bracket - UFF format
PLAYOFFS = [
    # Conference Championships - Week 9 (Seeds 1-2 per conference)
    {"id": "cc1", "round": "conference", "week": 9, "position": 1, "team1_id": "rd1", "team2_id": "rd2", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Ridge Conference Championship"},
    {"id": "cc2", "round": "conference", "week": 9, "position": 2, "team1_id": "gc1", "team2_id": "gc2", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Grand Central Conference Championship"},
    # Wildcard - Week 10 (Seeds 5-10)
    {"id": "wc1", "round": "wildcard", "week": 10, "position": 1, "team1_id": "gc3", "team2_id": "rd4", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "WC: #5 vs #10"},
    {"id": "wc2", "round": "wildcard", "week": 10, "position": 2, "team1_id": "rd3", "team2_id": "gc6", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "WC: #6 vs #9"},
    {"id": "wc3", "round": "wildcard", "week": 10, "position": 3, "team1_id": "gc4", "team2_id": "gc5", "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "WC: #7 vs #8"},
    # Divisional - Week 11
    {"id": "div1", "round": "divisional", "week": 11, "position": 1, "team1_id": "rd2", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Seed #3 vs WC Winner"},
    {"id": "div2", "round": "divisional", "week": 11, "position": 2, "team1_id": "rd3", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Seed #4 vs WC Winner"},
    # Semifinals - Week 12
    {"id": "sf1", "round": "semifinal", "week": 12, "position": 1, "team1_id": "rd1", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Semifinal #1"},
    {"id": "sf2", "round": "semifinal", "week": 12, "position": 2, "team1_id": "gc1", "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "Semifinal #2"},
    # Championship - Week 13
    {"id": "final", "round": "championship", "week": 13, "position": 1, "team1_id": None, "team2_id": None, "team1_score": 0, "team2_score": 0, "winner_id": None, "is_completed": False, "matchup_name": "UFF Championship - The Final"},
]

AWARDS = [
    {"id": "a1", "name": "League MVP", "description": "Most Valuable Player of the season", "winner_id": "p1", "winner_name": "Marcus Williams", "winner_team": "Vicksburg Vortex", "stat_value": "412.5 fantasy points"},
    {"id": "a2", "name": "Offensive Player of the Year", "description": "Best offensive performance", "winner_id": "p5", "winner_name": "Chris Anderson", "winner_team": "Vicksburg Vortex", "stat_value": "1,654 receiving yards"},
    {"id": "a3", "name": "Rookie of the Year", "description": "Best first-year player", "winner_id": "p10", "winner_name": "Kevin Harris", "winner_team": "Columbus Colts", "stat_value": "278.4 fantasy points"},
    {"id": "a4", "name": "Comeback Player", "description": "Best comeback performance", "winner_id": "p9", "winner_name": "David Martinez", "winner_team": "New York Guardians", "stat_value": "312.6 fantasy points"},
    {"id": "a5", "name": "Defensive Player of the Year", "description": "Best defensive performance", "winner_id": "p13", "winner_name": "Tyler Scott", "winner_team": "Vicksburg Vortex", "stat_value": "14.5 sacks"},
    {"id": "a6", "name": "Coach of the Year", "description": "Best coaching performance", "winner_id": None, "winner_name": "Coach Stevens", "winner_team": "Vicksburg Vortex", "stat_value": "8-0 record"},
]

# Generate schedule (8 weeks regular season)
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
            "is_completed": week <= 8,
            "player_of_game": player_names[i % len(player_names)],
            "player_of_game_stats": f"{25 + (i * 3)} pts"
        })

# In-memory watchlist storage
user_watchlists = {}

# Player Analysis Generator
def generate_player_analysis(player):
    pos = player["position"]
    stats = player["stats"]
    name = player["name"]
    team = player["team"]
    
    analysis = {
        "overview": "",
        "strengths": [],
        "weaknesses": [],
        "outlook": "",
        "fantasy_advice": ""
    }
    
    if pos == "QB":
        rating = stats.get("rating", 0)
        comp_pct = stats.get("completion_pct", 0)
        tds = stats.get("touchdowns", 0)
        ints = stats.get("interceptions", 0)
        
        analysis["overview"] = f"{name} has been a {'dominant' if rating > 110 else 'solid' if rating > 95 else 'developing'} force for {team} this season."
        
        if rating > 110:
            analysis["strengths"].append("Elite passer rating indicates top-tier decision making")
        if comp_pct > 67:
            analysis["strengths"].append(f"Excellent accuracy with {comp_pct}% completion rate")
        if tds > 25:
            analysis["strengths"].append(f"Prolific scorer with {tds} touchdowns")
        
        if ints > 12:
            analysis["weaknesses"].append("Turnover-prone, needs to protect the ball better")
        if comp_pct < 65:
            analysis["weaknesses"].append("Accuracy issues need to be addressed")
        
        analysis["outlook"] = "Projected to continue strong performance in playoffs" if rating > 100 else "Has potential but needs consistency"
        analysis["fantasy_advice"] = "Must-start every week" if stats.get("fantasy_points", 0) > 350 else "Solid QB1 option with weekly upside"
        
    elif pos == "RB":
        ypc = stats.get("yards_per_carry", 0)
        yards = stats.get("rushing_yards", 0)
        tds = stats.get("touchdowns", 0)
        
        analysis["overview"] = f"{name} is a {'workhorse' if yards > 1200 else 'reliable' if yards > 900 else 'rotational'} back for {team}."
        
        if ypc > 5.0:
            analysis["strengths"].append(f"Excellent efficiency at {ypc} yards per carry")
        if yards > 1200:
            analysis["strengths"].append("High-volume runner with bellcow workload")
        if tds > 10:
            analysis["strengths"].append(f"Red zone threat with {tds} touchdowns")
        
        if stats.get("fumbles", 0) > 2:
            analysis["weaknesses"].append("Ball security is a concern")
        if ypc < 4.5:
            analysis["weaknesses"].append("Needs to be more efficient between the tackles")
        
        analysis["outlook"] = "Elite RB1 with championship-winning upside" if yards > 1200 else "Solid flex play with RB2 upside"
        analysis["fantasy_advice"] = "Set and forget starter" if stats.get("fantasy_points", 0) > 250 else "Volume-dependent flex option"
        
    elif pos == "WR":
        yards = stats.get("receiving_yards", 0)
        recs = stats.get("receptions", 0)
        tds = stats.get("touchdowns", 0)
        
        analysis["overview"] = f"{name} has established himself as a {'elite' if yards > 1400 else 'dependable' if yards > 1000 else 'emerging'} receiver."
        
        if yards > 1400:
            analysis["strengths"].append("Elite yardage production")
        if recs > 90:
            analysis["strengths"].append(f"High-volume target with {recs} receptions")
        if tds > 10:
            analysis["strengths"].append("Dangerous in the end zone")
        
        if stats.get("drops", 0) > 5:
            analysis["weaknesses"].append("Drop rate needs improvement")
        
        analysis["outlook"] = "WR1 with league-winning potential" if yards > 1300 else "Reliable WR2/WR3 option"
        analysis["fantasy_advice"] = "Weekly must-start" if stats.get("fantasy_points", 0) > 220 else "Good starter with boom potential"
        
    elif pos == "DEF":
        sacks = stats.get("sacks", 0)
        tackles = stats.get("tackles", 0)
        ints = stats.get("interceptions", 0)
        
        analysis["overview"] = f"{name} is a {'game-wrecker' if sacks > 12 else 'solid' if sacks > 8 else 'developing'} defensive presence."
        
        if sacks > 12:
            analysis["strengths"].append(f"Elite pass rusher with {sacks} sacks")
        if ints > 3:
            analysis["strengths"].append("Ball-hawking ability creates turnovers")
        if tackles > 80:
            analysis["strengths"].append("Tackle machine, always around the ball")
        
        analysis["outlook"] = "Defensive Player of the Year candidate" if sacks > 12 else "Solid contributor"
        analysis["fantasy_advice"] = "Top-tier IDP option" if stats.get("fantasy_points", 0) > 150 else "Streaming option in good matchups"
    
    else:  # K
        fgs = stats.get("field_goals", 0)
        analysis["overview"] = f"{name} has been a {'reliable' if fgs > 25 else 'developing'} kicker."
        analysis["strengths"].append(f"{fgs} field goals made")
        analysis["outlook"] = "Consistent scoring threat"
        analysis["fantasy_advice"] = "Set and forget kicker" if fgs > 28 else "Streamable option"
    
    return analysis

# Team Analysis Generator
def generate_team_analysis(team_id):
    team = next((t for t in TEAMS if t["id"] == team_id), None)
    if not team:
        return None
    
    team_players = [p for p in PLAYERS if p["team_id"] == team_id]
    
    total_fantasy_pts = sum(p["stats"].get("fantasy_points", 0) for p in team_players)
    elite_count = sum(1 for p in team_players if p.get("is_elite", False))
    injured_count = sum(1 for p in team_players if p.get("injury_status"))
    
    win_pct = team["wins"] / (team["wins"] + team["losses"]) if (team["wins"] + team["losses"]) > 0 else 0
    point_diff = team["points_for"] - team["points_against"]
    
    analysis = {
        "team_name": team["name"],
        "record": f"{team['wins']}-{team['losses']}",
        "conference": team["conference"],
        "playoff_status": team.get("playoff_status"),
        "seed": team.get("seed"),
        "overview": "",
        "offense_grade": "",
        "defense_grade": "",
        "strengths": [],
        "weaknesses": [],
        "key_players": [],
        "playoff_outlook": "",
        "power_ranking": next((pr["rank"] for pr in POWER_RANKINGS if pr["team_id"] == team_id), None)
    }
    
    # Determine grades and analysis
    if win_pct > 0.75:
        analysis["overview"] = f"The {team['name']} are one of the league's elite teams with a commanding {team['wins']}-{team['losses']} record."
        analysis["offense_grade"] = "A" if team["points_for"] > 1800 else "B+"
        analysis["defense_grade"] = "A" if team["points_against"] < 1550 else "B+"
    elif win_pct > 0.5:
        analysis["overview"] = f"The {team['name']} are a playoff contender with solid fundamentals and a {team['wins']}-{team['losses']} record."
        analysis["offense_grade"] = "B+" if team["points_for"] > 1650 else "B"
        analysis["defense_grade"] = "B+" if team["points_against"] < 1650 else "B"
    else:
        analysis["overview"] = f"The {team['name']} are rebuilding but show flashes of potential with their {team['wins']}-{team['losses']} record."
        analysis["offense_grade"] = "C+" if team["points_for"] > 1500 else "C"
        analysis["defense_grade"] = "C+" if team["points_against"] < 1750 else "C"
    
    # Strengths and weaknesses
    if point_diff > 200:
        analysis["strengths"].append("Dominant point differential shows consistency")
    if elite_count >= 2:
        analysis["strengths"].append(f"{elite_count} elite-level players anchor the roster")
    if team["points_for"] > 1800:
        analysis["strengths"].append("High-powered offense")
    if team["points_against"] < 1550:
        analysis["strengths"].append("Stout defense")
    
    if injured_count > 0:
        analysis["weaknesses"].append(f"{injured_count} key player(s) dealing with injuries")
    if team["points_against"] > 1700:
        analysis["weaknesses"].append("Defensive struggles need addressing")
    if team["points_for"] < 1550:
        analysis["weaknesses"].append("Offensive production needs improvement")
    
    # Key players
    for p in sorted(team_players, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)[:3]:
        analysis["key_players"].append({
            "name": p["name"],
            "position": p["position"],
            "fantasy_points": p["stats"].get("fantasy_points", 0),
            "is_elite": p.get("is_elite", False)
        })
    
    # Playoff outlook
    if team.get("playoff_status") == "x":
        analysis["playoff_outlook"] = "Locked into playoffs as division leader with first-round bye potential."
    elif team.get("playoff_status") == "y":
        analysis["playoff_outlook"] = "Secured wildcard spot, looking to make a deep playoff run."
    elif team.get("playoff_status") == "z":
        analysis["playoff_outlook"] = "In the playin round, must win to advance."
    else:
        analysis["playoff_outlook"] = "Outside playoff picture, focusing on player development."
    
    return analysis

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "UFF - United Football League API", "version": "2.0.0"}

@api_router.get("/league-info")
async def get_league_info():
    return {
        "name": "UFF - United Football League",
        "logo": "https://customer-assets.emergentagent.com/job_elite-league-hub/artifacts/g9a4t1r6_image.png",
        "conferences": ["Grand Central", "Ridge"],
        "total_teams": len(TEAMS),
        "current_week": 8,
        "playoff_format": {
            "conference_championships": {"week": 9, "description": "Top 2 per conference"},
            "wildcard": {"week": 10, "description": "Seeds 5-10"},
            "divisional": {"week": 11, "description": "Round 2"},
            "semifinals": {"week": 12, "description": "Final 4"},
            "championship": {"week": 13, "description": "The Final"}
        }
    }

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
    analysis = generate_team_analysis(team_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Team not found")
    return analysis

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
    
    if sort_by in ["fantasy_points", "avg_points"]:
        players = sorted(players, key=lambda x: x["stats"].get(sort_by, 0), reverse=True)
    
    return players[:limit]

@api_router.get("/players/{player_id}")
async def get_player(player_id: str):
    player = next((p for p in PLAYERS if p["id"] == player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    weekly_scores = []
    for week in range(1, 9):
        base_score = player["stats"].get("avg_points", 15)
        variance = (week % 5) * 3 - 6
        weekly_scores.append({
            "week": week,
            "points": round(base_score + variance, 1),
            "opponent": TEAMS[(week + hash(player_id)) % len(TEAMS)]["abbreviation"]
        })
    
    return {**player, "weekly_scores": weekly_scores}

@api_router.get("/players/{player_id}/analysis")
async def get_player_analysis(player_id: str):
    player = next((p for p in PLAYERS if p["id"] == player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    analysis = generate_player_analysis(player)
    return {
        "player_id": player_id,
        "player_name": player["name"],
        "position": player["position"],
        "team": player["team"],
        **analysis
    }

@api_router.get("/standings")
async def get_standings():
    gc_teams = sorted([t for t in TEAMS if t["conference"] == "Grand Central"], key=lambda x: (-x["wins"], x["losses"]))
    rd_teams = sorted([t for t in TEAMS if t["conference"] == "Ridge"], key=lambda x: (-x["wins"], x["losses"]))
    
    league_structure = {
        "format": "10-team playoff bracket",
        "rounds": [
            {"name": "Conference Championships", "week": 9, "description": "Top 2 Per Conference"},
            {"name": "Wildcard", "week": 10, "description": "Seeds 5-10"},
            {"name": "Divisional", "week": 11, "description": "Round 2"},
            {"name": "Semifinals", "week": 12, "description": "Final 4"},
            {"name": "Championship", "week": 13, "description": "The Final"}
        ],
        "seeding": {
            "division_leaders": "Seeds 1-4 (Conference Champions get bye to Semifinals)",
            "wildcards": "Seeds 5-6 (Straight to Divisional)",
            "playins": "Seeds 7-10 (Wildcard round)"
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
        "receiving_yards": sorted([p for p in PLAYERS if p["position"] == "WR"], key=lambda x: x["stats"].get("receiving_yards", 0), reverse=True)[:5],
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
    league_info = {
        "name": "UFF - United Football League",
        "logo": "https://customer-assets.emergentagent.com/job_elite-league-hub/artifacts/g9a4t1r6_image.png",
    }
    top_players = sorted(PLAYERS, key=lambda x: x["stats"].get("fantasy_points", 0), reverse=True)[:5]
    recent_games = [g for g in SCHEDULE if g["week"] == 8]
    
    leaders = {}
    for pos in ["QB", "WR", "RB", "DEF", "K"]:
        pos_players = [p for p in PLAYERS if p["position"] == pos]
        if pos_players:
            leaders[pos] = max(pos_players, key=lambda x: x["stats"].get("fantasy_points", 0))
    
    return {
        "league_info": league_info,
        "top_performers": top_players,
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
    new_player = {"id": str(uuid.uuid4()), **player, "stats": player.get("stats", {}), "is_elite": player.get("is_elite", False)}
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
