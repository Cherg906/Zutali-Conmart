"""
Management command to populate categories and subcategories
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from api.models import Category


class Command(BaseCommand):
    help = 'Populate categories and subcategories for construction materials'

    def handle(self, *args, **options):
        self.stdout.write('Starting category population...')

        categories_data = {
            'Building Materials': [
                'Cement & Concrete',
                'Sand, Gravel & Aggregates',
                'Bricks, Blocks & Masonry',
                'Steel & Metal Products',
                'Timber & Wood Products',
                'Roofing Materials',
                'Glass & Glazing',
                'Drywall, Plaster & Ceiling Boards',
            ],
            'Finishes & Interiors': [
                'Tiles & Flooring',
                'Paints & Coatings',
                'Wall Finishes',
                'Doors, Windows & Frames',
                'Interior Furniture & Fixtures',
                'Sanitaryware & Bathroom Fittings',
            ],
            'MEP (Mechanical, Electrical, Plumbing)': [
                'Plumbing & Pipes',
                'Electrical Materials',
                'HVAC Systems',
                'Water Supply & Pumps',
                'Gas Supply Systems',
            ],
            'Construction Chemicals': [
                'Concrete Admixtures',
                'Waterproofing Solutions',
                'Adhesives, Sealants & Grouts',
                'Protective Coatings',
                'Flooring Compounds',
            ],
            'Insulation & Energy': [
                'Thermal Insulation',
                'Acoustic Insulation',
                'Fireproofing Materials',
                'Solar & Renewable Energy Products',
            ],
            'Hardware & Tools': [
                'Hand Tools',
                'Power Tools',
                'Fasteners',
                'Measuring & Layout Tools',
                'Safety Materials',
            ],
            'Construction Equipment & Machinery': [
                'Earthmoving Equipment',
                'Concrete Equipment',
                'Material Handling',
                'Compaction Equipment',
                'Scaffolding & Formwork',
                'Generators & Compressors',
            ],
            'Site Essentials': [
                'Temporary Structures',
                'Safety & Signage',
                'Waste Management & Recycling',
                'Surveying Instruments',
            ],
        }

        # Amharic translations for main categories
        amharic_names = {
            'Building Materials': 'የግንባታ ቁሳቁሶች',
            'Finishes & Interiors': 'የውስጥ ማጠናቀቂያዎች',
            'MEP (Mechanical, Electrical, Plumbing)': 'ሜካኒካል፣ ኤሌክትሪክ እና ቧንቧ',
            'Construction Chemicals': 'የግንባታ ኬሚካሎች',
            'Insulation & Energy': 'መከላከያ እና ኃይል',
            'Hardware & Tools': 'መሳሪያዎች',
            'Construction Equipment & Machinery': 'የግንባታ መሳሪያዎች',
            'Site Essentials': 'የግንባታ ቦታ አስፈላጊዎች',
        }

        # Placeholder images for categories (using Unsplash construction-related images)
        category_images = {
            'Building Materials': [
                'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&h=600&fit=crop',
            ],
            'Finishes & Interiors': [
                'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800&h=600&fit=crop',
            ],
            'MEP (Mechanical, Electrical, Plumbing)': [
                'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop',
            ],
            'Construction Chemicals': [
                'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
            ],
            'Insulation & Energy': [
                'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&h=600&fit=crop',
            ],
            'Hardware & Tools': [
                'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&h=600&fit=crop',
            ],
            'Construction Equipment & Machinery': [
                'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1590859808308-3d2d9c515b1a?w=800&h=600&fit=crop',
            ],
            'Site Essentials': [
                'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop',
            ],
        }

        created_count = 0
        updated_count = 0

        for order, (category_name, subcategories) in enumerate(categories_data.items(), start=1):
            # Create or update main category
            category, created = Category.objects.get_or_create(
                name=category_name,
                defaults={
                    'slug': slugify(category_name),
                    'name_amharic': amharic_names.get(category_name, ''),
                    'order': order,
                    'is_active': True,
                    'description': f'Browse {category_name.lower()} for your construction needs',
                    'category_images': category_images.get(category_name, []),
                }
            )
            
            # Update images if category already exists
            if not created and category_name in category_images:
                category.category_images = category_images[category_name]
                category.save()

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'[+] Created category: {category_name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'[*] Category already exists: {category_name}'))

            # Create subcategories
            for sub_order, subcategory_name in enumerate(subcategories, start=1):
                subcategory, sub_created = Category.objects.get_or_create(
                    name=subcategory_name,
                    defaults={
                        'slug': slugify(subcategory_name),
                        'parent': category,
                        'order': sub_order,
                        'is_active': True,
                        'description': f'{subcategory_name} products and materials',
                    }
                )

                if sub_created:
                    created_count += 1
                    self.stdout.write(f'  [+] Created subcategory: {subcategory_name}')
                else:
                    updated_count += 1
                    self.stdout.write(f'  [*] Subcategory already exists: {subcategory_name}')

        self.stdout.write(self.style.SUCCESS(f'\n[SUCCESS] Category population complete!'))
        self.stdout.write(f'Created: {created_count} categories/subcategories')
        self.stdout.write(f'Already existed: {updated_count} categories/subcategories')
        self.stdout.write(f'Total categories in database: {Category.objects.count()}')
