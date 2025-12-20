# Roblox Flag Football Stats Platform 🏈

A professional ESPN-style statistics platform for Roblox flag football games. Automatically tracks player stats, organizes by week, and posts results to Discord with CSV files.

![Dashboard](https://img.shields.io/badge/Status-Live-brightgreen)
![API](https://img.shields.io/badge/API-Active-blue)
![Discord](https://img.shields.io/badge/Discord-Integrated-7289DA)

## 🎯 Features

- **📊 ESPN-Style Dashboard**: Professional dark theme with modern UI
- **📡 Public API**: HTTPS endpoint for Roblox to submit game stats
- **📅 Week Organization**: Automatic organization by week number
- **💬 Discord Integration**: Auto-post results with embed cards + CSV files
- **📈 Detailed Stats**: Passing, Defense, Rushing, Receiving categories
- **🏆 Player Highlights**: Player of the Game feature
- **📱 Responsive Design**: Works on desktop and mobile

## 🚀 Quick Start

### For Roblox Developers

1. Enable HTTP requests in your game settings
2. Copy the code from `/app/roblox_example.lua`
3. Update the API endpoint URL
4. Submit stats when your game ends

**API Endpoint:**
```
POST https://uff-backend.herokuapp.com/api/game
```

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for complete documentation.

## 📋 Stats Tracked

### Passing Stats
- Completions, Attempts, Yards, TDs, Interceptions, Sacked

### Defense Stats
- Tackles, TFL, Sacks, Safeties, Swats, Interceptions, PBU, TDs

### Rushing Stats
- Attempts, Yards, Touchdowns

### Receiving Stats
- Receptions, Yards, Touchdowns

## 🖥️ Dashboard Views

### Main Dashboard
- Total games played
- Weeks completed
- Browse by week
- Recent games feed
- Quick stats overview

### Week Detail View
- Complete game breakdown
- Player statistics tables
- Team-by-team analysis
- Expandable game cards

## 🔗 Live URLs

- **Frontend**: https://uff-frontend.herokuapp.com
- **API Base**: https://uff-backend.herokuapp.com/api

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/game` | Submit game stats from Roblox |
| GET | `/api/games` | Get all games |
| GET | `/api/games/week/{week}` | Get games for specific week |
| GET | `/api/weeks` | Get list of available weeks |

## 💬 Discord Integration

Automatically posts to Discord when stats are submitted:
- Embed card with final score and player of the game
- CSV file with complete stat breakdown
- Color-coded results (green for home win, red for away win)

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS
- **Database**: MongoDB
- **Fonts**: Space Grotesk + Inter
- **Theme**: Custom Dark Design

## 📚 Documentation

- [Complete Integration Guide](INTEGRATION_GUIDE.md) - Full API docs and Roblox setup
- [Roblox Example Code](roblox_example.lua) - Ready-to-use Lua script

## 🧪 Testing

Test the API with cURL:
```bash
curl -X POST "https://uff-backend.herokuapp.com/api/game" \
  -H "Content-Type: application/json" \
  -d @test_data.json
```

## 📊 Current Stats

- ✅ 3 games recorded
- ✅ 3 weeks tracked
- ✅ Discord integration active
- ✅ All features operational

## 🎨 Design Highlights

- Modern dark theme inspired by ESPN
- Emerald accent colors
- Smooth animations and transitions
- Card-based layout
- Hover effects and micro-interactions
- Professional typography hierarchy

## 🔧 Local Development

### Backend
```bash
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd /app/frontend
yarn install
yarn start
```

## 📝 License

Built with ❤️ for the Roblox flag football community

---

**Need Help?** Check [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for detailed instructions and troubleshooting
