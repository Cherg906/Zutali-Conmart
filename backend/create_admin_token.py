import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import User
from rest_framework.authtoken.models import Token

# Get or create admin user
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@zutali.com',
        'first_name': 'Admin',
        'last_name': 'User',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': True,
        'is_active': True,
    }
)

if created:
    admin_user.set_password('admin123')
    admin_user.save()
    print(f"✓ Created admin user: {admin_user.username}")
else:
    print(f"→ Admin user already exists: {admin_user.username}")
    # Update to ensure admin role
    admin_user.role = 'admin'
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.is_active = True
    admin_user.save()
    print(f"✓ Updated admin user permissions")

# Get or create token for admin user
token, created = Token.objects.get_or_create(user=admin_user)

print(f"\n{'='*60}")
print(f"Admin Token: {token.key}")
print(f"{'='*60}")
print(f"\nUse this token in the frontend:")
print(f"localStorage.setItem('admin_token', '{token.key}')")
print(f"localStorage.setItem('authToken', '{token.key}')")
