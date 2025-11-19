#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category

print("=== ALL CATEGORIES IN DATABASE ===")
print()

all_cats = Category.objects.all().order_by('name')
print(f"Total: {all_cats.count()} categories\n")

for cat in all_cats:
    parent_info = f" → parent: {cat.parent.name}" if cat.parent else ""
    print(f"- {cat.name}{parent_info}")
