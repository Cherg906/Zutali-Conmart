import requests
import json

# Test Django categories API
response = requests.get('http://localhost:8000/api/categories/')
data = response.json()

print("Status Code:", response.status_code)
print("\nResponse structure:")
if isinstance(data, list):
    print(f"  Type: List with {len(data)} items")
    if len(data) > 0:
        print(f"\n  First category:")
        print(f"    ID: {data[0].get('id')}")
        print(f"    Name: {data[0].get('name')}")
        print(f"    Slug: {data[0].get('slug')}")
elif isinstance(data, dict):
    print(f"  Type: Dict with keys: {list(data.keys())}")
    if 'results' in data:
        results = data['results']
        print(f"  Results count: {len(results)}")
        if len(results) > 0:
            print(f"\n  First category:")
            print(f"    ID: {results[0].get('id')}")
            print(f"    Name: {results[0].get('name')}")
            print(f"    Slug: {results[0].get('slug')}")

print("\n\nAll main categories (no parent):")
categories = data if isinstance(data, list) else data.get('results', [])
main_cats = [c for c in categories if not c.get('parent_id')]
for cat in main_cats[:3]:
    print(f"  - {cat.get('name')}: {cat.get('id')}")
