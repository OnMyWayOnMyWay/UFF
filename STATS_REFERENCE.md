# UFF Stats Reference Guide

## Stat Categories & Fields

This document shows the exact stat fields used across the entire system (Roblox → Backend → Frontend).

---

## 📊 Passing Stats

### Roblox (statsmanager.lua)
**Display Names**: Completions, Attempts, Yards, Touchdowns, Interceptions, Rating, Completion %, Average, Longest

**API Field Mapping**:
- `Comp` - Completions
- `Att` - Attempts
- `Yards` - Passing yards
- `TD` - Touchdowns
- `Int` - Interceptions
- `SCKED` - Times sacked

**Calculated Stats** (calculated in Roblox, recalculated on backend):
- `Rating` - NFL Passer Rating
- `Completion %` - Completion percentage (Comp/Att * 100)
- `Average` - Yards per attempt (Yards/Att)

### Backend API
**Accepted Fields**: `Comp`, `Att`, `Yards`, `TD`, `Int`, `SCKED`, `Rating` (optional)

**Note**: `Rating` is calculated in Roblox and submitted, but backend will recalculate for accuracy when aggregating multi-game stats.

**Calculated Fields** (added/recalculated by backend):
- `rating` - NFL Passer Rating (recalculated from raw stats)
- `completion_pct` - Completions / Attempts * 100
- `avg` - Yards / Attempts

---

## 🏃 Rushing Stats

### Roblox (statsmanager.lua)
**Display Names**: Attempts, Yards, Touchdowns, Yards Per Carry, Fumbles, 20+ Yards, Longest

**API Field Mapping**:
- `Att` - Rushing attempts
- `Yards` - Rushing yards
- `TD` - Touchdowns

**Calculated Stats**:
- `Yards Per Carry` - Yards / Attempts

### Backend API
**Accepted Fields**: `Att`, `Yards`, `TD`, `YPC` (optional)

**Note**: `YPC` (Yards Per Carry) is calculated in Roblox and submitted, but backend will recalculate for accuracy.

**Calculated Fields**:
- `ypc` - Yards per carry (recalculated from Yards / Att)

---

## 🎯 Receiving Stats

### Roblox (statsmanager.lua)
**Display Names**: Receptions, Yards, Touchdowns, Drops, Longest

**API Field Mapping**:
- `Rec` - Receptions
- `Yards` - Receiving yards
- `TD` - Touchdowns

### Backend API
**Accepted Fields**: `Rec`, `Yards`, `TD`

---

## 🛡️ Defense Stats

### Roblox (statsmanager.lua)
**Display Names**: Tackles, Tackles For Loss, Sacks, Safeties, swat, Interceptions, Pass Deflections, td

**API Field Mapping**:
- `TAK` - Tackles
- `TFL` - Tackles for loss
- `SCK` - Sacks
- `SAF` - Safeties
- `SWAT` - Swatted passes (deflections at line)
- `INT` - Interceptions
- `PBU` - Pass breakups (pass deflections in coverage)
- `TD` - Defensive touchdowns

### Backend API
**Accepted Fields**: `TAK`, `TFL`, `SCK`, `SAF`, `SWAT`, `INT`, `PBU`, `TD`

---

## 📤 API Submission Format

```json
{
  "week": 1,
  "home_team": "Team Name",
  "away_team": "Team Name",
  "home_score": 21,
  "away_score": 14,
  "player_of_game": "PlayerUsername",
  "game_date": "2025-12-27",
  "home_stats": {
    "PlayerUsername": {
      "Passing": {
        "Comp": 15,
        "Att": 25,
        "Yards": 250,
        "TD": 2,
        "Int": 1,
        "SCKED": 2,
        "Rating": 103.8
      },
      "Rushing": {
        "Att": 10,
        "Yards": 50,
        "TD": 1,
        "YPC": 5.0
      },
      "Receiving": {
        "Rec": 5,
        "Yards": 75,
        "TD": 1
      },
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
    // Same structure as home_stats
  }
}
```

---

## 🎮 Admin Panel Stat Editing

When editing stats through the admin panel, use these exact field names:

**Passing**: `Comp`, `Att`, `Yards`, `TD`, `Int`, `SCKED`, `Rating` (optional - will be recalculated)
**Rushing**: `Att`, `Yards`, `TD`, `YPC` (optional - will be recalculated)
**Receiving**: `Rec`, `Yards`, `TD`
**Defense**: `TAK`, `TFL`, `SCK`, `SAF`, `SWAT`, `INT`, `PBU`, `TD`

**Note**: Calculated stats (Rating, YPC) can be submitted but will be automatically recalculated by the backend when aggregating stats. Other calculated stats (Completion %, Average) are only calculated by the backend and never submitted.

---

## 🔄 Stat Flow

1. **Roblox Game** → Player performs actions
2. **statsmanager.lua** → Tracks stats and calculates derived stats
3. **API Submission** → Sends stats to backend using API field names
4. **Backend** → Stores stats and recalculates derived stats
5. **Frontend** → Displays stats with calculated values from backend

---

## 💡 Key Notes

- **Case Sensitivity**: API fields are case-sensitive (e.g., `Comp` not `comp`)
- **Calculated Stats**: Don't submit calculated stats from Roblox; backend will recalculate them
- **Required Fields**: `week`, `home_team`, `away_team`, `home_score`, `away_score`, `player_of_game` are required
- **Optional Fields**: `game_date` (auto-generated if not provided)
- **Player Names**: Use Roblox `player.Name` (username), not `DisplayName`

---

## 🐛 Troubleshooting

**Stats not appearing on website?**
- Check that field names match exactly (case-sensitive)
- Verify stats are using username not display name
- Check backend logs for validation errors

**Calculated stats wrong?**
- Backend recalculates using the same formulas as Roblox
- If there's a discrepancy, check the formula implementations

**Admin panel can't edit stats?**
- Ensure admin key is valid
- Use exact API field names (see reference above)
- Check browser console for error messages
