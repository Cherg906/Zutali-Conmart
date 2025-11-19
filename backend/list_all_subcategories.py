import requests

# Fetch categories from API
response = requests.get('http://localhost:8000/api/categories/')
data = response.json()

# Get categories list
cats = data if isinstance(data, list) else data.get('results', [])

# Get all subcategories (those with parent_id)
subcategories = [c for c in cats if c.get('parent_id')]

# Group by parent
from collections import defaultdict
by_parent = defaultdict(list)

for sub in subcategories:
    parent_id = sub['parent_id']
    # Find parent name
    parent = next((c for c in cats if c['id'] == parent_id), None)
    parent_name = parent['name'] if parent else 'Unknown'
    by_parent[parent_name].append(sub['name'])

print(f"Total subcategories in database: {len(subcategories)}\n")

for parent_name in sorted(by_parent.keys()):
    subs = by_parent[parent_name]
    print(f"\n{parent_name}: ({len(subs)} subcategories)")
    for sub_name in sorted(subs):
        print(f"  - {sub_name}")
