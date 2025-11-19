#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product

def update_all_category_counts():
    print("=== UPDATING ALL CATEGORY COUNTS ===")
    print()

    # First, let's check the Timber category specifically
    timber = Category.objects.filter(name='Timber & Wood Products').first()
    if timber:
        print(f"🎯 Found Timber & Wood Products:")
        print(f"   Parent: {timber.parent.name if timber.parent else 'None'}")
        print(f"   Current count: {timber._product_count}")

        # Count products manually
        sub_products_count = timber.sub_products.filter(status='active').count()
        print(f"   Products via sub_products: {sub_products_count}")

        # Update Timber count
        if timber._product_count != sub_products_count:
            timber._product_count = sub_products_count
            timber.save(update_fields=['_product_count'])
            print(f"   ✅ Updated Timber count: {timber._product_count}")
        else:
            print(f"   ✅ Timber count already correct: {timber._product_count}")

        # Update parent if exists
        if timber.parent:
            parent = timber.parent
            parent_count = parent.products.filter(status='active').count()
            if parent._product_count != parent_count:
                parent._product_count = parent_count
                parent.save(update_fields=['_product_count'])
                print(f"   ✅ Updated parent {parent.name}: {parent._product_count}")
    else:
        print("❌ Timber & Wood Products category not found")

    print()
    print("📊 Updating all other categories...")

    updated_count = 0
    for category in Category.objects.all():
        if category.name == 'Timber & Wood Products':
            continue  # Already handled above

        if category.parent:
            # This is a subcategory - count products where subcategory field matches
            correct_count = category.sub_products.filter(status='active').count()
        else:
            # This is a main category - count products where category field matches
            correct_count = category.products.filter(status='active').count()

        if category._product_count != correct_count:
            old_count = category._product_count
            category._product_count = correct_count
            category.save(update_fields=['_product_count'])
            updated_count += 1
            print(f"✅ Updated '{category.name}': {old_count} → {correct_count}")
        else:
            print(f"✅ Already correct '{category.name}': {correct_count}")

    print()
    print(f"📊 Updated {updated_count} categories total")

    # Final check
    if timber:
        print(f"\n🎯 Final Timber & Wood Products count: {timber._product_count}")

if __name__ == "__main__":
    update_all_category_counts()
