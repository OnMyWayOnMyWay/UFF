# 🚀 Quick Reference - Roblox API

## 📡 Endpoint
```
POST https://gameday-tracker-3.preview.emergentagent.com/api/game
```

## 📋 Minimal Example

```lua
local gameData = {
    week = 1,
    home_team = "Eagles",
    away_team = "Hawks", 
    home_score = 28,
    away_score = 21,
    player_of_game = "Baccon_o",
    
    home_stats = {
        ["Baccon_o"] = {
            Passing = {
                Comp = 15, Att = 22, Yards = 245,
                TD = 3, Int = 1, SCKED = 2
            }
        }
    },
    
    away_stats = {
        ["QuarterbackKing"] = {
            Passing = {
                Comp = 12, Att = 20, Yards = 198,
                TD = 2, Int = 2, SCKED = 3
            }
        }
    }
}
```

## 📊 Stat Field Quick Copy

### Passing
```lua
Passing = {
    Comp = 0,
    Att = 0,
    Yards = 0,
    TD = 0,
    Int = 0,
    SCKED = 0
}
```

### Rushing
```lua
Rushing = {
    Att = 0,
    Yards = 0,
    TD = 0
}
```

### Receiving
```lua
Receiving = {
    Rec = 0,
    Yards = 0,
    TD = 0
}
```

### Defense
```lua
Defense = {
    TAK = 0,
    TFL = 0,
    SCK = 0,
    SAF = 0,
    SWAT = 0,
    INT = 0,
    PBU = 0,
    TD = 0
}
```

## ⚡ Copy-Paste Template

```lua
local HttpService = game:GetService("HttpService")
local API_URL = "https://gameday-tracker-3.preview.emergentagent.com/api/game"

local gameData = {
    week = 1,                    -- Change this
    home_team = "YourTeam",      -- Change this
    away_team = "OpponentTeam",  -- Change this
    home_score = 0,              -- Change this
    away_score = 0,              -- Change this
    player_of_game = "Username", -- Change this
    
    home_stats = {
        ["PlayerName1"] = {
            -- Add stats here
        }
    },
    
    away_stats = {
        ["PlayerName2"] = {
            -- Add stats here
        }
    }
}

-- Submit
local jsonData = HttpService:JSONEncode(gameData)
local response = HttpService:RequestAsync({
    Url = API_URL,
    Method = "POST",
    Headers = {["Content-Type"] = "application/json"},
    Body = jsonData
})

print(response.Success and "✅ Sent!" or "❌ Failed")
```

## ✅ Checklist

- [ ] HTTP Requests enabled in Game Settings
- [ ] All field names match EXACTLY (case-sensitive)
- [ ] Week number is set correctly
- [ ] Both team names provided
- [ ] Both scores provided
- [ ] Player of game is a valid player username
- [ ] At least 1 player in home_stats
- [ ] At least 1 player in away_stats
- [ ] All stat categories use correct field names

## 🎯 Common Mistakes

❌ `yards` → ✅ `Yards` (capital Y!)
❌ `tackles` → ✅ `TAK` (use abbreviation!)
❌ Missing player stats → ✅ Set to 0
❌ Wrong endpoint → ✅ Use `/api/game`

## 📞 Need Help?

View dashboard: https://gameday-tracker-3.preview.emergentagent.com
Read full guide: `/app/ROBLOX_API_GUIDE.md`
