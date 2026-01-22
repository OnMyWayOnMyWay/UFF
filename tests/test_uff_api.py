"""
UFF Fantasy Football API Tests
Tests for all backend endpoints including:
- Dashboard, Players, Teams, Standings
- Roblox API integration
- Admin endpoints
- Stats and Analytics
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pigskin-analytics.preview.emergentagent.com').rstrip('/')
ADMIN_KEY = "BacconIsCool1@"


class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint returns version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "UFF" in data["message"]
        assert "version" in data


class TestDashboard:
    """Dashboard endpoint tests"""
    
    def test_dashboard_loads(self):
        """Test dashboard endpoint returns all required data"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "top_performers" in data
        assert "recent_games" in data
        assert "power_rankings" in data
        assert "recent_trades" in data
        assert "league_stats" in data
    
    def test_dashboard_top_performers_have_roblox_usernames(self):
        """Test that top performers include Roblox usernames"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Check top performers have player data with roblox_username
        for performer in data["top_performers"]:
            assert "player" in performer
            player = performer["player"]
            assert "roblox_username" in player
            assert player["roblox_username"] is not None
            assert len(player["roblox_username"]) > 0
    
    def test_dashboard_power_rankings(self):
        """Test power rankings data structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["power_rankings"]) > 0
        for ranking in data["power_rankings"]:
            assert "rank" in ranking
            assert "team_name" in ranking
            assert "analysis" in ranking


