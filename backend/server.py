from fastapi import FastAPI, APIRouter, HTTPException
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


def transform_player_stats(player_stats: Dict[str, Dict[str, Dict[str, Any]]]) -> Dict[str, list]:
    """
    Transform player-organized stats into category-organized stats for frontend display
    Input: {PlayerName: {Passing: {...}, Defense: {...}, Rushing: {...}, Receiving: {...}}}
    Output: {passing: [{name: PlayerName, stats: {...}}], defense: [...], rushing: [...], receiving: [...]}
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
                    'stats': {k.lower(): v for k, v in stats.items()}  # Normalize keys to lowercase
                })
    
    return result


@api_router.post("/game", response_model=Game)
async def submit_game(game_data: GameData):
    """Endpoint for Roblox to submit game stats"""
    try:
        # Transform stats from player-organized to category-organized format
        home_stats_transformed = transform_player_stats(game_data.home_stats)
        away_stats_transformed = transform_player_stats(game_data.away_stats)
        
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


# Include the router in the main app
app.include_router(api_router)

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