# Playoff System - Quick Reference

## Playoff Structure Summary

| Round | Week | Matchups | Format |
|-------|------|----------|--------|
| **Conference Championships** | 9 | #1v4 & #2v3 (each conference) | Single elimination |
| **Wild Card** | 10 | #5v12, #6v11, #7v10, #8v9 | Single elimination |
| **Divisional Round** | 11 | CC winners vs WC winners | Single elimination |
| **Semifinals/Conference Finals** | 12 | Winners advance | Single elimination |
| **Championship** | 13 | GC Champ vs Ridge Champ | Single elimination |

## Seeding Rules

```
Seeds 1-4: Division Champions (by win %)
- Each division (N/S) × 2 conferences = 4 seeds
- Ordered by conference win %

Seeds 5-12: Wild Card Teams
- Next best teams by conference win %
- Limited to teams that didn't win division
```

## API Endpoints Quick Reference

```bash
# Get seeds for a conference
GET /api/playoffs/seeds/{conference}
# conference = "Grand Central" or "Ridge"

# Get all playoff games
GET /api/playoffs/games

# Get playoff games by week
GET /api/games/week/{week}
# Use weeks 9-13 for playoffs

# Submit a playoff game (POST /api/game)
{
  "week": 9,
  "home_team": "Team Name",
  "away_team": "Team Name",
  "home_score": 24,
  "away_score": 21,
  "home_stats": { ... },
  "away_stats": { ... },
  "player_of_game": "PlayerName",
  "is_playoff": true
}
```

## StatsManager Playoff Methods

```lua
-- Just set the week - playoff detection is automatic!
StatsManager:SetWeek(9)   -- Conference Championships (auto-marked as playoff)
StatsManager:SetWeek(10)  -- Wild Card (auto-marked as playoff)
StatsManager:SetWeek(5)   -- Regular season (auto-marked as regular)

-- No need to call SetPlayoffGame() - it's automatic!
-- Weeks 9-13 = playoff, Weeks 1-8 = regular season

-- Submit as normal
StatsManager:Submit()
```

## Frontend Components

```jsx
// Playoffs.jsx displays:
- Division Champions (Week 9)
- Playoff bracket by week (9-13)
- Live score updates
- Team seeding and records
```

## Database Schema

```javascript
{
  week: Number,                           // 9-13 for playoffs
  home_team: String,
  away_team: String,
  home_score: Number,
  away_score: Number,
  player_of_game: String,
  is_playoff: Boolean,                    // true for playoffs
  home_stats: Object,
  away_stats: Object,
  game_date: String,                      // "YYYY-MM-DD"
  timestamp: Date
}
```

## Testing Checklist

- [ ] Playoff seeds generated correctly (8 teams per conference)
- [ ] Games submitted with weeks 9-13 for playoffs
- [ ] Frontend bracket displays correct round structure
- [ ] Seeds verified by win percentage and point differential
- [ ] Seeds 1-4 are division champions
- [ ] Seeds 5-12 ordered by win %
- [ ] Playoff games display on `/playoffs` page
- [ ] Game results show correct winner
- [ ] Bracket advances winners correctly
- [ ] Final championship shows both conference winners

## Common Issues

| Issue | Solution |
|-------|----------|
| Seeds not generating | Check weeks 1-8 games exist and `is_playoff: false` |
| Games not on bracket | Verify `is_playoff: true` and valid `playoff_round` |
| Wrong division champions | Check win % calculation includes only weeks 1-8 |
| Week validation error | Use weeks 1-14, not 0 or 15+ |
| Round spelling error | Use exact: "wildcard", "divisional", "conference_championship", "championship" |

## File Locations

- **Lua Module**: `/workspaces/UFF/PlayoffManager.lua`
- **Backend**: `/workspaces/UFF/backend/server.py` (routes added to api_router)
- **Frontend**: `/workspaces/UFF/frontend/src/pages/Playoffs.jsx`
- **Roblox Integration**: `/workspaces/UFF/statsmanager.lua`
- **Full Guide**: `/workspaces/UFF/PLAYOFF_GUIDE.md`

## Stats Model Updates

### GameData Model (Backend)
```python
class GameData(BaseModel):
    # ... existing fields ...
    is_playoff: Optional[bool] = False
    playoff_round: Optional[str] = None
```

### Game Model (Backend)
```python
class Game(BaseModel):
    # ... existing fields ...
    is_playoff: bool = False
    playoff_round: Optional[str] = None
```

### statsmanager submissionData (Lua)
```lua
local submissionData = {
    -- ... existing fields ...
    is_playoff = false,
    playoff_round = nil
}
```
