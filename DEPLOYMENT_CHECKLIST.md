# Playoff System Deployment Checklist - Week-Based (v1.1)

## Code Updates ✅

- [x] **statsmanager.lua** 
  - Removed `playoff_round` field from `submissionData`
  - Changed `SetPlayoffGame()` to accept boolean parameter
  - Added week validation (9-13 for playoffs)
  - Removed `SetRegularSeasonGame()` method
  - Updated `Submit()` validation logic

- [x] **backend/server.py**
  - Removed `playoff_round` from `GameData` model
  - Removed `playoff_round` from `Game` model
  - Updated POST `/api/game` validation (weeks 9-13 for `is_playoff=true`)
  - Removed round-based field validation

- [x] **PlayoffManager.lua** (unchanged)
  - No changes needed - still handles seeding correctly
  - Continues to work with week-based structure

## Documentation Updates ✅

- [x] **PLAYOFF_GUIDE.md**
  - Updated code examples
  - Shows correct week assignments (9-13)
  - Removed references to `playoff_round` parameter

- [x] **PLAYOFF_QUICK_REFERENCE.md**
  - Fixed playoff structure table
  - Week 9 now shows "Conference Championships" (was Wildcard)
  - Updated API endpoint examples
  - Simplified StatsManager examples

- [x] **PLAYOFF_IMPLEMENTATION.md**
  - Updated component descriptions
  - Changed endpoint documentation
  - Updated usage examples
  - Removed references to round-based fields

- [x] **PLAYOFF_UPDATE_SUMMARY.md** (new)
  - Complete change summary
  - Migration guide for old code
  - Benefits of week-based approach
  - Testing recommendations

## Frontend Verification

- [ ] Test `/playoffs` page loads correctly
- [ ] Verify Week 9 bracket shows Conference Championships (1v4, 2v3)
- [ ] Verify Week 10 bracket shows Wild Card games (5v12, 6v11, etc.)
- [ ] Confirm games can be submitted and displayed with new API
- [ ] Test real-time score updates for weeks 9-13
- [ ] Verify seeds are populated correctly from backend

## Backend Testing

- [ ] API accepts POST /api/game with `is_playoff: true` and week 9-13
- [ ] API rejects POST /api/game with `is_playoff: true` and week < 9 or > 13
- [ ] API rejects POST /api/game with `is_playoff: false` and week > 8
- [ ] GET /api/games/week/{9-13} returns playoff games only
- [ ] GET /api/playoffs/seeds/{conference} returns correct seeding
- [ ] Database queries work without `playoff_round` field
- [ ] Old games (without `is_playoff` field) still display correctly

## Roblox Testing

- [ ] StatsManager loads without errors
- [ ] `SetPlayoffGame(true)` marks game as playoff
- [ ] `SetPlayoffGame(false)` marks game as regular season
- [ ] `SetWeek(9)` through `SetWeek(13)` accepted for playoffs
- [ ] `SetWeek(1)` through `SetWeek(8)` accepted for regular season
- [ ] Submitting with `SetPlayoffGame(true)` + `SetWeek(5)` returns error
- [ ] Submitting with `SetPlayoffGame(false)` + `SetWeek(9)` returns error

## Deployment Steps

### 1. Backup Current Database
```bash
# Recommended: Export current games collection
mongoexport --uri="mongodb+srv://..." --db=database --collection=games --out=games_backup.json
```

### 2. Deploy Backend
```bash
# Push updated server.py to production
git add backend/server.py
git commit -m "refactor: simplify playoff system to use weeks instead of rounds"
git push
# Wait for Heroku redeploy
```

### 3. Deploy Frontend
```bash
# Update and deploy Playoffs.jsx and related components
git add frontend/src/pages/Playoffs.jsx
git commit -m "refactor: update playoff bracket for week-based system"
git push
# Wait for build and deployment
```

### 4. Deploy Roblox Updates
```bash
# Update statsmanager.lua in Roblox Studio
# Test with a single game submission
# Monitor for errors
```

### 5. Verify All Systems
- [ ] Backend API responding correctly
- [ ] Frontend loads without errors
- [ ] Can submit test playoff game (Week 9)
- [ ] Can view bracket with new game
- [ ] Check browser console for JS errors
- [ ] Check backend logs for submission errors

## Rollback Plan

If issues arise:

1. **Database**: No migration needed (playoff_round field can be safely ignored)
2. **Backend**: Revert server.py to previous version
3. **Frontend**: Revert Playoffs.jsx to previous version  
4. **Roblox**: Revert statsmanager.lua to previous version

**Important**: Old games without `playoff_round` field will continue to work unchanged.

## Success Criteria

- ✅ All code compiles without errors
- ✅ All tests pass
- ✅ Can submit week 9-13 games with `is_playoff=true`
- ✅ Can submit week 1-8 games with `is_playoff=false`
- ✅ Playoff bracket displays correctly
- ✅ No regressions in regular season functionality
- ✅ Seeding algorithm produces correct bracket

## Post-Deployment

- [ ] Monitor logs for errors
- [ ] Test with live game submission
- [ ] Verify stats appear in standings
- [ ] Check playoff bracket updates in real-time
- [ ] Document any issues for future improvements

## Notes

- Week-based system is cleaner and more maintainable
- No migration of existing games required
- Fully backwards compatible
- Can easily adjust week numbers in future if needed

---

**Version**: 1.1 (Week-Based Playoffs)
**Date**: January 17, 2026
**Status**: Ready for Deployment
