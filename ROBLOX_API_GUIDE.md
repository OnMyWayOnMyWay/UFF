# 🎮 Roblox Flag Football API - Complete Integration Guide

## 📡 API Endpoint

```
POST https://gameday-tracker-3.preview.emergentagent.com/api/game
```

**Content-Type:** `application/json`

---

## 📋 Request Structure

### Main Game Data

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `week` | Number | ✅ Yes | Week number (1-52) | `1` |
| `home_team` | String | ✅ Yes | Home team name | `"Eagles"` |
| `away_team` | String | ✅ Yes | Away team name | `"Hawks"` |
| `home_score` | Number | ✅ Yes | Home team final score | `28` |
| `away_score` | Number | ✅ Yes | Away team final score | `21` |
| `player_of_game` | String | ✅ Yes | Player of the game (Roblox username) | `"Baccon_o"` |
| `game_date` | String | ⚠️ Optional | Date in YYYY-MM-DD format (auto-generated if omitted) | `"2025-01-15"` |
| `home_stats` | Object | ✅ Yes | Home team player stats (see below) | `{...}` |
| `away_stats` | Object | ✅ Yes | Away team player stats (see below) | `{...}` |

---

## 👥 Player Stats Structure

**Format:** `{PlayerUsername: {CategoryName: {StatName: Value}}}`

### Example:
```lua
home_stats = {
    ["Baccon_o"] = {
        Passing = {...},
        Rushing = {...}
    },
    ["NoobMaster69"] = {
        Receiving = {...}
    }
}
```

---

## 📊 Stat Categories & Fields

### 🎯 PASSING Stats

| Stat Name | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `Comp` | Number | ✅ Yes | Completions | `15` |
| `Att` | Number | ✅ Yes | Attempts | `22` |
| `Yards` | Number | ✅ Yes | Passing Yards | `245` |
| `TD` | Number | ✅ Yes | Touchdowns | `3` |
| `Int` | Number | ✅ Yes | Interceptions | `1` |
| `SCKED` | Number | ✅ Yes | Times Sacked | `2` |

**Example:**
```lua
Passing = {
    Comp = 15,
    Att = 22,
    Yards = 245,
    TD = 3,
    Int = 1,
    SCKED = 2
}
```

---

### 🏃 RUSHING Stats

| Stat Name | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `Att` | Number | ✅ Yes | Attempts | `12` |
| `Yards` | Number | ✅ Yes | Rushing Yards | `85` |
| `TD` | Number | ✅ Yes | Touchdowns | `1` |

**Example:**
```lua
Rushing = {
    Att = 12,
    Yards = 85,
    TD = 1
}
```

---

### 🙌 RECEIVING Stats

| Stat Name | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `Rec` | Number | ✅ Yes | Receptions | `7` |
| `Yards` | Number | ✅ Yes | Receiving Yards | `125` |
| `TD` | Number | ✅ Yes | Touchdowns | `2` |

**Example:**
```lua
Receiving = {
    Rec = 7,
    Yards = 125,
    TD = 2
}
```

---

### 🛡️ DEFENSE Stats

| Stat Name | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `TAK` | Number | ✅ Yes | Tackles | `8` |
| `TFL` | Number | ✅ Yes | Tackles for Loss | `2` |
| `SCK` | Number | ✅ Yes | Sacks | `1` |
| `SAF` | Number | ✅ Yes | Safeties | `0` |
| `SWAT` | Number | ✅ Yes | Pass Deflections/Swats | `3` |
| `INT` | Number | ✅ Yes | Interceptions | `1` |
| `PBU` | Number | ✅ Yes | Pass Break-Ups | `2` |
| `TD` | Number | ✅ Yes | Defensive Touchdowns | `0` |

**Example:**
```lua
Defense = {
    TAK = 8,
    TFL = 2,
    SCK = 1,
    SAF = 0,
    SWAT = 3,
    INT = 1,
    PBU = 2,
    TD = 0
}
```

---

## 💻 Complete Roblox Example

