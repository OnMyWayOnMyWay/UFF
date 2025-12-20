import requests
import random
from datetime import datetime, timedelta

API_URL = "https://uff-backend.herokuapp.com/api/game"

# Team names
teams = ["Eagles", "Hawks", "Titans", "Warriors", "Sharks", "Dragons", "Panthers", "Lightning"]

# Player pools for each team - ROBLOX USERNAMES
team_players = {
    "Eagles": {
        "QB": "Baccon_o", "RB": "xX_Speedster_Xx", "WR": "NoobMaster69", 
        "DEF1": "TackleMachine", "DEF2": "Iron_Defense"
    },
    "Hawks": {
        "QB": "QuarterbackKing", "RB": "RushGod_420", "WR": "CatchMeIfYouCan",
        "DEF1": "BlitzBoy", "DEF2": "Sack_Attack"
    },
    "Titans": {
        "QB": "ProGamer_Sarah", "RB": "Lightning_Legs", "WR": "WR_Elite",
        "DEF1": "DefenseIsKey", "DEF2": "Stone_Wall99"
    },
    "Warriors": {
        "QB": "ThunderArm_Brad", "RB": "Sprint_Master", "WR": "Air_Jordan23",
        "DEF1": "Hill_Climber", "DEF2": "BenTheGreat"
    },
    "Sharks": {
        "QB": "Tommy_Cannon", "RB": "Dash_Destroyer", "WR": "ClutchPlayer_RC",
        "DEF1": "MillerTime", "DEF2": "Derek_Dominator"
    },
    "Dragons": {
        "QB": "Dragon_Slayer", "RB": "Turbo_Torres", "WR": "Rodriguez_Rocket",
        "DEF1": "Paul_The_Wall", "DEF2": "Martinez_Mayhem"
    },
    "Panthers": {
        "QB": "Marcus_Magic", "RB": "JasonTheJet", "WR": "Tyler_Touchdown",
        "DEF1": "JonesTheBeast", "DEF2": "Luis_Lockdown"
    },
    "Lightning": {
        "QB": "EvanTheElite", "RB": "Sam_Speedrun", "WR": "Carter_Clutch",
        "DEF1": "Jake_Juggernaut", "DEF2": "Brooks_Blitz"
    }
}

def generate_player_stats(position, is_winner=False, player_name=""):
    """Generate realistic stats based on position and game outcome"""
    stats = {}
    
    # Boost stats for Baccon_o
    is_baccon = "Baccon_o" in player_name
    multiplier = 1.3 if is_baccon else 1.0
    
    if position == "QB":
        comp = random.randint(8, 22)
        if is_baccon:
            comp = random.randint(15, 28)  # Better completion rate
        att = comp + random.randint(3, 10)
        yards = int(comp * random.randint(8, 18) * multiplier)
        td = random.randint(2, 5) if (is_winner or is_baccon) else random.randint(0, 2)
        ints = random.randint(0, 1) if (not is_winner or is_baccon) else random.randint(0, 2)
        
        stats = {
            "Passing": {
                "Comp": comp,
                "Att": att,
                "Yards": yards,
                "TD": td,
                "Int": ints,
                "SCKED": random.randint(0, 3)
            }
        }
    
    elif position == "RB":
        att = random.randint(8, 18)
        yards = att * random.randint(3, 8)
        td = random.randint(0, 2) if is_winner else random.randint(0, 1)
        
        stats = {
            "Rushing": {
                "Att": att,
                "Yards": yards,
                "TD": td
            }
        }
    
    elif position == "WR":
        rec = random.randint(3, 10)
        yards = rec * random.randint(8, 18)
        td = random.randint(0, 3) if is_winner else random.randint(0, 2)
        
        stats = {
            "Receiving": {
                "Rec": rec,
                "Yards": yards,
                "TD": td
            }
        }
    
    elif position.startswith("DEF"):
        stats = {
            "Defense": {
                "TAK": random.randint(4, 12),
                "TFL": random.randint(0, 3),
                "SCK": random.randint(0, 2),
                "SAF": random.randint(0, 1),
                "SWAT": random.randint(0, 3),
                "INT": random.randint(0, 2),
                "PBU": random.randint(0, 4),
                "TD": random.randint(0, 1) if is_winner else 0
            }
        }
    
    return stats

