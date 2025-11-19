#!/usr/bin/env python3
"""
Script to create subcategories for existing categories
"""
import os
import sys
import django
from django.utils.text import slugify

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category

def create_subcategories():
    """Create subcategories for construction materials"""
    
    # Get existing categories
    building_materials = Category.objects.filter(name="Building Materials").first()
    finishes_interiors = Category.objects.filter(name="Finishes & Interiors").first()
    mep = Category.objects.filter(name__contains="MEP").first()
    construction_chemicals = Category.objects.filter(name="Construction Chemicals").first()
    
    subcategories_data = []
    
    if building_materials:
        subcategories_data.extend([
            {
                'name': 'Cement & Concrete',
                'name_amharic': 'ሲሚንቶ እና ኮንክሪት',
                'description': 'Portland cement, ready-mix concrete, concrete blocks',
                'description_amharic': 'ፖርትላንድ ሲሚንቶ፣ ዝግጁ ኮንክሪት፣ የኮንክሪት ብሎኮች',
                'icon': 'building-2',
                'parent_id': building_materials.id
            },
            {
                'name': 'Steel & Metal',
                'name_amharic': 'ብረት እና ብረታ ብረት',
                'description': 'Rebar, steel beams, metal sheets, structural steel',
                'description_amharic': 'ሪባር፣ የብረት ምሰሶዎች፣ የብረት ሉሆች፣ መዋቅራዊ ብረት',
                'icon': 'hammer',
                'parent_id': building_materials.id
            },
            {
                'name': 'Bricks & Blocks',
                'name_amharic': 'ጡብ እና ብሎኮች',
                'description': 'Clay bricks, concrete blocks, hollow blocks, pavers',
                'description_amharic': 'የሸክላ ጡቦች፣ የኮንክሪት ብሎኮች፣ ባዶ ብሎኮች፣ ፓቨሮች',
                'icon': 'brick-wall',
                'parent_id': building_materials.id
            },
            {
                'name': 'Timber & Wood',
                'name_amharic': 'እንጨት',
                'description': 'Lumber, plywood, hardwood, softwood, engineered wood',
                'description_amharic': 'እንጨት፣ ፕላይዉድ፣ ጠንካራ እንጨት፣ ለስላሳ እንጨት፣ የተሰራ እንጨት',
                'icon': 'tree-pine',
                'parent_id': building_materials.id
            }
        ])
    
    if finishes_interiors:
        subcategories_data.extend([
            {
                'name': 'Paint & Coatings',
                'name_amharic': 'ቀለም እና ሽፋን',
                'description': 'Interior paint, exterior paint, primers, varnish',
                'description_amharic': 'የውስጥ ቀለም፣ የውጭ ቀለም፣ ፕራይመሮች፣ ቫርኒሽ',
                'icon': 'paint-brush',
                'parent_id': finishes_interiors.id
            },
            {
                'name': 'Tiles & Flooring',
                'name_amharic': 'ሰሌዳዎች እና ወለል',
                'description': 'Ceramic tiles, porcelain, marble, granite, vinyl',
                'description_amharic': 'የሴራሚክ ሰሌዳዎች፣ ፖርሴሊን፣ እብነ በረድ፣ ግራናይት፣ ቪኒል',
                'icon': 'square-stack',
                'parent_id': finishes_interiors.id
            },
            {
                'name': 'Doors & Windows',
                'name_amharic': 'በሮች እና መስኮቶች',
                'description': 'Wooden doors, aluminum windows, frames, hardware',
                'description_amharic': 'የእንጨት በሮች፣ የአሉሚኒየም መስኮቶች፣ ፍሬሞች፣ መሳሪያዎች',
                'icon': 'door-open',
                'parent_id': finishes_interiors.id
            }
        ])
    
    if mep:
        subcategories_data.extend([
            {
                'name': 'Plumbing & Pipes',
                'name_amharic': 'የቧንቧ ስራ',
                'description': 'PVC pipes, fittings, valves, water tanks, fixtures',
                'description_amharic': 'ፒቪሲ ቧንቧዎች፣ መገጣጠሚያዎች፣ ቫልቮች፣ የውሃ ታንኮች፣ መገጣጠሚያዎች',
                'icon': 'pipe',
                'parent_id': mep.id
            },
            {
                'name': 'Electrical Materials',
                'name_amharic': 'የኤሌክትሪክ ቁሳቁሶች',
                'description': 'Wires, cables, switches, sockets, circuit breakers',
                'description_amharic': 'ሽቦዎች፣ ኬብሎች፣ ማብሪያ ማጥፊያዎች፣ ሶኬቶች፣ የወረዳ መቋረጫዎች',
                'icon': 'zap',
                'parent_id': mep.id
            }
        ])
    
    # Create subcategories
    created_count = 0
    for subcat_data in subcategories_data:
        slug = slugify(subcat_data['name'])
        
        # Check if subcategory already exists
        if not Category.objects.filter(slug=slug).exists():
            Category.objects.create(
                name=subcat_data['name'],
                name_amharic=subcat_data['name_amharic'],
                slug=slug,
                description=subcat_data['description'],
                description_amharic=subcat_data['description_amharic'],
                icon=subcat_data['icon'],
                category_images=[
                    f"https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop&q=80"
                ],
                order=created_count + 100  # Higher order for subcategories
            )
            created_count += 1
            print(f"Created subcategory: {subcat_data['name']}")
        else:
            print(f"Subcategory already exists: {subcat_data['name']}")
    
    print(f"\nTotal subcategories created: {created_count}")
    print("Subcategories creation completed!")

if __name__ == "__main__":
    create_subcategories()
