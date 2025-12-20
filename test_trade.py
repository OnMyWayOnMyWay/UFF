import requests

API_URL = "https://uff-backend.herokuapp.com/api/game"

# Simulate NoobMaster69 being traded from Eagles to Titans
# Week 12 game - NoobMaster69 now plays for Titans

trade_game = {
    "week": 12,
    "home_team": "Titans",
    "away_team": "Warriors", 
    "home_score": 35,
    "away_score": 28,
    "player_of_game": "NoobMaster69",
    "game_date": "2025-02-26",
    "home_stats": {
        "ProGamer_Sarah": {
            "Passing": {
                "Comp": 12,
                "Att": 18,
                "Yards": 145,
                "TD": 1,
                "Int": 0,
                "SCKED": 1
            }
        },
        "NoobMaster69": {  # TRADED FROM EAGLES!
            "Receiving": {
                "Rec": 9,
                "Yards": 156,
                "TD": 3
            }
        },
        "Lightning_Legs": {
            "Rushing": {
                "Att": 15,
                "Yards": 92,
                "TD": 1
            }
        },
        "DefenseIsKey": {
            "Defense": {
                "TAK": 8,
                "TFL": 2,
                "SCK": 1,
                "SAF": 0,
                "SWAT": 1,
                "INT": 1,
                "PBU": 2,
                "TD": 0
            }
        }
    },
    "away_stats": {
        "ThunderArm_Brad": {
            "Passing": {
                "Comp": 14,
                "Att": 22,
                "Yards": 188,
                "TD": 2,
                "Int": 2,
                "SCKED": 2
            }
        },
        "Sprint_Master": {
            "Rushing": {
                "Att": 12,
                "Yards": 78,
                "TD": 1
            }
        },
        "Air_Jordan23": {
            "Receiving": {
                "Rec": 6,
                "Yards": 98,
                "TD": 1
            }
        },
        "Hill_Climber": {
            "Defense": {
                "TAK": 10,
                "TFL": 1,
                "SCK": 2,
                "SAF": 0,
                "SWAT": 0,
                "INT": 1,
                "PBU": 3,
                "TD": 0
            }
        }
    }
}

print("🔄 SIMULATING TRADE: NoobMaster69 Eagles → Titans")
print("=" * 60)

try:
    response = requests.post(API_URL, json=trade_game, timeout=10)
    if response.status_code == 200:
        print(f"✅ Trade game posted successfully!")
        print(f"📊 Week 12: Titans 35 - Warriors 28")
        print(f"🏆 Player of Game: NoobMaster69 (156 yards, 3 TDs)")
        print(f"\n🔍 NoobMaster69 should now show:")
        print(f"   - Current Team: Titans")
        print(f"   - Team History: Eagles (X games) → Titans (1 game)")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"❌ Error: {str(e)}")
