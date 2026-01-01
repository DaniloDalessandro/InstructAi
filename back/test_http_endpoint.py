"""
Script to test the tags endpoint via HTTP
"""
import requests
import json

BASE_URL = 'http://localhost:8000'

# First, get a token
print("=== Getting authentication token ===")
login_data = {
    'email': 'test@example.com',
    'password': 'testpass123'
}

try:
    response = requests.post(f'{BASE_URL}/api/v1/accounts/token/', json=login_data)
    print(f"Login Status Code: {response.status_code}")

    if response.status_code == 200:
        token = response.json().get('access')
        print(f"Token obtained successfully")

        # Test GET request
        print("\n=== Testing GET /api/v1/tags/ ===")
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        response = requests.get(f'{BASE_URL}/api/v1/tags/', headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

        # Test POST request
        print("\n=== Testing POST /api/v1/tags/ ===")
        tag_data = {
            'name': 'HTTP Test Tag',
            'color': '#00FF00'
        }

        response = requests.post(f'{BASE_URL}/api/v1/tags/', json=tag_data, headers=headers)
        print(f"Status Code: {response.status_code}")
        if response.status_code in [200, 201]:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Response: {response.text}")
    else:
        print(f"Login failed: {response.text}")
        print("\nNote: Make sure the test user exists. You can create it with:")
        print("  python manage.py createsuperuser")
        print("  or run: python test_tags_endpoint.py first")

except requests.exceptions.ConnectionError:
    print("Error: Could not connect to the server.")
    print("Make sure the Django development server is running:")
    print("  python manage.py runserver")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
