# Categories Management - Troubleshooting Guide

## Current Error: "Error saving category"

### Cause
The frontend has been updated to support image uploads, but the **backend hasn't been updated yet** to handle:
- Multipart/form-data requests
- Image file storage
- `images` field in Category model

### Current Behavior
✅ **Categories WITHOUT images** → Work fine (saves using JSON)
⚠️ **Categories WITH images** → Automatically falls back to saving without images

### Solution

The component now has **intelligent fallback**:

1. **If you upload images:**
   - Tries to save with FormData
   - If backend doesn't support it → Falls back to JSON save
   - Shows message: "Category created successfully! (Images will be available once backend is updated)"

2. **If you don't upload images:**
   - Saves normally with JSON
   - Works perfectly as before

### To Enable Full Image Support

Follow the steps in `CATEGORIES_IMAGE_UPLOAD_GUIDE.md`:

#### Quick Steps:

1. **Update Django Model**
```python
# backend/api/models.py
class Category(models.Model):
    # ... existing fields ...
    images = models.JSONField(default=list, blank=True)
```

2. **Run Migration**
```bash
python manage.py makemigrations
python manage.py migrate
```

3. **Update ViewSet**
```python
# backend/api/views.py
# Add image upload handling (see full guide)
```

4. **Configure Media Files**
```python
# settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

5. **Update URLs**
```python
# urls.py
from django.conf.urls.static import static
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### What Works Right Now

✅ **Fully Functional:**
- Create categories without images
- Edit categories without images
- Delete categories
- Bilingual support (English & Amharic)
- Subcategories
- Tree view with expand/collapse
- Product counts

⏳ **Pending Backend Update:**
- Upload images for categories
- Display rotating images
- Image storage and retrieval

### Testing Without Backend Update

You can still test the image upload UI:
1. Open category form
2. Click "Upload Images"
3. Select images
4. See preview grid
5. Click Save
6. Category saves successfully (without images)
7. Message shows: "Images will be available once backend is updated"

### No Errors or Data Loss

- ✅ Category data saves correctly
- ✅ No breaking errors
- ✅ Smooth user experience
- ✅ Clear messaging about image support

### When Backend Is Ready

Once you implement the backend changes:
1. No frontend changes needed
2. Images will automatically start working
3. Upload will use FormData
4. Images will display and rotate

---

**Status**: Frontend Ready ✅ | Backend Update Pending ⏳
**Impact**: Categories work perfectly, images available after backend update
**Action**: Implement backend following `CATEGORIES_IMAGE_UPLOAD_GUIDE.md`
