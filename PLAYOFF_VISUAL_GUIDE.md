# UFF Playoff Bracket - Visual Structure

## Regular Season Standings → Playoff Seeds

```
GRAND CENTRAL CONFERENCE              RIDGE CONFERENCE
├─ North Division                    ├─ North Division
│  ├─ Team A (8-0) ← Champion       │  ├─ Team I (7-1) ← Champion
│  ├─ Team B (7-1)                  │  ├─ Team J (6-2)
│  ├─ Team C (6-2)                  │  ├─ Team K (5-3)
│  └─ Team D (5-3)                  │  └─ Team L (4-4)
├─ South Division                    ├─ South Division
│  ├─ Team E (7-1) ← Champion       │  ├─ Team M (8-0) ← Champion
│  ├─ Team F (6-2)                  │  ├─ Team N (6-2)
│  ├─ Team G (5-3)                  │  ├─ Team O (5-3)
│  └─ Team H (4-4)                  │  └─ Team P (3-5)
└─ Other: Q, R, S, T                └─ Other: U, V, W, X

SEEDING (by win %):
1. Team A (GC) - 8-0 (1.000)
2. Team M (Ridge) - 8-0 (1.000)
3. Team E (GC) - 7-1 (0.875)
4. Team I (Ridge) - 7-1 (0.875)
5. Team B (GC) - 7-1 (0.875) - TIEBREAK: Points For
6. Team J (Ridge) - 6-2 (0.750)
...
12. [8th Best Team]
```

## Playoff Bracket Progression

```
WEEK 9: CONFERENCE CHAMPIONSHIPS (2 games) ⚠️ MUST COMPLETE FIRST
═════════════════════════════════════════════════════════════════

RIDGE CONFERENCE CHAMPIONSHIP
      Ridge #1 vs Ridge #2  ┐
              ↓              │
      RIDGE WINNER           ├─→ Advances to Divisional
                             │

GRAND CENTRAL CONFERENCE CHAMPIONSHIP
      GC #1 vs GC #2         ┐
              ↓              │
      GC WINNER              ├─→ Advances to Divisional
                             │

⚠️ THESE GAMES MUST COMPLETE BEFORE WEEK 10 WILD CARD BEGINS


WEEK 10: WILD CARD ROUND (4 games) - Played AFTER Week 9 completes
═════════════════════════════════════════════════════════════════

WEEK 10: WILD CARD ROUND (4 games)
═════════════════════════════════════════════════════════════════

      #5 vs #12  ┐
         ↓       │
      WINNER     │
    (or #5)      ├─→ To Divisional Round
                 │
      #6 vs #11  ┐
         ↓       │
      WINNER     │
    (or #6)      ┘

      #7 vs #10  ┐
         ↓       │
      WINNER     │
    (or #7)      ├─→ To Divisional Round
                 │
      #8 vs #9   ┐
         ↓       │
      WINNER     │
    (or #8)      ┘


WEEK 11: DIVISIONAL ROUND (4 games)
═════════════════════════════════════════════════════════════════

Ridge Winner ┐
             ├─→ vs WC Winner  ┐
WC Winner    ┘                 │
                               ├─→ To Semifinals
GC Winner    ┐                 │
             ├─→ vs WC Winner  ┐
WC Winner    ┘                 ┘


WEEK 12: SEMIFINALS / CONFERENCE FINALS (2 games)
═════════════════════════════════════════════════════════════════

[Divisional Winner #1]  ┐
                        ├─→ CONFERENCE CHAMPION  ┐
[Divisional Winner #2]  ┘                        │
                                                 │
[Divisional Winner #3]  ┐                        ├─→ To Championship
                        ├─→ CONFERENCE CHAMPION  │
[Divisional Winner #4]  ┘                        ┘


WEEK 13: CHAMPIONSHIP GAME (1 game)
═════════════════════════════════════════════════════════════════

    🏆 UFF LEAGUE CHAMPION 🏆

[Conference Champion] ──┐
                        ├─→ CHAMPIONSHIP WINNER = UFF CHAMPION
[Conference Champion] ──┘


```

## Seeding Advantage Flow

```
Seed #1 (Best Team)
├─ Round 1: BYE (bye week - doesn't play)
├─ Round 2: Plays worst wild card winner AT HOME
├─ Round 3: Plays conference finals winner AT HOME
└─ Round 4: Plays for championship (home TBD)

Seed #2
├─ Round 1: BYE
├─ Round 2: Plays 2nd-worst wild card winner AT HOME
├─ Round 3: Plays conference finals winner AT HOME
└─ Round 4: Plays for championship (home TBD)

Seed #5 (Best Wild Card)
├─ Round 1: Plays #12 AT HOME
├─ Round 2: If wins, plays #1 or #2 AWAY
├─ Round 3: If wins, plays conference finals AWAY
└─ Round 4: Can't reach (2+ games to win)

Seed #12 (Worst Team)
├─ Round 1: Plays #5 AWAY ← Hardest path
├─ Round 2: If wins, plays #1 or #2 AWAY
├─ Round 3: If wins, plays conference finals
└─ Round 4: Must win 4 games total to reach
```

## Example: Team Path to Championship

