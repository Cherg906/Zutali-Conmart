#!/usr/bin/env python3
"""
Simple script to add subcategories manually
"""
import os
import sys
import django
from django.utils.text import slugify

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category

def add_subcategories():
    """Add subcategories as regular categories"""
    
    subcategories = [
        # Building Materials subcategories
        {
            'name': 'Cement & Concrete',
            'name_amharic': 'ሲሚንቶ እና ኮንክሪት',
            'description': 'Portland cement, ready-mix concrete, concrete blocks',
            'description_amharic': 'ፖርትላንድ ሲሚንቶ፣ ዝግጁ ኮንክሪት፣ የኮንክሪት ብሎኮች',
            'icon': 'building-2'
        },
        {
            'name': 'Steel & Metal',
            'name_amharic': 'ብረት እና ብረታ ብረት',
            'description': 'Rebar, steel beams, metal sheets, structural steel',
            'description_amharic': 'ሪባር፣ የብረት ምሰሶዎች፣ የብረት ሉሆች፣ መዋቅራዊ ብረት',
            'icon': 'hammer'
        },
        {
            'name': 'Bricks & Blocks',
            'name_amharic': 'ጡብ እና ብሎኮች',
            'description': 'Clay bricks, concrete blocks, hollow blocks, pavers',
            'description_amharic': 'የሸክላ ጡቦች፣ የኮንክሪት ብሎኮች፣ ባዶ ብሎኮች፣ ፓቨሮች',
            'icon': 'brick-wall'
        },
        {
            'name': 'Timber & Wood',
            'name_amharic': 'እንጨት',
            'description': 'Lumber, plywood, hardwood, softwood, engineered wood',
            'description_amharic': 'እንጨት፣ ፕላይዉድ፣ ጠንካራ እንጨት፣ ለስላሳ እንጨት፣ የተሰራ እንጨት',
            'icon': 'tree-pine'
        },
        # Finishes & Interiors subcategories
        {
            'name': 'Paint & Coatings',
            'name_amharic': 'ቀለም እና ሽፋን',
            'description': 'Interior paint, exterior paint, primers, varnish',
            'description_amharic': 'የውስጥ ቀለም፣ የውጭ ቀለም፣ ፕራይመሮች፣ ቫርኒሽ',
            'icon': 'paint-brush'
        },
        {
            'name': 'Tiles & Flooring',
            'name_amharic': 'ሰሌዳዎች እና ወለል',
            'description': 'Ceramic tiles, porcelain, marble, granite, vinyl',
            'description_amharic': 'የሴራሚክ ሰሌዳዎች፣ ፖርሴሊን፣ እብነ በረድ፣ ግራናይት፣ ቪኒል',
            'icon': 'square-stack'
        },
        {
            'name': 'Doors & Windows',
            'name_amharic': 'በሮች እና መስኮቶች',
            'description': 'Wooden doors, aluminum windows, frames, hardware',
            'description_amharic': 'የእንጨት በሮች፣ የአሉሚኒየም መስኮቶች፣ ፍሬሞች፣ መሳሪያዎች',
            'icon': 'door-open'
        },
        # MEP subcategories
        {
            'name': 'Plumbing & Pipes',
            'name_amharic': 'የቧንቧ ስራ',
            'description': 'PVC pipes, fittings, valves, water tanks, fixtures',
            'description_amharic': 'ፒቪሲ ቧንቧዎች፣ መገጣጠሚያዎች፣ ቫልቮች፣ የውሃ ታንኮች፣ መገጣጠሚያዎች',
            'icon': 'pipe'
        },
        {
            'name': 'Electrical Materials',
            'name_amharic': 'የኤሌክትሪክ ቁሳቁሶች',
            'description': 'Wires, cables, switches, sockets, circuit breakers',
            'description_amharic': 'ሽቦዎች፣ ኬብሎች፣ ማብሪያ ማጥፊያዎች፣ ሶኬቶች፣ የወረዳ መቋረጫዎች',
            'icon': 'zap'
        }
    ]
    
    created_count = 0
    for subcat in subcategories:
        slug = slugify(subcat['name'])
        
        # Check if category already exists
        if not Category.objects.filter(slug=slug).exists():
            try:
                Category.objects.create(
                    name=subcat['name'],
                    name_amharic=subcat['name_amharic'],
                    slug=slug,
                    description=subcat['description'],
                    description_amharic=subcat['description_amharic'],
                    icon=subcat['icon'],
                    category_images=[
                        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop&q=80"
                    ]
                )
                created_count += 1
                print(f"✅ Created: {subcat['name']}")
            except Exception as e:
                print(f"❌ Error creating {subcat['name']}: {e}")
        else:
            print(f"⚠️  Already exists: {subcat['name']}")
    
    print(f"\n🎉 Total new categories created: {created_count}")
    print(f"📊 Total categories in database: {Category.objects.count()}")

if __name__ == "__main__":
    add_subcategories()
