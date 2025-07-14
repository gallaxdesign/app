import requests
import sys
from datetime import datetime, date
import json

class ServiceTrackingAPITester:
    def __init__(self, base_url="https://9506cb3a-692d-46e1-82a9-f50fec52d65c.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_service_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login_valid(self):
        """Test login with valid credentials"""
        success, response = self.run_test(
            "Login with valid credentials",
            "POST",
            "auth/login",
            200,
            data={"email": "bilgi@gallaxdesign.com", "password": "gallax11"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token}")
            return True
        return False

    def test_login_invalid(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Login with invalid credentials",
            "POST",
            "auth/login",
            401,
            data={"email": "wrong@email.com", "password": "wrongpass"}
        )
        return success

    def test_get_services_unauthorized(self):
        """Test getting services without token"""
        old_token = self.token
        self.token = None
        success, response = self.run_test(
            "Get services without authentication",
            "GET",
            "services",
            401
        )
        self.token = old_token
        return success

    def test_get_services(self):
        """Test getting all services"""
        success, response = self.run_test(
            "Get all services",
            "GET",
            "services",
            200
        )
        if success:
            print(f"   Found {len(response)} services")
        return success

    def test_create_service(self):
        """Test creating a new service"""
        service_data = {
            "name": f"Test Service {datetime.now().strftime('%H%M%S')}",
            "service_type": "Domain",
            "provider": "Test Provider",
            "creation_date": "2024-01-01",
            "last_renewal_date": "2024-01-01",
            "next_renewal_date": "2025-01-01",
            "annual_fee": 100.0,
            "currency": "TRY",
            "status": "active",
            "notes": "Test service created by automated test"
        }
        
        success, response = self.run_test(
            "Create new service",
            "POST",
            "services",
            200,
            data=service_data
        )
        
        if success and 'id' in response:
            self.created_service_id = response['id']
            print(f"   Created service ID: {self.created_service_id}")
            return True
        return False

    def test_get_service_by_id(self):
        """Test getting a specific service by ID"""
        if not self.created_service_id:
            print("❌ No service ID available for testing")
            return False
            
        success, response = self.run_test(
            f"Get service by ID: {self.created_service_id}",
            "GET",
            f"services/{self.created_service_id}",
            200
        )
        return success

    def test_update_service(self):
        """Test updating a service"""
        if not self.created_service_id:
            print("❌ No service ID available for testing")
            return False
            
        update_data = {
            "name": f"Updated Test Service {datetime.now().strftime('%H%M%S')}",
            "annual_fee": 150.0,
            "notes": "Updated by automated test"
        }
        
        success, response = self.run_test(
            f"Update service: {self.created_service_id}",
            "PUT",
            f"services/{self.created_service_id}",
            200,
            data=update_data
        )
        return success

    def test_get_dashboard_stats(self):
        """Test getting dashboard statistics"""
        success, response = self.run_test(
            "Get dashboard statistics",
            "GET",
            "services/stats/dashboard",
            200
        )
        
        if success:
            expected_keys = ['total_services', 'active_services', 'total_annual_fees', 'services_by_type']
            for key in expected_keys:
                if key in response:
                    print(f"   {key}: {response[key]}")
                else:
                    print(f"   Missing key: {key}")
        return success

    def test_delete_service(self):
        """Test soft deleting a service"""
        if not self.created_service_id:
            print("❌ No service ID available for testing")
            return False
            
        success, response = self.run_test(
            f"Delete service: {self.created_service_id}",
            "DELETE",
            f"services/{self.created_service_id}",
            200
        )
        return success

    def test_get_deleted_service(self):
        """Test that deleted service is not returned in list"""
        if not self.created_service_id:
            print("❌ No service ID available for testing")
            return False
            
        success, response = self.run_test(
            f"Try to get deleted service: {self.created_service_id}",
            "GET",
            f"services/{self.created_service_id}",
            404
        )
        return success

def main():
    print("🚀 Starting Service Tracking API Tests")
    print("=" * 50)
    
    tester = ServiceTrackingAPITester()
    
    # Test sequence
    test_sequence = [
        ("Authentication Tests", [
            tester.test_login_invalid,
            tester.test_get_services_unauthorized,
            tester.test_login_valid,
        ]),
        ("Service CRUD Tests", [
            tester.test_get_services,
            tester.test_create_service,
            tester.test_get_service_by_id,
            tester.test_update_service,
            tester.test_get_dashboard_stats,
            tester.test_delete_service,
            tester.test_get_deleted_service,
        ])
    ]
    
    for section_name, tests in test_sequence:
        print(f"\n📋 {section_name}")
        print("-" * 30)
        
        for test_func in tests:
            if not test_func():
                print(f"❌ Critical test failed: {test_func.__name__}")
                # Continue with other tests even if one fails
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())