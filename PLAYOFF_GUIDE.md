# UFF Playoff System Guide

## Overview

The UFF uses an 8-week regular season followed by a single-elimination playoff tournament. This guide explains the playoff structure, seeding system, and how to submit playoff games.

## Regular Season

**Weeks 1-8**: Teams play regular season games. Win-loss records and point differentials determine playoff seeding.

## Playoff Structure

### Seeding (After Week 8)

At the end of the regular season, teams are seeded based on their win-loss records:

#### Seeds 1-4: Division Champions
- Each division (North and South) within each conference has one champion
- Division champions are the teams with the best win percentage in their division
- These 4 teams are seeded 1-4 based on their conference win percentage
- **Advantage**: Get a first-round bye, starting in the Divisional Round

#### Seeds 5-12: Wild Card Teams
- The remaining teams with the best win percentages in the conference
- These 8 teams are seeded 5-12
- Must win the Wild Card Round to advance

### Playoff Rounds

#### Week 9: Conference Championships (Single Elimination)
- **Ridge Conference Championship**: Ridge #1 seed vs Ridge #2 seed
- **Grand Central Conference Championship**: Grand Central #1 seed vs Grand Central #2 seed
- **⚠️ MUST COMPLETE BEFORE WILD CARD ROUND**
- Determines playoff seeding and bracket structure
- **Format**: 2 games (one per conference)

**These games must be played and completed FIRST before Week 10 Wild Card games begin.**

**Winners advance to Week 11 Divisional Round**

#### Week 10: Wild Card Round (Single Elimination)
- **#5 seed** hosts **#12 seed** (better seed plays at home)
- **#6 seed** hosts **#11 seed**
- **#7 seed** hosts **#10 seed**
- **#8 seed** hosts **#9 seed** (or remaining wild card teams)

**Winners advance to Divisional Round**

#### Week 11: Divisional Round (Single Elimination)
- Conference Championship winners play Wild Card Round winners
- Better seeds play at home
- Typically 4 games per conference

**Winners advance to Semifinals**

#### Week 12: Semifinals / Conference Finals (Single Elimination)
- Two Divisional Round winners from each conference play each other
- Higher seed plays at home
- Winners are crowned **Conference Champions**

**Winners advance to the Championship Game**

#### Week 13: Championship Game
- **Grand Central Conference Champion** vs **Ridge Conference Champion**
- Determines the **UFF League Champion**
- Higher seed (from regular season) plays at home

## Submitting Playoff Games

### Using StatsManager (Roblox)

```lua
local StatsManager = require(game.ReplicatedStorage.StatsManager)

-- Enable stats
StatsManager:EnableStats()

-- Set basic game info
StatsManager:SetTeamInfo("Home", "Home Team Name")
StatsManager:SetTeamInfo("Away", "Away Team Name")
StatsManager:SetScore(24, "Home")
StatsManager:SetScore(21, "Away")
StatsManager:SetPlayerOfGame("PlayerName")

-- Set week (automatically detects playoff weeks 9-13)
StatsManager:SetWeek(9)  -- Conference Championships - automatically marked as playoff!
-- or Week 10 (Wildcard), 11 (Divisional), 12 (Semifinals), 13 (Championship)

-- Add player stats throughout the game
StatsManager:AddStatLine("Passing", userId, "Completions")
StatsManager:AddStatLine("Passing", userId, "Attempts")
StatsManager:AddStatLine("Passing", userId, "Yards", 250)
-- ... etc

-- Submit at end of game
StatsManager:Submit()
```

### Playoff Weeks

Just set the week number - the system automatically marks it as a playoff game!

