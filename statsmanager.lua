--============================================================================--
--                            STATS MANAGER                                   --
--                    Player Statistics Tracking System                       --
--============================================================================--

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

--============================================================================--
--                            CONFIGURATION                                   --
--============================================================================--

local STAT_SHEET_ROOT = ReplicatedStorage:FindFirstChild("StatSheet")
local PLAYER_STAT_TEMPLATE = ReplicatedStorage:FindFirstChild("PlayerStatsTemplate")
-- API endpoint for stats submission
-- Update this URL to match your deployed backend URL
local API_URL = "https://uffstats-37e418b3f8e1.herokuapp.com/api/game"

-- Stat definitions by category
local STAT_DEFINITIONS = {
	Passing = {
		stats = {"Completions", "Attempts", "Yards", "Touchdowns", "Interceptions", "Rating", "Completion %", "Average", "Longest"},
		calculated = {"Rating", "Completion %", "Average"}
	},
	Rushing = {
		stats = {"Attempts", "Yards", "Touchdowns", "Yards Per Carry", "Fumbles", "20+ Yards", "Longest"},
		calculated = {"Yards Per Carry"}
	},
	Receiving = {
		stats = {"Receptions", "Yards", "Touchdowns", "Drops", "Longest"},
		calculated = {}
	},
	Defense = {
		stats = {"Tackles", "Tackles For Loss", "Sacks", "Safeties", "swat", "Interceptions", "Pass Deflections", "td"},
		calculated = {}
	}
}

-- Stats required for JSON submission (internal stat names)
local SUBMISSION_STATS = {
	passing = {"Completions", "Attempts", "Yards", "Touchdowns", "Interceptions", "Rating"},
	rushing = {"Attempts", "Yards", "Touchdowns", "Yards Per Carry"},
	receiving = {"Receptions", "Yards", "Touchdowns", "Drops"},
	defense = {"Tackles", "Tackles For Loss", "Sacks", "Safeties", "swat", "Interceptions", "Pass Deflections", "td"}
}

-- Mapping from internal stat names to API field names
local API_FIELD_MAPPING = {
	passing = {
		["Completions"] = "Comp",
		["Attempts"] = "Att",
		["Yards"] = "Yards",
		["Touchdowns"] = "TD",
		["Interceptions"] = "Int",
		["Rating"] = "Rating",
	},
	rushing = {
		["Attempts"] = "Att",
		["Yards"] = "Yards",
		["Touchdowns"] = "TD",
		["Yards Per Carry"] = "YPC"
	},
	receiving = {
		["Receptions"] = "Rec",
		["Yards"] = "Yards",
		["Touchdowns"] = "TD",
		["Drops"] = "Drops"
	},
	defense = {
		["Tackles"] = "TAK",
		["Tackles For Loss"] = "TFL",
		["Sacks"] = "SCK",
		["Safeties"] = "SAF",
		["swat"] = "SWAT",
		["Interceptions"] = "INT",
		["Pass Deflections"] = "PBU",
		["td"] = "TD"
	}
}

--============================================================================--
--                              MODULE                                        --
--============================================================================--

local StatsManager = {}

-- Stats tracking enabled/disabled flag
local statsEnabled = false

-- Submission data structure (new API format)
local submissionData = {
	week = 1,
	home_team = "Home",
	away_team = "Away",
	home_score = 0,
	away_score = 0,
	player_of_game = "",
	game_date = nil,  -- Optional: YYYY-MM-DD format, auto-generated if nil
	home_stats = {},  -- Format: {PlayerUsername: {Category: {Stat: Value}}}
	away_stats = {}   -- Format: {PlayerUsername: {Category: {Stat: Value}}}
}

--============================================================================--
--                          UTILITY FUNCTIONS                                 --
--============================================================================--

local function toPascalCase(str)
	return str:sub(1, 1):upper() .. str:sub(2):lower()
end

local function color3ToHex(color)
	if not color then return "" end
	return string.format("#%02X%02X%02X", 
		math.round(color.R * 255), 
		math.round(color.G * 255), 
		math.round(color.B * 255)
	)
