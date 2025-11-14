-- Roblox Flag Football Game Stats Submission Example
-- Place this code in your Roblox game to submit stats to your API

local HttpService = game:GetService("HttpService")

-- Your API endpoint
local API_URL = "https://gameday-tracker-3.preview.emergentagent.com/api/game"

-- Example game data - Organized by player name
local gameData = {
    week = 1,
    home_team = "Eagles",
    away_team = "Hawks",
    home_score = 28,
    away_score = 21,
    player_of_game = "John Smith",
    game_date = "2025-01-15",
    
    -- Home team stats organized by player
    home_stats = {
        ["John Smith"] = {
            Passing = {
                Comp = 15,
                Att = 22,
                Yards = 245,
                TD = 3,
                Int = 1,
                SCKED = 2
            },
            -- Players can have multiple categories
            Rushing = {
                Att = 3,
                Yards = 15,
                TD = 0
            }
        },
        ["Mike Johnson"] = {
            Defense = {
                TAK = 8,
                TFL = 2,
                SCK = 1,
                SAF = 0,
                SWAT = 3,
                INT = 1,
                PBU = 2,
                TD = 0
            }
        },
        ["Tom Davis"] = {
            Rushing = {
                Att = 12,
                Yards = 85,
                TD = 1
            }
        },
        ["Chris Brown"] = {
            Receiving = {
                Rec = 7,
                Yards = 125,
                TD = 2
            },
            Defense = {
                TAK = 3,
                TFL = 0,
                SCK = 0,
                SAF = 0,
                SWAT = 0,
                INT = 0,
                PBU = 1,
                TD = 0
            }
        }
    },
    
    -- Away team stats organized by player
    away_stats = {
        ["Alex Wilson"] = {
            Passing = {
                Comp = 12,
                Att = 20,
                Yards = 198,
                TD = 2,
                Int = 2,
                SCKED = 3
            }
        },
        ["Robert Lee"] = {
            Defense = {
                TAK = 10,
                TFL = 1,
                SCK = 2,
                SAF = 0,
                SWAT = 1,
                INT = 2,
                PBU = 3,
                TD = 1
            }
        },
        ["David Green"] = {
            Rushing = {
                Att = 8,
                Yards = 62,
                TD = 1
            }
        },
        ["Mark Taylor"] = {
            Receiving = {
                Rec = 5,
                Yards = 98,
                TD = 1
            }
        }
    }
}

-- Note: Players only need categories they participated in
-- For example, if a player only played defense, only include their Defense stats

-- Function to submit game stats
local function submitGameStats()
    local success, result = pcall(function()
        local jsonData = HttpService:JSONEncode(gameData)
        
        local response = HttpService:RequestAsync({
            Url = API_URL,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = jsonData
        })
        
        if response.Success then
            print("Game stats submitted successfully!")
            print("Response:", response.Body)
            return true
        else
            warn("Failed to submit game stats:", response.StatusCode)
            return false
        end
    end)
    
    if not success then
        warn("Error submitting game stats:", result)
    end
end

-- Call this function when the game ends
submitGameStats()

-- Note: Make sure HTTP requests are enabled in your game settings:
-- Game Settings > Security > Allow HTTP Requests = ON
