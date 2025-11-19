import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from rest_framework.authtoken.models import Token
from api.models import User

# Check if admin token exists
admin_token = '6d9215b9003606babe98f4cc5535c8ff034cdedf'

try:
    token = Token.objects.get(key=admin_token)
    user = token.user
    print(f"✓ Token is valid")
    print(f"  User: {user.username}")
    print(f"  Email: {user.email}")
    print(f"  Role: {user.role}")
    print(f"  Is Admin: {user.role == 'admin'}")
    print(f"  Is Active: {user.is_active}")
    print(f"  Is Staff: {user.is_staff}")
    print(f"  Is Superuser: {user.is_superuser}")
except Token.DoesNotExist:
    print("✗ Token not found in database!")
    print("\nAll tokens in database:")
    for token in Token.objects.all()[:5]:
        print(f"  {token.key} -> {token.user.username}")
