# Roblox Flag Football Stats Platform - Integration Guide

## Overview
This platform allows your Roblox flag football game to submit stats to a web-based ESPN-style dashboard. Stats are automatically stored by week and sent to Discord with an embed card and CSV file.

---

## Features

### ✅ Implemented Features
- **API Endpoint**: Public HTTPS endpoint for Roblox to POST game data
- **Week-Based Organization**: Stats automatically organized by week number
- **ESPN-Style Dashboard**: Dark-themed, professional stats display
- **Discord Integration**: Automatic posting with embed cards and CSV files
- **Detailed Stats Tracking**:
  - **Passing**: Comp, Att, Yards, TD, Int, SCKED
  - **Defense**: TAK/TKL, TFL, SCK, SAF, SWAT, INT, PBU, TD
  - **Rushing**: Att, Yards, TD
  - **Receiving**: Rec, Yards, TD
- **Player of the Game**: Highlight feature on dashboard
- **Mobile Responsive**: Works on all devices

---

## API Documentation

### Base URL
```
https://gameday-tracker-3.preview.emergentagent.com/api
```

### Endpoints

#### 1. Submit Game Stats
**POST** `/game`

Submit game statistics from Roblox.

**Request Body:**
```json
{
  "week": 1,
  "home_team": "Eagles",
  "away_team": "Hawks",
  "home_score": 28,
  "away_score": 21,
  "player_of_game": "John Smith",
  "game_date": "2025-01-15",
  "home_stats": {
    "passing": [
      {
        "name": "John Smith",
        "stats": {
          "comp": 15,
          "att": 22,
          "yards": 245,
          "td": 3,
          "int": 1,
          "scked": 2
        }
      }
    ],
    "defense": [
      {
        "name": "Mike Johnson",
        "stats": {
          "tak": 8,
          "tfl": 2,
          "sck": 1,
          "saf": 0,
          "swat": 3,
          "int": 1,
          "pbu": 2,
          "td": 0
        }
      }
    ],
    "rushing": [
      {
        "name": "Tom Davis",
        "stats": {
          "att": 12,
          "yards": 85,
          "td": 1
        }
      }
    ],
    "receiving": [
      {
        "name": "Chris Brown",
        "stats": {
          "rec": 7,
          "yards": 125,
          "td": 2
        }
      }
    ]
  },
  "away_stats": {
    // Same structure as home_stats
  }
}
```

**Response:**
```json
{
  "id": "unique-game-id",
  "week": 1,
  "home_team": "Eagles",
  "away_team": "Hawks",
  "home_score": 28,
  "away_score": 21,
  // ... other fields
  "timestamp": "2025-01-15T12:00:00Z"
}
```

#### 2. Get All Games
**GET** `/games`

Returns all games in the database.

#### 3. Get Games by Week
**GET** `/games/week/{week}`

Returns all games for a specific week.

**Example:** `/games/week/1`

#### 4. Get Available Weeks
**GET** `/weeks`

Returns a list of all weeks with recorded games.

**Response:**
```json
{
  "weeks": [3, 2, 1]
}
```

---

## Roblox Integration

### Step 1: Enable HTTP Requests
In your Roblox game settings:
1. Go to **Game Settings** → **Security**
2. Enable **Allow HTTP Requests**

### Step 2: Add the Script
Use the code from `/app/roblox_example.lua` as a reference.

### Key Points:
- Replace the `API_URL` with your actual endpoint
- Call `submitGameStats()` when your game ends
- Make sure to collect all player stats during gameplay
- Structure your data exactly as shown in the example

### Example Roblox Code:
```lua
local HttpService = game:GetService("HttpService")
local API_URL = "https://gameday-tracker-3.preview.emergentagent.com/api/game"

-- Build your gameData object
local gameData = {
    week = 1,
    home_team = "TeamName",
    away_team = "OpponentName",
    home_score = 28,
    away_score = 21,
    player_of_game = "PlayerName",
    game_date = "2025-01-15",
    home_stats = { --[[ your stats ]] },
    away_stats = { --[[ your stats ]] }
}

-- Submit to API
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
    
    return response.Success
end)

if success then
    print("Stats submitted successfully!")
end
```