end

local function getTeamData(teamKey)
	-- Returns the stats table for the team (home_stats or away_stats)
	if teamKey == "Home" then return submissionData.home_stats end
	if teamKey == "Away" then return submissionData.away_stats end
	return nil
end

local function getCategoryFolder(categoryName)
	if not STAT_SHEET_ROOT then return nil end
	return STAT_SHEET_ROOT:FindFirstChild(toPascalCase(categoryName))
end

local function getPlayerFolder(category, userId)
	local categoryFolder = getCategoryFolder(category)
	if not categoryFolder then return nil end
	return categoryFolder:FindFirstChild(tostring(userId))
end

local function getPlayerTeam(userId)
	-- First try to get team from stored value in any stat folder
	-- Check all categories to find a folder with team info
	for category, _ in pairs(SUBMISSION_STATS) do
		local folder = getPlayerFolder(category, userId)
		if folder then
			local teamValue = folder:FindFirstChild("Team")
			if teamValue and teamValue:IsA("StringValue") and teamValue.Value ~= "" then
				return teamValue.Value -- Returns "Home" or "Away"
			end
		end
	end

	-- Fallback to checking if player is currently in game
	local player = Players:GetPlayerByUserId(userId)
	if player and player.Team then
		-- Compare team name with stored team names
		local teamName = player.Team.Name
		return (teamName == submissionData.home_team) and "Home" or "Away"
	end

	-- Default to Away if we can't determine
	return "Away"
end

local function getStatValue(folder, statName)
	if not folder then return 0 end
	local stat = folder:FindFirstChild(statName)
	return (stat and stat:IsA("ValueBase")) and stat.Value or 0
end

local function setStatValue(folder, statName, value)
	if not folder then return false end
	local stat = folder:FindFirstChild(statName)
	if stat and stat:IsA("ValueBase") then
		stat.Value = value
		return true
	end
	return false
end

--============================================================================--
--                       TEMPLATE & FOLDER CREATION                           --
--============================================================================--

local function createPlayerFolder(userId, category)
	if not PLAYER_STAT_TEMPLATE or not PLAYER_STAT_TEMPLATE:IsA("Folder") then
		warn("[StatsManager] Missing PlayerStatsTemplate")
		return nil
	end

	local categoryName = toPascalCase(category)
	local categoryTemplate = PLAYER_STAT_TEMPLATE:FindFirstChild(categoryName)
	local categoryRoot = getCategoryFolder(category)

	if not categoryTemplate or not categoryRoot then
		warn("[StatsManager] Missing template or root for category:", categoryName)
		return nil
	end

	-- Create player folder
	local playerFolder = Instance.new("Folder")
	playerFolder.Name = tostring(userId)
	playerFolder.Parent = categoryRoot

	-- Clone stats from template (flattened structure)
	for _, statTemplate in ipairs(categoryTemplate:GetChildren()) do
		if statTemplate:IsA("ValueBase") then
			local stat = statTemplate:Clone()
			stat.Value = 0
			stat.Parent = playerFolder
		end
	end

	-- Store team information for this player
	local teamKey = getPlayerTeam(userId)
	local teamValue = Instance.new("StringValue")
	teamValue.Name = "Team"
	teamValue.Value = teamKey
	teamValue.Parent = playerFolder

	return playerFolder
end

local function ensurePlayerFolder(category, userId)
	local folder = getPlayerFolder(category, userId)
	if not folder then
		folder = createPlayerFolder(userId, category)
	else
		-- Update team info if player is in game (in case team changed)
		local teamKey = getPlayerTeam(userId)
		local teamValue = folder:FindFirstChild("Team")
		if teamValue and teamValue:IsA("StringValue") then
			teamValue.Value = teamKey
		elseif teamKey then
			-- Team value doesn't exist, create it
			teamValue = Instance.new("StringValue")
			teamValue.Name = "Team"
			teamValue.Value = teamKey
			teamValue.Parent = folder
		end
	end
	return folder
end

--============================================================================--
--                        CALCULATED STATS                                    --
--============================================================================--

