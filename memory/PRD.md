# UFF - United Football League

## Original Problem Statement
Build a feature-rich website for a fantasy football league named "UFF - United Football League" with:
- Dashboard, Loading Screen, Elite Players, Standings, Schedule, Playoffs, and Awards pages
- Comprehensive Admin Panel for league management
- Player and Team analytics with detailed stat definitions
- 10-team playoff format with Conference Championships, Wildcards, Divisionals, and United Flag Bowl
- MongoDB database integration
- Auto-fetch Roblox avatars for players

## Tech Stack
- **Frontend**: React, Tailwind CSS, Recharts, react-router-dom
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB (fully integrated)
- **UI Components**: shadcn/ui
- **External APIs**: Roblox API (user search, avatar fetching)

## Completed Features ✅

### MongoDB Integration (Jan 22, 2026)
- [x] Full MongoDB integration using Motor async driver
- [x] Auto-seeding database on startup with 12 teams, 16 players, 48 games
- [x] Playoff matchups with animation_state for advancement animations
- [x] All CRUD operations working with MongoDB

### Animated Playoffs Page (Jan 22, 2026)
- [x] 5-round bracket: Play-Ins → Wildcard → Divisional → Conference → Championship
- [x] Team cards with colors, seeds, records, and scores
- [x] Animation phases for staggered entrance effects
- [x] Winner highlighting with crown icons and glow effects
- [x] Confetti celebration for championship winner
- [x] Round badges (Week 9-13) and format legend

### Roblox Avatar Auto-Fetch (Jan 22, 2026)
- [x] Backend endpoint `/api/admin/player/{id}/fetch-avatar`
- [x] Auto-fetch from Roblox API by ID or username
- [x] "Fetch All Avatars" bulk action in Admin Panel
- [x] Individual avatar fetch button per player
- [x] Auto button in Edit Player modal

### Player System (Roblox Integration)
- [x] Players identified by Roblox username
- [x] Roblox user search API (`/api/roblox/search/{username}`)
- [x] Roblox avatar fetching API (`/api/roblox/avatar/{user_id}`)
- [x] Player image support via URL

### Stats Structure
Stats organized in 4 categories:
- **Passing**: Completions, Attempts, Yards, TDs, INTs, Rating, Completion %, AVG, Longest
- **Rushing**: Attempts, Yards, TDs, YPC, Fumbles, 20+ Yard Runs, Longest
- **Receiving**: Receptions, Yards, TDs, Drops, Longest
- **Defense**: Tackles, TFL, Sacks, Safeties, Swat, INTs, Pass Deflections, Defensive TDs

### Public Pages
- [x] **Dashboard** - League overview, top performers, recent games, trades, power rankings
- [x] **Standings** - Conference standings with playoff picture, league structure
- [x] **Schedule** - Weekly game schedule with scores and POG
- [x] **Playoffs** - Animated bracket with 5 rounds
- [x] **Elite Players** - Top players by position
- [x] **Player Stats** - Searchable player list
- [x] **Player Profile** - Detailed analysis with radar chart, fantasy chart
- [x] **Team Analysis** - Team overview with stats, H2H, roster
- [x] **Awards** - League MVP, OPOY, DPOY, ROY
- [x] **Trades** - Recent trade history
- [x] **Power Rankings** - Weekly team rankings
- [x] **Watchlist** - Personal player watchlist
- [x] **Stat Leaders** - Position leaders

### Admin Panel ✅
- [x] Admin authentication (X-Admin-Key header)
- [x] Dashboard overview with league stats
- [x] Player Management (CRUD, merge accounts, Roblox search, **avatar fetch**)
- [x] Team Management (edit conference, division, colors, logo, record)
- [x] Game Management (CRUD, clone, bulk delete, CSV export)
- [x] Trade Management
- [x] Playoff Management (update matchups, scores, winners)
- [x] Admin Management (add/delete admins)
- [x] Activity Log
- [x] Season Reset
- [x] Data Validation

## Key API Endpoints

