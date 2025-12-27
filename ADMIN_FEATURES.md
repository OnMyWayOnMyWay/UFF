# Admin Panel Features

## Overview
The admin panel now includes comprehensive player management, admin management, and Roblox integration features.

## Features

### 1. **Edit Player Data**
- **Change Player Name**: Update a player's name across all games
- **Change Team**: Update a player's team affiliation across all games
- **Add Stats**: Add new stat categories or values to a player
- **Remove Stats**: Remove specific stats from a player
- **Delete Player**: Completely remove a player from all games

#### Example Usage:
1. Enter the current player name
2. Optionally enter a new name or team
3. Add stats by selecting category (passing/rushing/receiving/defense), stat key (e.g., "yards"), and value
4. Remove stats by selecting category and stat key
5. Click "Update Player" to apply changes or "Delete" to remove the player

### 2. **Roblox Integration**
- **Username Lookup**: Convert Roblox User IDs to usernames
- **Auto-detection**: Automatically detects if input is a username or User ID
- Returns username, display name, and User ID

#### Example Usage:
- Enter a Roblox User ID (e.g., `123456789`) or username
- Click "Lookup" to fetch player information from Roblox API
- Use the returned username when adding players to your system

### 3. **Admin Management** (Master Admin Only)
- **Add Admins**: Create new admin accounts with custom keys
- **Remove Admins**: Revoke admin access
- **List Admins**: View all current admin users

#### Example Usage:
1. Navigate to "Manage Admins" tab (only visible to master admin)
2. Enter username and admin key for new admin
3. Click "Add Admin"
4. View list of current admins below
5. Click trash icon to remove an admin

### 4. **Season Reset**
- Permanently delete all game data
- Requires confirmation
- Available to all admin users

## API Endpoints

### Player Management
- `PUT /api/admin/player/edit` - Edit player data
- `DELETE /api/admin/player/{player_name}` - Delete player

### Admin Management
- `POST /api/admin/add-admin` - Add new admin (master only)
- `DELETE /api/admin/remove-admin/{admin_key}` - Remove admin (master only)
- `GET /api/admin/list` - List all admins (master only)
- `GET /api/admin/verify` - Verify admin key

### Roblox Integration
- `GET /api/roblox/username/{user_id}` - Get Roblox username from User ID

### Season Management
- `POST /api/admin/reset-season` - Reset season data

## Authentication
All admin endpoints require an `admin-key` header:
```javascript
headers: {
  'admin-key': 'your-admin-key-here'
}
```

## Admin Levels
1. **Master Admin**: Has full access including admin management (uses `ADMIN_KEY` environment variable)
2. **Regular Admin**: Can edit players, reset season, and lookup Roblox users (stored in database)

## Setup
1. Set `ADMIN_KEY` in backend `.env` file for master admin
2. Master admin can then create additional admin accounts through the panel
3. MongoDB collection `admins` stores additional admin users

## Stat Categories
- **passing**: comp, att, yards, td, int, scked
- **rushing**: att, yards, td
- **receiving**: rec, yards, td
- **defense**: tak, tfl, sck, saf, swat, int, pbu, td