```
Team A (1 seed)
├─ Regular Season: 8-0 (1.000) - Ranked #1 overall
├─ Week 9: BYE (gets rest week)
├─ Week 10: Beats #7 Seed @ Home, 24-21
├─ Week 11: Beats #3 Seed @ Home, 17-14 (Conference Champ)
└─ Week 12: Beats Ridge Champion @ Home, 31-28 → UFF CHAMPION! 🏆

Team B (12 seed - Cinderella Story)
├─ Regular Season: 4-4 (0.500) - Barely made playoffs as WC
├─ Week 9: Upsets #5 @ Home (upset!), 20-17
├─ Week 10: Loses to #1 Seed AWAY, 10-24 → ELIMINATED ❌

Team C (5 seed - Best Wild Card)
├─ Regular Season: 6-2 (0.750) - Best non-champion
├─ Week 9: Beats #12 @ Home, 28-10
├─ Week 10: Loses to #2 Seed AWAY, 13-27 → ELIMINATED ❌

Team D (7 seed - Upset Artist)
├─ Regular Season: 5-3 (0.625)
├─ Week 9: Upsets #10 @ Home, 21-20 (upset!)
├─ Week 10: Upsets #4 @ Home, 24-17 (MAJOR upset!)
├─ Week 11: Loses #2 Seed AWAY, 14-21 → ELIMINATED ❌
```

## Conference Breakdown

```
GRAND CENTRAL (GC)
├─ North Division Champion: Team A
├─ South Division Champion: Team E
├─ Wildcard 1: Team B
├─ Wildcard 2: Team F
├─ Wildcard 3: Team C
├─ Wildcard 4: Team G
├─ Wildcard 5: Team D
└─ Wildcard 6: Team H

RIDGE
├─ North Division Champion: Team I
├─ South Division Champion: Team M
├─ Wildcard 1: Team J
├─ Wildcard 2: Team N
├─ Wildcard 3: Team K
├─ Wildcard 4: Team O
├─ Wildcard 5: Team L
└─ Wildcard 6: Team P
```

## Win-Loss Calculation

```
Regular Season: 8 Games Total
├─ Win Percentage = Wins / (Wins + Losses)
├─ Tiebreaker 1: Head-to-Head (if applicable)
├─ Tiebreaker 2: Points For / Points Against
└─ Tiebreaker 3: Strength of Schedule

Single Elimination Playoffs: Each loss = elimination
├─ Must win 4 games to win championship from wild card (WC → Div → CC → Champ)
├─ Must win 3 games from seed 1 (Div → CC → Champ)
└─ Must win 3 games from seed 5 (WC → Div → CC → Champ)
```

## Database Schema for Tracking

```
Regular Season Game:
{
  week: 5,
  home_team: "Team A",
  away_team: "Team B",
  home_score: 24,
  away_score: 21,
  is_playoff: false,
  playoff_round: null,
  game_date: "2025-01-15"
}

Playoff Game:
{
  week: 9,
  home_team: "Team E",          (Seed #5)
  away_team: "Team P",           (Seed #12)
  home_score: 24,
  away_score: 21,
  is_playoff: true,
  playoff_round: "wildcard",
  game_date: "2025-02-08"
}

Championship Game:
{
  week: 12,
  home_team: "Team A",           (GC Champion)
  away_team: "Team M",           (Ridge Champion)
  home_score: 31,
  away_score: 28,
  is_playoff: true,
  playoff_round: "championship",
  game_date: "2025-02-23"
}
```

## Timeline

```
REGULAR SEASON
└─ Weeks 1-8 (8 games per team)
   └─ Record determines seeding

PLAYOFF SEEDING
└─ After Week 8
   ├─ Division Champions = Seeds 1-4
   └─ Wildcard Teams = Seeds 5-12

WILD CARD ROUND
└─ Week 9
   └─ Seeds #5-12 play (4 games)

DIVISIONAL ROUND
└─ Week 10
   └─ Seeds #1-4 + 4 WC winners play (4 games)

CONFERENCE CHAMPIONSHIP
└─ Week 11
   └─ 2 divisional winners per conference play (2 games)

CHAMPIONSHIP GAME
└─ Week 12
   └─ Conference champions play (1 game)
   └─ CHAMPION CROWNED! 🏆
```

## Statistics

```
Regular Season Games Needed:
├─ Per Team: 8 games (against other conference/division teams)
├─ Grand Central: 4 teams × 8 = 32 games
├─ Ridge: 4 teams × 8 = 32 games
├─ Total: 32-64 games (depending on schedule)

Playoff Games:
├─ Wild Card: 4 games
├─ Divisional: 4 games
├─ Conference Championship: 2 games
├─ Championship: 1 game
├─ Total: 11 games

Total Season Games: 32-64 regular + 11 playoffs = 43-75 games

Teams Remaining After Each Round:
├─ After Regular Season: 8 teams
├─ After Wild Card: 8 teams (4 from each seed tier)
├─ After Divisional: 4 teams
├─ After Conference Championship: 2 teams
├─ After Championship: 1 CHAMPION! 🏆
```

---

## Quick Seed Lookup

```
Seed #1:  Division Champion (Best Record in Division)
Seed #2:  Division Champion (Best Record in Division)
Seed #3:  Division Champion (Best Record in Division)
Seed #4:  Division Champion (Best Record in Division)
Seed #5:  Best Wildcard
Seed #6:  2nd Best Wildcard
Seed #7:  3rd Best Wildcard
Seed #8:  4th Best Wildcard
Seed #9:  5th Best Wildcard
Seed #10: 6th Best Wildcard
Seed #11: 7th Best Wildcard
Seed #12: 8th Best Wildcard (Worst Playoff Team)
```

---

**Remember**: In single-elimination, you must **win** to advance, or you're **out**! 🏆