local function calculatePassingStats(userId)
	local folder = getPlayerFolder("Passing", userId)
	if not folder then return end

	local attempts = getStatValue(folder, "Attempts")
	local completions = getStatValue(folder, "Completions")
	local yards = getStatValue(folder, "Yards")
	local touchdowns = getStatValue(folder, "Touchdowns")
	local interceptions = getStatValue(folder, "Interceptions")

	if attempts == 0 then
		setStatValue(folder, "Average", 0)
		setStatValue(folder, "Completion %", 0)
		setStatValue(folder, "Rating", 0)
		return
	end

	-- Completion Percentage (2 decimal places)
	local compPct = math.floor((completions / attempts) * 10000 + 0.5) / 100
	setStatValue(folder, "Completion %", compPct)

	-- Yards Per Attempt (1 decimal place)
	local average = math.floor((yards / attempts) * 10 + 0.5) / 10
	setStatValue(folder, "Average", average)

	-- NFL Passer Rating Formula
	local A = math.clamp(((completions / attempts) - 0.3) * 5, 0, 2.375)
	local B = math.clamp(((yards / attempts) - 3) * 0.25, 0, 2.375)
	local C = math.clamp((touchdowns / attempts) * 20, 0, 2.375)
	local D = math.clamp(2.375 - ((interceptions / attempts) * 25), 0, 2.375)
	local rating = math.floor(((A + B + C + D) / 6) * 1000 + 0.5) / 10

	setStatValue(folder, "Rating", rating)
end

local function calculateRushingStats(userId)
	local folder = getPlayerFolder("Rushing", userId)
	if not folder then return end

	local yards = getStatValue(folder, "Yards")
	local attempts = getStatValue(folder, "Attempts")

	local ypc = attempts > 0 and math.floor((yards / attempts) * 100 + 0.5) / 100 or 0
	setStatValue(folder, "Yards Per Carry", ypc)
end

local function updateCalculatedStats(category, userId)
	if category == "Passing" then
		calculatePassingStats(userId)
	elseif category == "Rushing" then
		calculateRushingStats(userId)
	end
end

--============================================================================--
--                       SUBMISSION DATA SYNC                                 --
--============================================================================--

-- Convert internal stat name to API field name
local function getAPIFieldName(category, internalStatName)
	local categoryKey = category:lower()
	local mapping = API_FIELD_MAPPING[categoryKey]
	if mapping then
		return mapping[internalStatName] or internalStatName
	end
	return internalStatName
end

-- Gather player stats for a specific category in API format
local function gatherPlayerStatsForAPI(userId, category)
	local folder = getPlayerFolder(category, userId)
	if not folder then return nil end

	local categoryKey = category:lower()
	local requiredStats = SUBMISSION_STATS[categoryKey]
	if not requiredStats then return nil end

	-- Build stats object with API field names
	local apiStats = {}

	for _, statName in ipairs(requiredStats) do
		-- Skip only these calculated stats that shouldn't be in API
		if statName == "Completion %" or statName == "Average" then
			-- These are calculated stats not in SUBMISSION_STATS, skip for API submission
		else
			-- Include all stats from SUBMISSION_STATS, including Rating and Yards Per Carry
			local apiFieldName = getAPIFieldName(category, statName)
			local value = getStatValue(folder, statName)
			apiStats[apiFieldName] = tonumber(value) or 0
		end
	end

	-- Ensure all required API fields are present
	if categoryKey == "passing" then
		-- SCKED is required for passing stats
		if not apiStats["SCKED"] then
			-- Check if SCKED exists in folder, otherwise default to 0
			local sckedValue = getStatValue(folder, "SCKED")
			apiStats["SCKED"] = tonumber(sckedValue) or 0
		end
	end

	return apiStats
end