def generate_game(week, home_team, away_team, game_date, is_playoff=False):
    """Generate a complete game with stats"""
    
    # Generate scores (playoff games tend to be closer)
    if is_playoff:
        base_score = random.randint(17, 28)
        score_diff = random.randint(3, 10)
    else:
        base_score = random.randint(14, 31)
        score_diff = random.randint(3, 21)
    
    is_home_winner = random.choice([True, False])
    home_score = base_score + score_diff if is_home_winner else base_score
    away_score = base_score if is_home_winner else base_score + score_diff
    
    # Generate player stats
    home_stats = {}
    away_stats = {}
    
    home_players = team_players[home_team]
    away_players = team_players[away_team]
    
    # Home team stats
    for pos, player in home_players.items():
        home_stats[player] = generate_player_stats(pos, is_home_winner, player)
    
    # Away team stats
    for pos, player in away_players.items():
        away_stats[player] = generate_player_stats(pos, not is_home_winner, player)
    
    # Determine player of the game (usually from winning team)
    winner_team = home_team if is_home_winner else away_team
    winner_players = team_players[winner_team]
    player_of_game = winner_players[random.choice(["QB", "RB", "WR"])]
    
    game_data = {
        "week": week,
        "home_team": home_team,
        "away_team": away_team,
        "home_score": home_score,
        "away_score": away_score,
        "home_stats": home_stats,
        "away_stats": away_stats,
        "player_of_game": player_of_game,
        "game_date": game_date
    }
    
    return game_data

def post_game(game_data):
    """Post game to API"""
    try:
        response = requests.post(API_URL, json=game_data, timeout=10)
        if response.status_code == 200:
            print(f"✅ Week {game_data['week']}: {game_data['home_team']} {game_data['home_score']} - {game_data['away_score']} {game_data['away_team']}")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

# Generate complete season
print("🏈 GENERATING COMPLETE SEASON\n")

start_date = datetime(2025, 1, 15)
games_posted = 0

# REGULAR SEASON - 8 Weeks (4 games per week)
print("📅 REGULAR SEASON")
print("=" * 50)

for week in range(1, 9):
    print(f"\n🗓️  WEEK {week}")
    game_date = (start_date + timedelta(days=(week-1)*7)).strftime("%Y-%m-%d")
    
    # Shuffle teams for matchups
    week_teams = teams.copy()
    random.shuffle(week_teams)
    
    # Create 4 matchups
    for i in range(0, 8, 2):
        game = generate_game(week, week_teams[i], week_teams[i+1], game_date)
        if post_game(game):
            games_posted += 1

# PLAYOFFS - Week 9-10 (Semifinals)
print("\n\n🏆 PLAYOFFS - SEMIFINALS")
print("=" * 50)

playoff_teams = ["Eagles", "Titans", "Sharks", "Panthers"]  # Top 4 seeds
playoff_date_1 = (start_date + timedelta(days=8*7)).strftime("%Y-%m-%d")

print(f"\n🗓️  WEEK 9 - Semifinal Round")
# Game 1: #1 vs #4
game1 = generate_game(9, playoff_teams[0], playoff_teams[3], playoff_date_1, is_playoff=True)
if post_game(game1):
    games_posted += 1
    winner1 = game1['home_team'] if game1['home_score'] > game1['away_score'] else game1['away_team']

# Game 2: #2 vs #3
game2 = generate_game(9, playoff_teams[1], playoff_teams[2], playoff_date_1, is_playoff=True)
if post_game(game2):
    games_posted += 1
    winner2 = game2['home_team'] if game2['home_score'] > game2['away_score'] else game2['away_team']

# 3rd Place Game
print(f"\n🗓️  WEEK 10 - 3rd Place Game")
playoff_date_2 = (start_date + timedelta(days=9*7)).strftime("%Y-%m-%d")

loser1 = game1['away_team'] if game1['home_score'] > game1['away_score'] else game1['home_team']
loser2 = game2['away_team'] if game2['home_score'] > game2['away_score'] else game2['home_team']

game3 = generate_game(10, loser1, loser2, playoff_date_2, is_playoff=True)
if post_game(game3):
    games_posted += 1

# CHAMPIONSHIP - Week 11
print("\n\n🏆 CHAMPIONSHIP GAME")
print("=" * 50)
print(f"\n🗓️  WEEK 11 - CHAMPIONSHIP")

championship_date = (start_date + timedelta(days=10*7)).strftime("%Y-%m-%d")
championship = generate_game(11, winner1, winner2, championship_date, is_playoff=True)
# Make championship game close and exciting
championship['home_score'] = random.randint(24, 31)
championship['away_score'] = championship['home_score'] + random.choice([-3, 3, 7, -7])
championship['away_score'] = max(21, championship['away_score'])

if post_game(championship):
    games_posted += 1

champion = championship['home_team'] if championship['home_score'] > championship['away_score'] else championship['away_team']

print("\n\n" + "=" * 50)
print(f"🎉 SEASON COMPLETE!")
print(f"📊 Total games posted: {games_posted}")
print(f"🏆 CHAMPION: {champion}")
print(f"🥇 Final Score: {championship['home_team']} {championship['home_score']} - {championship['away_score']} {championship['away_team']}")
print("=" * 50)
