# Stats Displayed on Website

All stats from your Roblox statsmanager.lua are now fully displayed on the website.

## 📊 Passing Stats (from lines 42-45 of statsmanager.lua)
**Submitted from Roblox**: Completions, Attempts, Yards, Touchdowns, Interceptions, Rating

**Displayed on Website**:
- ✅ Completions (Comp)
- ✅ Attempts (Att)
- ✅ Yards
- ✅ Touchdowns (TD)
- ✅ Interceptions (Int)
- ✅ **Rating** (Passer Rating) - NFL formula
- ✅ Completion % (calculated)
- ✅ Times Sacked (SCKED)

**Where to see**:
- **Player Profile**: Shows comp/att (%), rating, TDs, INTs, sacked
- **Stats Leaders**: "Passing Yards" and "Passer Rating" tabs
- **Game Log**: Shows comp/att, yards, TD/INT, and rating per game

---

## 🏃 Rushing Stats
**Submitted from Roblox**: Attempts, Yards, Touchdowns, Yards Per Carry

**Displayed on Website**:
- ✅ Attempts (Att)
- ✅ Yards
- ✅ Touchdowns (TD)
- ✅ **Yards Per Carry (YPC)** - calculated

**Where to see**:
- **Player Profile**: Shows yards, TDs, attempts, YPC
- **Stats Leaders**: "Rushing Yards" and "Yards Per Carry" tabs
- **Game Log**: Shows yards, TDs, attempts, YPC per game

---

## 🎯 Receiving Stats
**Submitted from Roblox**: Receptions, Yards, Touchdowns

**Displayed on Website**:
- ✅ Receptions (Rec)
- ✅ Yards
- ✅ Touchdowns (TD)

**Where to see**:
- **Player Profile**: Shows receptions, yards, TDs
- **Stats Leaders**: "Receiving Yards" tab
- **Game Log**: Shows receptions, yards per game

---

## 🛡️ Defense Stats
**Submitted from Roblox**: Tackles, Tackles For Loss, Sacks, Safeties, swat, Interceptions, Pass Deflections, td

**Displayed on Website**:
- ✅ Tackles (TAK)
- ✅ **Tackles For Loss (TFL)**
- ✅ Sacks (SCK)
- ✅ **Safeties (SAF)**
- ✅ **Swats (SWAT)**
- ✅ Interceptions (INT)
- ✅ **Pass Deflections (PBU)**
- ✅ Touchdowns (TD)

**Where to see**:
- **Player Profile**: Shows all defensive stats (TAK, SCK, INT, TFL, SAF, SWAT, PBU, TD)
- **Stats Leaders**: "Tackles", "Tackles For Loss", "Sacks", "Interceptions" tabs
- **Game Log**: Shows tackles, sacks, TFL, INT, PBU per game

---

## 🏆 Fantasy Points
Calculated automatically from all stats using the formula:
- Passing TD: 4 pts
- Passing Yard: 0.04 pts
- Rushing/Receiving TD: 6 pts
- Rushing/Receiving Yard: 0.1 pts
- Reception: 1 pt
- Tackle: 0.5 pts
- TFL: 1 pt
- Sack: 1 pt
- Interception: 2 pts
- Defensive TD: 6 pts
- Interception Thrown: -2 pts

---

## 📍 Where Each Stat Appears

### Player Profile Page (`/player/{name}`)
- **Stat Cards**: Passing (with Rating), Rushing (with YPC), Receiving, Defense (with all stats)
- **Game Log Table**: Detailed per-game breakdown of all stats
- **Charts**: Performance radar and fantasy points by game

### Stats Leaders Page (`/stats/leaders`)
**Available Leaderboards**:
1. Fantasy Points
2. Passing Yards
3. **Passer Rating** (min 50 attempts)
4. Rushing Yards
5. **Yards Per Carry** (min 20 attempts)
6. Receiving Yards
7. Tackles
8. **Tackles For Loss**
9. Sacks
10. Interceptions

### Admin Panel
Can add/remove any of these stats for any player:
- Passing: `Comp`, `Att`, `Yards`, `TD`, `Int`, `SCKED`, `Rating`
- Rushing: `Att`, `Yards`, `TD`, `YPC`
- Receiving: `Rec`, `Yards`, `TD`
- Defense: `TAK`, `TFL`, `SCK`, `SAF`, `SWAT`, `INT`, `PBU`, `TD`

---

## ✨ Key Features

1. **Calculated Stats Shown**: Rating, YPC, Completion % are all displayed
2. **All Defensive Stats**: Every defensive stat from Roblox is shown
3. **Per-Game Breakdown**: Game log shows detailed stats for each game
4. **Leader Categories**: 10 different leaderboards including new ones for Rating, YPC, TFL
5. **Admin Editing**: Can manually edit or add any stat through admin panel

All stats from your Roblox game (lines 42-45 of statsmanager.lua) are now fully integrated and displayed!
