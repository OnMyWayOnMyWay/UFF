# Playoff System - Upgrade & Migration Guide

## Overview

This guide walks you through implementing the new playoff system in your existing UFF deployment.

## Pre-Deployment Checklist

- [ ] Backup your MongoDB database
- [ ] Verify all current games are in weeks 1-8
- [ ] Update Roblox game with new statsmanager.lua
- [ ] Update frontend with new Playoffs.jsx
- [ ] Deploy backend with new endpoints
- [ ] Run database validation

## Step 1: Backup Database

```bash
# Backup games collection
mongodump --uri="mongodb+srv://..." --out=backup_before_playoffs

# Backup to local file
mongoexport --uri="mongodb+srv://..." --collection=games --out=games_backup.json
```

## Step 2: Update Roblox Scripts

### Update statsmanager.lua

1. Open `statsmanager.lua` in your Roblox game
2. Replace with the updated version from the repo
3. **Key changes to test**:
   - `SetPlayoffGame("wildcard")` method exists
   - `SetRegularSeasonGame()` method exists
   - Submit validation accepts weeks 1-14

### Update ReplicatedStorage Setup

**No changes needed** - The script uses existing structure:
- StatSheet folder
- PlayerStatsTemplate folder

## Step 3: Update Backend (Python/FastAPI)

### 1. Update server.py

```bash
# Replace server.py with updated version
# Or manually add changes:
# 1. Update GameData model
# 2. Update Game model  
# 3. Add 3 new playoff endpoints
# 4. Update POST /game validation
```

### 2. Update requirements.txt (if needed)

Check that all dependencies are installed:
```
fastapi==0.104.1
pydantic==2.0+
motor==3.0+
```

### 3. Deploy to Heroku (if using)

```bash
# Commit changes
git add backend/server.py
git commit -m "Add playoff system support"

# Push to Heroku
git push heroku main

# Check logs
heroku logs --tail
```

## Step 4: Update Frontend (React)

### 1. Update Playoffs.jsx

Replace `frontend/src/pages/Playoffs.jsx` with updated version.

**Key changes**:
- `fetchData()` now calls separate playoff endpoints
- New data structure with conference-separated seeds
- Uses `playoff_round` instead of `week` for filtering

### 2. Rebuild Frontend

```bash
# In frontend directory
npm install
npm run build

# Or run development server
npm start
```

## Step 5: Database Validation

### Verify Existing Data

```javascript
// In MongoDB shell
db.games.updateMany(
  { is_playoff: { $exists: false } },
  { $set: { is_playoff: false, playoff_round: null } }
)

// Check regular season games
db.games.countDocuments({ week: { $gte: 1, $lte: 8 }, is_playoff: false })

// Should have 0 playoff games
db.games.countDocuments({ is_playoff: true })
```

### Clear Playoff Data (if re-testing)

```javascript
// DELETE ALL PLAYOFF GAMES (be careful!)
db.games.deleteMany({ is_playoff: true })

// Or just clear specific rounds
db.games.deleteMany({ playoff_round: "wildcard" })
```

## Step 6: Testing

### Test Seeding Endpoint

```bash
curl -X GET "http://localhost:8000/api/playoffs/seeds/Grand Central"
curl -X GET "http://localhost:8000/api/playoffs/seeds/Ridge"
```

Expected response:
```json
{
  "conference": "Grand Central",
  "seeds": {
    "1": { "team": "Team A", "wins": 8, "losses": 0, ... },
    ...
  },
  "division_winners": [...],
  "wildcards": [...]
}
```

### Test Playoff Game Submission

In Roblox:
```lua
local StatsManager = require(game.ReplicatedStorage.StatsManager)

StatsManager:EnableStats()
StatsManager:SetTeamInfo("Home", "Test Team 1")
StatsManager:SetTeamInfo("Away", "Test Team 2")
StatsManager:SetScore(24, "Home")
StatsManager:SetScore(21, "Away")
StatsManager:SetPlayerOfGame("TestPlayer")
StatsManager:SetWeek(9)
StatsManager:SetPlayoffGame("wildcard")

-- Add some stats
StatsManager:AddStatLine("Defense", Players:GetPlayers()[1].UserId, "Tackles")

-- Submit
local success, response = StatsManager:Submit()
print("Success:", success)
print("Response:", response)
```

### Test API Endpoints

```bash
# Get playoff games
curl -X GET "http://localhost:8000/api/playoffs/games"

# Get wildcard games
curl -X GET "http://localhost:8000/api/playoffs/games/wildcard"

# Get championship game
curl -X GET "http://localhost:8000/api/playoffs/games/championship"
```

### Test Frontend

1. Visit `/playoffs` page
2. Should see Division Champions section
3. Should see Division Champions with their records
4. If you submitted test games, should see bracket updates

## Step 7: Production Deployment

### Final Checklist

