#!/usr/bin/env python3
"""
Test script to verify login validation for different account types
"""

import requests
import json

# Base URLs
DJANGO_URL = "http://127.0.0.1:8000"
NEXTJS_URL = "http://localhost:3000"

def test_login_via_api(email_or_phone, password, user_type):
    """Test login via Next.js API route"""
    url = f"{NEXTJS_URL}/api/auth/login"
    
    # Determine if it's email or phone
    if "@" in email_or_phone:
        payload = {
            "email": email_or_phone,
            "password": password,
            "userType": user_type
        }
    else:
        payload = {
            "phone": email_or_phone,
            "password": password,
            "userType": user_type
        }
    
    print(f"\n{'='*50}")
    print(f"Testing {user_type} login with: {email_or_phone}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
        else:
            print("❌ Login failed!")
            error_msg = response.json().get('message', 'No error message')
            print(f"Error: {error_msg}")
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")

def main():
    print("Testing Login Validation")
    print("="*50)
    
    # Test cases with real credentials from database
    test_cases = [
        # Test with user credentials trying to login as product owner
        ("chernetg@gmail.com", "password123", "owner"),  # Assuming password
        
        # Test with user credentials trying to login as admin
        ("chernetg@gmail.com", "password123", "admin"),
        
        # Test with product owner credentials trying to login as user
        ("muluyeasnake2@gmail.com", "password123", "user"),
        
        # Test with admin credentials trying to login as user
        ("admin@zutali.com", "zutali_admin_2024", "user"),
        
        # Test with admin credentials trying to login as product owner
        ("admin@zutali.com", "zutali_admin_2024", "owner"),
        
        # Test correct logins (these should work)
        ("admin@zutali.com", "zutali_admin_2024", "admin"),
    ]
    
    for email, password, user_type in test_cases:
        test_login_via_api(email, password, user_type)
    
    print("\n" + "="*50)
    print("Test complete!")

if __name__ == "__main__":
    main()