local function syncSubmissionData(category, userId)
	local categoryKey = category:lower()
	if not SUBMISSION_STATS[categoryKey] then return end

	local teamKey = getPlayerTeam(userId)
	local teamStats = getTeamData(teamKey)
	if not teamStats then return end

	local apiStats = gatherPlayerStatsForAPI(userId, category)
	if not apiStats then return end

	-- Get player name (username)
	local player = Players:GetPlayerByUserId(userId)
	local playerName = player and (player.Name) or tostring(userId)  -- Use Name, not DisplayName for API

	-- Check if player already exists in team stats
	if not teamStats[playerName] then
		teamStats[playerName] = {}
	end

	-- Add/update category stats for this player
	local categoryName = category  -- "Passing", "Rushing", "Receiving", "Defense"
	teamStats[playerName][categoryName] = apiStats
end

--============================================================================--
--                          PUBLIC API                                        --
--============================================================================--

--- Get a player's stat folder for a category
function StatsManager:GetPlayerCategoryFolder(category, userId)
	return getPlayerFolder(category, userId)
end

--- Add to a stat value (increments by 1 or adds yards)
function StatsManager:AddStatLine(category, userId, statKey, value)
	-- Check if stats are enabled
	if not statsEnabled then
		return
	end

	local folder = ensurePlayerFolder(category, userId)
	if not folder then return end

	-- Update team info when adding stats (in case team changed)
	local teamKey = getPlayerTeam(userId)
	if teamKey then
		local teamValue = folder:FindFirstChild("Team")
		if teamValue and teamValue:IsA("StringValue") then
			teamValue.Value = teamKey
		else
			teamValue = Instance.new("StringValue")
			teamValue.Name = "Team"
			teamValue.Value = teamKey
			teamValue.Parent = folder
		end
	end

	local statInstance = folder:FindFirstChild(statKey)
	if not statInstance or not statInstance:IsA("ValueBase") then
		warn("[StatsManager] Stat '" .. statKey .. "' not found in folder for category '" .. category .. "', userId: " .. tostring(userId))
		return
	end

	-- Add yards or increment by 1
	if statKey == "Yards" and value then
		statInstance.Value += value
	else
		statInstance.Value += 1
	end

	updateCalculatedStats(category, userId)
	syncSubmissionData(category, userId)
end

--- Get a stat value
function StatsManager:GetStatValue(category, userId, statKey)
	local folder = getPlayerFolder(category, userId)
	return getStatValue(folder, statKey)
end

--- Get player's team (from stored value or current team)
function StatsManager:GetPlayerTeam(category, userId)
	local folder = getPlayerFolder(category, userId)
	if not folder then return nil end

	-- Check stored team value first
	local teamValue = folder:FindFirstChild("Team")
	if teamValue and teamValue:IsA("StringValue") and teamValue.Value ~= "" then
		return teamValue.Value
	end

	-- Fallback to current team if player is in game
	return getPlayerTeam(userId)
end

--- Set a stat value directly
function StatsManager:SetStatValue(category, userId, statKey, value)
	-- Check if stats are enabled
	if not statsEnabled then
		return
	end

	local folder = ensurePlayerFolder(category, userId)
	if not folder then return end

	-- Update team info when setting stats
	local teamKey = getPlayerTeam(userId)
	if teamKey then
		local teamValue = folder:FindFirstChild("Team")
		if teamValue and teamValue:IsA("StringValue") then
			teamValue.Value = teamKey
		else
			teamValue = Instance.new("StringValue")
			teamValue.Name = "Team"
			teamValue.Value = teamKey
			teamValue.Parent = folder
		end
	end

	if not setStatValue(folder, statKey, value) then return end

	updateCalculatedStats(category, userId)
	syncSubmissionData(category, userId)
end

--- Set team info for submission
function StatsManager:SetTeamInfo(team, name, color)
	if team == "Home" then
		submissionData.home_team = name 
	elseif team == "Away" then
		submissionData.away_team = name
	end
	-- Note: color is no longer used in new API
end

--- Set team score
function StatsManager:SetScore(score, team)
	if team == "Home" then
		submissionData.home_score = score
	elseif team == "Away" then
		submissionData.away_score = score
	end
end

--- Set week number
function StatsManager:SetWeek(weekNumber)
	submissionData.week = weekNumber
