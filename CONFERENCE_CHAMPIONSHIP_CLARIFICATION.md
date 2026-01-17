# Conference Championship Clarification

## Updated Structure (Week 9)

The Conference Championships in **Week 9** are **within each conference**, not between conferences.

### Ridge Conference Championship
- **Matchup**: Ridge #1 seed vs Ridge #2 seed
- **Purpose**: Determine the top playoff seed from the Ridge Conference
- **Winner**: Advances to Divisional Round with higher seeding

### Grand Central Conference Championship
- **Matchup**: Grand Central #1 seed vs Grand Central #2 seed
- **Purpose**: Determine the top playoff seed from the Grand Central Conference
- **Winner**: Advances to Divisional Round with higher seeding

## Playoff Structure Overview

| Week | Round | Matchups | Teams | Timing |
|------|-------|----------|-------|--------|
| 9 | **Conference Championships** | Ridge: #1 vs #2<br>Grand Central: #1 vs #2 | 4 teams total (2 games) | **MUST PLAY FIRST** |
| 10 | **Wild Card Round** | #5v12, #6v11, #7v10, #8v9 | 8 teams (4 games) | After Week 9 completes |
| 11 | **Divisional Round** | Conf Champ winners vs WC winners | 8 teams (4 games) |
| 12 | **Semifinals** | Conference Finals | 4 teams (2 games) |
| 13 | **Championship** | Final game | 2 teams (1 game) |

## Key Points

1. **Conference Championships are NOT cross-conference**
   - ❌ NOT: #1 (any conf) vs #4 (any conf)
   - ❌ NOT: #2 (any conf) vs #3 (any conf)
   - ✅ YES: Ridge #1 vs Ridge #2
   - ✅ YES: Grand Central #1 vs Grand Central #2

2. **⚠️ CRITICAL TIMING**: Conference Championships MUST be played and completed BEFORE Wild Card games begin
   - Week 9 games must finish first
   - Results affect playoff bracket structure
   - Wild Card round cannot start until Conference Championships are complete

3. **Purpose**: Determine playoff seeding within each conference before moving to the Wild Card and Divisional rounds.

4. **Winner Advancement**: Winners from each Conference Championship advance to face Wild Card winners in the Divisional Round.

## Files Updated

- ✅ [PLAYOFF_IMPLEMENTATION.md](PLAYOFF_IMPLEMENTATION.md)
- ✅ [PLAYOFF_QUICK_REFERENCE.md](PLAYOFF_QUICK_REFERENCE.md)
- ✅ [START_HERE.md](START_HERE.md)
- ✅ [PLAYOFF_GUIDE.md](PLAYOFF_GUIDE.md)
- ✅ [PLAYOFF_VISUAL_GUIDE.md](PLAYOFF_VISUAL_GUIDE.md)
- ✅ [PlayoffManager.lua](PlayoffManager.lua)
- ✅ [frontend/src/pages/Playoffs.jsx](frontend/src/pages/Playoffs.jsx)

## Frontend Display

The Playoffs page now correctly shows:

```
Conference Championships - Week 9
┌─────────────────────────────────┐
│ Ridge Championship              │
│ Ridge #1 vs Ridge #2            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Grand Central Championship      │
│ GC #1 vs GC #2                  │
└─────────────────────────────────┘
```

## Implementation Notes

- Backend seeding API returns top 2 seeds per conference
- Frontend displays separate brackets for Ridge and Grand Central Conference Championships
- Winners advance to face Wild Card winners in Divisional Round
- All documentation has been updated to reflect this structure
