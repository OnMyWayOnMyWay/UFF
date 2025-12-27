# Stat Calculation Reference

This document explains how stats are calculated and synchronized between Roblox and the backend.

## 🧮 Calculated Stats

### Passer Rating (NFL Formula)

**Used by**: Roblox (statsmanager.lua) and Backend (server.py)

```
A = ((Completions / Attempts - 0.3) × 5) clamped between 0 and 2.375
B = ((Yards / Attempts - 3) × 0.25) clamped between 0 and 2.375  
C = (Touchdowns / Attempts × 20) clamped between 0 and 2.375
D = (2.375 - (Interceptions / Attempts × 25)) clamped between 0 and 2.375

Rating = ((A + B + C + D) / 6) × 100
```

**Example**:
- 15 completions, 25 attempts, 250 yards, 2 TDs, 1 INT
- A = ((15/25 - 0.3) × 5) = ((0.6 - 0.3) × 5) = 1.5
- B = ((250/25 - 3) × 0.25) = ((10 - 3) × 0.25) = 1.75
- C = (2/25 × 20) = 1.6
- D = (2.375 - (1/25 × 25)) = (2.375 - 1.0) = 1.375
- Rating = ((1.5 + 1.75 + 1.6 + 1.375) / 6) × 100 = 103.8

### Completion Percentage

```
Completion % = (Completions / Attempts) × 100
```

**Precision**: 2 decimal places (e.g., 62.50%)

### Yards Per Attempt (Average)

```
Average = Yards / Attempts
```

**Precision**: 1 decimal place (e.g., 8.5)

### Yards Per Carry

```
YPC = Rushing Yards / Rushing Attempts
```

**Precision**: 2 decimal places (e.g., 4.25)

---

## 🔄 Stat Flow & Synchronization

### Roblox Game (statsmanager.lua)

1. **Track Stats**: When a play happens, stats are recorded
   ```lua
   StatsManager:AddStatLine("Passing", userId, "Yards", 15)
   StatsManager:AddStatLine("Passing", userId, "Completions", 1)
   ```

2. **Calculate Derived Stats**: Automatically calculated after each stat update
   - Passer Rating
   - Completion %
   - Yards Per Attempt
   - Yards Per Carry

3. **Sync to Submission Data**: Stats are formatted for API submission
   ```lua
   syncSubmissionData(category, userId)
   ```

4. **Submit to API**: At end of game
   ```lua
   StatsManager:Submit()
   ```

### Backend API (server.py)

1. **Receive Stats**: POST to `/api/game`
   - Validates required fields
   - Stores raw stats in MongoDB

2. **Aggregate Stats**: When viewing player profiles or leaderboards
   - Sums stats across all games
   - Recalculates derived stats:
     - `calculate_passer_rating()`
     - `calculate_completion_percentage()`
     - `calculate_yards_per_attempt()`
     - `calculate_yards_per_carry()`

3. **Return Enhanced Data**: API responses include calculated stats
   ```json
   {
     "passing": {
       "comp": 45,
       "att": 75,
       "yards": 650,
       "td": 6,
       "int": 2,
       "rating": 105.3,
       "completion_pct": 60.00,
       "avg": 8.7
     }
   }
   ```

### Frontend (React)

1. **Display Stats**: Shows both raw and calculated stats
2. **Leaderboards**: Sorts by various stat categories
3. **Player Profiles**: Shows career totals with calculated stats

---

## 🎯 Why Calculate Twice?

Stats are calculated both in Roblox and on the backend for these reasons:

1. **Roblox**: Shows live, in-game stats to players during the match
2. **Backend**: Recalculates for accuracy when aggregating multi-game stats
3. **Verification**: Ensures data integrity across systems
4. **Admin Edits**: When admins edit stats, backend recalculates derived stats

---

## 📊 Fantasy Points Formula

```python
# Passing
+0.04 per passing yard
+4 per passing TD
-2 per interception

# Rushing  
+0.1 per rushing yard
+6 per rushing TD

# Receiving
+1 per reception
+0.1 per receiving yard  
+6 per receiving TD

# Defense
+0.5 per tackle
+1 per tackle for loss
+1 per sack
+2 per interception
+2 per safety
+6 per defensive TD
+0.5 per pass breakup
```

---

## 🛠️ Admin Panel Stat Editing

When stats are edited through the admin panel:

1. **Update Stats**: Admin changes raw stat values (e.g., Yards, TD, Comp)
2. **Backend Recalculation**: Derived stats are automatically recalculated
3. **No Manual Calculation**: Admins don't edit Rating, Completion %, etc. directly

**Example Admin Edit**:
```
Change player "John123" passing stats:
- Comp: 15 → 16 (correcting missed stat)
- Yards: 250 → 265 (adding missed yards)

Backend automatically recalculates:
- Rating: 103.8 → 106.2
- Completion %: 60.00% → 64.00%
- Average: 10.0 → 10.6
```

---

## 🔍 Debugging Stats

If stats don't match between Roblox and website:

1. **Check Field Names**: Ensure API fields match exactly (case-sensitive)
2. **Verify Calculations**: Both systems use same formulas
3. **Check Aggregation**: Backend sums stats across multiple games
4. **Review Game Logs**: Check MongoDB for raw submitted data
5. **Test Calculations**: Use same input values in both systems

**Test Example**:
```
Input: 20 Comp, 30 Att, 300 Yards, 3 TD, 1 INT
Expected Rating: ~116.7
- Roblox should show 116.7
- Backend should calculate 116.7
- Frontend should display 116.7
```