end

--- Set player of the game (required for submission)
function StatsManager:SetPlayerOfGame(playerName)
	submissionData.player_of_game = playerName or ""
end

--- Set game date (optional, format: "YYYY-MM-DD")
function StatsManager:SetGameDate(dateString)
	submissionData.game_date = dateString
end

--- Get current API URL (for debugging)
function StatsManager:GetAPIUrl()
	return API_URL
end

--- Enable stats tracking
function StatsManager:EnableStats()
	statsEnabled = true
	print("[StatsManager] Stats tracking enabled")
end

--- Disable stats tracking
function StatsManager:DisableStats()
	statsEnabled = false
	print("[StatsManager] Stats tracking disabled")
end

--- Check if stats are enabled
function StatsManager:IsStatsEnabled()
	return statsEnabled
end

--- Get all submission data
function StatsManager:GetData()
	return submissionData
end

--- Get all stats for a player across all categories
function StatsManager:GetAllPlayerStats(userId)
	local allStats = {
		UserId = userId,
		Name = nil,
		Passing = {},
		Rushing = {},
		Receiving = {},
		Defense = {}
	}

	local player = Players:GetPlayerByUserId(userId)
	allStats.Name = player and (player.DisplayName or player.Name) or tostring(userId)

	for categoryName, definition in pairs(STAT_DEFINITIONS) do
		local folder = getPlayerFolder(categoryName, userId)
		if folder then
			for _, statName in ipairs(definition.stats) do
				allStats[categoryName][statName] = getStatValue(folder, statName)
			end
		end
	end

	return allStats
end

--- Get leaderboard for a specific stat
function StatsManager:GetLeaderboard(category, statName, limit)
	limit = limit or 10
	local leaderboard = {}

	local categoryFolder = getCategoryFolder(category)
	if not categoryFolder then return leaderboard end

	for _, playerFolder in ipairs(categoryFolder:GetChildren()) do
		local userId = tonumber(playerFolder.Name)
		if userId then
			local value = getStatValue(playerFolder, statName)
			if value > 0 then
				local player = Players:GetPlayerByUserId(userId)
				table.insert(leaderboard, {
					UserId = userId,
					Name = player and (player.DisplayName or player.Name) or tostring(userId),
					Value = value
				})
			end
		end
	end

	-- Sort descending
	table.sort(leaderboard, function(a, b) return a.Value > b.Value end)

	-- Limit results
	if #leaderboard > limit then
		local trimmed = {}
		for i = 1, limit do
			trimmed[i] = leaderboard[i]
		end
		return trimmed
	end

	return leaderboard
end

--- Reset all stats
function StatsManager:Reset()
	-- Reset submission data (preserve week number)
	submissionData = {
		week = submissionData.week,
		home_team = "Home",
		away_team = "Away",
		home_score = 0,
		away_score = 0,
		player_of_game = "",
		game_date = nil,
		home_stats = {},
		away_stats = {}
	}

	-- Clear all player stat folders
	if not STAT_SHEET_ROOT then return end

	for _, categoryFolder in ipairs(STAT_SHEET_ROOT:GetChildren()) do
		if categoryFolder:IsA("Folder") then
			for _, playerFolder in ipairs(categoryFolder:GetChildren()) do
				if tonumber(playerFolder.Name) then
					playerFolder:Destroy()
				end
			end
		end
	end
end

