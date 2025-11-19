import requests

# Test admin dashboard API with the admin token
admin_token = 'a95e6ea0162901c57edc940a9a86e22c947b37df'

print("Testing admin dashboard API...")
print(f"Token: {admin_token[:20]}...")

response = requests.get(
    'http://localhost:8000/api/admin/dashboard/',
    headers={
        'Authorization': f'Token {admin_token}',
        'Content-Type': 'application/json',
    }
)

print(f"\nStatus Code: {response.status_code}")
print(f"\nResponse:")
if response.status_code == 200:
    import json
    print(json.dumps(response.json(), indent=2))
else:
    print(response.text)
