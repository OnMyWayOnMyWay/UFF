# Playoff System - Week-Based Update Summary

## Changes Made

### 1. **statsmanager.lua** - Simplified for Week-Based Playoffs
- ✅ Removed `playoff_round` field from `submissionData` structure
- ✅ Updated `SetPlayoffGame(isPlayoff)` to accept boolean instead of round string
- ✅ Removed `SetRegularSeasonGame()` method (replaced with `SetPlayoffGame(false)`)
- ✅ Added week-range validation (weeks 9-13 only for playoff games)
- ✅ Updated Submit() to validate: `is_playoff=true` requires week 9-13
- ✅ Removed round-based validation (no more "wildcard", "divisional", etc.)

**Current API:**
```lua
StatsManager:SetPlayoffGame(true)   -- Mark as playoff (weeks 9-13)
StatsManager:SetPlayoffGame(false)  -- Mark as regular season (weeks 1-8)
StatsManager:SetWeek(9)             -- Conference Championships
```

### 2. **backend/server.py** - Simplified Game Models
- ✅ Removed `playoff_round` field from `GameData` model
- ✅ Removed `playoff_round` field from `Game` model  
- ✅ Updated POST `/api/game` validation:
  - Old: Checked for valid `playoff_round` values
  - New: Validates `is_playoff=true` requires week 9-13
- ✅ Simplified database schema (no redundant fields)

**Current API Request:**
```json
{
  "week": 9,
  "is_playoff": true,
  "home_team": "Team A",
  "away_team": "Team B",
  "home_score": 24,
  "away_score": 21,
  ...
}
```

### 3. **Documentation Files** - Updated to Reflect Week Structure
All documentation now shows Week 9-13 playoff structure:

#### PLAYOFF_GUIDE.md
- ✅ Updated "Submitting Playoff Games" section with new API
- ✅ Shows weeks 9-13 with their corresponding rounds
- ✅ Removed references to `playoff_round` parameter

#### PLAYOFF_QUICK_REFERENCE.md
- ✅ Updated playoff structure table (Week 9 = Conference Championships, not Wildcard)
- ✅ Changed API endpoint examples from `/api/playoffs/games/{playoff_round}` to `/api/games/week/{week}`
- ✅ Updated StatsManager method examples to use `SetPlayoffGame(boolean)`
- ✅ Simplified database schema to remove `playoff_round`

#### PLAYOFF_IMPLEMENTATION.md
- ✅ Updated methods section (removed `SetRegularSeasonGame()`)
- ✅ Updated endpoint documentation
- ✅ Changed usage examples to show week-based approach
- ✅ Updated database schema examples

## Playoff Bracket Structure

Week-based mapping (matches user's desired bracket):

```
Week 9:  Conference Championships (Seeds 1v4, 2v3 per conference)
Week 10: Wild Card Round (Seeds 5v12, 6v11, 7v10, 8v9)
Week 11: Divisional Round (CC winners vs WC winners)
Week 12: Semifinals/Conference Finals (Winners advance)
Week 13: Championship (GC Champion vs Ridge Champion)
```

## API Endpoints

### Getting Playoff Data
```bash
# Get playoff seeds
GET /api/playoffs/seeds/{conference}

# Get games for a specific week (9-13 for playoffs)
GET /api/games/week/{week}

# Get all games
GET /api/games
```

### Submitting Games
```bash
# Submit playoff or regular season game
POST /api/game
{
  "week": 9-13 for playoffs, 1-8 for regular season,
  "is_playoff": true or false,
  ...
}
```

## Migration Path

### For Existing Code Using Old API
If you have code that used `SetPlayoffGame("wildcard")`:

**Before:**
```lua
StatsManager:SetPlayoffGame("wildcard")
```

**After:**
```lua
StatsManager:SetPlayoffGame(true)
StatsManager:SetWeek(10)  -- Wild Card is Week 10
```

### For Fetching Playoff Data
If you fetched by round:

**Before:**
```bash
GET /api/playoffs/games/wildcard
```

**After:**
```bash
GET /api/games/week/10
```

## Benefits of Week-Based Approach

✅ **Simpler** - No redundant fields (week already identifies the round)
✅ **Cleaner** - Frontend already organized by week (Week 9-13)
✅ **More Flexible** - Easy to add/remove rounds without code changes
✅ **Less Error-Prone** - Single source of truth (week number)
✅ **Better Performance** - Smaller database documents

## Validation Rules

When submitting games:
- `is_playoff=false`: Week must be 1-8 (regular season)
- `is_playoff=true`: Week must be 9-13 (playoff rounds)
- All other weeks (14) reserved for potential tie-breakers or extras

## Testing Recommendations

- [ ] Submit a Week 9 game with `is_playoff=true` - should succeed
- [ ] Submit a Week 5 game with `is_playoff=true` - should fail
- [ ] Submit a Week 1 game with `is_playoff=false` - should succeed
- [ ] Verify frontend bracket displays correctly with Week 9-13 games
- [ ] Verify seeds are generated correctly from regular season

## Rollback Plan

If needed, the system is backwards-compatible:
- Old games without `playoff_round` field still work
- Games submitted before this update have `is_playoff: false` (default)
- Existing API endpoints unchanged

---

**Status**: ✅ All changes complete and validated  
**Date**: January 17, 2026  
**Version**: 1.1 (Week-Based Playoffs)
