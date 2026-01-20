# UFF - United Football League

## Original Problem Statement
Build a feature-rich website for a fantasy football league named "UFF - United Football League" with:
- Dashboard, Loading Screen, Elite Players, Standings, Schedule, Playoffs, and Awards pages
- Comprehensive Admin Panel for league management
- Player and Team analytics with detailed stat definitions
- 10-team playoff format with Conference Championships, Wildcards, Divisionals, and United Flag Bowl

## Tech Stack
- **Frontend**: React, Tailwind CSS, Recharts, react-router-dom
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (currently using mock data)
- **UI Components**: shadcn/ui

## Core Features

### Completed Features ✅

#### Public Pages
- [x] **Dashboard** - League overview, top performers, recent games, trades, power rankings
- [x] **Standings** - Conference standings with playoff picture, league structure, stats legend
- [x] **Schedule** - Weekly game schedule with scores and player of game
- [x] **Playoffs** - Bracket view with Conference Championships, Wildcards, Divisionals, Finals
- [x] **Elite Players** - Top players by position with stats
- [x] **Player Stats** - Searchable player list with filtering
- [x] **Player Profile** - Detailed player analysis with radar chart, fantasy points chart, game log
- [x] **Team Analysis** - Team overview with season stats, H2H records, roster, strengths/weaknesses
- [x] **Awards** - League MVP, Offensive Player of Year
- [x] **Trades** - Recent trade history
- [x] **Power Rankings** - Weekly team rankings with analysis
- [x] **Watchlist** - Personal player watchlist
- [x] **Stat Leaders** - Passing, rushing, receiving, fantasy points leaders

#### Admin Panel ✅
- [x] Admin authentication (X-Admin-Key header)
- [x] Dashboard overview with league stats
- [x] Player Management (create, edit, delete, merge accounts, Roblox search)
- [x] Team Management (edit conference, division, colors, record)
- [x] Game Management (create, edit, delete, clone, bulk delete, export CSV)
- [x] Trade Management (create, view history)
- [x] Playoff Management (update matchups, scores, winners)
- [x] Admin Management (add/delete admins with roles)
- [x] Player Analytics by position
- [x] Activity Log (track admin actions)
- [x] Season Reset functionality
- [x] Data Validation

### Improvements Made (Jan 20, 2026)

#### Admin Panel Enhancements
- Added proper **Edit Team Modal** with: name, conference, division, wins/losses, color picker, **logo URL** field
- Added proper **Edit Game Modal** with: home/away scores, player of game, POG stats, completed checkbox
- Added proper **Edit Player Modal** with: name, position, team, **player image URL**, Roblox ID/username, elite checkbox
- Replaced all browser `prompt()` dialogs with proper modal components
- Added logo column to Teams table showing which teams have logos
- Added image preview in edit modals

#### Standings Page
- Added **Playoff Picture** showing Top 5 per Conference (Grand Central & Ridge)
- Added **Quick Stats** panel (Total Teams, Playoff Teams, Conferences, Leading Team, Best Record)
- Added **League Structure** showing divisions and team assignments
- Improved standings table with clickable team names linking to team analysis
- Added proper playoff indicator badges (x, y, z)
- Added comprehensive **Legend** section

#### Player Profile Page
- Added **Performance Profile** radar chart (position-specific stats visualization)
- Added **Fantasy Points by Game** bar chart
- Added detailed **Stat Cards** by position (Passing, Rushing, Receiving, Defense)
- Improved **Game Log** table with weekly breakdown by position

#### Team Analysis Page
- Added team logo with Conference/Division display
- Added **Win Rate %** and record display
- Added **Quick Stats** (Total Games, AVG Points, Total TDs, Roster count)
- Added **Season Statistics** (Passing/Rushing/Receiving Yards, Total Tackles)
- Added **Head-to-Head Records** bar chart
- Added **Roster** section showing team players with links to profiles
- Improved team analysis with strengths, weaknesses, and playoff outlook

## Key API Endpoints

### Public
- `GET /api/teams` - All teams
- `GET /api/teams/{team_id}/analysis` - Team analysis
- `GET /api/players` - All players with filters
- `GET /api/players/{player_id}` - Player details with weekly scores
- `GET /api/players/{player_id}/analysis` - Player analysis
- `GET /api/standings` - Conference standings with league structure
- `GET /api/schedule` - Game schedule
- `GET /api/playoffs` - Playoff bracket
- `GET /api/dashboard` - Dashboard data

### Admin (requires X-Admin-Key header)
- `GET /api/admin/stats` - League statistics
- `POST /api/admin/player` - Create player
- `PUT /api/admin/player/{id}` - Update player
- `DELETE /api/admin/player/{id}` - Delete player
- `POST /api/admin/player/merge` - Merge player accounts
- `PUT /api/admin/team/{id}` - Update team
- `POST /api/admin/game` - Create game
- `POST /api/admin/game/bulk-delete` - Bulk delete games
- `GET /api/admin/games/export` - Export to CSV
- `POST /api/admin/trade` - Create trade
- `PUT /api/admin/playoff/{id}` - Update playoff matchup
- `POST /api/admin/season/reset` - Reset season

## Data Models

### Team
```json
{
  "id": "string",
  "name": "string",
  "abbreviation": "string",
  "conference": "Grand Central | Ridge",
  "division": "string",
  "color": "#hex",
  "wins": number,
  "losses": number,
  "points_for": number,
  "points_against": number,
  "seed": number | null,
  "playoff_status": "x | y | z | null"
}
```

### Player
```json
{
  "id": "string",
  "name": "string",
  "roblox_id": "string",
  "roblox_username": "string",
  "position": "QB | WR | RB | DEF | K",
  "team": "string",
  "team_id": "string",
  "is_elite": boolean,
  "stats": { position-specific stats }
}
```

## Backlog / Future Tasks

### P1 - High Priority
- [ ] Database Integration (MongoDB connection instead of mock data)
- [ ] Playoff Animations (teams advancing each week)

### P2 - Medium Priority
- [ ] Backend Refactoring (break down monolithic server.py)
- [ ] Roblox API Integration for player lookup
- [ ] Real-time score updates

### P3 - Low Priority
- [ ] User authentication for personalized watchlists
- [ ] Mobile app optimization
- [ ] Dark/Light theme toggle

## Credentials

- **Admin Key**: `BacconIsCool1@`
- **Backend URL**: `https://united-league.preview.emergentagent.com`

## Files Structure

```
/app/
├── backend/
│   └── server.py          # FastAPI with all routes and mock data
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Standings.jsx      # Updated with playoff picture
│       │   ├── PlayerProfile.jsx  # Updated with radar chart
│       │   ├── TeamAnalysis.jsx   # Updated with season stats
│       │   ├── AdminPanel.jsx     # Complete admin interface
│       │   └── ...
│       └── components/
│           └── Navigation.jsx
└── memory/
    └── PRD.md
```