### Public
- `GET /api/` - API info
- `GET /api/teams` - All teams
- `GET /api/teams/{id}` - Team details
- `GET /api/teams/{id}/analysis` - Team analysis
- `GET /api/teams/{id}/roster` - Team roster
- `GET /api/players` - All players (filters: position, team_id, elite_only, search)
- `GET /api/players/{id}` - Player details with weekly scores
- `GET /api/standings` - Conference standings
- `GET /api/schedule` - Game schedule (filter: ?week=N)
- `GET /api/playoffs` - Playoff bracket with animation_state
- `GET /api/dashboard` - Dashboard data
- `GET /api/power-rankings` - Power rankings
- `GET /api/trades` - Trade history
- `GET /api/awards` - League awards
- `GET /api/stat-leaders` - Position leaders

### Roblox
- `GET /api/roblox/user/{id}` - Get Roblox user info
- `GET /api/roblox/avatar/{id}` - Get avatar URL
- `GET /api/roblox/search/{username}` - Search by username

### Admin (X-Admin-Key header required)
- `GET /api/admin/stats` - League statistics
- `POST /api/admin/player` - Create player
- `PUT /api/admin/player/{id}` - Update player
- `PUT /api/admin/player/{id}/stats` - Update player stats
- `DELETE /api/admin/player/{id}` - Delete player
- `POST /api/admin/player/{id}/fetch-avatar` - Fetch Roblox avatar
- `POST /api/admin/player/merge` - Merge player accounts
- `PUT /api/admin/team/{id}` - Update team
- `PUT /api/admin/team/{id}/branding` - Update team branding
- `POST /api/admin/game` - Create game
- `PUT /api/admin/game/{id}` - Update game
- `DELETE /api/admin/game/{id}` - Delete game
- `POST /api/admin/game/bulk-delete` - Bulk delete games
- `POST /api/admin/game/clone` - Clone game
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
  "conference": "Ridge | Grand Central",
  "division": "East | West | North | South",
  "color": "#hex",
  "logo": "url | null",
  "wins": number,
  "losses": number,
  "points_for": number,
  "points_against": number,
  "seed": number,
  "playoff_status": "x | y | z"
}
```

### Player
```json
{
  "id": "string",
  "roblox_id": "string",
  "roblox_username": "string",
  "name": "string (alias for roblox_username)",
  "position": "QB | WR | RB | DEF | K",
  "team": "string",
  "team_id": "string",
  "is_elite": boolean,
  "image": "url | null",
  "games_played": number,
  "passing": {...},
  "rushing": {...},
  "receiving": {...},
  "defense": {...},
  "fantasy_points": number,
  "weekly_scores": [{"week": N, "points": N}]
}
```

### Playoff Matchup
```json
{
  "id": "string",
  "round": "Playins | Wildcard | Divisional | Conference | Championship",
  "matchup_name": "string",
  "team1_id": "string | null",
  "team2_id": "string | null",
  "team1_score": number,
  "team2_score": number,
  "winner_id": "string | null",
  "is_completed": boolean,
  "animation_state": "pending | advancing | completed"
}
```

## Backlog / Future Tasks

### P1 - High Priority
- [ ] Real-time score updates via WebSockets
- [ ] Player comparison tool
- [ ] Trade analyzer

### P2 - Medium Priority
- [ ] Backend refactoring (break down server.py into routers)
- [ ] User authentication for personalized watchlists
- [ ] Mobile app optimization

### P3 - Low Priority
- [ ] Dark/Light theme toggle
- [ ] Live game simulations
- [ ] Draft simulator

## Credentials
- **Admin Key**: `BacconIsCool1@`
- **Backend URL**: Check `REACT_APP_BACKEND_URL` in `/app/frontend/.env`

## Files Structure
```
/app/
├── backend/
│   ├── server.py          # FastAPI with MongoDB integration
│   └── .env               # MONGO_URL, DB_NAME, ADMIN_KEY
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Standings.jsx
│       │   ├── Playoffs.jsx      # NEW: Animated playoff bracket
│       │   ├── PlayerProfile.jsx
│       │   ├── TeamAnalysis.jsx
│       │   ├── AdminPanel.jsx    # Updated: Avatar fetch
│       │   └── ...
│       └── components/
│           └── Navigation.jsx
├── tests/
│   └── test_uff_api.py    # 35 API tests
└── memory/
    └── PRD.md
```

## Test Results (Jan 22, 2026)
- **Backend**: 35/35 tests pass (100%)
- **Frontend**: All pages verified working
- See `/app/test_reports/iteration_1.json` for details
