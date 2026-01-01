"""
Comprehensive diagnostic script for the 404 error on POST /tags
"""
import os
import sys
import django

# Set UTF-8 encoding for output
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.urls import get_resolver
from django.conf import settings

print("=" * 80)
print("DJANGO CONFIGURATION DIAGNOSTIC")
print("=" * 80)

# 1. Check if 'tags' is in INSTALLED_APPS
print("\n1. Checking INSTALLED_APPS:")
print("-" * 40)
if 'tags' in settings.INSTALLED_APPS:
    print("✓ 'tags' app is registered in INSTALLED_APPS")
    print(f"  Position: {settings.INSTALLED_APPS.index('tags')}")
else:
    print("✗ 'tags' app is NOT registered in INSTALLED_APPS")

# 2. Check if django_filters is in INSTALLED_APPS
print("\n2. Checking django_filters:")
print("-" * 40)
if 'django_filters' in settings.INSTALLED_APPS:
    print("✓ 'django_filters' is registered in INSTALLED_APPS")
else:
    print("⚠ 'django_filters' is NOT registered in INSTALLED_APPS")
    print("  This may cause issues with DjangoFilterBackend")

# 3. Check URL configuration
print("\n3. Checking URL Configuration:")
print("-" * 40)

from django.urls import resolve
from django.urls.exceptions import Resolver404

test_urls = [
    '/api/v1/tags/',
    '/api/v1/tags/1/',
    '/api/v1/sectors/',
]

for url in test_urls:
    try:
        match = resolve(url)
        print(f"✓ {url}")
        print(f"  View: {match.func.__name__ if hasattr(match.func, '__name__') else match.func}")
        print(f"  Name: {match.view_name}")
    except Resolver404:
        print(f"✗ {url} - NOT FOUND")

# 4. Check router registration
print("\n4. Checking Router Configuration:")
print("-" * 40)
try:
    from tags.urls import router as tags_router
    print(f"Tags router registry: {tags_router.registry}")
    for prefix, viewset, basename in tags_router.registry:
        print(f"  ✓ {prefix}: {viewset.__name__} (basename: {basename})")
except Exception as e:
    print(f"✗ Error loading tags router: {e}")

# 5. Check ViewSet configuration
print("\n5. Checking ViewSet Configuration:")
print("-" * 40)
try:
    from tags.views import TagViewSet
    from tags.models import Tag
    from tags.serializers import TagSerializer

    print(f"✓ TagViewSet imported successfully")
    print(f"  Model: {TagViewSet.queryset.model.__name__}")
    print(f"  Serializer: {TagViewSet.serializer_class.__name__}")
    print(f"  Permission classes: {[p.__name__ for p in TagViewSet.permission_classes]}")
    print(f"  Filter backends: {[b.__name__ if hasattr(b, '__name__') else str(b) for b in TagViewSet.filter_backends]}")

    # Check if model has been migrated
    try:
        count = Tag.objects.count()
        print(f"✓ Tag model is accessible (count: {count})")
    except Exception as e:
        print(f"✗ Error accessing Tag model: {e}")
except Exception as e:
    print(f"✗ Error loading TagViewSet: {e}")

# 6. Check REST Framework configuration
print("\n6. Checking REST Framework Configuration:")
print("-" * 40)
rest_config = settings.REST_FRAMEWORK
print(f"Default authentication: {rest_config.get('DEFAULT_AUTHENTICATION_CLASSES')}")
print(f"Default permission: {rest_config.get('DEFAULT_PERMISSION_CLASSES')}")

# 7. List all URL patterns containing 'tag'
print("\n7. All URL patterns containing 'tag':")
print("-" * 40)
from django.urls import get_resolver

def list_urls(urlpatterns, prefix=''):
    urls = []
    from django.urls.resolvers import URLPattern, URLResolver
    for pattern in urlpatterns:
        if isinstance(pattern, URLPattern):
            url = prefix + str(pattern.pattern)
            urls.append(url)
        elif isinstance(pattern, URLResolver):
            new_prefix = prefix + str(pattern.pattern)
            urls.extend(list_urls(pattern.url_patterns, new_prefix))
    return urls

resolver = get_resolver()
all_urls = list_urls(resolver.url_patterns)
tag_urls = [url for url in all_urls if 'tag' in url.lower()]

for url in sorted(tag_urls):
    print(f"  {url}")

# 8. Test the endpoint programmatically
print("\n8. Testing Endpoint Programmatically:")
print("-" * 40)
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import force_authenticate

User = get_user_model()

try:
    # Get or create test user
    user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={'name': 'Test User'}
    )
    if created:
        user.set_password('testpass123')
        user.save()

    factory = RequestFactory()
    view = TagViewSet.as_view({'post': 'create', 'get': 'list'})

    # Test GET
    request = factory.get('/api/v1/tags/')
    force_authenticate(request, user=user)
    response = view(request)
    print(f"✓ GET /api/v1/tags/ - Status: {response.status_code}")

    # Test POST
    request = factory.post(
        '/api/v1/tags/',
        data={'name': 'Diagnostic Tag', 'color': '#123456'},
        content_type='application/json'
    )
    force_authenticate(request, user=user)
    response = view(request)
    print(f"✓ POST /api/v1/tags/ - Status: {response.status_code}")

    if response.status_code == 201:
        print(f"  Created tag: {response.data}")
    else:
        print(f"  Response: {response.data}")

except Exception as e:
    print(f"✗ Error testing endpoint: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("DIAGNOSTIC COMPLETE")
print("=" * 80)
print("\nIf the programmatic test works but HTTP requests return 404:")
print("  1. Check if the development server is running")
print("  2. Restart the development server to reload URL configuration")
print("  3. Check the URL you're using (must be exactly /api/v1/tags/)")
print("  4. Check HTTP method (POST requires authentication)")
print("  5. Verify CORS settings if accessing from frontend")
