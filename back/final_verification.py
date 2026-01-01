"""
Final verification script - Use this after restarting the server
"""
import requests
import json
import sys

BASE_URL = 'http://localhost:8000'

print("=" * 80)
print("FINAL ENDPOINT VERIFICATION")
print("=" * 80)

# Test 1: Check if server is running
print("\n1. Checking if server is running...")
print("-" * 40)
try:
    response = requests.get(f'{BASE_URL}/admin/login/', timeout=2)
    if response.status_code == 200:
        print("✓ Server is running")
    else:
        print(f"⚠ Server responded with status {response.status_code}")
except requests.exceptions.ConnectionError:
    print("✗ Server is NOT running")
    print("\nPlease start the server with:")
    print("  python manage.py runserver")
    sys.exit(1)

# Test 2: Get authentication token
print("\n2. Getting authentication token...")
print("-" * 40)
login_data = {
    'email': 'test@example.com',
    'password': 'testpass123'
}

response = requests.post(f'{BASE_URL}/api/v1/accounts/token/', json=login_data)
print(f"Login status: {response.status_code}")

if response.status_code != 200:
    print("✗ Authentication failed")
    print(f"Response: {response.text}")
    print("\nNote: Make sure the test user exists")
    print("Run this command to create the test user:")
    print("  python test_tags_endpoint.py")
    sys.exit(1)

token = response.json().get('access')
print("✓ Authentication successful")

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Test 3: GET /api/v1/tags/
print("\n3. Testing GET /api/v1/tags/...")
print("-" * 40)
response = requests.get(f'{BASE_URL}/api/v1/tags/', headers=headers)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    print("✓ GET request successful")
    tags = response.json()
    print(f"Found {len(tags)} tag(s)")
    if tags:
        print("\nExisting tags:")
        for tag in tags:
            print(f"  - {tag['name']} ({tag['color']})")
elif response.status_code == 404:
    print("✗ GET request returned 404")
    print("This means the URL pattern is not being matched")
    print("\nPlease restart the development server:")
    print("  1. Stop the current server (Ctrl+C)")
    print("  2. Run: python manage.py runserver")
else:
    print(f"⚠ Unexpected status code: {response.status_code}")
    print(f"Response: {response.text}")

# Test 4: POST /api/v1/tags/
print("\n4. Testing POST /api/v1/tags/...")
print("-" * 40)

import random
random_color = f"#{random.randint(0, 0xFFFFFF):06x}"
tag_data = {
    'name': f'Final Test Tag {random.randint(1000, 9999)}',
    'color': random_color
}

response = requests.post(f'{BASE_URL}/api/v1/tags/', json=tag_data, headers=headers)
print(f"Status: {response.status_code}")

if response.status_code == 201:
    print("✓ POST request successful")
    created_tag = response.json()
    print(f"\nCreated tag:")
    print(f"  ID: {created_tag['id']}")
    print(f"  Name: {created_tag['name']}")
    print(f"  Color: {created_tag['color']}")
    print(f"  Created by: {created_tag['created_by']}")
elif response.status_code == 404:
    print("✗ POST request returned 404")
    print("This means the URL pattern is not being matched")
    print("\nPlease restart the development server:")
    print("  1. Stop the current server (Ctrl+C)")
    print("  2. Run: python manage.py runserver")
elif response.status_code == 400:
    print("⚠ POST request returned 400 (Bad Request)")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
else:
    print(f"⚠ Unexpected status code: {response.status_code}")
    print(f"Response: {response.text}")

# Test 5: Verify the created tag
if response.status_code == 201:
    print("\n5. Verifying created tag...")
    print("-" * 40)
    tag_id = created_tag['id']
    response = requests.get(f'{BASE_URL}/api/v1/tags/{tag_id}/', headers=headers)

    if response.status_code == 200:
        print(f"✓ Tag #{tag_id} retrieved successfully")
    else:
        print(f"⚠ Failed to retrieve tag #{tag_id}")

print("\n" + "=" * 80)
print("VERIFICATION COMPLETE")
print("=" * 80)

if response.status_code in [200, 201]:
    print("\n✓ All tests passed! The endpoint is working correctly.")
else:
    print("\n⚠ Some tests failed. Please check the output above.")