```lua
local HttpService = game:GetService("HttpService")

-- API Configuration
local API_URL = "https://gameday-tracker-3.preview.emergentagent.com/api/game"

-- Build Game Data
local gameData = {
    week = 1,
    home_team = "Eagles",
    away_team = "Hawks",
    home_score = 28,
    away_score = 21,
    player_of_game = "Baccon_o",
    game_date = "2025-01-15",  -- Optional: YYYY-MM-DD format
    
    -- HOME TEAM STATS
    home_stats = {
        -- Quarterback
        ["Baccon_o"] = {
            Passing = {
                Comp = 15,
                Att = 22,
                Yards = 245,
                TD = 3,
                Int = 1,
                SCKED = 2
            },
            Rushing = {  -- Players can have multiple categories!
                Att = 3,
                Yards = 15,
                TD = 0
            }
        },
        
        -- Wide Receiver
        ["NoobMaster69"] = {
            Receiving = {
                Rec = 7,
                Yards = 125,
                TD = 2
            }
        },
        
        -- Running Back
        ["xX_Speedster_Xx"] = {
            Rushing = {
                Att = 12,
                Yards = 85,
                TD = 1
            }
        },
        
        -- Defenders
        ["TackleMachine"] = {
            Defense = {
                TAK = 8,
                TFL = 2,
                SCK = 1,
                SAF = 0,
                SWAT = 3,
                INT = 1,
                PBU = 2,
                TD = 0
            }
        },
        
        ["Iron_Defense"] = {
            Defense = {
                TAK = 6,
                TFL = 1,
                SCK = 0,
                SAF = 0,
                SWAT = 1,
                INT = 0,
                PBU = 3,
                TD = 0
            }
        }
    },
    
    -- AWAY TEAM STATS (same structure)
    away_stats = {
        ["QuarterbackKing"] = {
            Passing = {
                Comp = 12,
                Att = 20,
                Yards = 198,
                TD = 2,
                Int = 2,
                SCKED = 3
            }
        },
        
        ["RushGod_420"] = {
            Rushing = {
                Att = 8,
                Yards = 62,
                TD = 1
            }
        },
        
        ["CatchMeIfYouCan"] = {
            Receiving = {
                Rec = 5,
                Yards = 98,
                TD = 1
            }
        },
        
        ["BlitzBoy"] = {
            Defense = {
                TAK = 10,
                TFL = 1,
                SCK = 2,
                SAF = 0,
                SWAT = 1,
                INT = 2,
                PBU = 3,
                TD = 1
            }
        },
        
        ["Sack_Attack"] = {
            Defense = {
                TAK = 5,
                TFL = 0,
                SCK = 1,
                SAF = 0,
                SWAT = 0,
                INT = 0,
                PBU = 1,
                TD = 0
            }
        }
    }
}

-- Function to Submit Game Stats
local function submitGameStats()
    local success, result = pcall(function()
        local jsonData = HttpService:JSONEncode(gameData)
        
        local response = HttpService:RequestAsync({
            Url = API_URL,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = jsonData
        })
        
        if response.Success and response.StatusCode == 200 then
            print("✅ Game stats submitted successfully!")
            print("Response:", response.Body)
            return true
        else
            warn("❌ Failed to submit stats:", response.StatusCode, response.StatusMessage)
            return false
        end
    end)
    
    if not success then
        warn("❌ Error submitting game stats:", result)
    end
    
    return success
end

-- Call this when your game ends
submitGameStats()
```

---

## 🔑 Important Notes

### ✅ DO's:
- ✅ Use exact field names (case-sensitive!)
- ✅ Include all required fields for each stat category
- ✅ Use Roblox usernames for player names
- ✅ Set all stats to 0 if player didn't perform that action
- ✅ Players can have multiple categories (QB can also rush, WR can also defend)
- ✅ Enable HTTP requests in Game Settings → Security

### ❌ DON'Ts:
- ❌ Don't skip required fields (use 0 if no stats)
- ❌ Don't use incorrect capitalization (e.g., "yards" instead of "Yards")
- ❌ Don't send empty categories (omit if player didn't play that position)
- ❌ Don't include players with zero stats in all categories

---

## 🔄 Trade Handling

**When a player gets traded, just include them in their NEW team's roster!**

```lua
-- Week 1-5: NoobMaster69 plays for Eagles
home_stats = {
    ["NoobMaster69"] = {
        Receiving = {...}
    }
}

-- Week 6: NoobMaster69 traded to Titans
-- Just put them in Titans roster now!
away_stats = {  -- If Titans are away team
    ["NoobMaster69"] = {
        Receiving = {...}
    }
}
```

**The API automatically:**
- ✅ Detects the team change
- ✅ Shows "Team History" on player profile
- ✅ Tracks stats separately per team
- ✅ Displays current team

---

## 📊 Response Format

**Success (200):**
```json
{
  "id": "unique-game-id",
  "week": 1,
  "home_team": "Eagles",
  "away_team": "Hawks",
  "home_score": 28,
  "away_score": 21,
  "player_of_game": "Baccon_o",
  "game_date": "2025-01-15",
  "timestamp": "2025-01-15T12:00:00Z",
  "home_stats": {...},
  "away_stats": {...}
}
```

**Error (4xx/5xx):**
```json
{
  "detail": "Error message here"
}
```

---

## 🧪 Testing Your Integration

### Test with cURL:
```bash
curl -X POST "https://gameday-tracker-3.preview.emergentagent.com/api/game" \
  -H "Content-Type: application/json" \
  -d '{
    "week": 1,
    "home_team": "TestTeam1",
    "away_team": "TestTeam2",
    "home_score": 10,
    "away_score": 7,
    "player_of_game": "TestPlayer123",
    "home_stats": {
      "TestPlayer123": {
        "Passing": {
          "Comp": 5,
          "Att": 10,
          "Yards": 75,
          "TD": 1,
          "Int": 0,
          "SCKED": 0
        }
      }
    },
    "away_stats": {
      "OpponentPlayer": {
        "Defense": {
          "TAK": 5,
          "TFL": 0,
          "SCK": 0,
          "SAF": 0,
          "SWAT": 0,
          "INT": 0,
          "PBU": 0,
          "TD": 0
        }
      }
    }
  }'
```

---

## 📞 Support

- Check the live dashboard: https://gameday-tracker-3.preview.emergentagent.com
- Verify your game appears after submission
- Player profiles show up automatically
- Discord webhook posts game results

---

## 🎯 Quick Reference

**Minimum Required Players Per Team:** 1 (but ideally 5+)

**Stat Categories:** Passing, Rushing, Receiving, Defense

**Players Can Have:** Multiple categories (e.g., QB with Passing + Rushing)

**Trade Support:** ✅ Automatic (just change team roster)

**Fantasy Scoring:** ✅ Automatic calculation

**Discord Integration:** ✅ Auto-posts with CSV file

---

Happy coding! 🎮🏈
