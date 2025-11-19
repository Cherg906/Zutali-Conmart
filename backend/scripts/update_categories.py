#!/usr/bin/env python
"""
Script to update categories with the new structure.
Run this with: python manage.py shell < scripts/update_categories.py
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zutali_backend.settings')
django.setup()

from api.models import Category
from django.utils.text import slugify

# New category structure with subcategories
CATEGORIES = [
    {
        'name': 'Building Materials',
        'name_amharic': 'የግንባታ ቁሳቁሶች',
        'description': 'Essential construction materials for building projects',
        'description_amharic': 'ለግንባታ ፕሮጀክቶች አስፈላጊ የሆኑ የግንባታ ቁሳቁሶች',
        'icon': 'building',
        'subcategories': [
            'Cement & Concrete',
            'Sand, Gravel & Aggregates', 
            'Bricks, Blocks & Masonry',
            'Steel & Metal Products',
            'Timber & Wood Products',
            'Roofing Materials',
            'Glass & Glazing',
            'Drywall, Plaster & Ceiling Boards'
        ]
    },
    {
        'name': 'Finishes & Interiors',
        'name_amharic': 'የውስጥ ማጠናቀቂያዎች',
        'description': 'Interior finishing materials and fixtures',
        'description_amharic': 'የውስጥ ማጠናቀቂያ ቁሳቁሶች እና መሳሪያዎች',
        'icon': 'palette',
        'subcategories': [
            'Tiles & Flooring',
            'Paints & Coatings',
            'Wall Finishes (wallpapers, panels, cladding)',
            'Doors, Windows & Frames',
            'Interior Furniture & Fixtures',
            'Sanitaryware & Bathroom Fittings'
        ]
    },
    {
        'name': 'MEP (Mechanical, Electrical, Plumbing)',
        'name_amharic': 'ሜካኒካል፣ ኤሌክትሪካል እና ፓይፕ',
        'description': 'Mechanical, electrical and plumbing systems',
        'description_amharic': 'ሜካኒካል፣ ኤሌክትሪካል እና የውሃ ቧንቧ ስርዓቶች',
        'icon': 'zap',
        'subcategories': [
            'Plumbing & Pipes (PVC, PPR, HDPE, fittings)',
            'Electrical Materials (wires, switches, lighting)',
            'HVAC Systems (air conditioners, ducts, fans)',
            'Water Supply & Pumps',
            'Gas Supply Systems'
        ]
    },
    {
        'name': 'Construction Chemicals',
        'name_amharic': 'የግንባታ ኬሚካሎች',
        'description': 'Chemical products for construction applications',
        'description_amharic': 'ለግንባታ አፕሊኬሽኖች የሚሆኑ ኬሚካላዊ ምርቶች',
        'icon': 'flask',
        'subcategories': [
            'Concrete Admixtures',
            'Waterproofing Solutions',
            'Adhesives, Sealants & Grouts',
            'Protective Coatings',
            'Flooring Compounds (epoxy, self-leveling)'
        ]
    },
    {
        'name': 'Insulation & Energy',
        'name_amharic': 'ኢንሱሌሽን እና ኢነርጂ',
        'description': 'Insulation materials and energy solutions',
        'description_amharic': 'የኢንሱሌሽን ቁሳቁሶች እና የኢነርጂ መፍትሄዎች',
        'icon': 'shield',
        'subcategories': [
            'Thermal Insulation',
            'Acoustic Insulation',
            'Fireproofing Materials',
            'Solar & Renewable Energy Products'
        ]
    },
    {
        'name': 'Hardware & Tools',
        'name_amharic': 'ሃርድዌር እና መሳሪያዎች',
        'description': 'Construction tools and hardware',
        'description_amharic': 'የግንባታ መሳሪያዎች እና ሃርድዌር',
        'icon': 'wrench',
        'subcategories': [
            'Hand Tools',
            'Power Tools',
            'Fasteners (nails, bolts, screws, anchors)',
            'Measuring & Layout Tools',
            'Safety Materials (helmets, gloves, boots, harnesses)'
        ]
    },
    {
        'name': 'Construction Equipment & Machinery',
        'name_amharic': 'የግንባታ መሳሪያዎች እና ማሽኖች',
        'description': 'Heavy machinery and construction equipment',
        'description_amharic': 'ከባድ ማሽኖች እና የግንባታ መሳሪያዎች',
        'icon': 'truck',
        'subcategories': [
            'Earth moving Equipment (excavators, bulldozers)',
            'Concrete Equipment (mixers, pumps, vibrators)',
            'Material Handling (cranes, forklifts, hoists)',
            'Compaction Equipment (rollers, rammers)',
            'Scaffolding & Formwork',
            'Generators & Compressors'
        ]
    },
    {
        'name': 'Site Essentials',
        'name_amharic': 'የሳይት አስፈላጊዎች',
        'description': 'Essential site management and safety materials',
        'description_amharic': 'አስፈላጊ የሳይት አስተዳደር እና የደህንነት ቁሳቁሶች',
        'icon': 'hard-hat',
        'subcategories': [
            'Temporary Structures (sheds, cabins, fencing)',
            'Safety & Signage (cones, barriers, boards)',
            'Waste Management & Recycling',
            'Surveying Instruments'
        ]
    }
]

def update_categories():
    """Update categories with new structure"""
    print("Updating categories...")
    
    # Clear existing categories
    Category.objects.all().delete()
    print("Cleared existing categories")
    
    # Create new categories
    for i, cat_data in enumerate(CATEGORIES):
        category = Category.objects.create(
            name=cat_data['name'],
            name_amharic=cat_data['name_amharic'],
            slug=slugify(cat_data['name']),
            description=cat_data['description'],
            description_amharic=cat_data['description_amharic'],
            icon=cat_data['icon'],
            order=i,
            is_active=True,
            category_images=[
                f"https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
                f"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
                f"https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop"
            ]
        )
        print(f"Created category: {category.name}")
    
    print(f"Successfully created {len(CATEGORIES)} categories")

if __name__ == "__main__":
    update_categories()
