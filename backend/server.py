from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import aiohttp
import csv
import io
import secrets
import string


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class PlayerStat(BaseModel):
    name: str
    stats: Dict[str, Any]  # Flexible stats dictionary

class GameData(BaseModel):
    week: int
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    home_stats: Dict[str, Dict[str, Dict[str, Any]]]  # {PlayerName: {Passing: {}, Defense: {}, ...}}
    away_stats: Dict[str, Dict[str, Dict[str, Any]]]  # Same structure
    player_of_game: str
    game_date: Optional[str] = None

class Game(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week: int
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    home_stats: Dict[str, Any]
    away_stats: Dict[str, Any]
    player_of_game: str
    game_date: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminUser(BaseModel):
    admin_key: str
    username: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlayerEdit(BaseModel):
    old_name: str
    new_name: Optional[str] = None
    new_team: Optional[str] = None
    stats_to_add: Optional[Dict[str, Dict[str, Any]]] = None  # {category: {stat_key: value}}
    stats_to_remove: Optional[Dict[str, List[str]]] = None  # {category: [stat_keys]}

class AddAdminRequest(BaseModel):
    new_admin_key: str
    username: str

class TwoFactorRequest(BaseModel):
    operation: str  # 'edit_game' or 'delete_game'
    game_id: Optional[str] = None

class TwoFactorVerify(BaseModel):
    code: str
    operation: str
    game_id: Optional[str] = None

class GameEdit(BaseModel):
    week: Optional[int] = None
    home_team: Optional[str] = None
    away_team: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    player_of_game: Optional[str] = None
    game_date: Optional[str] = None
    home_stats: Optional[Dict[str, Any]] = None
    away_stats: Optional[Dict[str, Any]] = None


async def send_to_discord(game: Game):
    """Send game results to Discord with embed and CSV file"""
    webhook_url = os.environ.get('DISCORD_WEBHOOK_URL')
    if not webhook_url:
        logger.warning("Discord webhook URL not configured")
        return
    
    try:
        import json
        
        # Create embed
        embed = {
            "title": f"🏈 Week {game.week} Final Score",
            "description": f"**{game.home_team}** vs **{game.away_team}**",
            "color": 0x2ecc71 if game.home_score > game.away_score else 0xe74c3c,
            "fields": [
                {
                    "name": game.home_team,
                    "value": str(game.home_score),
                    "inline": True
                },
                {
                    "name": game.away_team,
                    "value": str(game.away_score),
                    "inline": True
                },
                {
                    "name": "Player of the Game",
                    "value": game.player_of_game,
                    "inline": False
                }
            ],
            "timestamp": game.timestamp.isoformat(),
            "footer": {
                "text": f"Game Date: {game.game_date}"
            }
        }
        
        # Create CSV file
        csv_content = generate_csv(game)
        
        # Send to Discord
        async with aiohttp.ClientSession() as session:
            # Create form data with embed and file
            form = aiohttp.FormData()
            payload = {"embeds": [embed]}
            form.add_field('payload_json', json.dumps(payload))
            
            # Add CSV file
            csv_bytes = csv_content.encode('utf-8')
            form.add_field('file',
                          csv_bytes,
                          filename=f'week_{game.week}_stats.csv',
                          content_type='text/csv')
            
            async with session.post(webhook_url, data=form) as response:
                if response.status in [200, 204]:
                    logger.info("Successfully sent to Discord")
                else:
                    response_text = await response.text()
                    logger.error(f"Discord webhook failed: {response.status} - {response_text}")
                    
    except Exception as e:
        logger.error(f"Error sending to Discord: {str(e)}")


def generate_csv(game: Game) -> str:
    """Generate CSV content from game stats"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([f"Week {game.week} - {game.home_team} vs {game.away_team}"])
    writer.writerow([f"Final Score: {game.home_team} {game.home_score} - {game.away_team} {game.away_score}"])
    writer.writerow([f"Player of the Game: {game.player_of_game}"])
    writer.writerow([])
    
    # HOME TEAM STATS
    writer.writerow([f"{game.home_team.upper()} STATS"])
    writer.writerow([])
    
    # Passing stats
    if game.home_stats.get('passing'):
        writer.writerow(["PASSING"])
        writer.writerow(["Name", "Comp", "Att", "Yards", "TD", "Int", "SCKED"])
        for player in game.home_stats['passing']:
            stats = player.get('stats', {})
            writer.writerow([
                player.get('name', ''),
                stats.get('comp', 0),
                stats.get('att', 0),
                stats.get('yards', 0),
                stats.get('td', 0),
                stats.get('int', 0),
                stats.get('scked', 0)
            ])
        writer.writerow([])
    
    # Defense stats
    if game.home_stats.get('defense'):
        writer.writerow(["DEFENSE"])
        writer.writerow(["Name", "TAK", "TFL", "SCK", "SAF", "SWAT", "INT", "PBU", "TD"])
        for player in game.home_stats['defense']:
            stats = player.get('stats', {})
            writer.writerow([
                player.get('name', ''),
                stats.get('tak', 0),
                stats.get('tfl', 0),
                stats.get('sck', 0),
                stats.get('saf', 0),
                stats.get('swat', 0),
                stats.get('int', 0),
                stats.get('pbu', 0),
                stats.get('td', 0)
            ])
        writer.writerow([])
    
    # Rushing stats
    if game.home_stats.get('rushing'):
        writer.writerow(["RUSHING"])
        writer.writerow(["Name", "Att", "Yards", "TD"])
        for player in game.home_stats['rushing']:
            stats = player.get('stats', {})
            writer.writerow([
                player.get('name', ''),
                stats.get('att', 0),
                stats.get('yards', 0),
                stats.get('td', 0)
            ])
        writer.writerow([])
    
    # Receiving stats
    if game.home_stats.get('receiving'):
        writer.writerow(["RECEIVING"])
        writer.writerow(["Name", "Rec", "Yards", "TD"])
        for player in game.home_stats['receiving']:
            stats = player.get('stats', {})
            writer.writerow([
                player.get('name', ''),
                stats.get('rec', 0),
                stats.get('yards', 0),
                stats.get('td', 0)
            ])
        writer.writerow([])
    
    # AWAY TEAM STATS
    writer.writerow([f"{game.away_team.upper()} STATS"])
    writer.writerow([])
    
    # Passing stats
    if game.away_stats.get('passing'):
        writer.writerow(["PASSING"])
        writer.writerow(["Name", "Comp", "Att", "Yards", "TD", "Int", "SCKED"])
        for player in game.away_stats['passing']:
            stats = player.get('stats', {})
            writer.writerow([
                player.get('name', ''),
                stats.get('comp', 0),
                stats.get('att', 0),
                stats.get('yards', 0),
                stats.get('td', 0),
                stats.get('int', 0),
                stats.get('scked', 0)
            ])
        writer.writerow([])
    
    # Defense stats
    if game.away_stats.get('defense'):
        writer.writerow(["DEFENSE"])
        writer.writerow(["Name", "TAK", "TFL", "SCK", "SAF", "SWAT", "INT", "PBU", "TD"])
        for player in game.away_stats['defense']:
            stats = player.get('stats', {})
            writer.writerow([
                player.get('name', ''),
                stats.get('tak', 0),
                stats.get('tfl', 0),
                stats.get('sck', 0),
                stats.get('saf', 0),
                stats.get('swat', 0),
                stats.get('int', 0),
                stats.get('pbu', 0),
                stats.get('td', 0)
            ])
        writer.writerow([])
    
    # Rushing stats
    if game.away_stats.get('rushing'):
        writer.writerow(["RUSHING"])
        writer.writerow(["Name", "Att", "Yards", "TD"])
        for player in game.away_stats['rushing']:
            stats = player.get('stats', {})
            writer.writerow([
                player.get('name', ''),
                stats.get('att', 0),
                stats.get('yards', 0),
                stats.get('td', 0)
            ])
        writer.writerow([])
    
    # Receiving stats
    if game.away_stats.get('receiving'):
        writer.writerow(["RECEIVING"])
        writer.writerow(["Name", "Rec", "Yards", "TD"])
        for player in game.away_stats['receiving']:
            stats = player.get('stats', {})
            writer.writerow([
                player.get('name', ''),
                stats.get('rec', 0),
                stats.get('yards', 0),
                stats.get('td', 0)
            ])
        writer.writerow([])
    
    return output.getvalue()


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Flag Football Stats API"}


def transform_player_stats(player_stats: Dict[str, Dict[str, Dict[str, Any]]], team_name: str) -> Dict[str, list]:
    """
    Transform player-organized stats into category-organized stats for frontend display
    Input: {PlayerName: {Passing: {...}, Defense: {...}, Rushing: {...}, Receiving: {...}}}
    Output: {passing: [{name: PlayerName, team: TeamName, stats: {...}}], defense: [...], rushing: [...], receiving: [...]}
    """
    result = {
        'passing': [],
        'defense': [],
        'rushing': [],
        'receiving': []
    }
    
    for player_name, categories in player_stats.items():
        for category, stats in categories.items():
            category_key = category.lower()
            if category_key in result and stats:  # Only add if stats exist
                result[category_key].append({
                    'name': player_name,
                    'team': team_name,  # Track which team player was on
                    'stats': {k.lower(): v for k, v in stats.items()}  # Normalize keys to lowercase
                })
    
    return result


@api_router.post("/game", response_model=Game)
async def submit_game(game_data: GameData):
    """Endpoint for Roblox to submit game stats"""
    try:
        # Transform stats from player-organized to category-organized format
        # Include team name so we can track player history
        home_stats_transformed = transform_player_stats(game_data.home_stats, game_data.home_team)
        away_stats_transformed = transform_player_stats(game_data.away_stats, game_data.away_team)
        
        # Create game object
        game = Game(
            week=game_data.week,
            home_team=game_data.home_team,
            away_team=game_data.away_team,
            home_score=game_data.home_score,
            away_score=game_data.away_score,
            home_stats=home_stats_transformed,
            away_stats=away_stats_transformed,
            player_of_game=game_data.player_of_game,
            game_date=game_data.game_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        )
        
        # Convert to dict and serialize datetime to ISO string for MongoDB
        doc = game.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        
        # Save to MongoDB
        await db.games.insert_one(doc)
        
        # Send to Discord
        await send_to_discord(game)
        
        return game
        
    except Exception as e:
        logger.error(f"Error submitting game: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/games", response_model=List[Game])
async def get_all_games():
    """Get all games"""
    games = await db.games.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for game in games:
        if isinstance(game['timestamp'], str):
            game['timestamp'] = datetime.fromisoformat(game['timestamp'])
    
    return games


@api_router.get("/games/week/{week}", response_model=List[Game])
async def get_games_by_week(week: int):
    """Get games by week number"""
    games = await db.games.find({"week": week}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for game in games:
        if isinstance(game['timestamp'], str):
            game['timestamp'] = datetime.fromisoformat(game['timestamp'])
    
    return games


@api_router.get("/weeks")
async def get_available_weeks():
    """Get list of available weeks"""
    pipeline = [
        {"$group": {"_id": "$week"}},
        {"$sort": {"_id": -1}}
    ]
    weeks = await db.games.aggregate(pipeline).to_list(100)
    return {"weeks": [w["_id"] for w in weeks]}


def calculate_passer_rating(completions: int, attempts: int, yards: int, touchdowns: int, interceptions: int) -> float:
    """Calculate NFL passer rating"""
    if attempts == 0:
        return 0.0
    
    A = max(0, min(2.375, ((completions / attempts) - 0.3) * 5))
    B = max(0, min(2.375, ((yards / attempts) - 3) * 0.25))
    C = max(0, min(2.375, (touchdowns / attempts) * 20))
    D = max(0, min(2.375, 2.375 - ((interceptions / attempts) * 25)))
    
    rating = ((A + B + C + D) / 6) * 100
    return round(rating, 1)


def calculate_completion_percentage(completions: int, attempts: int) -> float:
    """Calculate completion percentage"""
    if attempts == 0:
        return 0.0
    return round((completions / attempts) * 100, 2)


def calculate_yards_per_attempt(yards: int, attempts: int) -> float:
    """Calculate yards per attempt (average)"""
    if attempts == 0:
        return 0.0
    return round(yards / attempts, 1)


def calculate_yards_per_carry(yards: int, attempts: int) -> float:
    """Calculate yards per carry"""
    if attempts == 0:
        return 0.0
    return round(yards / attempts, 2)


def calculate_fantasy_points(player_stats: Dict[str, Any]) -> float:
    """Calculate fantasy points for a player based on their stats"""
    points = 0.0
    
    # Passing points
    if 'passing' in player_stats:
        for stat in player_stats['passing']:
            points += stat.get('yards', 0) * 0.04  # 0.04 per passing yard
            points += stat.get('td', 0) * 4  # 4 per passing TD
            points -= stat.get('int', 0) * 2  # -2 per interception
    
    # Rushing points
    if 'rushing' in player_stats:
        for stat in player_stats['rushing']:
            points += stat.get('yards', 0) * 0.1  # 0.1 per rushing yard
            points += stat.get('td', 0) * 6  # 6 per rushing TD
    
    # Receiving points
    if 'receiving' in player_stats:
        for stat in player_stats['receiving']:
            points += stat.get('rec', 0) * 1  # 1 per reception
            points += stat.get('yards', 0) * 0.1  # 0.1 per receiving yard
            points += stat.get('td', 0) * 6  # 6 per receiving TD
    
    # Defense points
    if 'defense' in player_stats:
        for stat in player_stats['defense']:
            points += stat.get('tak', 0) * 0.5  # 0.5 per tackle
            points += stat.get('tfl', 0) * 1  # 1 per tackle for loss
            points += stat.get('sck', 0) * 1  # 1 per sack
            points += stat.get('int', 0) * 2  # 2 per interception
            points += stat.get('saf', 0) * 2  # 2 per safety
            points += stat.get('td', 0) * 6  # 6 per defensive TD
            points += stat.get('pbu', 0) * 0.5  # 0.5 per pass breakup
    
    return round(points, 2)


@api_router.get("/stats/leaders")
async def get_stats_leaders():
    """Get season stats leaders with fantasy points"""
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        
        # Aggregate stats by player
        player_stats = {}
        
        for game in games:
            # Track which players we've seen in this game to avoid double-counting games
            players_in_game = set()
            
            # Process home team
            for category in ['passing', 'defense', 'rushing', 'receiving']:
                if category in game['home_stats']:
                    for player in game['home_stats'][category]:
                        name = player['name']
                        if name not in player_stats:
                            player_stats[name] = {
                                'name': name,
                                'passing': [],
                                'defense': [],
                                'rushing': [],
                                'receiving': [],
                                'games_played': 0
                            }
                        player_stats[name][category].append(player['stats'])
                        
                        # Only increment games_played once per game per player
                        if name not in players_in_game:
                            player_stats[name]['games_played'] += 1
                            players_in_game.add(name)
            
            # Process away team
            for category in ['passing', 'defense', 'rushing', 'receiving']:
                if category in game['away_stats']:
                    for player in game['away_stats'][category]:
                        name = player['name']
                        if name not in player_stats:
                            player_stats[name] = {
                                'name': name,
                                'passing': [],
                                'defense': [],
                                'rushing': [],
                                'receiving': [],
                                'games_played': 0
                            }
                        player_stats[name][category].append(player['stats'])
                        
                        # Only increment games_played once per game per player
                        if name not in players_in_game:
                            player_stats[name]['games_played'] += 1
                            players_in_game.add(name)
        
        # Calculate totals and fantasy points
        leaders = {
            'points': [],
            'passing_yards': [],
            'passer_rating': [],
            'rushing_yards': [],
            'yards_per_carry': [],
            'receiving_yards': [],
            'tackles': [],
            'tackles_for_loss': [],
            'sacks': [],
            'interceptions': []
        }
        
        for name, stats in player_stats.items():
            # Calculate fantasy points
            fantasy_points = calculate_fantasy_points(stats)
            
            # Calculate totals
            passing_yards = sum(s.get('yards', 0) for s in stats['passing'])
            passing_tds = sum(s.get('td', 0) for s in stats['passing'])
            passing_comp = sum(s.get('comp', 0) for s in stats['passing'])
            passing_att = sum(s.get('att', 0) for s in stats['passing'])
            passing_ints = sum(s.get('int', 0) for s in stats['passing'])
            
            # Calculate passer rating if QB has attempts
            passer_rating = 0.0
            completion_pct = 0.0
            if passing_att > 0:
                passer_rating = calculate_passer_rating(
                    passing_comp, passing_att, passing_yards, passing_tds, passing_ints
                )
                completion_pct = calculate_completion_percentage(passing_comp, passing_att)
            
            rushing_yards = sum(s.get('yards', 0) for s in stats['rushing'])
            rushing_tds = sum(s.get('td', 0) for s in stats['rushing'])
            rushing_att = sum(s.get('att', 0) for s in stats['rushing'])
            
            # Calculate yards per carry
            ypc = 0.0
            if rushing_att > 0:
                ypc = calculate_yards_per_carry(rushing_yards, rushing_att)
            
            receiving_yards = sum(s.get('yards', 0) for s in stats['receiving'])
            receiving_tds = sum(s.get('td', 0) for s in stats['receiving'])
            receptions = sum(s.get('rec', 0) for s in stats['receiving'])
            
            tackles = sum(s.get('tak', 0) for s in stats['defense'])
            tackles_for_loss = sum(s.get('tfl', 0) for s in stats['defense'])
            sacks = sum(s.get('sck', 0) for s in stats['defense'])
            interceptions = sum(s.get('int', 0) for s in stats['defense'])
            
            # Add to leaders lists
            if fantasy_points > 0:
                leaders['points'].append({
                    'name': name,
                    'value': fantasy_points,
                    'games': stats['games_played']
                })
            
            if passing_yards > 0:
                leaders['passing_yards'].append({
                    'name': name,
                    'value': passing_yards,
                    'tds': passing_tds,
                    'comp': passing_comp,
                    'att': passing_att,
                    'ints': passing_ints,
                    'rating': passer_rating,
                    'completion_pct': completion_pct,
                    'games': stats['games_played']
                })
            
            # Passer rating leaderboard (min 50 attempts)
            if passing_att >= 50 and passer_rating > 0:
                leaders['passer_rating'].append({
                    'name': name,
                    'value': passer_rating,
                    'att': passing_att,
                    'comp': passing_comp,
                    'completion_pct': completion_pct,
                    'tds': passing_tds,
                    'games': stats['games_played']
                })
            
            if rushing_yards > 0:
                leaders['rushing_yards'].append({
                    'name': name,
                    'value': rushing_yards,
                    'tds': rushing_tds,
                    'att': rushing_att,
                    'ypc': ypc,
                    'games': stats['games_played']
                })
            
            # YPC leaderboard (min 20 attempts)
            if rushing_att >= 20 and ypc > 0:
                leaders['yards_per_carry'].append({
                    'name': name,
                    'value': ypc,
                    'yards': rushing_yards,
                    'att': rushing_att,
                    'attempts': rushing_att,
                    'games': stats['games_played']
                })
            
            if receiving_yards > 0:
                leaders['receiving_yards'].append({
                    'name': name,
                    'value': receiving_yards,
                    'tds': receiving_tds,
                    'receptions': receptions,
                    'games': stats['games_played']
                })
            
            if tackles > 0:
                leaders['tackles'].append({
                    'name': name,
                    'value': tackles,
                    'games': stats['games_played']
                })
            
            if tackles_for_loss > 0:
                leaders['tackles_for_loss'].append({
                    'name': name,
                    'value': tackles_for_loss,
                    'games': stats['games_played']
                })
            
            if sacks > 0:
                leaders['sacks'].append({
                    'name': name,
                    'value': sacks,
                    'games': stats['games_played']
                })
            
            if interceptions > 0:
                leaders['interceptions'].append({
                    'name': name,
                    'value': interceptions,
                    'games': stats['games_played']
                })
        
        # Sort and get top 10 for each category
        for category in leaders:
            leaders[category] = sorted(leaders[category], key=lambda x: x['value'], reverse=True)[:10]
        
        return leaders
        
    except Exception as e:
        logger.error(f"Error getting stats leaders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/teams/standings")
async def get_team_standings():
    """Get team win/loss records"""
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        
        team_records = {}
        
        for game in games:
            home = game['home_team']
            away = game['away_team']
            
            # Initialize teams if not exists
            if home not in team_records:
                team_records[home] = {'wins': 0, 'losses': 0, 'points_for': 0, 'points_against': 0}
            if away not in team_records:
                team_records[away] = {'wins': 0, 'losses': 0, 'points_for': 0, 'points_against': 0}
            
            # Update records
            if game['home_score'] > game['away_score']:
                team_records[home]['wins'] += 1
                team_records[away]['losses'] += 1
            else:
                team_records[away]['wins'] += 1
                team_records[home]['losses'] += 1
            
            team_records[home]['points_for'] += game['home_score']
            team_records[home]['points_against'] += game['away_score']
            team_records[away]['points_for'] += game['away_score']
            team_records[away]['points_against'] += game['home_score']
        
        # Convert to list with calculated fields
        standings = []
        for team, record in team_records.items():
            games_played = record['wins'] + record['losses']
            win_pct = record['wins'] / games_played if games_played > 0 else 0
            standings.append({
                'team': team,
                'wins': record['wins'],
                'losses': record['losses'],
                'win_pct': round(win_pct, 3),
                'points_for': record['points_for'],
                'points_against': record['points_against'],
                'point_diff': record['points_for'] - record['points_against']
            })
        
        # Sort by wins desc, then point differential
        standings.sort(key=lambda x: (x['wins'], x['point_diff']), reverse=True)
        
        return standings
        
    except Exception as e:
        logger.error(f"Error getting team standings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/players/{player_name}")
async def get_player_profile(player_name: str):
    """Get detailed player profile with all stats"""
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        
        player_data = {
            'name': player_name,
            'games_played': 0,
            'current_team': None,
            'team_history': [],
            'total_stats': {
                'passing': {'yards': 0, 'tds': 0, 'ints': 0, 'comp': 0, 'att': 0},
                'rushing': {'yards': 0, 'tds': 0, 'att': 0},
                'receiving': {'rec': 0, 'yards': 0, 'tds': 0},
                'defense': {'tak': 0, 'sacks': 0, 'ints': 0, 'tds': 0}
            },
            'stats_by_team': {},
            'game_log': [],
            'fantasy_points': 0.0
        }
        
        teams_played_for = []
        
        for game in games:
            game_stats = {'week': game['week'], 'date': game['game_date'], 'team': None}
            player_found = False
            player_team = None
            
            # Check both teams
            for team_key in ['home_stats', 'away_stats']:
                stats = game[team_key]
                current_team_name = game['home_team'] if team_key == 'home_stats' else game['away_team']
                
                # Check each category
                for category in ['passing', 'defense', 'rushing', 'receiving']:
                    if category in stats:
                        for player in stats[category]:
                            if player['name'] == player_name:
                                player_found = True
                                player_team = player.get('team', current_team_name)
                                game_stats[category] = player['stats']
                                game_stats['team'] = player_team
                                
                                # Track team
                                if player_team not in teams_played_for:
                                    teams_played_for.append(player_team)
                                
                                # Initialize team stats if needed
                                if player_team not in player_data['stats_by_team']:
                                    player_data['stats_by_team'][player_team] = {
                                        'games': 0,
                                        'stats': {
                                            'passing': {'yards': 0, 'tds': 0, 'ints': 0, 'comp': 0, 'att': 0},
                                            'rushing': {'yards': 0, 'tds': 0, 'att': 0},
                                            'receiving': {'rec': 0, 'yards': 0, 'tds': 0},
                                            'defense': {'tak': 0, 'sacks': 0, 'ints': 0, 'tds': 0}
                                        }
                                    }
                                
                                # Aggregate totals
                                for stat_key, stat_value in player['stats'].items():
                                    if stat_key in player_data['total_stats'][category]:
                                        player_data['total_stats'][category][stat_key] += stat_value
                                        player_data['stats_by_team'][player_team]['stats'][category][stat_key] += stat_value
            
            if player_found:
                player_data['games_played'] += 1
                if player_team:
                    player_data['stats_by_team'][player_team]['games'] += 1
                player_data['game_log'].append(game_stats)
        
        if player_data['games_played'] == 0:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Set current team (most recent game)
        if player_data['game_log']:
            player_data['current_team'] = player_data['game_log'][-1].get('team')
        
        # Build team history with game counts
        player_data['team_history'] = [
            {'team': team, 'games': player_data['stats_by_team'][team]['games']}
            for team in teams_played_for
        ]
        
        # Add calculated stats for passing
        passing_stats = player_data['total_stats']['passing']
        if passing_stats['att'] > 0:
            # Recalculate even if Rating was submitted, to ensure accuracy
            passing_stats['rating'] = calculate_passer_rating(
                passing_stats['comp'],
                passing_stats['att'],
                passing_stats['yards'],
                passing_stats['tds'],
                passing_stats['ints']
            )
            passing_stats['completion_pct'] = calculate_completion_percentage(
                passing_stats['comp'],
                passing_stats['att']
            )
            passing_stats['avg'] = calculate_yards_per_attempt(
                passing_stats['yards'],
                passing_stats['att']
            )
        else:
            passing_stats['rating'] = 0.0
            passing_stats['completion_pct'] = 0.0
            passing_stats['avg'] = 0.0
        
        # Add calculated stats for rushing
        rushing_stats = player_data['total_stats']['rushing']
        if rushing_stats['att'] > 0:
            # Recalculate even if YPC was submitted
            rushing_stats['ypc'] = calculate_yards_per_carry(
                rushing_stats['yards'],
                rushing_stats['att']
            )
        else:
            rushing_stats['ypc'] = 0.0
        
        # Calculate fantasy points
        player_stats_for_points = {
            'passing': [player_data['total_stats']['passing']],
            'rushing': [player_data['total_stats']['rushing']],
            'receiving': [player_data['total_stats']['receiving']],
            'defense': [player_data['total_stats']['defense']]
        }
        player_data['fantasy_points'] = calculate_fantasy_points(player_stats_for_points)
        
        return player_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting player profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/teams/{team_name}/analysis")
async def get_team_analysis(team_name: str):
    """Get comprehensive team analysis including franchise history and awards"""
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        
        team_data = {
            'name': team_name,
            'all_time_record': {'wins': 0, 'losses': 0, 'win_pct': 0},
            'total_games': 0,
            'total_points_scored': 0,
            'total_points_allowed': 0,
            'avg_points_scored': 0,
            'avg_points_allowed': 0,
            'biggest_win': None,
            'biggest_loss': None,
            'current_streak': {'type': None, 'count': 0},
            'head_to_head': {},
            'roster': {},  # All players who played for team
            'team_records': {
                'most_points_game': None,
                'most_yards_passing_game': None,
                'most_yards_rushing_game': None,
                'most_yards_receiving_game': None,
                'most_tackles_game': None,
                'most_sacks_game': None
            },
            'season_stats': {
                'total_passing_yards': 0,
                'total_rushing_yards': 0,
                'total_receiving_yards': 0,
                'total_touchdowns': 0,
                'total_tackles': 0,
                'total_sacks': 0,
                'total_interceptions': 0
            },
            'awards': [],
            'championships': 0,
            'playoff_appearances': 0
        }
        
        team_games = []
        streak_type = None
        streak_count = 0
        
        for game in games:
            is_home = game['home_team'] == team_name
            is_away = game['away_team'] == team_name
            
            if not (is_home or is_away):
                continue
            
            team_games.append(game)
            team_data['total_games'] += 1
            
            # Calculate win/loss
            if is_home:
                team_score = game['home_score']
                opp_score = game['away_score']
                opponent = game['away_team']
                stats = game['home_stats']
            else:
                team_score = game['away_score']
                opp_score = game['home_score']
                opponent = game['home_team']
                stats = game['away_stats']
            
            team_data['total_points_scored'] += team_score
            team_data['total_points_allowed'] += opp_score
            
            is_win = team_score > opp_score
            margin = abs(team_score - opp_score)
            
            if is_win:
                team_data['all_time_record']['wins'] += 1
                if not team_data['biggest_win'] or margin > team_data['biggest_win']['margin']:
                    team_data['biggest_win'] = {
                        'opponent': opponent,
                        'score': f"{team_score}-{opp_score}",
                        'margin': margin,
                        'week': game['week'],
                        'date': game['game_date']
                    }
            else:
                team_data['all_time_record']['losses'] += 1
                if not team_data['biggest_loss'] or margin > team_data['biggest_loss']['margin']:
                    team_data['biggest_loss'] = {
                        'opponent': opponent,
                        'score': f"{team_score}-{opp_score}",
                        'margin': margin,
                        'week': game['week'],
                        'date': game['game_date']
                    }
            
            # Track streak
            if streak_type is None:
                streak_type = 'W' if is_win else 'L'
                streak_count = 1
            elif (streak_type == 'W' and is_win) or (streak_type == 'L' and not is_win):
                streak_count += 1
            else:
                streak_type = 'W' if is_win else 'L'
                streak_count = 1
            
            # Head to head
            if opponent not in team_data['head_to_head']:
                team_data['head_to_head'][opponent] = {'wins': 0, 'losses': 0}
            if is_win:
                team_data['head_to_head'][opponent]['wins'] += 1
            else:
                team_data['head_to_head'][opponent]['losses'] += 1
            
            # Process player stats
            for category in ['passing', 'defense', 'rushing', 'receiving']:
                if category in stats:
                    for player in stats[category]:
                        player_name = player['name']
                        if player_name not in team_data['roster']:
                            team_data['roster'][player_name] = {
                                'games': 0,
                                'stats': {
                                    'passing': {'yards': 0, 'tds': 0},
                                    'rushing': {'yards': 0, 'tds': 0},
                                    'receiving': {'yards': 0, 'tds': 0},
                                    'defense': {'tackles': 0, 'sacks': 0, 'ints': 0}
                                }
                            }
                        
                        team_data['roster'][player_name]['games'] += 1
                        
                        # Aggregate team season stats
                        if category == 'passing':
                            yards = player['stats'].get('yards', 0)
                            tds = player['stats'].get('td', 0)
                            team_data['season_stats']['total_passing_yards'] += yards
                            team_data['season_stats']['total_touchdowns'] += tds
                            team_data['roster'][player_name]['stats']['passing']['yards'] += yards
                            team_data['roster'][player_name]['stats']['passing']['tds'] += tds
                            
                            if not team_data['team_records']['most_yards_passing_game'] or yards > team_data['team_records']['most_yards_passing_game']['yards']:
                                team_data['team_records']['most_yards_passing_game'] = {
                                    'player': player_name,
                                    'yards': yards,
                                    'opponent': opponent,
                                    'week': game['week']
                                }
                        
                        elif category == 'rushing':
                            yards = player['stats'].get('yards', 0)
                            tds = player['stats'].get('td', 0)
                            team_data['season_stats']['total_rushing_yards'] += yards
                            team_data['season_stats']['total_touchdowns'] += tds
                            team_data['roster'][player_name]['stats']['rushing']['yards'] += yards
                            team_data['roster'][player_name]['stats']['rushing']['tds'] += tds
                            
                            if not team_data['team_records']['most_yards_rushing_game'] or yards > team_data['team_records']['most_yards_rushing_game']['yards']:
                                team_data['team_records']['most_yards_rushing_game'] = {
                                    'player': player_name,
                                    'yards': yards,
                                    'opponent': opponent,
                                    'week': game['week']
                                }
                        
                        elif category == 'receiving':
                            yards = player['stats'].get('yards', 0)
                            tds = player['stats'].get('td', 0)
                            team_data['season_stats']['total_receiving_yards'] += yards
                            team_data['season_stats']['total_touchdowns'] += tds
                            team_data['roster'][player_name]['stats']['receiving']['yards'] += yards
                            team_data['roster'][player_name]['stats']['receiving']['tds'] += tds
                            
                            if not team_data['team_records']['most_yards_receiving_game'] or yards > team_data['team_records']['most_yards_receiving_game']['yards']:
                                team_data['team_records']['most_yards_receiving_game'] = {
                                    'player': player_name,
                                    'yards': yards,
                                    'opponent': opponent,
                                    'week': game['week']
                                }
                        
                        elif category == 'defense':
                            tackles = player['stats'].get('tak', 0)
                            sacks = player['stats'].get('sck', 0)
                            ints = player['stats'].get('int', 0)
                            team_data['season_stats']['total_tackles'] += tackles
                            team_data['season_stats']['total_sacks'] += sacks
                            team_data['season_stats']['total_interceptions'] += ints
                            team_data['roster'][player_name]['stats']['defense']['tackles'] += tackles
                            team_data['roster'][player_name]['stats']['defense']['sacks'] += sacks
                            team_data['roster'][player_name]['stats']['defense']['ints'] += ints
                            
                            if not team_data['team_records']['most_tackles_game'] or tackles > team_data['team_records']['most_tackles_game']['tackles']:
                                team_data['team_records']['most_tackles_game'] = {
                                    'player': player_name,
                                    'tackles': tackles,
                                    'opponent': opponent,
                                    'week': game['week']
                                }
                            
                            if not team_data['team_records']['most_sacks_game'] or sacks > team_data['team_records']['most_sacks_game']['sacks']:
                                team_data['team_records']['most_sacks_game'] = {
                                    'player': player_name,
                                    'sacks': sacks,
                                    'opponent': opponent,
                                    'week': game['week']
                                }
            
            # Track highest scoring game
            if not team_data['team_records']['most_points_game'] or team_score > team_data['team_records']['most_points_game']['points']:
                team_data['team_records']['most_points_game'] = {
                    'points': team_score,
                    'opponent': opponent,
                    'week': game['week'],
                    'date': game['game_date']
                }
        
        if team_data['total_games'] == 0:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Calculate averages
        team_data['avg_points_scored'] = round(team_data['total_points_scored'] / team_data['total_games'], 1)
        team_data['avg_points_allowed'] = round(team_data['total_points_allowed'] / team_data['total_games'], 1)
        
        # Calculate win percentage
        total_games = team_data['all_time_record']['wins'] + team_data['all_time_record']['losses']
        team_data['all_time_record']['win_pct'] = round(team_data['all_time_record']['wins'] / total_games, 3) if total_games > 0 else 0
        
        # Set current streak
        team_data['current_streak'] = {
            'type': 'Win' if streak_type == 'W' else 'Loss',
            'count': streak_count
        }
        
        # Sort roster by games played
        team_data['roster'] = dict(sorted(
            team_data['roster'].items(),
            key=lambda x: x[1]['games'],
            reverse=True
        ))
        
        return team_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting team analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 2FA Code Storage (in-memory for simplicity, expires in 5 minutes)
twofa_codes = {}

def generate_2fa_code() -> str:
    """Generate a 6-digit 2FA code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

async def store_2fa_code(admin_key: str, operation: str, game_id: Optional[str] = None) -> str:
    """Store a 2FA code with expiration"""
    code = generate_2fa_code()
    key = f"{admin_key}:{operation}:{game_id or 'none'}"
    twofa_codes[key] = {
        'code': code,
        'expires': datetime.now(timezone.utc).timestamp() + 300  # 5 minutes
    }
    # Clean up expired codes
    current_time = datetime.now(timezone.utc).timestamp()
    expired_keys = [k for k, v in twofa_codes.items() if v['expires'] < current_time]
    for k in expired_keys:
        del twofa_codes[k]
    return code

async def verify_2fa_code(admin_key: str, code: str, operation: str, game_id: Optional[str] = None) -> bool:
    """Verify a 2FA code"""
    key = f"{admin_key}:{operation}:{game_id or 'none'}"
    if key not in twofa_codes:
        return False
    
    stored = twofa_codes[key]
    current_time = datetime.now(timezone.utc).timestamp()
    
    # Check if code is expired
    if stored['expires'] < current_time:
        del twofa_codes[key]
        return False
    
    # Check if code matches
    if stored['code'] == code:
        del twofa_codes[key]  # Code can only be used once
        return True
    
    return False

# Admin authentication helper
async def verify_admin(admin_key: str) -> bool:
    """Verify if the admin key is valid"""
    # Check if it's the master admin key
    if admin_key == os.environ.get('ADMIN_KEY', 'reset_season_2025'):
        return True
    
    # Check if it's a registered admin user
    admin_user = await db.admins.find_one({"admin_key": admin_key})
    return admin_user is not None

@api_router.post("/admin/reset-season")
async def reset_season(admin_key: str):
    """Reset the season by wiping all game data"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        result = await db.games.delete_many({})
        logger.info(f"Season reset - deleted {result.deleted_count} games")
        return {
            "success": True,
            "message": f"Season reset complete. Deleted {result.deleted_count} games.",
            "deleted_count": result.deleted_count
        }
    except Exception as e:
        logger.error(f"Error resetting season: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/add-admin")
async def add_admin(request: AddAdminRequest, admin_key: str = Header(...)):
    """Add a new admin user (requires master admin key)"""
    # Only master admin can add new admins
    if admin_key != os.environ.get('ADMIN_KEY', 'reset_season_2025'):
        raise HTTPException(status_code=403, detail="Only master admin can add new admins")
    
    try:
        # Check if admin already exists
        existing = await db.admins.find_one({"admin_key": request.new_admin_key})
        if existing:
            raise HTTPException(status_code=400, detail="Admin key already exists")
        
        admin_user = AdminUser(
            admin_key=request.new_admin_key,
            username=request.username
        )
        
        doc = admin_user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.admins.insert_one(doc)
        logger.info(f"New admin added: {request.username}")
        
        return {
            "success": True,
            "message": f"Admin user '{request.username}' added successfully",
            "username": request.username
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding admin: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/remove-admin/{admin_key_to_remove}")
async def remove_admin(admin_key_to_remove: str, admin_key: str = Header(...)):
    """Remove an admin user (requires master admin key)"""
    # Only master admin can remove admins
    if admin_key != os.environ.get('ADMIN_KEY', 'reset_season_2025'):
        raise HTTPException(status_code=403, detail="Only master admin can remove admins")
    
    try:
        result = await db.admins.delete_one({"admin_key": admin_key_to_remove})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        logger.info(f"Admin removed: {admin_key_to_remove}")
        
        return {
            "success": True,
            "message": "Admin removed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing admin: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/list")
async def list_admins(admin_key: str = Header(...)):
    """List all admin users (requires master admin key)"""
    # Only master admin can list admins
    if admin_key != os.environ.get('ADMIN_KEY', 'reset_season_2025'):
        raise HTTPException(status_code=403, detail="Only master admin can list admins")
    
    try:
        admins = await db.admins.find({}, {"_id": 0, "admin_key": 0}).to_list(100)
        return {"admins": admins}
    except Exception as e:
        logger.error(f"Error listing admins: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/roblox/username/{user_id}")
async def get_roblox_username(user_id: str):
    """Get Roblox username from user ID"""
    try:
        # Check if it's already a username (not numeric)
        if not user_id.isdigit():
            return {"username": user_id, "user_id": None}
        
        # Fetch from Roblox API
        async with aiohttp.ClientSession() as session:
            url = f"https://users.roblox.com/v1/users/{user_id}"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "username": data.get("name"),
                        "display_name": data.get("displayName"),
                        "user_id": user_id
                    }
                elif response.status == 404:
                    raise HTTPException(status_code=404, detail="Roblox user not found")
                else:
                    raise HTTPException(status_code=response.status, detail="Error fetching from Roblox API")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Roblox username: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/player/edit")
async def edit_player(player_edit: PlayerEdit, admin_key: str = Header(...)):
    """Edit player data across all games - change name, team, add/remove stats"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        # Find all games with this player
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        
        updated_count = 0
        games_updated = []
        
        for game in games:
            game_modified = False
            
            # Check both home and away stats
            for team_key in ['home_stats', 'away_stats']:
                stats = game[team_key]
                
                # Check each category (passing, defense, rushing, receiving)
                for category in ['passing', 'defense', 'rushing', 'receiving']:
                    if category in stats:
                        for i, player in enumerate(stats[category]):
                            if player['name'] == player_edit.old_name:
                                game_modified = True
                                
                                # Update player name
                                if player_edit.new_name:
                                    stats[category][i]['name'] = player_edit.new_name
                                
                                # Update team
                                if player_edit.new_team:
                                    stats[category][i]['team'] = player_edit.new_team
                                
                                # Add stats
                                if player_edit.stats_to_add and category in player_edit.stats_to_add:
                                    for stat_key, stat_value in player_edit.stats_to_add[category].items():
                                        stats[category][i]['stats'][stat_key] = stat_value
                                
                                # Remove stats
                                if player_edit.stats_to_remove and category in player_edit.stats_to_remove:
                                    for stat_key in player_edit.stats_to_remove[category]:
                                        if stat_key in stats[category][i]['stats']:
                                            del stats[category][i]['stats'][stat_key]
            
            # Update the game in database if modified
            if game_modified:
                await db.games.update_one(
                    {"id": game['id']},
                    {"$set": game}
                )
                updated_count += 1
                games_updated.append({"week": game['week'], "id": game['id']})
        
        if updated_count == 0:
            raise HTTPException(status_code=404, detail=f"Player '{player_edit.old_name}' not found in any games")
        
        logger.info(f"Player '{player_edit.old_name}' updated in {updated_count} games")
        
        return {
            "success": True,
            "message": f"Player updated in {updated_count} games",
            "games_updated": games_updated,
            "changes": {
                "name_changed": player_edit.new_name is not None,
                "team_changed": player_edit.new_team is not None,
                "stats_added": player_edit.stats_to_add is not None,
                "stats_removed": player_edit.stats_to_remove is not None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing player: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/player/{player_name}")
async def delete_player(player_name: str, admin_key: str = Header(...)):
    """Remove a player from all games"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        
        updated_count = 0
        
        for game in games:
            game_modified = False
            
            # Check both home and away stats
            for team_key in ['home_stats', 'away_stats']:
                stats = game[team_key]
                
                # Check each category
                for category in ['passing', 'defense', 'rushing', 'receiving']:
                    if category in stats:
                        # Filter out the player
                        original_length = len(stats[category])
                        stats[category] = [p for p in stats[category] if p['name'] != player_name]
                        
                        if len(stats[category]) < original_length:
                            game_modified = True
            
            # Update the game in database if modified
            if game_modified:
                await db.games.update_one(
                    {"id": game['id']},
                    {"$set": game}
                )
                updated_count += 1
        
        if updated_count == 0:
            raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found in any games")
        
        logger.info(f"Player '{player_name}' deleted from {updated_count} games")
        
        return {
            "success": True,
            "message": f"Player '{player_name}' removed from {updated_count} games",
            "games_updated": updated_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting player: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/verify")
async def verify_admin_key(admin_key: str = Header(...)):
    """Verify if an admin key is valid"""
    is_valid = await verify_admin(admin_key)
    is_master = admin_key == os.environ.get('ADMIN_KEY', 'reset_season_2025')
    
    if not is_valid:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    # Get admin info if it's not master
    admin_info = None
    if not is_master:
        admin = await db.admins.find_one({"admin_key": admin_key}, {"_id": 0, "admin_key": 0})
        if admin:
            admin_info = admin
    
    return {
        "valid": True,
        "is_master": is_master,
        "admin_info": admin_info if admin_info else {"username": "Master Admin"}
    }

@api_router.get("/admin/player-names")
async def get_player_names(admin_key: str = Header(...)):
    """Get list of all player names for autocomplete"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        player_names = set()
        
        for game in games:
            for team_key in ['home_stats', 'away_stats']:
                stats = game[team_key]
                for category in ['passing', 'defense', 'rushing', 'receiving']:
                    if category in stats:
                        for player in stats[category]:
                            player_names.add(player['name'])
        
        return {"players": sorted(list(player_names))}
    except Exception as e:
        logger.error(f"Error getting player names: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/teams")
async def get_all_teams(admin_key: str = Header(...)):
    """Get list of all teams"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        teams = set()
        
        for game in games:
            teams.add(game['home_team'])
            teams.add(game['away_team'])
        
        return {"teams": sorted(list(teams))}
    except Exception as e:
        logger.error(f"Error getting teams: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/detect-userids")
async def detect_and_update_userids(admin_key: str = Header(...)):
    """Detect player names that are user IDs and update them to usernames"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        
        # Find all numeric player names
        userid_mapping = {}  # {userid: username}
        numeric_names = set()
        
        for game in games:
            for team_key in ['home_stats', 'away_stats']:
                stats = game[team_key]
                for category in ['passing', 'defense', 'rushing', 'receiving']:
                    if category in stats:
                        for player in stats[category]:
                            name = player['name']
                            if name.isdigit() and len(name) >= 6:  # User IDs are typically long numbers
                                numeric_names.add(name)
        
        if not numeric_names:
            return {"success": True, "message": "No user IDs found", "updated": 0}
        
        # Fetch usernames from Roblox
        async with aiohttp.ClientSession() as session:
            for user_id in numeric_names:
                try:
                    url = f"https://users.roblox.com/v1/users/{user_id}"
                    async with session.get(url) as response:
                        if response.status == 200:
                            data = await response.json()
                            username = data.get("name")
                            if username:
                                userid_mapping[user_id] = username
                                logger.info(f"Mapped user ID {user_id} to username {username}")
                except Exception as e:
                    logger.error(f"Error fetching username for {user_id}: {str(e)}")
        
        if not userid_mapping:
            return {"success": True, "message": "No valid usernames found for user IDs", "updated": 0}
        
        # Update games
        updated_count = 0
        for game in games:
            game_modified = False
            
            for team_key in ['home_stats', 'away_stats']:
                stats = game[team_key]
                for category in ['passing', 'defense', 'rushing', 'receiving']:
                    if category in stats:
                        for i, player in enumerate(stats[category]):
                            if player['name'] in userid_mapping:
                                stats[category][i]['name'] = userid_mapping[player['name']]
                                game_modified = True
            
            if game_modified:
                await db.games.update_one(
                    {"id": game['id']},
                    {"$set": game}
                )
                updated_count += 1
        
        logger.info(f"Updated {updated_count} games, converted {len(userid_mapping)} user IDs to usernames")
        
        return {
            "success": True,
            "message": f"Updated {len(userid_mapping)} user IDs to usernames in {updated_count} games",
            "mappings": userid_mapping,
            "updated": updated_count
        }
    except Exception as e:
        logger.error(f"Error detecting/updating user IDs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class TradeRecord(BaseModel):
    player_name: str
    from_team: str
    to_team: str
    week: Optional[int] = None
    notes: Optional[str] = None

@api_router.post("/admin/trade")
async def record_trade(trade: TradeRecord, admin_key: str = Header(...)):
    """Record a player trade and send to Discord"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        # Update all games to reflect the trade
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        updated_count = 0
        
        for game in games:
            # Only update future games (after trade week if specified)
            if trade.week and game['week'] <= trade.week:
                continue
            
            game_modified = False
            
            for team_key in ['home_stats', 'away_stats']:
                stats = game[team_key]
                for category in ['passing', 'defense', 'rushing', 'receiving']:
                    if category in stats:
                        for i, player in enumerate(stats[category]):
                            if player['name'] == trade.player_name:
                                # Check if player is on the from_team
                                if player.get('team') == trade.from_team:
                                    stats[category][i]['team'] = trade.to_team
                                    game_modified = True
            
            if game_modified:
                await db.games.update_one(
                    {"id": game['id']},
                    {"$set": game}
                )
                updated_count += 1
        
        # Store trade record
        trade_doc = {
            "id": str(uuid.uuid4()),
            "player_name": trade.player_name,
            "from_team": trade.from_team,
            "to_team": trade.to_team,
            "week": trade.week,
            "notes": trade.notes,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.trades.insert_one(trade_doc)
        
        # Send to Discord
        webhook_url = os.environ.get('DISCORD_WEBHOOK_URL')
        if webhook_url:
            try:
                async with aiohttp.ClientSession() as session:
                    embed = {
                        "title": "🔄 Trade Alert",
                        "description": f"**{trade.player_name}** has been traded!",
                        "color": 0x3498db,
                        "fields": [
                            {"name": "From", "value": trade.from_team, "inline": True},
                            {"name": "To", "value": trade.to_team, "inline": True}
                        ],
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    
                    if trade.week:
                        embed["fields"].append({"name": "Effective Week", "value": str(trade.week + 1), "inline": False})
                    if trade.notes:
                        embed["fields"].append({"name": "Notes", "value": trade.notes, "inline": False})
                    
                    payload = {"embeds": [embed]}
                    async with session.post(webhook_url, json=payload) as response:
                        if response.status not in [200, 204]:
                            logger.error(f"Discord webhook failed: {response.status}")
            except Exception as e:
                logger.error(f"Error sending trade to Discord: {str(e)}")
        
        logger.info(f"Trade recorded: {trade.player_name} from {trade.from_team} to {trade.to_team}")
        
        return {
            "success": True,
            "message": f"Trade recorded: {trade.player_name} from {trade.from_team} to {trade.to_team}",
            "updated_games": updated_count
        }
    except Exception as e:
        logger.error(f"Error recording trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/game/{game_id}/raw")
async def get_raw_game_data(game_id: str, admin_key: str = Header(...)):
    """Get raw game data for debugging team assignments"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        game = await db.games.find_one({"id": game_id}, {"_id": 0})
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        
        return game
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting raw game data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/fix-team-assignments")
async def fix_team_assignments(admin_key: str = Header(...)):
    """Fix team assignments for all players in all games based on which stats section they're in"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        games = await db.games.find({}, {"_id": 0}).to_list(1000)
        updated_count = 0
        fixes_made = []
        
        for game in games:
            game_modified = False
            
            # Fix home team assignments
            for category in ['passing', 'defense', 'rushing', 'receiving']:
                if category in game['home_stats']:
                    for i, player in enumerate(game['home_stats'][category]):
                        # If team is missing or wrong, set it to home team
                        if player.get('team') != game['home_team']:
                            old_team = player.get('team', 'None')
                            game['home_stats'][category][i]['team'] = game['home_team']
                            game_modified = True
                            fixes_made.append({
                                'game_id': game['id'],
                                'week': game['week'],
                                'player': player['name'],
                                'category': category,
                                'old_team': old_team,
                                'new_team': game['home_team'],
                                'section': 'home_stats'
                            })
            
            # Fix away team assignments
            for category in ['passing', 'defense', 'rushing', 'receiving']:
                if category in game['away_stats']:
                    for i, player in enumerate(game['away_stats'][category]):
                        # If team is missing or wrong, set it to away team
                        if player.get('team') != game['away_team']:
                            old_team = player.get('team', 'None')
                            game['away_stats'][category][i]['team'] = game['away_team']
                            game_modified = True
                            fixes_made.append({
                                'game_id': game['id'],
                                'week': game['week'],
                                'player': player['name'],
                                'category': category,
                                'old_team': old_team,
                                'new_team': game['away_team'],
                                'section': 'away_stats'
                            })
            
            if game_modified:
                await db.games.update_one(
                    {"id": game['id']},
                    {"$set": game}
                )
                updated_count += 1
        
        logger.info(f"Fixed team assignments in {updated_count} games, made {len(fixes_made)} fixes")
        
        return {
            "success": True,
            "message": f"Fixed team assignments in {updated_count} games",
            "fixes_made": fixes_made[:50],  # Return first 50 fixes
            "total_fixes": len(fixes_made),
            "games_updated": updated_count
        }
    except Exception as e:
        logger.error(f"Error fixing team assignments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/game/{game_id}/csv")
async def get_game_csv(game_id: str, admin_key: str = Header(...)):
    """Get CSV export for a specific game"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        game = await db.games.find_one({"id": game_id}, {"_id": 0})
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        
        # Convert to Game object for CSV generation
        game_obj = Game(**game)
        csv_content = generate_csv(game_obj)
        
        return {"csv": csv_content}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/2fa/request")
async def request_2fa(request: TwoFactorRequest, admin_key: str = Header(...)):
    """Request a 2FA code for sensitive operations"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    try:
        code = await store_2fa_code(admin_key, request.operation, request.game_id)
        logger.info(f"2FA code generated for {request.operation}: {code}")
        
        return {
            "success": True,
            "message": f"2FA code generated. Code: {code} (expires in 5 minutes)",
            "code": code  # In production, send via email/SMS instead
        }
    except Exception as e:
        logger.error(f"Error generating 2FA code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/2fa/verify")
async def verify_2fa(request: TwoFactorVerify, admin_key: str = Header(...)):
    """Verify a 2FA code"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    is_valid = await verify_2fa_code(admin_key, request.code, request.operation, request.game_id)
    
    if not is_valid:
        raise HTTPException(status_code=403, detail="Invalid or expired 2FA code")
    
    return {"success": True, "message": "2FA code verified"}

@api_router.put("/admin/game/{game_id}")
async def edit_game(game_id: str, game_edit: GameEdit, twofa_code: str, admin_key: str = Header(...)):
    """Edit an existing game (requires 2FA verification)"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    # Verify 2FA code
    if not await verify_2fa_code(admin_key, twofa_code, "edit_game", game_id):
        raise HTTPException(status_code=403, detail="Invalid or expired 2FA code")
    
    try:
        # Find the game
        game = await db.games.find_one({"id": game_id}, {"_id": 0})
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        
        # Update only provided fields
        update_data = {}
        if game_edit.week is not None:
            update_data["week"] = game_edit.week
        if game_edit.home_team is not None:
            update_data["home_team"] = game_edit.home_team
        if game_edit.away_team is not None:
            update_data["away_team"] = game_edit.away_team
        if game_edit.home_score is not None:
            update_data["home_score"] = game_edit.home_score
        if game_edit.away_score is not None:
            update_data["away_score"] = game_edit.away_score
        if game_edit.player_of_game is not None:
            update_data["player_of_game"] = game_edit.player_of_game
        if game_edit.game_date is not None:
            update_data["game_date"] = game_edit.game_date
        if game_edit.home_stats is not None:
            update_data["home_stats"] = game_edit.home_stats
        if game_edit.away_stats is not None:
            update_data["away_stats"] = game_edit.away_stats
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update the game
        result = await db.games.update_one(
            {"id": game_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Game not found or no changes made")
        
        logger.info(f"Game {game_id} updated by admin")
        
        return {
            "success": True,
            "message": "Game updated successfully",
            "game_id": game_id,
            "updated_fields": list(update_data.keys())
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing game: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/game/{game_id}")
async def delete_game(game_id: str, twofa_code: str, admin_key: str = Header(...)):
    """Delete a game (requires 2FA verification)"""
    if not await verify_admin(admin_key):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    # Verify 2FA code
    if not await verify_2fa_code(admin_key, twofa_code, "delete_game", game_id):
        raise HTTPException(status_code=403, detail="Invalid or expired 2FA code")
    
    try:
        # Find the game first to return info
        game = await db.games.find_one({"id": game_id}, {"_id": 0})
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        
        # Delete the game
        result = await db.games.delete_one({"id": game_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Game not found")
        
        logger.info(f"Game {game_id} (Week {game.get('week')}) deleted by admin")
        
        return {
            "success": True,
            "message": f"Game deleted: Week {game.get('week')} - {game.get('home_team')} vs {game.get('away_team')}",
            "game_id": game_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting game: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app
app.include_router(api_router)

# Mount static files
static_dir = Path("static")
app.mount("/static", StaticFiles(directory="static", html=True), name="static")
# Debug endpoint to check static files
@app.get("/debug/static")
async def debug_static():
    static_path = Path("static")
    if static_path.exists():
        files = []
        for root, dirs, filenames in os.walk(static_path):
            for filename in filenames:
                files.append(os.path.relpath(os.path.join(root, filename), static_path))
        return {
            "static_dir_exists": True,
            "static_dir_path": str(static_path.absolute()),
            "files": files[:20],  # Limit to first 20 files
            "total_files": len(files)
        }
    else:
        return {
            "static_dir_exists": False,
            "static_dir_path": str(static_path.absolute()),
            "cwd": str(Path.cwd())
        }

# Serve React app at root
@app.get("/")
async def serve_react_app():
    index_path = Path("index.html")
    if index_path.exists():
        return FileResponse("index.html", media_type="text/html")
    else:
        return {"error": "Frontend not built", "index_exists": index_path.exists(), "cwd": str(Path.cwd())}

# Catch-all route to serve React app for SPA routing
@app.get("/{full_path:path}")
async def serve_react_app_spa(full_path: str):
    # This route should only be reached for non-API routes
    # API routes are handled by the api_router which is registered first
    index_path = Path("index.html")
    if index_path.exists():
        return FileResponse("index.html", media_type="text/html")
    else:
        return {"error": "Frontend not built", "index_exists": index_path.exists(), "cwd": str(Path.cwd())}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()