#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category

# Check Timber & Wood Products
timber = Category.objects.filter(name='Timber & Wood Products').first()
if timber:
    print(f"Timber & Wood Products:")
    print(f"  ID: {timber.id}")
    print(f"  parent_id: {timber.parent_id}")
    print(f"  parent: {timber.parent}")
    print(f"  parent name: {timber.parent.name if timber.parent else 'None'}")
else:
    print("Timber & Wood Products not found")

print("\nAll categories with their parents:")
for cat in Category.objects.all().order_by('name'):
    parent_name = cat.parent.name if cat.parent else "None"
    print(f"  {cat.name}: parent={parent_name}")