- [ ] All regular season games (weeks 1-8) present
- [ ] No week 9+ games exist (unless you want to preserve old data)
- [ ] Roblox scripts updated and tested
- [ ] Backend deployed and endpoints working
- [ ] Frontend built and deployed
- [ ] Database backup confirmed
- [ ] Tested seed generation (GET /api/playoffs/seeds)
- [ ] Tested game submission from Roblox
- [ ] Tested playoff games API
- [ ] Verified frontend bracket display

### Deployment Commands

```bash
# Backup current production
mongodump --uri="mongodb+srv://..." --archive=backup_prod_$(date +%s).archive

# Deploy backend
git push heroku main

# Deploy frontend (if using Vercel/Netlify)
vercel deploy --prod
# or
netlify deploy --prod

# Monitor for errors
heroku logs --tail
# or
vercel logs
```

## Rollback Plan

If you need to rollback:

### Restore from Backup

```bash
# List available backups
ls -la backup_*.archive

# Restore from specific backup
mongorestore --uri="mongodb+srv://..." --archive=backup_TIMESTAMP.archive
```

### Revert Code

```bash
# In your repo
git revert HEAD~1
git push heroku main

# Frontend
vercel rollback
```

## Known Issues & Solutions

### Issue: "Invalid week number"
**Solution**: Week must be 1-14. Check statsmanager.lua was updated.

### Issue: "Invalid playoff_round"
**Solution**: Round must be exact: "wildcard", "divisional", "conference_championship", "championship"

### Issue: Seeds not generating
**Solution**: 
- Ensure regular season games have `is_playoff: false` or null
- Only games in weeks 1-8 count toward seeding
- Each conference needs at least 4 teams for seeding to work

### Issue: Playoff games not appearing in API
**Solution**:
- Check `is_playoff: true` is set in submitted game
- Verify `playoff_round` is one of 4 valid values
- Check application logs for submission errors

### Issue: Frontend shows "No playoff seeds"
**Solution**:
- Check browser console for API errors
- Verify `/api/playoffs/seeds/Grand Central` returns data
- Clear browser cache and reload

## Performance Considerations

### Database Indexes

The system performs well with standard indexes. If you have performance issues:

```javascript
// Add indexes for faster queries
db.games.createIndex({ "is_playoff": 1 })
db.games.createIndex({ "playoff_round": 1 })
db.games.createIndex({ "week": 1 })
db.games.createIndex({ "is_playoff": 1, "playoff_round": 1 })
```

### API Response Times

- Seeding queries scan weeks 1-8 only → Typically <100ms
- Playoff games queries filtered by round → Typically <50ms
- Consider caching seeds if called frequently

## Data Migration (Optional)

If you want to migrate old playoff data:

```javascript
// Ensure old playoff weeks have correct fields
db.games.updateMany(
  { week: { $gte: 9 } },
  { $set: { is_playoff: true } }
)

// Map week numbers to rounds if needed
db.games.updateMany(
  { week: 9 },
  { $set: { playoff_round: "wildcard" } }
)

db.games.updateMany(
  { week: 10 },
  { $set: { playoff_round: "divisional" } }
)

db.games.updateMany(
  { week: 11 },
  { $set: { playoff_round: "conference_championship" } }
)

db.games.updateMany(
  { week: 12 },
  { $set: { playoff_round: "championship" } }
)
```

## Support & Documentation

- **Full Guide**: See `PLAYOFF_GUIDE.md`
- **Quick Reference**: See `PLAYOFF_QUICK_REFERENCE.md`
- **Implementation Details**: See `PLAYOFF_IMPLEMENTATION.md`

## Post-Deployment Verification

After deployment, verify:

1. ✅ Regular season games (weeks 1-8) work as before
2. ✅ `/api/playoffs/seeds/{conference}` returns 12 teams per conference
3. ✅ Playoff games can be submitted with `is_playoff: true`
4. ✅ Playoff games appear in `/api/playoffs/games`
5. ✅ Frontend `/playoffs` page loads and displays bracket
6. ✅ Game scores update in real-time on bracket

## Timeline

Typical deployment timeline:

| Phase | Duration | Steps |
|-------|----------|-------|
| Backup | 5 min | Database backup, code backup |
| Testing | 15-30 min | Local/staging testing, API verification |
| Deployment | 10-20 min | Code deployment, frontend build |
| Verification | 10-15 min | End-to-end testing, monitoring |
| **Total** | **40-75 min** | |

## Troubleshooting Deployment

### Backend won't start
```bash
heroku logs --tail
# Check for import errors or syntax issues
```

### Frontend blank page
```bash
# Check browser console for API errors
# Verify API URL in .env or config
# Check CORS settings in backend
```

### No playoff data appearing
```bash
# 1. Verify games were submitted with is_playoff: true
db.games.find({ is_playoff: true }).count()

# 2. Check playoffs/seeds endpoint
curl -X GET "https://your-app.herokuapp.com/api/playoffs/seeds/Grand Central"

# 3. Check playoff games
curl -X GET "https://your-app.herokuapp.com/api/playoffs/games"
```

---

**Need Help?**

1. Check `PLAYOFF_GUIDE.md` for detailed information
2. Review application logs
3. Verify all components were updated
4. Test with fresh data first

**Happy Playoffs!** 🏆
