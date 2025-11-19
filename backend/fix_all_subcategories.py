#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product

print("=== FIXING ALL SUBCATEGORY RELATIONSHIPS ===")
print()

# Define the correct parent-child relationships based on actual product usage
subcategory_mappings = {
    'Building Materials': [
        'Timber & Wood Products',
        'Glass & Glazing',
        'Drywall, Plaster & Ceiling Boards',
        'Roofing Materials',
        'Sand, Gravel & Aggregates',
        'Cement & Concrete',
        'Bricks & Blocks',
        'Steel & Metal Products',
        'Pipes & Plumbing Materials',
    ],
    'Finishes & Interiors': [
        'Interior Furniture & Fixtures',
        'Tiles & Flooring',
        'Paints & Coatings',
        'Wall Finishes (wallpapers, panels, cladding)',
        'Doors & Windows',
        'Lighting & Electrical Fixtures',
    ],
    'Hardware & Tools': [
        'Power Tools',
        'Hand Tools',
        'Fasteners & Fixings',
    ],
    'Insulation & Energy': [
        'Thermal Insulation',
        'Acoustic Insulation',
        'Solar & Renewable Energy Products',
    ],
    'Safety & Site Equipment': [
        'Safety Materials (helmets, gloves, boots, harnesses)',
        'Safety & Signage (cones, barriers, boards)',
        'Scaffolding & Formwork',
        'Temporary Structures (sheds, cabins, fencing)',
    ],
    'Plumbing & Sanitary': [
        'Sanitaryware & Bathroom Fittings',
        'Water Supply & Pumps',
        'Drainage & Sewage Systems',
    ],
    'HVAC & Climate Control': [
        'Air Conditioning & Ventilation',
        'Heating Systems',
    ],
    'Electrical & Lighting': [
        'Cables & Wiring',
        'Electrical Panels & Switches',
        'Generators & Power Backup',
    ],
    'Landscaping & Outdoor': [
        'Garden & Landscaping Materials',
        'Outdoor Furniture & Fixtures',
        'Fencing & Gates',
    ],
    'Specialized Construction': [
        'Waterproofing Solutions',
        'Adhesives & Sealants',
        'Construction Chemicals',
        'Geotextiles & Membranes',
    ],
}

updated_count = 0
not_found = []

for parent_name, subcategories in subcategory_mappings.items():
    parent = Category.objects.filter(name=parent_name).first()
    
    if not parent:
        print(f"⚠️  Parent category '{parent_name}' not found, skipping...")
        continue
    
    print(f"📁 {parent_name}:")
    
    for subcat_name in subcategories:
        subcat = Category.objects.filter(name=subcat_name).first()
        
        if subcat:
            if subcat.parent != parent:
                subcat.parent = parent
                subcat.save(update_fields=['parent'])
                print(f"  ✅ Set '{subcat.name}' as subcategory")
                updated_count += 1
            else:
                print(f"  ✓ '{subcat.name}' already correct")
        else:
            not_found.append(subcat_name)
            print(f"  ⚠️  '{subcat_name}' not found in database")
    
    print()

print(f"📊 Updated {updated_count} subcategory relationships")

if not_found:
    print(f"\n⚠️  {len(not_found)} categories not found in database:")
    for name in not_found:
        print(f"  - {name}")

print()
print("=== UPDATING ALL PRODUCT COUNTS ===")

# Now update all product counts
for category in Category.objects.all():
    if category.parent:
        # This is a subcategory - count products where subcategory field matches
        correct_count = Product.objects.filter(subcategory=category, status='active').count()
    else:
        # This is a main category - count products where category field matches
        correct_count = Product.objects.filter(category=category, status='active').count()
    
    if category._product_count != correct_count:
        Category.objects.filter(pk=category.pk).update(_product_count=correct_count)
        print(f"✅ Updated '{category.name}': {category._product_count} → {correct_count}")

print()
print("=== VERIFICATION ===")
print()

# Show categories with products
categories_with_products = []
for cat in Category.objects.all():
    as_subcategory = Product.objects.filter(subcategory=cat, status='active').count()
    if as_subcategory > 0:
        parent_info = f"(sub of {cat.parent.name})" if cat.parent else "(MISSING PARENT!)"
        categories_with_products.append((cat.name, parent_info, as_subcategory, cat._product_count))

if categories_with_products:
    print("Categories used as subcategories:")
    for name, parent_info, actual, stored in categories_with_products:
        status = "✅" if actual == stored else "❌"
        print(f"{status} {name} {parent_info}: {stored} products (actual: {actual})")
else:
    print("No categories are being used as subcategories")

print()
print("✅ All done!")
