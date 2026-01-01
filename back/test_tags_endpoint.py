"""
Script to test the tags endpoint
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import force_authenticate
from tags.views import TagViewSet

User = get_user_model()

# Create a test user
try:
    user = User.objects.filter(email='test@example.com').first()
    if not user:
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            name='Test User'
        )
        print(f"Created test user: {user.email}")
    else:
        print(f"Using existing test user: {user.email}")
except Exception as e:
    print(f"Error creating user: {e}")
    sys.exit(1)

# Test GET request
print("\n=== Testing GET /api/v1/tags/ ===")
factory = RequestFactory()
view = TagViewSet.as_view({'get': 'list'})

request = factory.get('/api/v1/tags/')
force_authenticate(request, user=user)

try:
    response = view(request)
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

# Test POST request
print("\n=== Testing POST /api/v1/tags/ ===")
view = TagViewSet.as_view({'post': 'create'})

request = factory.post(
    '/api/v1/tags/',
    data={'name': 'Test Tag', 'color': '#FF5733'},
    content_type='application/json'
)
force_authenticate(request, user=user)

try:
    response = view(request)
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\n=== Testing router configuration ===")
from tags.urls import router
print(f"Registered routes: {router.registry}")
for prefix, viewset, basename in router.registry:
    print(f"  - {prefix}: {viewset.__name__} (basename: {basename})")

print("\n=== Checking URL patterns ===")
from django.urls import resolve
try:
    match = resolve('/api/v1/tags/')
    print(f"URL '/api/v1/tags/' resolves to: {match.func}")
    print(f"View name: {match.view_name}")
    print(f"URL pattern: {match.url_name}")
except Exception as e:
    print(f"Failed to resolve '/api/v1/tags/': {e}")
