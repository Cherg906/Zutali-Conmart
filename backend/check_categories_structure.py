import requests
import json

# Fetch categories from API
response = requests.get('http://localhost:8000/api/categories/')
data = response.json()

# Get categories list
cats = data if isinstance(data, list) else data.get('results', [])

# Filter main categories
main_categories = [c for c in cats if not c.get('parent_id')]

print(f"Total categories in API: {len(cats)}")
print(f"Main categories: {len(main_categories)}\n")

# Show each main category and its subcategories
for cat in main_categories:
    subcats = cat.get('subcategories', [])
    print(f"\n{cat['name']}:")
    print(f"  ID: {cat['id']}")
    print(f"  Subcategories: {len(subcats)}")
    for sub in subcats:
        print(f"    - {sub['name']}")