--- Rebuild submission data from all stat folders
local function rebuildSubmissionData()
	-- Preserve team info, week, scores, and player_of_game (don't reset them)
	-- Only reset stats dictionaries
	submissionData.home_stats = {}
	submissionData.away_stats = {}

	-- Rebuild stats from all folders
	for category, _ in pairs(SUBMISSION_STATS) do
		local categoryFolder = getCategoryFolder(category)
		if categoryFolder then
			for _, playerFolder in ipairs(categoryFolder:GetChildren()) do
				local userId = tonumber(playerFolder.Name)
				if userId then
					syncSubmissionData(category, userId)
				end
			end
		end
	end

	-- Count players per team
	local homePlayerCount = 0
	for _ in pairs(submissionData.home_stats) do
		homePlayerCount = homePlayerCount + 1
	end
	local awayPlayerCount = 0
	for _ in pairs(submissionData.away_stats) do
		awayPlayerCount = awayPlayerCount + 1
	end

	print(string.format("[StatsManager] Rebuilt submission data - Home: %d players | Away: %d players",
		homePlayerCount, awayPlayerCount))
end

--- Submit stats to API
function StatsManager:Submit()
	-- Check if stats are enabled
	if not statsEnabled then
		warn("[StatsManager] Stats are currently disabled. Enable stats before submitting.")
		return false, "Stats are disabled"
	end

	-- Rebuild submission data from all stat folders before submitting
	rebuildSubmissionData()

	-- Validate submission data before encoding
	if not submissionData.week or submissionData.week < 1 then
		warn("[StatsManager] Invalid week number:", submissionData.week)
		return false, "Invalid week number"
	end

	-- Validate teams have names
	if not submissionData.home_team or submissionData.home_team == "" then
		warn("[StatsManager] Home team name is missing")
	end
	if not submissionData.away_team or submissionData.away_team == "" then
		warn("[StatsManager] Away team name is missing")
	end

	-- Validate player_of_game
	if not submissionData.player_of_game or submissionData.player_of_game == "" then
		warn("[StatsManager] Player of game is not set")
	end

	-- Count players per team
	local homePlayerCount = 0
	for _ in pairs(submissionData.home_stats) do
		homePlayerCount = homePlayerCount + 1
	end
	local awayPlayerCount = 0
	for _ in pairs(submissionData.away_stats) do
		awayPlayerCount = awayPlayerCount + 1
	end

	print(string.format("[StatsManager] Submitting stats - Week %d | Home: %s (%d players) | Away: %s (%d players)",
		submissionData.week, submissionData.home_team, homePlayerCount, submissionData.away_team, awayPlayerCount))

	-- Prepare data for submission (exclude game_date if nil)
	-- Ensure home_stats and away_stats are always dictionaries, not arrays
	-- Roblox JSONEncode treats empty tables as arrays, so we need to ensure they're dictionaries
	local homeStatsDict = {}
	for key, value in pairs(submissionData.home_stats) do
		homeStatsDict[key] = value
	end

	local awayStatsDict = {}
	for key, value in pairs(submissionData.away_stats) do
		awayStatsDict[key] = value
	end

	-- If empty, add a temporary key to force dictionary encoding, then remove it from JSON string
	-- This ensures empty tables are encoded as {} not []
	local hasHomeStats = next(homeStatsDict) ~= nil
	local hasAwayStats = next(awayStatsDict) ~= nil

	if not hasHomeStats then
		homeStatsDict["__empty__"] = true
	end
	if not hasAwayStats then
		awayStatsDict["__empty__"] = true
	end

	local dataToSubmit = {
		week = submissionData.week,
		home_team = submissionData.home_team,
		away_team = submissionData.away_team,
		home_score = submissionData.home_score,
		away_score = submissionData.away_score,
		player_of_game = submissionData.player_of_game,
		home_stats = homeStatsDict,
		away_stats = awayStatsDict
	}

	-- Only include game_date if it's set
	if submissionData.game_date then
		dataToSubmit.game_date = submissionData.game_date
	end

	local jsonData
	local encodeSuccess, encodeError = pcall(function()
		jsonData = HttpService:JSONEncode(dataToSubmit)

		-- Remove the temporary __empty__ keys from JSON string if they were added
		-- This ensures empty tables are encoded as {} not []
		if not hasHomeStats or not hasAwayStats then
			-- Remove "__empty__":true patterns (with various spacing)
			jsonData = jsonData:gsub('"%s*__empty__"%s*:%s*true%s*,?%s*', '')
			jsonData = jsonData:gsub(',%s*"%s*__empty__"%s*:%s*true', '')
			-- Clean up any double commas or trailing commas before closing braces
			jsonData = jsonData:gsub(',%s*,', ',')
			jsonData = jsonData:gsub(',%s*}', '}')
			jsonData = jsonData:gsub(',%s*]', ']')
		end
	end)

	if not encodeSuccess then
		warn("[StatsManager] Failed to encode JSON:", encodeError)
		return false, "JSON encoding failed: " .. tostring(encodeError)
	end

	-- Try submission with retries
	local maxRetries = 3
	local success, response

	for attempt = 1, maxRetries do
		success, response = pcall(function()
			return HttpService:RequestAsync({
				Url = API_URL,
				Method = "POST",
				Headers = {
					["Content-Type"] = "application/json"
				},
				Body = jsonData
			})
		end)

		-- Check response
		if success and response then
			-- Check status code
			if response.Success and response.StatusCode == 200 then
				print("[StatsManager] Stats submitted successfully!")
				if response.Body and #response.Body > 0 then
					local responseSample = string.sub(response.Body, 1, 500)
					print("[StatsManager] Response: " .. responseSample)
				end
				return true, response.Body
			else
				-- Non-200 status code
				local statusMsg = response.StatusMessage or "Unknown error"
				local statusCode = response.StatusCode or "?"
				warn("[StatsManager] HTTP " .. tostring(statusCode) .. ": " .. statusMsg)

				-- Special handling for 404 errors
				if statusCode == 404 then
					warn("[StatsManager] API endpoint not found (404). Please check:")
					warn("[StatsManager] 1. Is the backend deployed? Current URL: " .. API_URL)
					warn("[StatsManager] 2. Is the URL correct? Update API_URL in statsmanager.lua if needed")
					if response.Body then
						local bodyStr = tostring(response.Body)
						if bodyStr:find("No such app") then
							warn("[StatsManager] Heroku app not found - the app may not be deployed or the URL is incorrect")
						end
					end
					break -- Don't retry 404 errors
				end

				if response.Body then
					warn("[StatsManager] Response body: " .. string.sub(tostring(response.Body), 1, 300))
				end

				-- Don't retry on client errors (4xx)
				if statusCode >= 400 and statusCode < 500 then
					break
				end
			end
		else
			-- pcall failed - check for specific errors
			local errorStr = tostring(response or "")

			if errorStr:find("HttpError") or errorStr:find("Http requests are not enabled") then
				warn("[StatsManager] HTTP not enabled in Game Settings")
				break
			elseif errorStr:find("403") then
				warn("[StatsManager] HTTP 403 Forbidden - Check API permissions")
				break
			elseif errorStr:find("400") then
				warn("[StatsManager] HTTP 400 Bad Request - Check JSON data format")
				-- Log a sample of the data for debugging (first 200 chars)
				local dataSample = string.sub(jsonData, 1, 200)
				warn("[StatsManager] Data sample:", dataSample .. "...")
				break
			end
		end

		-- Retry with delay for other errors
		if attempt < maxRetries then
			warn("[StatsManager] Attempt " .. attempt .. " failed, retrying in 2 seconds...")
			task.wait(2)
		end
	end

	if not success or (response and not response.Success) then
		warn("[StatsManager] Submission failed after " .. maxRetries .. " attempts")
		if response then
			warn("[StatsManager] Error:", tostring(response))
		end
	end

	return success and response and response.Success, response
end

--- Test if the endpoint is reachable (GET request)
function StatsManager:TestConnection()
	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = API_URL,
			Method = "GET"
		})
	end)

	if success and response and response.Success then
		print("[StatsManager] Connection test successful (Status: " .. tostring(response.StatusCode) .. ")")
		return true
	else
		warn("[StatsManager] Connection test failed:", tostring(response))
		return false
	end
end

--============================================================================--
--                          INITIALIZATION                                    --
--============================================================================--

-- Validate required instances exist
if not STAT_SHEET_ROOT then
	warn("[StatsManager] StatSheet folder not found in ReplicatedStorage")
end

if not PLAYER_STAT_TEMPLATE then
	warn("[StatsManager] PlayerStatsTemplate not found in ReplicatedStorage")
end

return StatsManager
