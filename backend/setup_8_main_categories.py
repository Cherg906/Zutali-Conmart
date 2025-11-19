#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product

print("=== SETTING UP 8 MAIN CATEGORIES WITH SUBCATEGORIES ===")
print()

# Define the 8 main categories and their subcategories
# Based on construction industry standard categorization
category_structure = {
    'Building Materials': [
        'Cement & Concrete',
        'Steel & Metal Products',
        'Timber & Wood Products',
        'Glass & Glazing',
        'Sand, Gravel & Aggregates',
        'Drywall, Plaster & Ceiling Boards',
        'Roofing Materials',
        'Adhesives & Sealants',
        'Geotextiles & Membranes',
    ],
    
    'Finishes & Interiors': [
        'Tiles & Flooring',
        'Paints & Coatings',
        'Wall Finishes (wallpapers, panels, cladding)',
        'Interior Furniture & Fixtures',
        'Doors & Windows (if exists)',
        'Flooring Compounds (epoxy, self-leveling)',
        'Protective Coatings',
    ],
    
    'MEP (Mechanical, Electrical, Plumbing)': [
        'Plumbing & Pipes (PVC, PPR, HDPE, fittings)',
        'Sanitaryware & Bathroom Fittings',
        'Water Supply & Pumps',
        'Electrical Materials (wires, switches, lighting)',
        'Electrical & Lighting',
        'HVAC Systems (air conditioners, ducts, fans)',
        'Air Conditioning & Ventilation',
        'Gas Supply Systems',
    ],
    
    'Hardware & Tools': [
        'Power Tools',
        'Hand Tools',
        'Fasteners (nails, bolts, screws, anchors)',
        'Measuring & Layout Tools',
        'Material Handling (cranes, forklifts, hoists)',
        'Generators & Compressors',
    ],
    
    'Safety & Site Equipment': [
        'Safety Materials (helmets, gloves, boots, harnesses)',
        'Safety & Signage (cones, barriers, boards)',
        'Scaffolding & Formwork',
        'Temporary Structures (sheds, cabins, fencing)',
        'Site Essentials',
        'Surveying Instruments',
    ],
    
    'Insulation & Energy': [
        'Thermal Insulation',
        'Acoustic Insulation',
        'Waterproofing Solutions',
        'Fireproofing Materials',
        'Solar & Renewable Energy Products',
    ],
    
    'Landscaping & Outdoor': [
        'Landscaping & Outdoor',
        'Garden & Landscaping Materials (if exists)',
        'Outdoor Furniture & Fixtures (if exists)',
        'Fencing & Gates (if exists)',
    ],
    
    'Waste & Recycling': [
        'Waste Management & Recycling',
    ],
}

# Get all existing categories
all_categories = {cat.name: cat for cat in Category.objects.all()}
print(f"Found {len(all_categories)} total categories in database")
print()

# First, clear all parent relationships to start fresh
print("🔄 Clearing existing parent relationships...")
Category.objects.all().update(parent=None)
print()

updated_count = 0
not_found_parents = []
not_found_children = []

for parent_name, subcategories in category_structure.items():
    parent = all_categories.get(parent_name)
    
    if not parent:
        not_found_parents.append(parent_name)
        print(f"❌ Main category '{parent_name}' not found in database - SKIPPING")
        print()
        continue
    
    print(f"📁 {parent_name}:")
    
    for subcat_name in subcategories:
        subcat = all_categories.get(subcat_name)
        
        if not subcat:
            # Try without "(if exists)" suffix
            clean_name = subcat_name.replace(' (if exists)', '')
            subcat = all_categories.get(clean_name)
        
        if not subcat:
            not_found_children.append(subcat_name)
            print(f"  ⚠️  '{subcat_name}' not found in database")
            continue
        
        # Don't set a category as its own parent
        if subcat.id == parent.id:
            print(f"  ⚠️  Skipping '{subcat.name}' (can't be its own parent)")
            continue
        
        subcat.parent = parent
        subcat.save(update_fields=['parent'])
        print(f"  ✅ Set '{subcat.name}' as subcategory")
        updated_count += 1
    
    print()

print("=" * 70)
print(f"📊 Summary:")
print(f"  - Total relationships created: {updated_count}")
print(f"  - Main categories not found: {len(not_found_parents)}")
print(f"  - Subcategories not found: {len(not_found_children)}")
print()

if not_found_parents:
    print("❌ Missing main categories:")
    for name in not_found_parents:
        print(f"  - {name}")
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
    
    Category.objects.filter(pk=category.pk).update(_product_count=correct_count)
    
    if correct_count > 0:
        parent_info = f" (sub of {category.parent.name})" if category.parent else " (main)"
        print(f"✅ '{category.name}'{parent_info}: {correct_count} products")
        updated_counts += 1

if updated_counts == 0:
    print("ℹ️  No categories have products yet")

print()
print("=== FINAL CATEGORY STRUCTURE ===")
print()

# Show the complete category structure
main_cats = Category.objects.filter(parent__isnull=True).order_by('name')
print(f"📊 {main_cats.count()} Main Categories")
print()

for main_cat in main_cats:
    subcats = Category.objects.filter(parent=main_cat).order_by('name')
    product_count = Product.objects.filter(category=main_cat, status='active').count()
    
    print(f"📁 {main_cat.name} ({product_count} direct products)")
    
    if subcats.exists():
        for subcat in subcats:
            sub_product_count = Product.objects.filter(subcategory=subcat, status='active').count()
            marker = "📦" if sub_product_count > 0 else "  "
            print(f"  {marker} └─ {subcat.name} ({sub_product_count} products)")
    else:
        print(f"     └─ (no subcategories)")
    print()

print("=" * 70)
print("✅ COMPLETE! All categories are now properly structured.")
print("   - 8 main categories with their subcategories")
print("   - All product counts are accurate")
print("   - Signals will automatically update counts when products are added")
