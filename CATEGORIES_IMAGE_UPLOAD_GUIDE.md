# Categories Image Upload & Rotation - Implementation Guide

## Overview

Categories and subcategories now support multiple images that rotate automatically in the display. This enhances visual appeal and provides better representation of product categories.

## Frontend Implementation (Complete)

### Features Added:
- ✅ Multiple image upload for categories/subcategories
- ✅ Image preview with remove functionality
- ✅ Auto-rotating image display (every 3 seconds)
- ✅ Image counter badge (e.g., "2/5")
- ✅ Fallback icon for categories without images
- ✅ Support for both new uploads and existing images

### Component Updated:
`components/admin/categories-management.tsx`

### User Experience:
1. Admin clicks "Add/Edit Category"
2. Uploads multiple images (recommended max 5)
3. Images preview shows with remove option
4. On save, images uploaded to backend
5. In category list, images rotate automatically every 3 seconds
6. Image counter shows current/total (e.g., "1/3")

## Backend Implementation Required

### 1. Database Schema Update

Add `images` field to Category model:

```python
# In backend/api/models.py

from django.contrib.postgres.fields import ArrayField

class Category(models.Model):
    # ... existing fields ...
    
    images = ArrayField(
        models.URLField(max_length=500),
        blank=True,
        default=list,
        help_text='Array of image URLs for this category'
    )
    
    # Alternative if not using PostgreSQL:
    # images = models.JSONField(default=list, blank=True)
```

### 2. File Upload Handling

Update Category ViewSet to handle file uploads:

```python
# In backend/api/views.py

from django.core.files.storage import default_storage
from django.conf import settings
import os
import uuid

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]
    
    def create(self, request, *args, **kwargs):
        """Handle category creation with images"""
        images = request.FILES.getlist('images')
        
        # Create category first
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        
        # Upload and save images
        if images:
            image_urls = self._upload_images(images, category.id)
            category.images = image_urls
            category.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Handle category update with images"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Handle images separately
        images = request.FILES.getlist('images')
        existing_images = request.data.get('existing_images')
        
        # Parse existing_images if it's a JSON string
        if existing_images and isinstance(existing_images, str):
            import json
            existing_images = json.loads(existing_images)
        
        # Update category data
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        
        # Handle images
        if images or existing_images is not None:
            new_image_urls = []
            
            # Keep existing images that weren't removed
            if existing_images:
                new_image_urls.extend(existing_images)
            
            # Upload new images
            if images:
                uploaded_urls = self._upload_images(images, category.id)
                new_image_urls.extend(uploaded_urls)
            
            category.images = new_image_urls
            category.save()
        
        return Response(serializer.data)
    
    def _upload_images(self, files, category_id):
        """Upload images and return their URLs"""
        image_urls = []
        
        for file in files:
            # Generate unique filename
            ext = os.path.splitext(file.name)[1]
            filename = f"categories/{category_id}/{uuid.uuid4()}{ext}"
            
            # Save file
            path = default_storage.save(filename, file)
            
            # Get URL
            if settings.USE_S3:
                # If using S3
                url = default_storage.url(path)
            else:
                # If using local storage
                url = f"{settings.MEDIA_URL}{path}"
            
            image_urls.append(url)
        
        return image_urls
    
    def destroy(self, request, *args, **kwargs):
        """Delete category and its images"""
        instance = self.get_object()
        
        # Delete images from storage
        if instance.images:
            for image_url in instance.images:
                # Extract path from URL and delete
                if settings.USE_S3:
                    # Delete from S3
                    path = image_url.split(settings.AWS_S3_CUSTOM_DOMAIN)[-1].lstrip('/')
                    default_storage.delete(path)
                else:
                    # Delete from local storage
                    path = image_url.replace(settings.MEDIA_URL, '')
                    if default_storage.exists(path):
                        default_storage.delete(path)
        
        return super().destroy(request, *args, **kwargs)
```

### 3. Serializer Update

Update CategorySerializer to include images:

```python
# In backend/api/serializers.py

class CategorySerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'name_amharic', 
            'description', 'description_amharic',
            'parent_id', 'images', 'subcategories',
            '_product_count'
        ]
        read_only_fields = ['id', 'subcategories', '_product_count']
```

### 4. Settings Configuration

Configure media file handling:

