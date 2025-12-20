from fastapi import FastAPI, APIRouter, HTTPException
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
                        player_stats[name]['games_played'] += 1
            
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
        
        # Calculate totals and fantasy points
        leaders = {
            'points': [],
            'passing_yards': [],
            'rushing_yards': [],
            'receiving_yards': [],
            'tackles': [],
            'sacks': [],
            'interceptions': []
        }
        
        for name, stats in player_stats.items():
            # Calculate fantasy points
            fantasy_points = calculate_fantasy_points(stats)
            
            # Calculate totals
            passing_yards = sum(s.get('yards', 0) for s in stats['passing'])
            passing_tds = sum(s.get('td', 0) for s in stats['passing'])
            
            rushing_yards = sum(s.get('yards', 0) for s in stats['rushing'])
            rushing_tds = sum(s.get('td', 0) for s in stats['rushing'])
            
            receiving_yards = sum(s.get('yards', 0) for s in stats['receiving'])
            receiving_tds = sum(s.get('td', 0) for s in stats['receiving'])
            receptions = sum(s.get('rec', 0) for s in stats['receiving'])
            
            tackles = sum(s.get('tak', 0) for s in stats['defense'])
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
                    'games': stats['games_played']
                })
            
            if rushing_yards > 0:
                leaders['rushing_yards'].append({
                    'name': name,
                    'value': rushing_yards,
                    'tds': rushing_tds,
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


@api_router.post("/admin/reset-season")
async def reset_season(admin_key: str):
    """Reset the season by wiping all game data"""
    # Simple admin key check - you can change this
    if admin_key != os.environ.get('ADMIN_KEY', 'reset_season_2025'):
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


# Include the router in the main app
app.include_router(api_router)

# Mount static files
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# Serve React app at root
@app.get("/")
async def serve_react_app():
    index_path = Path("static/index.html")
    if index_path.exists():
        return FileResponse("static/index.html", media_type="text/html")
    else:
        return {"error": "Frontend not built", "static_exists": index_path.exists(), "cwd": str(Path.cwd())}

# Catch-all route to serve React app for SPA routing
@app.get("/{full_path:path}")
async def serve_react_app_spa(full_path: str):
    # Skip API routes and static files
    if full_path.startswith("api/") or full_path.startswith("static/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Serve index.html for all other routes (SPA routing)
    index_path = Path("static/index.html")
    if index_path.exists():
        return FileResponse("static/index.html", media_type="text/html")
    else:
        return {"error": "Frontend not built", "static_exists": index_path.exists(), "cwd": str(Path.cwd())}

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