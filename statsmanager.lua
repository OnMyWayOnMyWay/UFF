--============================================================================--
--                            STATS MANAGER                                   --
--                    Player Statistics Tracking System                       --
--============================================================================--

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local TeamManager = require(script.Parent.Parent.Parent.ServerLibraries.TeamManager)

--============================================================================--
--                            CONFIGURATION                                   --
--============================================================================--

local STAT_SHEET_ROOT = ReplicatedStorage:FindFirstChild("StatSheet")
local PLAYER_STAT_TEMPLATE = ReplicatedStorage:FindFirstChild("PlayerStatsTemplate")

-- API endpoint for stats submission
-- Update this URL to match your deployed backend URL
local API_URL = "https://uffstats-61cef3c41bef.herokuapp.com/api/game/submit"

local function getApiRoot()
	local root = API_URL
	root = root:gsub("/api/game/submit$", "/api/")
	root = root:gsub("/api/game$", "/api/")
	return root
end

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

local SUBMISSION_STATS = {
	passing = {"Completions", "Attempts", "Yards", "Touchdowns", "Interceptions", "Rating", "Average", "Longest"},
	rushing = {"Attempts", "Yards", "Touchdowns", "Yards Per Carry", "Fumbles", "20+ Yards", "Longest"},
	receiving = {"Receptions", "Yards", "Touchdowns", "Drops", "Longest"},
	defense = {"Tackles", "Tackles For Loss", "Sacks", "Safeties", "swat", "Interceptions", "Pass Deflections", "td"}
}

--============================================================================--
--                              MODULE                                        --
--============================================================================--

local StatsManager = {}
local statsEnabled = false

local submissionData = {
	week = 1,
	home_team = "Home",
	away_team = "Away",
	home_score = 0,
	away_score = 0,
	player_of_game = "",
	game_date = nil,
	home_stats = {},
	away_stats = {}
}

--============================================================================--
--                          UTILITY FUNCTIONS                                 --
--============================================================================--

local function toPascalCase(str)
	return str:sub(1, 1):upper() .. str:sub(2):lower()
end

local function getTeamData(teamKey)
	if teamKey == TeamManager:getHome().Name then return submissionData.home_stats end
	if teamKey == TeamManager:getAway().Name then return submissionData.away_stats end
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
	local player = Players:GetPlayerByUserId(userId)
	if player and player.Team then
		local teamName = player.Team.Name
		local currentTeamKey = nil

		if string.upper(teamName) == string.upper(TeamManager:getHome().Name) then
			currentTeamKey = player.Team.Name
		elseif string.upper(teamName) == string.upper(TeamManager:getAway().Name) then
			currentTeamKey = player.Team.Name
		end

		if currentTeamKey then
			for category, _ in pairs(SUBMISSION_STATS) do
				local folder = getPlayerFolder(category, userId)
				if folder then
					local teamValue = folder:FindFirstChild("Team")
					if teamValue and teamValue:IsA("StringValue") then
						teamValue.Value = currentTeamKey
					end
				end
			end
			return currentTeamKey
		end
	end

	for category, _ in pairs(SUBMISSION_STATS) do
		local folder = getPlayerFolder(category, userId)
		if folder then
			local teamValue = folder:FindFirstChild("Team")
			if teamValue and teamValue:IsA("StringValue") and teamValue.Value ~= "" then
				return teamValue.Value
			end
		end
	end

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

	local playerFolder = Instance.new("Folder")
	playerFolder.Name = tostring(userId)
	playerFolder.Parent = categoryRoot

	for _, statTemplate in ipairs(categoryTemplate:GetChildren()) do
		if statTemplate:IsA("ValueBase") then
			local stat = statTemplate:Clone()
			stat.Value = 0
			stat.Parent = playerFolder
		end
	end

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
	end
	getPlayerTeam(userId)
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

	local compPct = math.floor((completions / attempts) * 10000 + 0.5) / 100
	setStatValue(folder, "Completion %", compPct)

	local average = math.floor((yards / attempts) * 10 + 0.5) / 10
	setStatValue(folder, "Average", average)

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

