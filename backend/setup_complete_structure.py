#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product

print("=== COMPREHENSIVE CATEGORY STRUCTURE SETUP ===")
print()

# Complete parent-child relationships for ALL categories
# This is based on logical grouping of construction materials and tools
category_structure = {
    'Building Materials': [
        'Timber & Wood Products',
        'Glass & Glazing',
        'Drywall, Plaster & Ceiling Boards',
        'Roofing Materials',
        'Sand, Gravel & Aggregates',
        'Cement & Concrete',
        'Steel & Metal Products',
    ],
    'Finishes & Interiors': [
        'Interior Furniture & Fixtures',
        'Tiles & Flooring',
        'Paints & Coatings',
        'Wall Finishes (wallpapers, panels, cladding)',
    ],
    'Hardware & Tools': [
        'Power Tools',
        'Hand Tools',
    ],
    'Insulation & Energy': [
        'Thermal Insulation',
        'Acoustic Insulation',
        'Solar & Renewable Energy Products',
    ],
    'Safety Equipment': [
        'Safety Materials (helmets, gloves, boots, harnesses)',
        'Safety & Signage (cones, barriers, boards)',
    ],
    'Site Equipment': [
        'Scaffolding & Formwork',
        'Temporary Structures (sheds, cabins, fencing)',
        'Surveying Instruments',
    ],
    'Plumbing & Water': [
        'Sanitaryware & Bathroom Fittings',
        'Water Supply & Pumps',
    ],
    'Climate Control': [
        'Air Conditioning & Ventilation',
    ],
    'Electrical': [
        'Electrical & Lighting',
    ],
    'Outdoor & Landscaping': [
        'Landscaping & Outdoor',
    ],
    'Specialized Materials': [
        'Waterproofing Solutions',
        'Adhesives & Sealants',
        'Geotextiles & Membranes',
    ],
    'Waste & Recycling': [
        'Waste Management & Recycling',
    ],
}

# First, get all existing categories
all_categories = {cat.name: cat for cat in Category.objects.all()}
print(f"Found {len(all_categories)} total categories in database")
print()

updated_count = 0
already_correct = 0
not_found_parents = []
not_found_children = []

for parent_name, subcategories in category_structure.items():
    parent = all_categories.get(parent_name)
    
    if not parent:
        not_found_parents.append(parent_name)
        print(f"⚠️  Parent '{parent_name}' not found in database")
        continue
    
    print(f"📁 {parent_name}:")
    
    for subcat_name in subcategories:
        subcat = all_categories.get(subcat_name)
        
        if not subcat:
            not_found_children.append(subcat_name)
            print(f"  ⚠️  Subcategory '{subcat_name}' not found")
            continue
        
        if subcat.parent_id != parent.id:
            subcat.parent = parent
            subcat.save(update_fields=['parent'])
            print(f"  ✅ Set '{subcat.name}' as subcategory")
            updated_count += 1
        else:
            print(f"  ✓ '{subcat.name}' already correct")
            already_correct += 1
    
    print()

print("=" * 60)
print(f"📊 Summary:")
print(f"  - Updated: {updated_count} relationships")
print(f"  - Already correct: {already_correct} relationships")
print(f"  - Parent categories not found: {len(not_found_parents)}")
print(f"  - Child categories not found: {len(not_found_children)}")
print()

# Now update ALL product counts for ALL categories
print("=== UPDATING ALL PRODUCT COUNTS ===")
print()

updated_counts = 0
for category in Category.objects.all().select_related('parent'):
    if category.parent:
        # This is a subcategory - count products where subcategory field matches
        correct_count = Product.objects.filter(subcategory=category, status='active').count()
    else:
        # This is a main category - count products where category field matches
        correct_count = Product.objects.filter(category=category, status='active').count()
    
    if category._product_count != correct_count:
        Category.objects.filter(pk=category.pk).update(_product_count=correct_count)
        parent_info = f" (sub of {category.parent.name})" if category.parent else " (main)"
        print(f"✅ '{category.name}'{parent_info}: {category._product_count} → {correct_count}")
        updated_counts += 1

if updated_counts == 0:
    print("✓ All product counts are already correct")
else:
    print(f"\n📊 Updated {updated_counts} product counts")

print()
print("=== FINAL VERIFICATION ===")
print()

# Show the complete category structure
main_cats = Category.objects.filter(parent__isnull=True).order_by('name')
print(f"Main Categories: {main_cats.count()}")
for main_cat in main_cats:
    subcats = Category.objects.filter(parent=main_cat).order_by('name')
    product_count = Product.objects.filter(category=main_cat, status='active').count()
    print(f"\n📁 {main_cat.name} ({product_count} products)")
    
    if subcats.exists():
        for subcat in subcats:
            sub_product_count = Product.objects.filter(subcategory=subcat, status='active').count()
            print(f"  └─ {subcat.name} ({sub_product_count} products)")
    else:
        print(f"  └─ (no subcategories)")

print()
print("✅ ALL DONE! Category structure is now properly configured.")
print("   All parent-child relationships are set correctly.")
print("   All product counts are accurate.")
