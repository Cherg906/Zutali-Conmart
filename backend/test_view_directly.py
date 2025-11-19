import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.views import admin_dashboard
from api.models import User
from rest_framework.test import APIRequestFactory
from rest_framework.authtoken.models import Token

# Get admin user and token
admin_user = User.objects.get(username='admin')
token = Token.objects.get(user=admin_user)

# Create a fake request
factory = APIRequestFactory()
request = factory.get('/api/admin/dashboard/')
request.user = admin_user

# Call the view
response = admin_dashboard(request)

print("Response status:", response.status_code)
print("\nResponse data:")
import json
print(json.dumps(response.data, indent=2))
