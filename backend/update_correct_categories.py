#!/usr/bin/env python3
"""
Script to update categories with the correct structure
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

def update_categories():
    """Update categories with correct structure"""
    
    # First, clear existing categories to avoid conflicts
    print("🧹 Clearing existing categories...")
    Category.objects.all().delete()
    
    # Define the correct category structure
    categories_data = {
        "Building Materials": [
            "Cement & Concrete",
            "Sand, Gravel & Aggregates", 
            "Bricks, Blocks & Masonry",
            "Steel & Metal Products",
            "Timber & Wood Products",
            "Roofing Materials",
            "Glass & Glazing",
            "Drywall, Plaster & Ceiling Boards"
        ],
        "Finishes & Interiors": [
            "Tiles & Flooring",
            "Paints & Coatings", 
            "Wall Finishes (wallpapers, panels, cladding)",
            "Doors, Windows & Frames",
            "Interior Furniture & Fixtures",
            "Sanitaryware & Bathroom Fittings"
        ],
        "MEP (Mechanical, Electrical, Plumbing)": [
            "Plumbing & Pipes (PVC, PPR, HDPE, fittings)",
            "Electrical Materials (wires, switches, lighting)",
            "HVAC Systems (air conditioners, ducts, fans)",
            "Water Supply & Pumps",
            "Gas Supply Systems"
        ],
        "Construction Chemicals": [
            "Concrete Admixtures",
            "Waterproofing Solutions",
            "Adhesives, Sealants & Grouts", 
            "Protective Coatings",
            "Flooring Compounds (epoxy, self-leveling)"
        ],
        "Insulation & Energy": [
            "Thermal Insulation",
            "Acoustic Insulation",
            "Fireproofing Materials",
            "Solar & Renewable Energy Products"
        ],
        "Hardware & Tools": [
            "Hand Tools",
            "Power Tools",
            "Fasteners (nails, bolts, screws, anchors)",
            "Measuring & Layout Tools",
            "Safety Materials (helmets, gloves, boots, harnesses)"
        ],
        "Construction Equipment & Machinery": [
            "Earth moving Equipment (excavators, bulldozers)",
            "Concrete Equipment (mixers, pumps, vibrators)",
            "Material Handling (cranes, forklifts, hoists)",
            "Compaction Equipment (rollers, rammers)",
            "Scaffolding & Formwork",
            "Generators & Compressors"
        ],
        "Site Essentials": [
            "Temporary Structures (sheds, cabins, fencing)",
            "Safety & Signage (cones, barriers, boards)",
            "Waste Management & Recycling",
            "Surveying Instruments"
        ]
    }
    
    created_count = 0
    
    # Create main categories first
    print("\n📁 Creating main categories...")
    for main_category_name in categories_data.keys():
        main_slug = slugify(main_category_name)
        
        try:
            main_category = Category.objects.create(
                name=main_category_name,
                name_amharic=f"{main_category_name} (አማርኛ)",  # Placeholder Amharic
                slug=main_slug,
                description=f"All {main_category_name.lower()} for construction projects",
                description_amharic=f"ለግንባታ ፕሮጀክቶች {main_category_name}",
                icon="folder",
                category_images=[
                    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop&q=80"
                ]
            )
            created_count += 1
            print(f"✅ Created main category: {main_category_name}")
            
            # Create subcategories
            print(f"   📂 Creating subcategories for {main_category_name}...")
            for subcategory_name in categories_data[main_category_name]:
                sub_slug = slugify(subcategory_name)
                
                try:
                    Category.objects.create(
                        name=subcategory_name,
                        name_amharic=f"{subcategory_name} (አማርኛ)",  # Placeholder Amharic
                        slug=sub_slug,
                        description=f"{subcategory_name} products and materials",
                        description_amharic=f"{subcategory_name} ምርቶች እና ቁሳቁሶች",
                        icon="package",
                        category_images=[
                            "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop&q=80"
                        ]
                    )
                    created_count += 1
                    print(f"   ✅ Created subcategory: {subcategory_name}")
                    
                except Exception as e:
                    print(f"   ❌ Error creating subcategory {subcategory_name}: {e}")
                    
        except Exception as e:
            print(f"❌ Error creating main category {main_category_name}: {e}")
    
    print(f"\n🎉 Total categories created: {created_count}")
    print(f"📊 Total categories in database: {Category.objects.count()}")
    
    # Print summary
    print("\n📋 SUMMARY:")
    main_categories = Category.objects.filter(
        slug__in=[slugify(name) for name in categories_data.keys()]
    ).order_by('name')
    
    for main_cat in main_categories:
        subcategory_slugs = [slugify(sub) for sub in categories_data[main_cat.name]]
        subcategories = Category.objects.filter(slug__in=subcategory_slugs)
        print(f"\n📁 {main_cat.name} ({subcategories.count()} subcategories)")
        for sub in subcategories.order_by('name'):
            print(f"   📦 {sub.name}")

if __name__ == "__main__":
    update_categories()
