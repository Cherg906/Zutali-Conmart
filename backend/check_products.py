import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Product, Category

print("Total products:", Product.objects.count())
print("\nProducts by status:")
for status in ['active', 'under_review', 'rejected', 'draft']:
    count = Product.objects.filter(status=status).count()
    print(f"  {status}: {count}")

print("\nSample products:")
products = Product.objects.all()[:5]
for p in products:
    print(f"  - {p.name}")
    print(f"    ID: {p.id}")
    print(f"    Status: {p.status}")
    print(f"    Category: {p.category.name if p.category else 'None'} (ID: {p.category_id})")
    print(f"    Subcategory: {p.subcategory.name if p.subcategory else 'None'} (ID: {p.subcategory_id})")
    print()

print("\nChecking subcategory with products:")
subcats_with_products = Category.objects.filter(parent__isnull=False).annotate(
    product_count=models.Count('sub_products', filter=models.Q(sub_products__status='active'))
).filter(product_count__gt=0)

from django.db import models
subcats_with_products = Category.objects.filter(parent__isnull=False)
for subcat in subcats_with_products:
    count = subcat.sub_products.filter(status='active').count()
    if count > 0:
        print(f"  {subcat.name} (ID: {subcat.id}): {count} products")
