#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product

print("=== ANALYZING ALL CATEGORIES ===")
print()

# Get all categories
all_categories = Category.objects.all().order_by('name')

print("Current category structure:")
print()

main_categories = []
potential_subcategories = []

for cat in all_categories:
    if cat.parent:
        print(f"✅ {cat.name} (subcategory of {cat.parent.name})")
    else:
        print(f"📁 {cat.name} (main category)")
        main_categories.append(cat.name)
        
print()
print(f"Found {len(main_categories)} main categories")
print()

# Check which categories have products
print("=== CATEGORIES WITH PRODUCTS ===")
for cat in all_categories:
    # Count products in both category and subcategory fields
    as_category = Product.objects.filter(category=cat, status='active').count()
    as_subcategory = Product.objects.filter(subcategory=cat, status='active').count()
    
    if as_category > 0 or as_subcategory > 0:
        parent_info = f"(sub of {cat.parent.name})" if cat.parent else "(main)"
        print(f"{cat.name} {parent_info}:")
        print(f"  As main category: {as_category} products")
        print(f"  As subcategory: {as_subcategory} products")
        print(f"  Current _product_count: {cat._product_count}")
        
        # Show actual products
        if as_subcategory > 0:
            products = Product.objects.filter(subcategory=cat, status='active')[:3]
            print(f"  Sample products as subcategory:")
            for p in products:
                main_cat = p.category.name if p.category else "None"
                print(f"    - {p.name} (main cat: {main_cat})")
        print()
