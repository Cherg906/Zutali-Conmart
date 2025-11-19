#!/usr/bin/env python3
"""
Test authentication directly with Django
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('c:/Users/Administrator/Desktop/zutali_conmart-V0/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Setup Django
django.setup()

from django.contrib.auth import authenticate

def test_auth():
    print("Testing Django Authentication")
    print("="*40)
    
    # Test admin authentication
    user = authenticate(username='admin', password='zutali_admin_2024')
    print(f"Admin auth result: {user}")
    if user:
        print(f"Admin user found: {user.username}, Role: {user.role}")
    else:
        print("Admin authentication failed")
    
    # Test with different password
    user = authenticate(username='admin', password='admin')
    print(f"Admin with 'admin' password: {user}")
    
    # Test user authentication
    user = authenticate(username='chernetg@gmail.com', password='password123')
    print(f"User auth result: {user}")
    if user:
        print(f"User found: {user.username}, Role: {user.role}")
    else:
        print("User authentication failed")

if __name__ == "__main__":
    test_auth()
