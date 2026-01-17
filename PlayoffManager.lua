--============================================================================--
--                           PLAYOFF MANAGER                                   --
--                    Playoff Bracket & Seeding Logic                         --
--============================================================================--

--[[
	UFF Playoff Structure (8-week regular season):
	
	REGULAR SEASON: Weeks 1-8
	- Teams accumulate win-loss records
	- Teams are assigned to conferences and divisions
	
	SEEDING (After Week 8):
	- Top 2 teams per conference compete in Conference Championships
	- Seeding is per conference
	
	PLAYOFF STRUCTURE:
	Week 9:  Conference Championships (Ridge #1 vs #2, GC #1 vs #2) ⚠️ MUST COMPLETE FIRST
	Week 10: Wild Card Round   (5v12, 6v11, 7v10, 8v9) - Played AFTER Week 9
	Week 11: Divisional Round  (Conf Champ winners vs WC winners)
	Week 12: Semifinals / Conference Finals
	Week 13: Championship (conference champions face each other)
	
	⚠️ IMPORTANT: Conference Championship games (Week 9) must be completed
	before Wild Card games (Week 10) can begin, as results affect bracket structure.
]]

local PlayoffManager = {}

-- Configuration
local REGULAR_SEASON_WEEKS = 8
local CONFERENCE_CHAMPIONSHIP_WEEK = 9  -- Ridge #1 vs #2, GC #1 vs #2
local WILD_CARD_WEEK = 10               -- Seeds 5-12 compete
local DIVISIONAL_WEEK = 11              -- Conf Champ winners vs WC winners
local SEMIFINALS_WEEK = 12              -- Conference Finals
local CHAMPIONSHIP_WEEK = 13            -- Final game

--============================================================================--
--                         SEEDING LOGIC                                      --
--============================================================================--

--- Group teams by division
local function groupByDivision(standings, assignments)
	local byDivision = {}
	
	for _, teamData in ipairs(standings) do
		local team = teamData.team
		local teamInfo = assignments[team]
		
		if teamInfo then
			local division = teamInfo.division or "Unknown"
			if not byDivision[division] then
				byDivision[division] = {}
			end
			table.insert(byDivision[division], teamData)
		end
	end
	
	return byDivision
end

--- Get division winner (best win percentage)
local function getDivisionWinner(divisionTeams)
	if #divisionTeams == 0 then return nil end
	
	-- Sort by win percentage, then point differential
	table.sort(divisionTeams, function(a, b)
		if a.win_pct ~= b.win_pct then
			return a.win_pct > b.win_pct
		end
		return a.point_diff > b.point_diff
	end)
	
	return divisionTeams[1]
end

--- Generate playoff seeds for a conference
-- Returns: {seed: {team, wins, losses, win_pct, division, seed_number}}
function PlayoffManager:GenerateConferenceSeeds(conferenceStandings, assignments)
	local divisionTeams = groupByDivision(conferenceStandings, assignments)
	local divisionWinners = {}
	local wildcardTeams = {}
	
	-- Get division winners
	for division, teams in pairs(divisionTeams) do
		local winner = getDivisionWinner(teams)
		if winner then
			winner.division_winner = true
			table.insert(divisionWinners, winner)
		end
	end
	
	-- Sort division winners by win percentage for seeding 1-4
	table.sort(divisionWinners, function(a, b)
		if a.win_pct ~= b.win_pct then
			return a.win_pct > b.win_pct
		end
		return a.point_diff > b.point_diff
	end)
	
	-- Get non-division-winners for wildcard (seeds 5-12)
	for _, teamData in ipairs(conferenceStandings) do
		if not teamData.division_winner then
			table.insert(wildcardTeams, teamData)
		end
	end
	
	-- Sort wildcard teams by win percentage
	table.sort(wildcardTeams, function(a, b)
		if a.win_pct ~= b.win_pct then
			return a.win_pct > b.win_pct
		end
		return a.point_diff > b.point_diff
	end)
	
	-- Combine into seeded bracket
	local seeds = {}
	for i, team in ipairs(divisionWinners) do
		team.seed = i
		seeds[i] = team
	end
	
	for i, team in ipairs(wildcardTeams) do
		local seedNum = 4 + i
		team.seed = seedNum
		seeds[seedNum] = team
	end
	
	return seeds
end

--============================================================================--
--                      MATCHUP GENERATION                                    --
--============================================================================--

--- Generate Wild Card Round matchups (5v12, 6v11, 7v10)
function PlayoffManager:GenerateWildCardMatchups(seeds)
	local matchups = {}
	
	-- Seed 5 vs Seed 12
	if seeds[5] and seeds[12] then
		table.insert(matchups, {
			home_seed = 5,
			away_seed = 12,
			home_team = seeds[5].team,
			away_team = seeds[12].team,
			matchup_name = "#5 vs #12"
		})
	end
	
	-- Seed 6 vs Seed 11
	if seeds[6] and seeds[11] then
		table.insert(matchups, {
			home_seed = 6,
			away_seed = 11,
			home_team = seeds[6].team,
			away_team = seeds[11].team,
			matchup_name = "#6 vs #11"
		})
	end
	
	-- Seed 7 vs Seed 10
	if seeds[7] and seeds[10] then
		table.insert(matchups, {
			home_seed = 7,
			away_seed = 10,
			home_team = seeds[7].team,
			away_team = seeds[10].team,
			matchup_name = "#7 vs #10"
		})
	end
	
	return matchups
end

--- Generate Divisional Round matchups
-- Assumes wildcard results are provided
-- 1 seed gets bye, plays lowest seed wildcard winner
-- Other two wildcard winners play each other
function PlayoffManager:GenerateDivisionalMatchups(seeds, wildcardWinners)
	local matchups = {}
	
	-- wildcardWinners = {seed_number = team_name, ...}
	-- Find wildcard winners
	local wcWinnerSeeds = {}
	for seedNum, team in pairs(wildcardWinners) do
		table.insert(wcWinnerSeeds, {seed = seedNum, team = team})
	end
	
	-- Sort by seed number (highest seed = lowest number)
	table.sort(wcWinnerSeeds, function(a, b) return a.seed < b.seed end)
	
	if #wcWinnerSeeds >= 3 then
		-- Seed 1 plays highest-seeded wildcard winner
		local topWCWinner = wcWinnerSeeds[1]
		table.insert(matchups, {
			home_seed = 1,
			away_seed = topWCWinner.seed,
			home_team = seeds[1].team,
			away_team = topWCWinner.team,
			matchup_name = "#1 vs #" .. topWCWinner.seed
		})
		
		-- Other two wildcard winners play each other
		table.insert(matchups, {
			home_seed = wcWinnerSeeds[2].seed,
			away_seed = wcWinnerSeeds[3].seed,
			home_team = wcWinnerSeeds[2].team,
			away_team = wcWinnerSeeds[3].team,
			matchup_name = "#" .. wcWinnerSeeds[2].seed .. " vs #" .. wcWinnerSeeds[3].seed
		})
	elseif #wcWinnerSeeds == 2 then
		-- Both seed 1 scenarios
		table.insert(matchups, {
			home_seed = 1,
			away_seed = wcWinnerSeeds[1].seed,
			home_team = seeds[1].team,
			away_team = wcWinnerSeeds[1].team,
			matchup_name = "#1 vs #" .. wcWinnerSeeds[1].seed
		})
		
		table.insert(matchups, {
			home_seed = wcWinnerSeeds[2].seed,
			home_team = wcWinnerSeeds[2].team,
			matchup_name = "#" .. wcWinnerSeeds[2].seed
		})
	end
	
	return matchups
end

--- Generate Conference Championship matchup
function PlayoffManager:GenerateConferenceChampionshipMatchup(divisionalWinners)
	-- divisionalWinners = {team1, team2}
	if #divisionalWinners < 2 then
		return nil
	end
	
	-- Higher seed (lower number) gets home game
	return {
		home_team = divisionalWinners[1].team,
		away_team = divisionalWinners[2].team,
		matchup_name = "Conference Championship"
	}
end

--- Generate Championship Game (Super Bowl)
function PlayoffManager:GenerateChampionshipMatchup(conferenceWinners)
	-- conferenceWinners = {gcWinner, ridgeWinner}
	if #conferenceWinners < 2 then
		return nil
	end
	
	return {
		home_team = conferenceWinners[1].team,
		away_team = conferenceWinners[2].team,
		matchup_name = "UFF Championship"
	}
end

--============================================================================--
--                        UTILITY FUNCTIONS                                   --
--============================================================================--

--- Determine home team (better seed plays at home)
-- Returns: {home_team, away_team}
function PlayoffManager:DeterminHomeTeam(team1, team2, seed1, seed2)
	if seed1 and seed2 then
		if seed1 < seed2 then
			return {home_team = team1, away_team = team2}
		else
			return {home_team = team2, away_team = team1}
		end
	end
	
	-- Default if no seeds provided
	return {home_team = team1, away_team = team2}
end

--- Check if a team made the playoffs
function PlayoffManager:IsPlayoffTeam(team, seeds)
	for seed = 1, 12 do
		if seeds[seed] and seeds[seed].team == team then
			return true, seed
		end
	end
	return false
end

--- Get seed number for team
function PlayoffManager:GetTeamSeed(team, seeds)
	for seed = 1, 12 do
		if seeds[seed] and seeds[seed].team == team then
			return seed
		end
	end
	return nil
end

--- Format seed display
function PlayoffManager:FormatSeed(seedNumber)
	if seedNumber == 1 then return "1st Seed"
	elseif seedNumber == 2 then return "2nd Seed"
	elseif seedNumber == 3 then return "3rd Seed"
	elseif seedNumber == 4 then return "4th Seed"
	else return "#" .. seedNumber .. " Seed" end
end

--============================================================================--
--                       BRACKET STRUCTURE                                    --
--============================================================================--

--- Build full bracket structure
function PlayoffManager:BuildBracket(gc_seeds, ridge_seeds, wildcard_results, divisional_results)
	local bracket = {
		grand_central = {
			seeds = gc_seeds,
			wildcard = self:GenerateWildCardMatchups(gc_seeds),
			wildcard_results = wildcard_results or {},
			divisional = {},
			divisional_results = divisional_results or {},
			championship = nil,
			champion = nil
		},
		ridge = {
			seeds = ridge_seeds,
			wildcard = self:GenerateWildCardMatchups(ridge_seeds),
			wildcard_results = wildcard_results or {},
			divisional = {},
			divisional_results = divisional_results or {},
			championship = nil,
			champion = nil
		}
	}
	
	return bracket
end

return PlayoffManager
