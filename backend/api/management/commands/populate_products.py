from django.core.management.base import BaseCommand
from django.utils.text import slugify
from api.models import Category, Product, ProductOwner, User
from decimal import Decimal
import random

class Command(BaseCommand):
    help = 'Populate sample products for testing'

    def handle(self, *args, **options):
        self.stdout.write('Populating sample products...')
        
        # Get or create a sample product owner
        try:
            owner_user = User.objects.get(username='sample_owner')
        except User.DoesNotExist:
            owner_user = User.objects.create_user(
                username='sample_owner',
                email='owner@example.com',
                password='password123',
                first_name='Sample',
                last_name='Owner'
            )
        
        try:
            owner = ProductOwner.objects.get(user=owner_user)
        except ProductOwner.DoesNotExist:
            owner = ProductOwner.objects.create(
                user=owner_user,
                business_name='Sample Construction Supplies',
                business_description='Leading supplier of construction materials',
                business_phone='+251911123456',
                business_address='Addis Ababa, Ethiopia',
                tier='standard',
                verification_status='verified',
                subscription_active=True,
                products_limit=100
            )

        # Sample products by category
        SAMPLE_PRODUCTS = {
            'Building Materials': [
                {
                    'name': 'Portland Cement 50kg',
                    'name_amharic': 'ፖርትላንድ ሲሚንቶ 50 ኪ.ግ',
                    'description': 'High-quality Portland cement for all construction needs',
                    'price': 850.00,
                    'unit': 'bag',
                    'minimum_order': 10,
                    'stock_quantity': 500
                },
                {
                    'name': 'Steel Rebar 12mm',
                    'name_amharic': 'የብረት ዘንግ 12ሚሜ',
                    'description': 'High-grade steel reinforcement bars',
                    'price': 45.00,
                    'unit': 'meter',
                    'minimum_order': 50,
                    'stock_quantity': 1000
                },
                {
                    'name': 'Concrete Blocks 20x20x40cm',
                    'name_amharic': 'ኮንክሪት ብሎኮች 20x20x40ሴሜ',
                    'description': 'Standard concrete blocks for construction',
                    'price': 25.00,
                    'unit': 'piece',
                    'minimum_order': 100,
                    'stock_quantity': 2000
                },
                {
                    'name': 'Red Bricks',
                    'name_amharic': 'ቀይ ጡቦች',
                    'description': 'Traditional red clay bricks',
                    'price': 8.50,
                    'unit': 'piece',
                    'minimum_order': 500,
                    'stock_quantity': 5000
                }
            ],
            'Finishes & Interiors': [
                {
                    'name': 'Ceramic Floor Tiles 60x60cm',
                    'name_amharic': 'የሴራሚክ ወለል ሰሌዳዎች 60x60ሴሜ',
                    'description': 'Premium ceramic floor tiles',
                    'price': 180.00,
                    'unit': 'sqm',
                    'minimum_order': 20,
                    'stock_quantity': 300
                },
                {
                    'name': 'Interior Paint - White 20L',
                    'name_amharic': 'የውስጥ ቀለም - ነጭ 20ሊ',
                    'description': 'High-quality interior wall paint',
                    'price': 1200.00,
                    'unit': 'bucket',
                    'minimum_order': 5,
                    'stock_quantity': 100
                },
                {
                    'name': 'Wooden Doors - Standard',
                    'name_amharic': 'የእንጨት በሮች - መደበኛ',
                    'description': 'Standard wooden interior doors',
                    'price': 2500.00,
                    'unit': 'piece',
                    'minimum_order': 1,
                    'stock_quantity': 50
                }
            ],
            'MEP (Mechanical, Electrical, Plumbing)': [
                {
                    'name': 'PVC Pipes 110mm',
                    'name_amharic': 'ፒቪሲ ቧንቧዎች 110ሚሜ',
                    'description': 'PVC drainage pipes',
                    'price': 350.00,
                    'unit': 'meter',
                    'minimum_order': 20,
                    'stock_quantity': 500
                },
                {
                    'name': 'Electrical Wire 2.5mm²',
                    'name_amharic': 'የኤሌክትሪክ ሽቦ 2.5ሚሜ²',
                    'description': 'Copper electrical wire',
                    'price': 85.00,
                    'unit': 'meter',
                    'minimum_order': 100,
                    'stock_quantity': 2000
                },
                {
                    'name': 'Water Pump 1HP',
                    'name_amharic': 'የውሃ ፓምፕ 1ሆርስ ፓወር',
                    'description': 'Centrifugal water pump',
                    'price': 8500.00,
                    'unit': 'piece',
                    'minimum_order': 1,
                    'stock_quantity': 15
                }
            ],
            'Construction Chemicals': [
                {
                    'name': 'Waterproofing Membrane',
                    'name_amharic': 'የውሃ መከላከያ ሽፋን',
                    'description': 'Bituminous waterproofing membrane',
                    'price': 450.00,
                    'unit': 'sqm',
                    'minimum_order': 50,
                    'stock_quantity': 200
                },
                {
                    'name': 'Tile Adhesive 25kg',
                    'name_amharic': 'የሰሌዳ ማጣበቂያ 25ኪ.ግ',
                    'description': 'High-strength tile adhesive',
                    'price': 380.00,
                    'unit': 'bag',
                    'minimum_order': 10,
                    'stock_quantity': 150
                }
            ],
            'Hardware & Tools': [
                {
                    'name': 'Hammer - 500g',
                    'name_amharic': 'መዶሻ - 500ግ',
                    'description': 'Steel claw hammer',
                    'price': 450.00,
                    'unit': 'piece',
                    'minimum_order': 1,
                    'stock_quantity': 80
                },
                {
                    'name': 'Screwdriver Set',
                    'name_amharic': 'የስክሪው ማዞሪያ ስብስብ',
                    'description': 'Professional screwdriver set',
                    'price': 850.00,
                    'unit': 'set',
                    'minimum_order': 1,
                    'stock_quantity': 40
                }
            ]
        }

        # Clear existing products
        deleted_count = Product.objects.all().delete()[0]
        self.stdout.write(f'Deleted {deleted_count} existing products')
        
        created_count = 0
        for category_name, products in SAMPLE_PRODUCTS.items():
            try:
                category = Category.objects.get(name=category_name)
                
                for product_data in products:
                    product = Product.objects.create(
                        name=product_data['name'],
                        name_amharic=product_data['name_amharic'],
                        description=product_data['description'],
                        category=category,
                        owner=owner,
                        price=Decimal(str(product_data['price'])),
                        unit=product_data['unit'],
                        min_order_quantity=product_data['minimum_order'],
                        available_quantity=product_data['stock_quantity'],
                        location='Addis Ababa',
                        city='Addis Ababa',
                        status='active',
                        images=[
                            "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
                            "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop"
                        ],
                        specifications={
                            'brand': 'Premium Brand',
                            'origin': 'Ethiopia',
                            'warranty': '1 year'
                        },
                        brand='Premium Brand'
                    )
                    created_count += 1
                    self.stdout.write(f'Created: {product.name} in {category.name}')
                    
            except Category.DoesNotExist:
                self.stdout.write(f'Category "{category_name}" not found, skipping...')
                continue
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} sample products')
        )
