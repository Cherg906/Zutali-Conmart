#!/usr/bin/env python
"""
Test script to verify Django admin login functionality
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client

def test_admin_login():
    """Test admin login functionality"""
    print("=== Testing Django Admin Login ===")

    User = get_user_model()

    # Check if admin user exists
    try:
        admin = User.objects.get(username='admin')
        print(f"✅ Admin user found: {admin.username}")
        print(f"   - Email: {admin.email}")
        print(f"   - Is staff: {admin.is_staff}")
        print(f"   - Is superuser: {admin.is_superuser}")
        print(f"   - Is active: {admin.is_active}")
    except User.DoesNotExist:
        print("❌ Admin user not found!")
        return False

    # Test login with Django test client
    client = Client()
    response = client.post('/admin/login/', {
        'username': 'admin',
        'password': 'zutali_admin_2024'
    })

    print(f"Login response status: {response.status_code}")

    if response.status_code in [200, 302]:  # 302 is redirect after successful login
        print("✅ Admin login successful!")
        return True
    else:
        print("❌ Admin login failed!")
        print(f"Response content: {response.content[:500]}...")
        return False

def test_session_settings():
    """Test session configuration"""
    from django.conf import settings
    print("\n=== Session Configuration ===")
    print(f"Session engine: {settings.SESSION_ENGINE}")
    print(f"Session cookie age: {settings.SESSION_COOKIE_AGE}")
    print(f"Session save every request: {settings.SESSION_SAVE_EVERY_REQUEST}")
    print(f"Debug mode: {settings.DEBUG}")

if __name__ == '__main__':
    print("Django admin login test script")
    print("=" * 40)

    # Test session settings
    test_session_settings()

    # Test admin login
    success = test_admin_login()

    if success:
        print("\n🎉 All tests passed! Admin login should work correctly.")
        print("\nTo access admin panel:")
        print("1. Go to: http://localhost:8000/admin/")
        print("2. Username: admin")
        print("3. Password: zutali_admin_2024")
    else:
        print("\n❌ Tests failed! Check the configuration.")
