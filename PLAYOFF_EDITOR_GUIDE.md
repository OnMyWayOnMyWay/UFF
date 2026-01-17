# Playoff Editor - Admin Feature Guide

## Overview
The new **Playoffs Editor** in the Admin Panel provides a drag-and-drop interface for manually setting up playoff matchups.

## Features

### 🎯 Drag and Drop Interface
- **Seeded Teams Pool**: All playoff-eligible teams ranked by record and displayed with their seeds
- **Matchup Slots**: Drop zones for each playoff round where you can arrange matchups
- **Visual Feedback**: Smooth animations and color-coded states (dragging, filled, empty)

### 📅 Playoff Rounds
The editor supports all playoff rounds:

1. **Week 9 - Wildcard** (4 matchups)
2. **Week 10 - Divisional** (4 matchups)
3. **Week 11 - Conference Championships** (2 matchups)
4. **Week 12 - Championship** (1 matchup)

### 🎨 Visual Design
- **Amber/Gold Theme**: Matches playoff prestige with amber highlights
- **Seed Badges**: Gold gradient badges showing team rankings
- **Animated States**: Hover effects, drag states, and pulse animations for empty slots
- **Responsive Layout**: Two-column layout (seeds on left, matchups on right)

## How to Use

### Access the Editor
1. Open Admin Panel
2. Verify with your admin key
3. Click the **"Playoffs Editor"** tab (amber button with trophy icon)

### Create Matchups
1. **Drag a Team**: Click and hold a team from the "Playoff Seeds" panel
2. **Drop into Slot**: Drag over a matchup slot (Team 1 or Team 2 position)
3. **Release**: Drop the team when the slot glows amber
4. **Complete Matchup**: Add both teams to save the matchup automatically

### Modify Matchups
- **Remove Team**: Click the X button next to a team in a matchup slot
- **Replace Team**: Drag a new team over an existing one
- **Clear Matchup**: Click "X" in the matchup header to remove both teams
- **Clear All**: Click "Clear All" button to reset all playoff matchups

### Team Information Display
Each seed shows:
- **Seed Number**: Overall ranking (#1, #2, etc.)
- **Team Name**: Full team name
- **Record**: Wins-Losses
- **Conference**: Which conference they're from
- **Point Differential**: +/- scoring margin

## API Endpoints Used

### GET Endpoints
- `/api/playoffs/matchups` - Retrieve current matchups
- `/api/playoffs/seeds/Grand Central` - Get GC conference seeds
- `/api/playoffs/seeds/Ridge` - Get Ridge conference seeds

### POST Endpoints
- `/api/admin/playoffs/set-matchup` - Save individual matchup
  - Requires: week, matchup_id, team1, team2, round_name
  - Headers: admin-key

### DELETE Endpoints
- `/api/admin/playoffs/clear-matchups` - Remove all custom matchups

## Technical Details

### Files Modified
- `/frontend/src/components/AdminPanel.jsx` - Added playoff editor tab and logic
- `/frontend/src/styles/playoff-editor.css` - Custom drag-and-drop styling

### New Components
- **MatchupSlot**: Reusable drag-drop component for matchup creation
  - Props: week, matchupId, roundName, team1, team2, draggedTeam, onDrop, onClear

### State Management
- `playoffMatchups` - Current matchup configuration
- `playoffSeeds` - Ranked list of playoff teams
- `draggedTeam` - Currently dragged team (for visual feedback)

### Drag and Drop Implementation
- Native HTML5 drag and drop API
- No external libraries required
- Custom event handlers for dragStart, dragOver, dragLeave, dragEnd, drop

## Styling Features

### CSS Classes
- `.playoff-seed-item` - Team cards with hover and drag states
- `.matchup-slot` - Matchup container with transitions
- `.matchup-team-slot` - Individual team drop zones
- `.seed-badge` - Gold gradient seed number badges
- `.playoff-round-header` - Styled round section headers
- `.drag-over` - Amber glow effect when dragging over valid drop zone
- `.dragging` - Semi-transparent state for item being dragged
- `.empty-slot` - Subtle pulse animation for empty slots

### Animations
- `pulse-glow` - Pulsing glow on drag-over
- `slideIn` - Smooth entry for filled slots
- `subtle-pulse` - Breathing effect for empty slots

## Best Practices

1. **Seed Order**: Teams are auto-ranked by wins, then point differential
2. **Matchup Strategy**: Typically seed matchups as:
   - Wildcard: #5 vs #12, #6 vs #11, #7 vs #10, #8 vs #9
   - Adjust as needed for your league rules

3. **Save Frequently**: Each complete matchup (both teams) auto-saves
4. **Verify Games**: After setting matchups, verify games are created in the Schedule

## Troubleshooting

### Matchup Not Saving
- Ensure both teams are added (partial matchups don't save)
- Check admin key is valid
- Verify network connection

### Teams Not Loading
- Refresh the playoff data
- Check that regular season standings exist
- Verify at least 8 teams have played games

### Drag Not Working
- Ensure you click and hold on a team card
- Try refreshing the browser
- Check browser console for errors

## Future Enhancements
- Auto-suggest optimal matchups based on seeding
- Preview generated games before saving
- Copy previous year's bracket structure
- Export bracket as image
- Bulk import matchups from CSV/JSON

---

**Created**: January 2026
**Version**: 1.0