class TestPlayers:
    """Player endpoints tests"""
    
    def test_get_all_players(self):
        """Test getting all players"""
        response = requests.get(f"{BASE_URL}/api/players")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_players_have_roblox_usernames(self):
        """Test that all players have Roblox usernames"""
        response = requests.get(f"{BASE_URL}/api/players")
        assert response.status_code == 200
        data = response.json()
        
        for player in data:
            assert "roblox_username" in player
            assert "name" in player
            # Name should be the roblox_username
            assert player["name"] == player["roblox_username"]
    
    def test_players_have_new_stats_structure(self):
        """Test that players have the new stats structure (passing, rushing, receiving, defense)"""
        response = requests.get(f"{BASE_URL}/api/players")
        assert response.status_code == 200
        data = response.json()
        
        for player in data:
            # Check all stat categories exist
            assert "passing" in player
            assert "rushing" in player
            assert "receiving" in player
            assert "defense" in player
            
            # Check passing stats structure
            passing = player["passing"]
            assert "completions" in passing
            assert "attempts" in passing
            assert "yards" in passing
            assert "touchdowns" in passing
            assert "interceptions" in passing
            assert "rating" in passing
            assert "completion_pct" in passing
            assert "average" in passing
            assert "longest" in passing
            
            # Check rushing stats structure
            rushing = player["rushing"]
            assert "attempts" in rushing
            assert "yards" in rushing
            assert "touchdowns" in rushing
            assert "yards_per_carry" in rushing
            assert "fumbles" in rushing
            assert "twenty_plus" in rushing
            assert "longest" in rushing
            
            # Check receiving stats structure
            receiving = player["receiving"]
            assert "receptions" in receiving
            assert "yards" in receiving
            assert "touchdowns" in receiving
            assert "drops" in receiving
            assert "longest" in receiving
            
            # Check defense stats structure
            defense = player["defense"]
            assert "tackles" in defense
            assert "tackles_for_loss" in defense
            assert "sacks" in defense
            assert "safeties" in defense
            assert "swat" in defense
            assert "interceptions" in defense
            assert "pass_deflections" in defense
            assert "td" in defense
    
    def test_get_player_by_id(self):
        """Test getting a specific player by ID"""
        response = requests.get(f"{BASE_URL}/api/players/p1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "p1"
        assert data["roblox_username"] == "n4w"
        assert data["name"] == "n4w"
        assert "weekly_scores" in data
        # weekly_scores contains the weekly stats data
        assert isinstance(data["weekly_scores"], list)
    
    def test_get_player_not_found(self):
        """Test 404 for non-existent player"""
        response = requests.get(f"{BASE_URL}/api/players/nonexistent")
        assert response.status_code == 404
    
    def test_filter_players_by_position(self):
        """Test filtering players by position"""
        response = requests.get(f"{BASE_URL}/api/players?position=QB")
        assert response.status_code == 200
        data = response.json()
        
        for player in data:
            assert player["position"] == "QB"
    
    def test_filter_elite_players(self):
        """Test filtering elite players"""
        response = requests.get(f"{BASE_URL}/api/players?elite_only=true")
        assert response.status_code == 200
        data = response.json()
        
        for player in data:
            assert player["is_elite"] == True
    
    def test_player_analysis(self):
        """Test player analysis endpoint"""
        response = requests.get(f"{BASE_URL}/api/players/p1/analysis")
        assert response.status_code == 200
        data = response.json()
        
        assert "name" in data
        assert "position" in data
        assert "fantasy_points" in data
        assert data["name"] == "n4w"


class TestTeams:
    """Team endpoints tests"""
    
    def test_get_all_teams(self):
        """Test getting all teams"""
        response = requests.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 12  # 12 teams total
    
    def test_get_team_by_id(self):
        """Test getting a specific team"""
        response = requests.get(f"{BASE_URL}/api/teams/rd1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "rd1"
        assert data["name"] == "Vicksburg Vortex"
        assert "conference" in data
        assert "division" in data
    
    def test_team_analysis(self):
        """Test team analysis endpoint"""
        response = requests.get(f"{BASE_URL}/api/teams/rd1/analysis")
        assert response.status_code == 200
        data = response.json()
        
        assert "overview" in data
        assert "strengths" in data
        assert "weaknesses" in data
        assert "key_players" in data
        assert "playoff_outlook" in data
    
    def test_team_roster(self):
        """Test team roster endpoint"""
        response = requests.get(f"{BASE_URL}/api/teams/rd1/roster")
        assert response.status_code == 200
        data = response.json()
        
        assert "team" in data
        assert "roster" in data
        assert len(data["roster"]) > 0
        
        # Check roster players have roblox_username
        for player in data["roster"]:
            assert "roblox_username" in player


class TestStandings:
    """Standings endpoint tests"""
    
    def test_get_standings(self):
        """Test standings endpoint"""
        response = requests.get(f"{BASE_URL}/api/standings")
        assert response.status_code == 200
        data = response.json()
        
        assert "ridge" in data
        assert "grand_central" in data
        assert "league_structure" in data
        
        # Check Ridge conference teams
        assert len(data["ridge"]) == 6
        
        # Check Grand Central conference teams
        assert len(data["grand_central"]) == 6
    
    def test_standings_sorted_by_wins(self):
        """Test that standings are sorted by wins"""
        response = requests.get(f"{BASE_URL}/api/standings")
        assert response.status_code == 200
        data = response.json()
        
        # Check Ridge is sorted by wins descending
        ridge_wins = [t["wins"] for t in data["ridge"]]
        assert ridge_wins == sorted(ridge_wins, reverse=True)


class TestSchedule:
    """Schedule endpoint tests"""
    
    def test_get_full_schedule(self):
        """Test getting full schedule"""
        response = requests.get(f"{BASE_URL}/api/schedule")
        assert response.status_code == 200
        data = response.json()
        
        assert "games" in data
        assert "total_weeks" in data
        assert len(data["games"]) > 0
    
    def test_get_week_schedule(self):
        """Test getting schedule for specific week using query param"""
        response = requests.get(f"{BASE_URL}/api/schedule?week=1")
        assert response.status_code == 200
        data = response.json()
        
        assert "games" in data
        # All games should be from week 1
        for game in data["games"]:
            assert game["week"] == 1


class TestStatLeaders:
    """Stat leaders endpoint tests"""
    
    def test_get_stat_leaders(self):
        """Test stat leaders endpoint"""
        response = requests.get(f"{BASE_URL}/api/stat-leaders")
        assert response.status_code == 200
        data = response.json()
        
        assert "passing" in data
        assert "rushing" in data
        assert "receiving" in data
        assert "defense" in data
        assert "fantasy" in data
    
    def test_stat_leaders_have_names(self):
        """Test that stat leaders have player names (via roblox_username)"""
        response = requests.get(f"{BASE_URL}/api/stat-leaders")
        assert response.status_code == 200
        data = response.json()
        
        for category in ["passing", "rushing", "receiving", "defense", "fantasy"]:
            for player in data[category]:
                # Players have roblox_username as their name identifier
                assert "roblox_username" in player
                assert "team" in player


class TestRobloxAPI:
    """Roblox API integration tests"""
    
    def test_search_roblox_user(self):
        """Test Roblox user search endpoint"""
        response = requests.get(f"{BASE_URL}/api/roblox/search/n4w")
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "name" in data
        assert "displayName" in data
        assert "avatar_url" in data
    
    def test_search_roblox_user_not_found(self):
        """Test Roblox search for non-existent user"""
        response = requests.get(f"{BASE_URL}/api/roblox/search/thisisnotarealuser12345678")
        # Should return 404 or 500 for not found
        assert response.status_code in [404, 500]


class TestPlayoffs:
    """Playoffs endpoint tests"""
    
    def test_get_playoffs(self):
        """Test playoffs endpoint"""
        response = requests.get(f"{BASE_URL}/api/playoffs")
        assert response.status_code == 200
        data = response.json()
        
        assert "matchups" in data
        assert "rounds" in data
        assert len(data["matchups"]) > 0


class TestPowerRankings:
    """Power rankings endpoint tests"""
    
    def test_get_power_rankings(self):
        """Test power rankings endpoint"""
        response = requests.get(f"{BASE_URL}/api/power-rankings")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 12  # All 12 teams
        
        # Check rankings are in order
        for i, ranking in enumerate(data):
            assert ranking["rank"] == i + 1


class TestTrades:
    """Trades endpoint tests"""
    
    def test_get_trades(self):
        """Test trades endpoint"""
        response = requests.get(f"{BASE_URL}/api/trades")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)


class TestAwards:
    """Awards endpoint tests"""
    
    def test_get_awards(self):
        """Test awards endpoint"""
        response = requests.get(f"{BASE_URL}/api/awards")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        for award in data:
            assert "name" in award
            assert "player_name" in award


class TestWatchlist:
    """Watchlist endpoint tests"""
    
    def test_get_watchlist(self):
        """Test getting watchlist"""
        response = requests.get(f"{BASE_URL}/api/watchlist")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
    
    def test_add_to_watchlist(self):
        """Test adding player to watchlist"""
        response = requests.post(
            f"{BASE_URL}/api/watchlist",
            json={"player_id": "p1"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "p1" in data["watchlist"]
    
    def test_remove_from_watchlist(self):
        """Test removing player from watchlist"""
        # First add
        requests.post(f"{BASE_URL}/api/watchlist", json={"player_id": "p1"})
        
        # Then remove
        response = requests.delete(f"{BASE_URL}/api/watchlist/p1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True


class TestAdminEndpoints:
    """Admin endpoint tests"""
    
    def test_admin_stats_without_key(self):
        """Test admin stats without key returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401
    
    def test_admin_stats_with_key(self):
        """Test admin stats with valid key"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"X-Admin-Key": ADMIN_KEY}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_teams" in data
        assert "total_players" in data
        assert "total_games" in data
    
    def test_admin_get_admins(self):
        """Test getting admin list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/admins",
            headers={"X-Admin-Key": ADMIN_KEY}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0


class TestPlayerAnalytics:
    """Player analytics endpoint tests"""
    
    def test_get_player_analytics(self):
        """Test player analytics endpoint"""
        response = requests.get(f"{BASE_URL}/api/player-analytics")
        assert response.status_code == 200
        data = response.json()
        
        assert "passing" in data
        assert "rushing" in data
        assert "receiving" in data
        assert "defense" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