local function gatherPlayerStatsForAPI(userId, category)
	local folder = getPlayerFolder(category, userId)
	if not folder then return nil end

	local categoryKey = category:lower()
	local requiredStats = SUBMISSION_STATS[categoryKey]
	if not requiredStats then return nil end

	local apiStats = {}

	for _, statName in ipairs(requiredStats) do
		if statName == "Completion %" or statName == "Average" then
			-- skip calculated stats
		else
			local value = getStatValue(folder, statName)
			apiStats[statName] = tonumber(value) or 0
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

	local player = Players:GetPlayerByUserId(userId)
	local playerName = player and (player.Name) or tostring(userId)

	if not teamStats[playerName] then
		teamStats[playerName] = {}
	end

	teamStats[playerName][category] = apiStats
end

--============================================================================--
--                          PUBLIC API                                        --
--============================================================================--

function StatsManager:GetPlayerCategoryFolder(category, userId)
	return getPlayerFolder(category, userId)
end

function StatsManager:AddStatLine(category, userId, statKey, value)
	if not statsEnabled then
		return
	end

	local folder = ensurePlayerFolder(category, userId)
	if not folder then return end

	getPlayerTeam(userId)

	local statInstance = folder:FindFirstChild(statKey)
	if not statInstance or not statInstance:IsA("ValueBase") then
		warn("[StatsManager] Stat '" .. statKey .. "' not found in folder for category '" .. category .. "', userId: " .. tostring(userId))
		return
	end

	if statKey == "Yards" and value then
		statInstance.Value += value
	else
		statInstance.Value += 1
	end

	updateCalculatedStats(category, userId)
	syncSubmissionData(category, userId)
end

function StatsManager:GetStatValue(category, userId, statKey)
	local folder = getPlayerFolder(category, userId)
	return getStatValue(folder, statKey)
end

function StatsManager:GetPlayerTeam(category, userId)
	local folder = getPlayerFolder(category, userId)
	if not folder then return nil end

	local teamValue = folder:FindFirstChild("Team")
	if teamValue and teamValue:IsA("StringValue") and teamValue.Value ~= "" then
		return teamValue.Value
	end

	return getPlayerTeam(userId)
end

function StatsManager:SetStatValue(category, userId, statKey, value)
	if not statsEnabled then
		return
	end

	local folder = ensurePlayerFolder(category, userId)
	if not folder then return end

	getPlayerTeam(userId)

	if not setStatValue(folder, statKey, value) then return end

	updateCalculatedStats(category, userId)
	syncSubmissionData(category, userId)
end

function StatsManager:RefreshAllPlayerTeams()
	for category, _ in pairs(SUBMISSION_STATS) do
		local categoryFolder = getCategoryFolder(category)
		if categoryFolder then
			for _, playerFolder in ipairs(categoryFolder:GetChildren()) do
				local userId = tonumber(playerFolder.Name)
				if userId then
					getPlayerTeam(userId)
				end
			end
		end
	end
end

function StatsManager:SetTeamInfo(team, name, _color)
	local oldHomeTeam = submissionData.home_team
	local oldAwayTeam = submissionData.away_team

	if team == "Home" then
		submissionData.home_team = name
	elseif team == "Away" then
		submissionData.away_team = name
	end

	if (team == "Home" and oldHomeTeam ~= name) or (team == "Away" and oldAwayTeam ~= name) then
		self:RefreshAllPlayerTeams()
	end
end

function StatsManager:SetScore(score, team)
	if team == "Home" then
		submissionData.home_score = score
	elseif team == "Away" then
		submissionData.away_score = score
	end
end

function StatsManager:SetWeek(weekNumber)
	submissionData.week = weekNumber
end

function StatsManager:SetPlayerOfGame(playerName)
	submissionData.player_of_game = playerName or ""
end

function StatsManager:SetGameDate(dateString)
	submissionData.game_date = dateString
end

function StatsManager:GetAPIUrl()
	return API_URL
end

function StatsManager:EnableStats()
	statsEnabled = true
	print("[StatsManager] Stats tracking enabled")
end

function StatsManager:DisableStats()
	statsEnabled = false
	print("[StatsManager] Stats tracking disabled")
end

function StatsManager:IsStatsEnabled()
	return statsEnabled
