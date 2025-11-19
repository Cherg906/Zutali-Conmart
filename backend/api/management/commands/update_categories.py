from django.core.management.base import BaseCommand
from django.utils.text import slugify
from api.models import Category

class Command(BaseCommand):
    help = 'Update categories with new structure'

    def handle(self, *args, **options):
        self.stdout.write('Updating categories...')
        
        # New category structure
        CATEGORIES = [
            {
                'name': 'Building Materials',
                'name_amharic': 'የግንባታ ቁሳቁሶች',
                'description': 'Essential construction materials for building projects',
                'description_amharic': 'ለግንባታ ፕሮጀክቶች አስፈላጊ የሆኑ የግንባታ ቁሳቁሶች',
                'icon': 'building',
            },
            {
                'name': 'Finishes & Interiors',
                'name_amharic': 'የውስጥ ማጠናቀቂያዎች',
                'description': 'Interior finishing materials and fixtures',
                'description_amharic': 'የውስጥ ማጠናቀቂያ ቁሳቁሶች እና መሳሪያዎች',
                'icon': 'palette',
            },
            {
                'name': 'MEP (Mechanical, Electrical, Plumbing)',
                'name_amharic': 'ሜካኒካል፣ ኤሌክትሪካል እና ፓይፕ',
                'description': 'Mechanical, electrical and plumbing systems',
                'description_amharic': 'ሜካኒካል፣ ኤሌክትሪካል እና የውሃ ቧንቧ ስርዓቶች',
                'icon': 'zap',
            },
            {
                'name': 'Construction Chemicals',
                'name_amharic': 'የግንባታ ኬሚካሎች',
                'description': 'Chemical products for construction applications',
                'description_amharic': 'ለግንባታ አፕሊኬሽኖች የሚሆኑ ኬሚካላዊ ምርቶች',
                'icon': 'flask',
            },
            {
                'name': 'Insulation & Energy',
                'name_amharic': 'ኢንሱሌሽን እና ኢነርጂ',
                'description': 'Insulation materials and energy solutions',
                'description_amharic': 'የኢንሱሌሽን ቁሳቁሶች እና የኢነርጂ መፍትሄዎች',
                'icon': 'shield',
            },
            {
                'name': 'Hardware & Tools',
                'name_amharic': 'ሃርድዌር እና መሳሪያዎች',
                'description': 'Construction tools and hardware',
                'description_amharic': 'የግንባታ መሳሪያዎች እና ሃርድዌር',
                'icon': 'wrench',
            },
            {
                'name': 'Construction Equipment & Machinery',
                'name_amharic': 'የግንባታ መሳሪያዎች እና ማሽኖች',
                'description': 'Heavy machinery and construction equipment',
                'description_amharic': 'ከባድ ማሽኖች እና የግንባታ መሳሪያዎች',
                'icon': 'truck',
            },
            {
                'name': 'Site Essentials',
                'name_amharic': 'የሳይት አስፈላጊዎች',
                'description': 'Essential site management and safety materials',
                'description_amharic': 'አስፈላጊ የሳይት አስተዳደር እና የደህንነት ቁሳቁሶች',
                'icon': 'hard-hat',
            }
        ]

        # Clear existing categories
        deleted_count = Category.objects.all().delete()[0]
        self.stdout.write(f'Deleted {deleted_count} existing categories')
        
        # Create new categories
        created_count = 0
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
                    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
                    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
                    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop"
                ]
            )
            created_count += 1
            self.stdout.write(f'Created: {category.name}')
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} categories')
        )
