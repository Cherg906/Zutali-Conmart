#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category

print("=== FIXING SUBCATEGORY RELATIONSHIPS ===")
print()

# Get Building Materials as the main category
building_materials = Category.objects.filter(name='Building Materials').first()
if not building_materials:
    print("❌ Building Materials category not found!")
    exit(1)

print(f"✅ Found main category: {building_materials.name}")
print()

# List of subcategories that should belong to Building Materials
subcategories = [
    'Timber & Wood Products',
    'Glass & Glazing',
    'Drywall, Plaster & Ceiling Boards',
    'Roofing Materials',
    # Add more as needed
]

updated_count = 0
for subcat_name in subcategories:
    subcat = Category.objects.filter(name=subcat_name).first()
    if subcat:
        if subcat.parent != building_materials:
            subcat.parent = building_materials
            subcat.save(update_fields=['parent'])
            print(f"✅ Set {subcat.name} as subcategory of {building_materials.name}")
            updated_count += 1
        else:
            print(f"✅ {subcat.name} already has correct parent")
    else:
        print(f"❌ Subcategory '{subcat_name}' not found")

print()
print(f"📊 Updated {updated_count} subcategories")

# Verify
print()
print("=== VERIFICATION ===")
timber = Category.objects.filter(name='Timber & Wood Products').first()
if timber:
    print(f"Timber & Wood Products:")
    print(f"  Parent: {timber.parent.name if timber.parent else 'None'}")
    print(f"  Parent ID: {timber.parent_id}")
