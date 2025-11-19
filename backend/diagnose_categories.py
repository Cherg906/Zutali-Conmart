#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product

def diagnose_categories():
    print("=== CATEGORY DIAGNOSTIC ===")
    print()

    # Find Timber & Wood Products
    timber = Category.objects.filter(name='Timber & Wood Products').first()
    if not timber:
        print("❌ Timber & Wood Products category not found")
        return

    print(f"✅ Found: {timber.name}")
    print(f"   Parent: {timber.parent.name if timber.parent else 'None'}")
    print(f"   Current count: {timber._product_count}")
    print()

    # Count products manually
    products_in_subcategory = Product.objects.filter(subcategory=timber, status='active')
    products_in_category = Product.objects.filter(category=timber, status='active')

    print(f"📊 Products with subcategory={timber.name}: {products_in_subcategory.count()}")
    print(f"📊 Products with category={timber.name}: {products_in_category.count()}")
    print()

    # Show actual products
    if products_in_subcategory.exists():
        print("📦 Products in subcategory:")
        for product in products_in_subcategory:
            category_name = product.category.name if product.category else "No category"
            print(f"   - {product.name} (main category: {category_name})")
    else:
        print("📦 No products found in subcategory")

    print()

    # Update the count
    correct_count = products_in_subcategory.count()
    if timber._product_count != correct_count:
        print(f"🔄 Updating count from {timber._product_count} to {correct_count}")
        timber._product_count = correct_count
        timber.save(update_fields=['_product_count'])
        print(f"✅ Updated! New count: {timber._product_count}")
    else:
        print(f"✅ Count is already correct: {timber._product_count}")

if __name__ == "__main__":
    diagnose_categories()
