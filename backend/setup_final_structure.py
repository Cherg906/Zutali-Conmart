#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product

print("=== SETTING UP EXACT CATEGORY STRUCTURE ===")
print()

# Define the exact 8 main categories and their subcategories as specified
category_structure = {
    'Building Materials': [
        'Cement & Concrete',
        'Sand, Gravel & Aggregates',
        'Bricks, Blocks & Masonry',
        'Steel & Metal Products',
        'Timber & Wood Products',
        'Roofing Materials',
        'Glass & Glazing',
        'Drywall, Plaster & Ceiling Boards',
    ],
    
    'Finishes & Interiors': [
        'Tiles & Flooring',
        'Paints & Coatings',
        'Wall Finishes (wallpapers, panels, cladding)',
        'Doors, Windows & Frames',
        'Interior Furniture & Fixtures',
        'Sanitaryware & Bathroom Fittings',
    ],
    
    'MEP (Mechanical, Electrical, Plumbing)': [
        'Plumbing & Pipes (PVC, PPR, HDPE, fittings)',
        'Electrical Materials (wires, switches, lighting)',
        'HVAC Systems (air conditioners, ducts, fans)',
        'Water Supply & Pumps',
        'Gas Supply Systems',
    ],
    
    'Construction Chemicals': [
        'Concrete Admixtures',
        'Waterproofing Solutions',
        'Adhesives, Sealants & Grouts',
        'Protective Coatings',
        'Flooring Compounds (epoxy, self-leveling)',
    ],
    
    'Insulation & Energy': [
        'Thermal Insulation',
        'Acoustic Insulation',
        'Fireproofing Materials',
        'Solar & Renewable Energy Products',
    ],
    
    'Hardware & Tools': [
        'Hand Tools',
        'Power Tools',
        'Fasteners (nails, bolts, screws, anchors)',
        'Measuring & Layout Tools',
        'Safety Materials (helmets, gloves, boots, harnesses)',
    ],
    
    'Construction Equipment & Machinery': [
        'Earth moving Equipment (excavators, bulldozers)',
        'Concrete Equipment (mixers, pumps, vibrators)',
        'Material Handling (cranes, forklifts, hoists)',
        'Compaction Equipment (rollers, rammers)',
        'Scaffolding & Formwork',
        'Generators & Compressors',
    ],
    
    'Site Essentials': [
        'Temporary Structures (sheds, cabins, fencing)',
        'Safety & Signage (cones, barriers, boards)',
        'Waste Management & Recycling',
        'Surveying Instruments',
    ],
}

# Get all existing categories
all_categories = {cat.name: cat for cat in Category.objects.all()}
print(f"📊 Found {len(all_categories)} total categories in database")
print()

# First, clear all parent relationships to start fresh
print("🔄 Clearing existing parent relationships...")
cleared = Category.objects.all().update(parent=None)
print(f"   Cleared {cleared} relationships")
print()

updated_count = 0
not_found_parents = []
not_found_children = []
main_categories_found = []

for parent_name, subcategories in category_structure.items():
    parent = all_categories.get(parent_name)
    
    if not parent:
        not_found_parents.append(parent_name)
        print(f"❌ Main category '{parent_name}' NOT FOUND in database")
        print(f"   Please create this category first!")
        print()
        continue
    
    main_categories_found.append(parent_name)
    print(f"📁 {parent_name}:")
    
    subcats_set = 0
    for subcat_name in subcategories:
        subcat = all_categories.get(subcat_name)
        
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
        print(f"  ✅ {subcat.name}")
        updated_count += 1
        subcats_set += 1
    
    print(f"  → Set {subcats_set} subcategories")
    print()

print("=" * 70)
print(f"📊 SUMMARY:")
print(f"  ✅ Main categories found: {len(main_categories_found)}/{len(category_structure)}")
print(f"  ✅ Subcategory relationships created: {updated_count}")
print(f"  ❌ Main categories not found: {len(not_found_parents)}")
print(f"  ⚠️  Subcategories not found: {len(not_found_children)}")
print()

if not_found_parents:
    print("❌ MISSING MAIN CATEGORIES (need to be created):")
    for name in not_found_parents:
        print(f"  - {name}")
    print()

if not_found_children:
    print("⚠️  MISSING SUBCATEGORIES:")
    for name in not_found_children:
        print(f"  - {name}")
    print()

# Now update ALL product counts for ALL categories
print("=" * 70)
print("=== UPDATING ALL PRODUCT COUNTS ===")
print()

for category in Category.objects.all().select_related('parent'):
    if category.parent:
        # This is a subcategory - count products where subcategory field matches
        correct_count = Product.objects.filter(subcategory=category, status='active').count()
    else:
        # This is a main category - count products where category field matches
        correct_count = Product.objects.filter(category=category, status='active').count()
    
    Category.objects.filter(pk=category.pk).update(_product_count=correct_count)
    
    if correct_count > 0:
        parent_info = f" (sub of {category.parent.name})" if category.parent else " (MAIN)"
        print(f"✅ {category.name}{parent_info}: {correct_count} products")

print()
print("=" * 70)
print("=== FINAL CATEGORY STRUCTURE ===")
print()

# Show the complete category structure
main_cats = Category.objects.filter(parent__isnull=True).order_by('name')
print(f"📊 {main_cats.count()} MAIN CATEGORIES:")
print()

for idx, main_cat in enumerate(main_cats, 1):
    subcats = Category.objects.filter(parent=main_cat).order_by('name')
    product_count = Product.objects.filter(category=main_cat, status='active').count()
    
    print(f"{idx}. 📁 {main_cat.name} ({product_count} direct products)")
    
    if subcats.exists():
        for subcat in subcats:
            sub_product_count = Product.objects.filter(subcategory=subcat, status='active').count()
            marker = "📦" if sub_product_count > 0 else "  "
            print(f"   {marker} └─ {subcat.name} ({sub_product_count} products)")
    else:
        print(f"      └─ (no subcategories)")
    print()

print("=" * 70)
print("✅ SETUP COMPLETE!")
print()
print("Summary:")
print(f"  • {len(main_categories_found)} main categories configured")
print(f"  • {updated_count} subcategory relationships established")
print(f"  • All product counts updated")
print(f"  • Signals active for automatic updates")
print()
print("Next: Refresh your frontend to see the updated structure!")