- **Week 9**: Conference Championships (Ridge #1 vs #2, GC #1 vs #2) - **PLAY FIRST**
- **Week 10**: Wild Card Round (Seeds 5v12, 6v11, 7v10, 8v9) - **After Week 9 completes**
- **Week 11**: Divisional Round (Conf Champ winners vs WC winners)
- **Week 12**: Semifinals / Conference Finals
- **Week 13**: Championship Game

**⚠️ IMPORTANT**: Conference Championships (Week 9) must be completed before Wild Card games (Week 10) begin.

**Note**: Weeks 9-13 are automatically flagged as playoff games. Weeks 1-8 are automatically regular season.

### API Endpoints

#### Get Playoff Seeds for a Conference
```
GET /api/playoffs/seeds/{conference}
```

Example:
```
GET /api/playoffs/seeds/Grand Central
GET /api/playoffs/seeds/Ridge
```

Response:
```json
{
  "conference": "Grand Central",
  "seeds": {
    "1": { "team": "Team A", "wins": 8, "losses": 0, "win_pct": 1.0, "seed": 1, ... },
    "2": { "team": "Team B", "wins": 7, "losses": 1, "win_pct": 0.875, "seed": 2, ... },
    ...
  },
  "division_winners": [ ... ],
  "wildcards": [ ... ]
}
```

#### Get All Playoff Games
```
GET /api/playoffs/games
```

Returns all playoff games (all rounds).

#### Get Playoff Games by Round
```
GET /api/playoffs/games/{playoff_round}
```

Valid rounds:
- `wildcard`
- `divisional`
- `conference_championship`
- `championship`

Response:
```json
[
  {
    "week": 9,
    "home_team": "Team A",
    "away_team": "Team B",
    "home_score": 24,
    "away_score": 21,
    "player_of_game": "PlayerName",
    "is_playoff": true,
    "playoff_round": "wildcard",
    "game_date": "2025-01-20",
    "home_stats": { ... },
    "away_stats": { ... },
    ...
  }
]
```

## Frontend: Viewing the Playoff Bracket

The **Playoffs** page (`/playoffs`) displays:

1. **Division Champions Section**
   - Shows all 4 division champions with their division and record
   - Sorted by conference

2. **Playoff Bracket**
   - Organized by round (Wild Card → Divisional → Conference Championship → Championship)
   - Shows seeds 1-4 with first-round byes
   - Shows seeds 5-12 competing in Wild Card Round
   - Live score updates as games are played
   - Winner advancement in real-time

3. **Team Records**
   - Each team shows their regular season record (W-L)
   - Win percentage displayed for seeding context

## Key Rules

1. **Single Elimination**: One loss and you're out
2. **Seeding Advantage**: Higher seed (lower number) always plays at home
3. **Week Requirements**: Playoff games must be submitted with:
   - `is_playoff: true`
   - `playoff_round`: One of the 4 valid rounds
   - `week`: 9-12 (can extend if needed)

4. **Bye Weeks**: Seeds 1-4 don't play in Wild Card (Week 9)

## Example Bracket Flow

```
Regular Season (Weeks 1-8)
├─ Grand Central Champion: Team A (8-0)
├─ Ridge Champion: Team B (7-1)
├─ GC Runner-up: Team C (6-2)
├─ Ridge Runner-up: Team D (6-2)
├─ Other GC playoff teams: E, F, G, H (best remaining records)
└─ Other Ridge playoff teams: I, J, K, L (best remaining records)

Seeding:
├─ Seed #1: Team A (bye to Divisional)
├─ Seed #2: Team B (bye to Divisional)
├─ Seed #3: Team C (bye to Divisional)
├─ Seed #4: Team D (bye to Divisional)
├─ Seeds #5-12: Teams E through L (play Wild Card)

Wild Card Round (Week 9)
├─ #5 beats #12 → Seed #5 advances
├─ #6 beats #11 → Seed #6 advances
└─ #7 beats #10 → Seed #7 advances

Divisional Round (Week 10)
├─ #1 beats #7 → Seed #1 advances
├─ #2 beats #6 → Seed #2 advances
├─ #3 beats #5 → Seed #3 advances (or other results)
└─ #4 beats other → Seed #4 advances (or other results)

Conference Championships (Week 11)
├─ #1 beats #2 → Team A wins GC Championship
└─ #3 beats #4 → Team C wins Ridge Championship

Championship (Week 12)
└─ Team A beats Team C → Team A is UFF Champion!
```

## Testing the System

To test playoff functionality:

1. **Generate playoff seeds**:
   ```
   GET /api/playoffs/seeds/Grand Central
   GET /api/playoffs/seeds/Ridge
   ```

2. **Submit a playoff game**:
   - Use StatsManager in Roblox
   - Set `SetPlayoffGame("wildcard")`
   - Submit with `Submit()`

3. **Verify game appears in API**:
   ```
   GET /api/playoffs/games
   GET /api/playoffs/games/wildcard
   ```

4. **Check frontend bracket**:
   - Visit `/playoffs` page
   - Should see game results in Wild Card section

## Database Schema

Games are stored with these playoff-related fields:

```json
{
  "_id": ObjectId,
  "week": 9,
  "is_playoff": true,
  "playoff_round": "wildcard",
  "home_team": "Team A",
  "away_team": "Team B",
  "home_score": 24,
  "away_score": 21,
  "home_stats": { ... },
  "away_stats": { ... },
  "player_of_game": "PlayerName",
  "game_date": "2025-01-20",
  "timestamp": "2025-01-20T19:30:00Z"
}
```

## Troubleshooting

### "Invalid playoff_round" Error
- Check spelling: must be exactly `"wildcard"`, `"divisional"`, `"conference_championship"`, or `"championship"`
- Lua strings are case-sensitive

### Playoff games not appearing on frontend
- Check that `is_playoff: true` is set
- Verify `playoff_round` is one of the 4 valid values
- Check browser console for API errors

### Seeding looks wrong
- Seeds are calculated from Week 1-8 games only
- Only games with `is_playoff: false` (or null) count toward regular season seeding
- Clear any playoff games from weeks 1-8 if testing

### Week/Round mismatch
- Wild Card typically Week 9
- Divisional typically Week 10
- Conference Championship typically Week 11
- Championship typically Week 12
- You can use higher week numbers if needed

## Future Enhancements

Potential improvements to the playoff system:

1. **Multi-round seeding**: Support for different seeding scenarios based on league size
2. **Bracket editing**: Admin tools to modify brackets before playoff games start
3. **Tiebreaker rules**: Head-to-head, strength of schedule, etc.
4. **Playoff stats tracking**: Separate playoff statistics from regular season
5. **Historical brackets**: View previous years' playoff brackets
