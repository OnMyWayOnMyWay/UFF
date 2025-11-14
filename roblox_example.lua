-- Roblox Flag Football Game Stats Submission Example
-- Place this code in your Roblox game to submit stats to your API

local HttpService = game:GetService("HttpService")

-- Your API endpoint
local API_URL = "https://gameday-tracker-3.preview.emergentagent.com/api/game"

-- Example game data
local gameData = {
    week = 1,
    home_team = "Eagles",
    away_team = "Hawks",
    home_score = 28,
    away_score = 21,
    player_of_game = "John Smith",
    game_date = "2025-01-15",
    
    home_stats = {
        passing = {
            {
                name = "John Smith",
                stats = {
                    comp = 15,
                    att = 22,
                    yards = 245,
                    td = 3,
                    int = 1,
                    scked = 2
                }
            }
        },
        defense = {
            {
                name = "Mike Johnson",
                stats = {
                    tak = 8,
                    tfl = 2,
                    sck = 1,
                    saf = 0,
                    swat = 3,
                    int = 1,
                    pbu = 2,
                    td = 0
                }
            }
        },
        rushing = {
            {
                name = "Tom Davis",
                stats = {
                    att = 12,
                    yards = 85,
                    td = 1
                }
            }
        },
        receiving = {
            {
                name = "Chris Brown",
                stats = {
                    rec = 7,
                    yards = 125,
                    td = 2
                }
            }
        }
    },
    
    away_stats = {
        passing = {
            {
                name = "Alex Wilson",
                stats = {
                    comp = 12,
                    att = 20,
                    yards = 198,
                    td = 2,
                    int = 2,
                    scked = 3
                }
            }
        },
        defense = {
            {
                name = "Robert Lee",
                stats = {
                    tak = 10,
                    tfl = 1,
                    sck = 2,
                    saf = 0,
                    swat = 1,
                    int = 2,
                    pbu = 3,
                    td = 1
                }
            }
        },
        rushing = {
            {
                name = "David Green",
                stats = {
                    att = 8,
                    yards = 62,
                    td = 1
                }
            }
        },
        receiving = {
            {
                name = "Mark Taylor",
                stats = {
                    rec = 5,
                    yards = 98,
                    td = 1
                }
            }
        }
    }
}

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