end

function StatsManager:GetData()
	return submissionData
end

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

	table.sort(leaderboard, function(a, b) return a.Value > b.Value end)

	if #leaderboard > limit then
		local trimmed = {}
		for i = 1, limit do
			trimmed[i] = leaderboard[i]
		end
		return trimmed
	end

	return leaderboard
end

function StatsManager:Reset()
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

local function rebuildSubmissionData()
	submissionData.home_stats = {}
	submissionData.away_stats = {}

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

function StatsManager:Submit()
	if not statsEnabled then
		warn("[StatsManager] Stats are currently disabled. Enable stats before submitting.")
		return false, "Stats are disabled"
	end

	rebuildSubmissionData()

	if not submissionData.week or submissionData.week < 1 then
		warn("[StatsManager] Invalid week number:", submissionData.week)
		return false, "Invalid week number"
	end

	if not submissionData.home_team or submissionData.home_team == "" then
		warn("[StatsManager] Home team name is missing")
	end
	if not submissionData.away_team or submissionData.away_team == "" then
		warn("[StatsManager] Away team name is missing")
	end
	if not submissionData.player_of_game or submissionData.player_of_game == "" then
		warn("[StatsManager] Player of game is not set")
	end

	local homeStatsDict = {}
	for key, value in pairs(submissionData.home_stats) do
		homeStatsDict[key] = value
	end

	local awayStatsDict = {}
	for key, value in pairs(submissionData.away_stats) do
		awayStatsDict[key] = value
	end

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

	if submissionData.game_date then
		dataToSubmit.game_date = submissionData.game_date
	end

	local jsonData
	local encodeSuccess, encodeError = pcall(function()
		jsonData = HttpService:JSONEncode(dataToSubmit)

		if not hasHomeStats or not hasAwayStats then
			jsonData = jsonData:gsub('"%s*__empty__"%s*:%s*true%s*,?%s*', '')
			jsonData = jsonData:gsub(',%s*"%s*__empty__"%s*:%s*true', '')
			jsonData = jsonData:gsub(',%s*,', ',')
			jsonData = jsonData:gsub(',%s*}', '}')
			jsonData = jsonData:gsub(',%s*]', ']')
		end
	end)

	if not encodeSuccess then
		warn("[StatsManager] Failed to encode JSON:", encodeError)
		return false, "JSON encoding failed: " .. tostring(encodeError)
	end

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

		if success and response then
			if response.Success and response.StatusCode == 200 then
				print("[StatsManager] Stats submitted successfully!")
				if response.Body and #response.Body > 0 then
					local responseSample = string.sub(response.Body, 1, 500)
					print("[StatsManager] Response: " .. responseSample)
				end
				return true, response.Body
			else
				local statusMsg = response.StatusMessage or "Unknown error"
				local statusCode = response.StatusCode or "?"
				warn("[StatsManager] HTTP " .. tostring(statusCode) .. ": " .. statusMsg)

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
					break
				end

				if response.Body then
					warn("[StatsManager] Response body: " .. string.sub(tostring(response.Body), 1, 300))
				end

				if statusCode >= 400 and statusCode < 500 then
					break
				end
			end
		else
			local errorStr = tostring(response or "")

			if errorStr:find("HttpError") or errorStr:find("Http requests are not enabled") then
				warn("[StatsManager] HTTP not enabled in Game Settings")
				break
			elseif errorStr:find("403") then
				warn("[StatsManager] HTTP 403 Forbidden - Check API permissions")
				break
			elseif errorStr:find("400") then
				warn("[StatsManager] HTTP 400 Bad Request - Check JSON data format")
				local dataSample = string.sub(jsonData, 1, 200)
				warn("[StatsManager] Data sample:", dataSample .. "...")
				break
			end
		end

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

function StatsManager:TestConnection()
	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = getApiRoot(),
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

if not STAT_SHEET_ROOT then
	warn("[StatsManager] StatSheet folder not found in ReplicatedStorage")
end

if not PLAYER_STAT_TEMPLATE then
	warn("[StatsManager] PlayerStatsTemplate not found in ReplicatedStorage")
end

return StatsManager