```python
# In settings.py

import os

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Create media directory if it doesn't exist
os.makedirs(MEDIA_ROOT, exist_ok=True)

# For production with S3:
# USE_S3 = os.getenv('USE_S3', 'False') == 'True'
# 
# if USE_S3:
#     AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
#     AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
#     AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
#     AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
#     DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

### 5. URL Configuration

Add media URL pattern:

```python
# In main urls.py

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ... your existing patterns ...
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 6. Migration Script

Create and run migration:

```bash
python manage.py makemigrations
python manage.py migrate
```

## API Request/Response Examples

### Creating Category with Images

**Request:**
```
POST /api/categories/
Content-Type: multipart/form-data
Authorization: Token {admin_token}

Body (FormData):
- name: "Electronics"
- name_amharic: "ኤሌክትሮኒክስ"
- description: "Electronic products"
- description_amharic: "የኤሌክትሮኒክስ ምርቶች"
- parent_id: null
- images: [File1, File2, File3]
```

**Response:**
```json
{
    "id": "uuid",
    "name": "Electronics",
    "name_amharic": "ኤሌክትሮኒክስ",
    "description": "Electronic products",
    "description_amharic": "የኤሌክትሮኒክስ ምርቶች",
    "parent_id": null,
    "images": [
        "http://localhost:8000/media/categories/uuid/image1.jpg",
        "http://localhost:8000/media/categories/uuid/image2.jpg",
        "http://localhost:8000/media/categories/uuid/image3.jpg"
    ],
    "subcategories": [],
    "_product_count": 0
}
```

### Updating Category (Adding/Removing Images)

**Request:**
```
PATCH /api/categories/{id}/
Content-Type: multipart/form-data
Authorization: Token {admin_token}

Body (FormData):
- name: "Electronics" 
- existing_images: ["http://localhost:8000/media/categories/uuid/image1.jpg"]
- images: [NewFile1, NewFile2]
```

**Response:**
```json
{
    "id": "uuid",
    "name": "Electronics",
    "images": [
        "http://localhost:8000/media/categories/uuid/image1.jpg",
        "http://localhost:8000/media/categories/uuid/new_image1.jpg",
        "http://localhost:8000/media/categories/uuid/new_image2.jpg"
    ],
    ...
}
```

## Image Specifications

### Recommended:
- **Format**: JPG, PNG, WebP
- **Size**: Max 2MB per image
- **Dimensions**: 800x600px or 16:9 aspect ratio
- **Quantity**: 3-5 images per category
- **Compression**: Use optimized images for faster loading

### Validation:
```python
# Add to CategoryViewSet

def _validate_image(self, file):
    """Validate image file"""
    # Check file size (2MB max)
    if file.size > 2 * 1024 * 1024:
        raise ValidationError('Image file too large ( > 2MB )')
    
    # Check file type
    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if file.content_type not in allowed_types:
        raise ValidationError('Invalid image format. Use JPG, PNG, or WebP')
    
    return True
```

## Frontend Display Behavior

### Auto-Rotation:
- Images rotate every 3 seconds
- Smooth transition between images
- Shows current image index (e.g., "2/5")
- Stops on hover (optional enhancement)

### Display Sizes:
- **List View**: 64x64px thumbnail
- **Card View**: 16:9 aspect ratio
- **Detail View**: Full size with gallery

## Testing Checklist

- [ ] Upload single image for category
- [ ] Upload multiple images (3-5)
- [ ] Remove image before saving
- [ ] Edit category and add more images
- [ ] Edit category and remove some images
- [ ] Delete category (images deleted from storage)
- [ ] Images display correctly in list
- [ ] Images rotate automatically every 3 seconds
- [ ] Image counter shows correctly
- [ ] Subcategories support images
- [ ] API returns proper image URLs
- [ ] Images accessible via direct URL

## Optional Enhancements

1. **Image Compression**: Auto-compress uploaded images
2. **Thumbnail Generation**: Create thumbnails for faster loading
3. **Image CDN**: Use CDN for image delivery
4. **Drag-to-Reorder**: Allow reordering images
5. **Hover Pause**: Pause rotation on hover
6. **Manual Navigation**: Add prev/next buttons

---

**Status**: Frontend Complete ✅ | Backend Implementation Required ⏳
**Last Updated**: November 1, 2025
**Component**: `components/admin/categories-management.tsx`
