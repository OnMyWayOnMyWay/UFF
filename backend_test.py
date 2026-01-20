import requests
import sys
from datetime import datetime

class FantasyFootballAPITester:
    def __init__(self, base_url="https://united-league.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, validate_response=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success and validate_response:
                try:
                    response_data = response.json()
                    validation_result = validate_response(response_data)
                    if not validation_result:
                        success = False
                        print(f"❌ Failed - Response validation failed")
                        self.failed_tests.append(f"{name}: Response validation failed")
                except Exception as e:
                    success = False
                    print(f"❌ Failed - Response validation error: {str(e)}")
                    self.failed_tests.append(f"{name}: Response validation error - {str(e)}")
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return True, response.json() if response.content else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    print(f"Response: {response.text[:200]}...")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root API",
            "GET",
            "",
            200,
            validate_response=lambda data: "message" in data and "version" in data
        )

    def test_teams_endpoint(self):
        """Test teams endpoint"""
        success, data = self.run_test(
            "Get All Teams",
            "GET",
            "teams",
            200,
            validate_response=lambda data: isinstance(data, list) and len(data) == 12
        )
        
        if success and data:
            # Validate team structure
            team = data[0]
            required_fields = ['id', 'name', 'abbreviation', 'conference', 'wins', 'losses']
            if all(field in team for field in required_fields):
                print("✅ Team structure validation passed")
            else:
                print("❌ Team structure validation failed")
                self.failed_tests.append("Teams: Missing required fields")
                return False
                
        return success

    def test_single_team(self):
        """Test single team endpoint"""
        return self.run_test(
            "Get Single Team",
            "GET",
            "teams/gc1",
            200,
            validate_response=lambda data: data.get('id') == 'gc1' and 'name' in data
        )

    def test_players_endpoint(self):
        """Test players endpoint"""
        success, data = self.run_test(
            "Get All Players",
            "GET",
            "players",
            200,
            validate_response=lambda data: isinstance(data, list) and len(data) > 0
        )
        
        if success and data:
            # Validate player structure
            player = data[0]
            required_fields = ['id', 'name', 'position', 'team', 'stats']
            if all(field in player for field in required_fields):
                print("✅ Player structure validation passed")
            else:
                print("❌ Player structure validation failed")
                self.failed_tests.append("Players: Missing required fields")
                return False
                
        return success

    def test_players_by_position(self):
        """Test players by position"""
        positions = ['QB', 'WR', 'RB', 'TE', 'K', 'DEF']
        all_passed = True
        
        for pos in positions:
            success, data = self.run_test(
                f"Get {pos} Players",
                "GET",
                f"players?position={pos}",
                200,
                validate_response=lambda data, p=pos: isinstance(data, list) and all(player.get('position') == p for player in data)
            )
            if not success:
                all_passed = False
                
        return all_passed

    def test_elite_players(self):
        """Test elite players endpoint"""
        return self.run_test(
            "Get Elite Players",
            "GET",
            "players?elite_only=true",
            200,
            validate_response=lambda data: isinstance(data, list) and all(player.get('is_elite') for player in data)
        )

    def test_single_player(self):
        """Test single player endpoint"""
        return self.run_test(
            "Get Single Player",
            "GET",
            "players/p1",
            200,
            validate_response=lambda data: data.get('id') == 'p1' and 'name' in data
        )

    def test_standings_endpoint(self):
        """Test standings endpoint"""
        return self.run_test(
            "Get Standings",
            "GET",
            "standings",
            200,
            validate_response=lambda data: 'grand_central' in data and 'ridge' in data and 
                           isinstance(data['grand_central'], list) and isinstance(data['ridge'], list)
        )

    def test_schedule_endpoint(self):
        """Test schedule endpoint"""
        success, data = self.run_test(
            "Get Full Schedule",
            "GET",
            "schedule",
            200,
            validate_response=lambda data: 'games' in data and 'weekly_stats' in data
        )
        
        if success:
            # Test specific week
            week_success, week_data = self.run_test(
                "Get Week 1 Schedule",
                "GET",
                "schedule?week=1",
                200,
                validate_response=lambda data: 'games' in data and all(game.get('week') == 1 for game in data['games'])
            )
            return week_success
            
        return success

    def test_playoffs_endpoint(self):
        """Test playoffs endpoint"""
        return self.run_test(
            "Get Playoffs",
            "GET",
            "playoffs",
            200,
            validate_response=lambda data: 'matchups' in data and 'teams' in data and 
                           isinstance(data['matchups'], list) and isinstance(data['teams'], list)
        )

    def test_awards_endpoint(self):
        """Test awards endpoint"""
        return self.run_test(
            "Get Awards",
            "GET",
            "awards",
            200,
            validate_response=lambda data: isinstance(data, list) and len(data) > 0 and 
                           all('name' in award and 'description' in award for award in data)
        )

    def test_dashboard_endpoint(self):
        """Test dashboard endpoint"""
        return self.run_test(
            "Get Dashboard",
            "GET",
            "dashboard",
            200,
            validate_response=lambda data: all(key in data for key in ['top_performers', 'recent_games', 'leaders', 'standings_preview'])
        )

    def test_error_handling(self):
        """Test error handling for non-existent resources"""
        success1, _ = self.run_test(
            "Non-existent Team",
            "GET",
            "teams/nonexistent",
            404
        )
        
        success2, _ = self.run_test(
            "Non-existent Player",
            "GET",
            "players/nonexistent",
            404
        )
        
        return success1 and success2

def main():
    print("🏈 Fantasy Football League API Testing")
    print("=" * 50)
    
    tester = FantasyFootballAPITester()
    
    # Run all tests
    test_methods = [
        tester.test_root_endpoint,
        tester.test_teams_endpoint,
        tester.test_single_team,
        tester.test_players_endpoint,
        tester.test_players_by_position,
        tester.test_elite_players,
        tester.test_single_player,
        tester.test_standings_endpoint,
        tester.test_schedule_endpoint,
        tester.test_playoffs_endpoint,
        tester.test_awards_endpoint,
        tester.test_dashboard_endpoint,
        tester.test_error_handling,
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test method {test_method.__name__} failed with exception: {str(e)}")
            tester.failed_tests.append(f"{test_method.__name__}: {str(e)}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"  - {failure}")
    else:
        print("\n✅ All tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())