#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category, Product, ProductOwner, User

def test_signal():
    print("=== TESTING SIGNAL FUNCTIONALITY ===")
    print()

    # Find Timber & Wood Products
    timber = Category.objects.filter(name='Timber & Wood Products').first()
    if not timber:
        print("❌ Timber category not found")
        return

    print(f"🎯 Timber & Wood Products:")
    print(f"   Current count: {timber._product_count}")
    print()

    # Get or create a test product owner
    test_user, _ = User.objects.get_or_create(
        username='test_owner',
        defaults={'email': 'test@example.com', 'role': 'product_owner'}
    )
    test_user.set_password('testpass123')
    test_user.save()

    product_owner, _ = ProductOwner.objects.get_or_create(
        user=test_user,
        defaults={'business_name': 'Test Business'}
    )

    # Get Building Materials as main category
    building_materials = Category.objects.filter(name='Building Materials').first()
    if not building_materials:
        print("❌ Building Materials category not found")
        return

    print(f"📦 Creating test product...")
    print(f"   Main category: {building_materials.name}")
    print(f"   Subcategory: {timber.name}")
    print()

    # Create a test product
    test_product = Product.objects.create(
        owner=product_owner,
        category=building_materials,
        subcategory=timber,
        name='Test Timber Product',
        description='Test product to verify signals',
        unit='piece',
        location='Test Location',
        status='active'
    )

    print(f"✅ Created product: {test_product.name}")
    print()

    # Refresh from database
    timber.refresh_from_db()
    building_materials.refresh_from_db()

    print(f"📊 After creation:")
    print(f"   Timber count: {timber._product_count}")
    print(f"   Building Materials count: {building_materials._product_count}")
    print()

    # Clean up
    print("🧹 Cleaning up test product...")
    test_product.delete()

    # Refresh again
    timber.refresh_from_db()
    building_materials.refresh_from_db()

    print(f"📊 After deletion:")
    print(f"   Timber count: {timber._product_count}")
    print(f"   Building Materials count: {building_materials._product_count}")

if __name__ == "__main__":
    test_signal()