---

## Discord Integration

### What Gets Posted to Discord:
1. **Embed Card** with:
   - Week number
   - Final score (HOME vs AWAY)
   - Player of the game
   - Game date
   - Color-coded (green for home win, red for away win)

2. **CSV File** containing:
   - Complete breakdown of all player stats
   - Organized by team and category
   - Downloadable for record-keeping

### Current Discord Webhook:
The webhook is already configured in the backend. When you submit stats via the API, it automatically posts to Discord.

### To Change Discord Webhook:
Edit `/app/backend/.env`:
```
DISCORD_WEBHOOK_URL="your-new-webhook-url"
```
Then restart backend: `sudo supervisorctl restart backend`

---

## Dashboard Usage

### Main Dashboard
- View total games played
- Browse by week
- See recent games
- Quick access to detailed stats

### Week View
- Detailed breakdown of each game in that week
- Expandable/collapsible game cards
- Complete player statistics for both teams
- Organized by category (Passing, Defense, Rushing, Receiving)

---

## Testing

### Test with cURL:
```bash
curl -X POST "https://gameday-tracker-3.preview.emergentagent.com/api/game" \\
-H "Content-Type: application/json" \\
-d '{
  "week": 1,
  "home_team": "Test Team 1",
  "away_team": "Test Team 2",
  "home_score": 10,
  "away_score": 7,
  "player_of_game": "Test Player",
  "game_date": "2025-01-15",
  "home_stats": {
    "passing": [],
    "defense": [],
    "rushing": [],
    "receiving": []
  },
  "away_stats": {
    "passing": [],
    "defense": [],
    "rushing": [],
    "receiving": []
  }
}'
```

### Expected Results:
1. API returns success response
2. Game appears on dashboard
3. Discord receives embed + CSV file
4. Stats are queryable by week

---

## Troubleshooting

### Roblox Can't Connect to API
- Ensure HTTP requests are enabled in game settings
- Check if the API URL is correct
- Verify your game data structure matches the expected format

### Stats Not Showing on Dashboard
- Check if the API returned a success response
- Verify week number is a valid integer
- Ensure team names and scores are provided

### Discord Not Receiving Messages
- Check backend logs: `tail -f /var/log/supervisor/backend.*.log`
- Verify Discord webhook URL is correct
- Ensure webhook hasn't been deleted from Discord

### Player Stats Missing
- Ensure all stat fields are included (even if value is 0)
- Check that player names are strings
- Verify stats are nested under "stats" key for each player

---

## Stats Field Reference

### Passing Stats
- `comp`: Completions
- `att`: Attempts
- `yards`: Passing Yards
- `td`: Touchdowns
- `int`: Interceptions
- `scked`: Times Sacked

### Defense Stats
- `tak` / `tkl`: Tackles
- `tfl`: Tackles for Loss
- `sck`: Sacks
- `saf`: Safeties
- `swat`: Pass Deflections/Swats
- `int`: Interceptions
- `pbu`: Pass Break-Ups
- `td`: Defensive Touchdowns

### Rushing Stats
- `att`: Attempts
- `yards`: Rushing Yards
- `td`: Touchdowns

### Receiving Stats
- `rec`: Receptions
- `yards`: Receiving Yards
- `td`: Touchdowns

---

## Support

For issues or questions:
1. Check backend logs for errors
2. Verify API endpoint is accessible
3. Test with cURL before implementing in Roblox
4. Ensure all required fields are included in your request

---

## Technical Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React
- **Database**: MongoDB
- **Styling**: Tailwind CSS + Custom Dark Theme
- **Fonts**: Space Grotesk (headings), Inter (body)
