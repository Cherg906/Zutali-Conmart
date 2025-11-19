import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Product, Category, ProductOwner, User
from decimal import Decimal

# Get or create a test product owner
admin_user = User.objects.filter(username='admin').first()
if not admin_user:
    print("Error: Admin user not found")
    exit(1)

# Create a product owner for testing
product_owner, created = ProductOwner.objects.get_or_create(
    user=admin_user,
    defaults={
        'business_name': 'Test Construction Supplies',
        'business_phone': '+251911234567',
        'business_address': '123 Construction Street',
        'business_city': 'Addis Ababa',
        'verification_status': 'verified',
        'delivery_available': True,
    }
)

if created:
    print(f"Created product owner: {product_owner.business_name}")
else:
    print(f"Using existing product owner: {product_owner.business_name}")

# Get a subcategory (Cement & Concrete)
cement_subcat = Category.objects.filter(name='Cement & Concrete').first()
if not cement_subcat:
    print("Error: Cement & Concrete subcategory not found")
    exit(1)

# Get the main category (Building Materials)
building_materials = Category.objects.filter(name='Building Materials').first()
if not building_materials:
    print("Error: Building Materials category not found")
    exit(1)

print(f"Found subcategory: {cement_subcat.name} (ID: {cement_subcat.id})")
print(f"Found main category: {building_materials.name} (ID: {building_materials.id})")

# Create test products
test_products = [
    {
        'name': 'Portland Cement 50kg',
        'description': 'High-quality Portland cement suitable for all construction needs',
        'price': Decimal('850.00'),
        'unit': 'bag',
        'available_quantity': 500,
    },
    {
        'name': 'White Cement 25kg',
        'description': 'Premium white cement for finishing work',
        'price': Decimal('1200.00'),
        'unit': 'bag',
        'available_quantity': 200,
    },
    {
        'name': 'Ready Mix Concrete',
        'description': 'Pre-mixed concrete ready for use',
        'price': Decimal('2500.00'),
        'unit': 'm3',
        'available_quantity': 50,
    },
]

created_count = 0
for product_data in test_products:
    product, created = Product.objects.get_or_create(
        name=product_data['name'],
        owner=product_owner,
        defaults={
            'description': product_data['description'],
            'price': product_data['price'],
            'unit': product_data['unit'],
            'available_quantity': product_data['available_quantity'],
            'category': building_materials,
            'subcategory': cement_subcat,
            'status': 'active',
            'location': 'Addis Ababa',
            'city': 'Addis Ababa',
        }
    )
    
    if created:
        created_count += 1
        print(f"✓ Created product: {product.name}")
    else:
        print(f"→ Product already exists: {product.name}")

print(f"\n✅ Done! Created {created_count} new products")
print(f"Total products in database: {Product.objects.count()}")
print(f"Active products: {Product.objects.filter(status='active').count()}")
print(f"Products in Cement & Concrete: {Product.objects.filter(subcategory=cement_subcat, status='active').count()}")
