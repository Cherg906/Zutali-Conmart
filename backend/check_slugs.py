import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category

print("Main categories:")
cats = Category.objects.filter(parent__isnull=True)
for c in cats:
    print(f"  {c.name}: slug='{c.slug}'")

print("\nSample subcategories:")
subcats = Category.objects.filter(parent__isnull=False)[:5]
for c in subcats:
    print(f"  {c.name}: slug='{c.slug}'")
