import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category

print("Checking if the IDs from error exist:")
print(f"Category ID b50ffd98-aef2-4153-b9ce-0bb91eddfe62 exists: {Category.objects.filter(id='b50ffd98-aef2-4153-b9ce-0bb91eddfe62').exists()}")
print(f"Subcategory ID 6024fa04-2b39-4b11-9459-8ab506812eef exists: {Category.objects.filter(id='6024fa04-2b39-4b11-9459-8ab506812eef').exists()}")

print("\nActual main categories in database:")
main_cats = Category.objects.filter(parent__isnull=True)
for cat in main_cats:
    print(f"  {cat.name}: {cat.id}")

print("\nSample subcategories:")
subcats = Category.objects.filter(parent__isnull=False)[:10]
for cat in subcats:
    print(f"  {cat.name} (parent: {cat.parent.name}): {cat.id}")
