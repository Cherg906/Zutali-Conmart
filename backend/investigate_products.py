#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product

def investigate_products():
    print("=== INVESTIGATING PRODUCTS ===")
    print()

    # Find all products
    all_products = Product.objects.filter(status='active')
    print(f"📊 Total active products: {all_products.count()}")

    if all_products.count() == 0:
        print("❌ No active products found in database!")
        return

    print("\n📦 All products and their categories:")
    for product in all_products:
        category_name = product.category.name if product.category else "No category"
        subcategory_name = product.subcategory.name if product.subcategory else "No subcategory"
        print(f"   - {product.name}")
        print(f"     Main category: {category_name}")
        print(f"     Subcategory: {subcategory_name}")
        print()

    # Check Timber specifically
    timber = Category.objects.filter(name='Timber & Wood Products').first()
    if timber:
        print(f"🎯 Timber & Wood Products category:")
        print(f"   ID: {timber.id}")
        print(f"   Parent: {timber.parent.name if timber.parent else 'None'}")

        # Check if there are products with this as subcategory
        timber_products = Product.objects.filter(subcategory=timber, status='active')
        print(f"   Products with subcategory={timber.name}: {timber_products.count()}")

        if timber_products.exists():
            print("   Product names:")
            for p in timber_products:
                print(f"     - {p.name}")

        # Also check if there are products with this as main category
        main_cat_products = Product.objects.filter(category=timber, status='active')
        print(f"   Products with category={timber.name}: {main_cat_products.count()}")

    print("\n=== ALL CATEGORIES AND COUNTS ===")
    for category in Category.objects.all().order_by('name'):
        parent_info = f"(sub of {category.parent.name})" if category.parent else "(main)"
        print(f"{category.name} {parent_info}: {category._product_count} products")

if __name__ == "__main__":
    investigate_products()
