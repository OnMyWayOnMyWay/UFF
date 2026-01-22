-- Roblox ServerScript example for posting a game to your API.
-- Place in ServerScriptService and make sure HttpService is enabled.

local HttpService = game:GetService("HttpService")

local API_URL = "https://uffstats-61cef3c41bef.herokuapp.com/api/game/submit"

local function postGame()
	local payload = {
		week = 1,
		home_team = "Home Test",
		away_team = "Away Test",
		home_score = 21,
		away_score = 17,
		player_of_game = "TestPlayer1",
		game_date = os.date("!%Y-%m-%d"),
		home_stats = {
			TestPlayer1 = {
				Passing = {
					Completions = 18,
					Attempts = 26,
					Yards = 240,
					Touchdowns = 3,
					Interceptions = 1,
					Longest = 45
				},
				Rushing = {
					Attempts = 4,
					Yards = 22,
					Touchdowns = 1,
					Fumbles = 0,
					Longest = 12
				},
				Receiving = {
					Receptions = 2,
					Yards = 18,
					Touchdowns = 0,
					Drops = 0,
					Longest = 12
				},
				Defense = {
					Tackles = 1,
					["Tackles For Loss"] = 0,
					Sacks = 0,
					Safeties = 0,
					swat = 0,
					Interceptions = 0,
					["Pass Deflections"] = 0,
					td = 0
				}
			}
		},
		away_stats = {
			TestPlayer2 = {
				Passing = {
					Completions = 15,
					Attempts = 28,
					Yards = 210,
					Touchdowns = 2,
					Interceptions = 2,
					Longest = 38
				},
				Rushing = {
					Attempts = 6,
					Yards = 30,
					Touchdowns = 0,
					Fumbles = 0,
					Longest = 14
				},
				Receiving = {
					Receptions = 3,
					Yards = 36,
					Touchdowns = 1,
					Drops = 1,
					Longest = 20
				},
				Defense = {
					Tackles = 2,
					["Tackles For Loss"] = 1,
					Sacks = 1,
					Safeties = 0,
					swat = 1,
					Interceptions = 0,
					["Pass Deflections"] = 2,
					td = 0
				}
			}
		}
	}

	local json = HttpService:JSONEncode(payload)

	local ok, result = pcall(function()
		return HttpService:RequestAsync({
			Url = API_URL,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json"
			},
			Body = json
		})
	end)

	if not ok then
		warn("[API] Request failed:", result)
		return
	end

	if result.Success then
		print("[API] Submitted game:", result.StatusCode, result.Body)
	else
		warn("[API] Error:", result.StatusCode, result.StatusMessage, result.Body)
	end
end

postGame()
