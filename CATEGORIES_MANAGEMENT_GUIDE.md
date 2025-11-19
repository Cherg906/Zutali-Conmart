# Categories Management - User Guide

## 🎯 Overview

The Categories Management system provides a complete interface for managing product categories and subcategories with bilingual support.

## 🚀 Quick Start

### Access the Categories Management

**URL:** `http://localhost:3000/admin/categories`

**Requirements:**
- Admin authentication required
- Token stored in localStorage (from admin login)

### From Admin Dashboard

Click the **"Manage Categories"** button in the admin dashboard header to navigate directly to the categories management page.

## ✨ Features

### 1. View Categories
- **Tree Structure**: Categories displayed hierarchically with parent-child relationships
- **Expandable/Collapsible**: Click the arrow icons to expand/collapse subcategories
- **Product Counts**: Each category shows how many products are associated
- **Bilingual Display**: Shows both English and Amharic names (if provided)

### 2. Add Category

**Button:** Click "Add Category" in the top-right corner

**Form Fields:**
- **Name (English)*** - Required, e.g., "Cement"
- **Name (Amharic)** - Optional, e.g., "ሲሚንቶ"
- **Description (English)** - Optional, brief description
- **Description (Amharic)** - Optional, Amharic description
- **Parent Category** - Optional dropdown
  - Leave as "None" to create a main category
  - Select a parent to create a subcategory

**Actions:**
- **Save Category** - Creates the new category
- **Cancel** - Closes the form without saving

### 3. Edit Category

**Button:** Click the Edit icon (pencil) next to any category

**What You Can Edit:**
- All name and description fields
- Parent category (move category to different parent)
- Cannot change category ID (system-managed)

**Actions:**
- **Save Category** - Updates the category
- **Cancel** - Closes without saving changes

### 4. Delete Category

**Button:** Click the Delete icon (trash) next to any category

**Confirmation:**
- System will ask for confirmation
- Warning: Products using this category will need to be recategorized
- Cannot delete if category has subcategories (delete subcategories first)

## 📋 Best Practices

### Category Naming
- Use clear, descriptive names
- Keep names concise (2-3 words maximum)
- Provide Amharic translations for local users
- Use consistent naming conventions

### Category Structure
```
Main Category (e.g., "Building Materials")
├── Subcategory 1 (e.g., "Cement")
├── Subcategory 2 (e.g., "Steel")
└── Subcategory 3 (e.g., "Concrete")
```

### Organization Tips
1. **Limit Depth**: Keep hierarchy to 2 levels (main + subcategory)
2. **Group Logically**: Related products should be in same main category
3. **Avoid Duplication**: Don't create similar categories with different names
4. **Regular Review**: Periodically review and consolidate categories

## 🔄 Workflow Examples

### Example 1: Adding a Main Category

1. Click "Add Category"
2. Enter Name: "Construction Equipment"
3. Enter Name (Amharic): "የግንባታ መሳሪያዎች"
4. Leave Parent Category as "None (Main Category)"
5. Click "Save Category"

Result: New main category created

### Example 2: Adding a Subcategory

1. Click "Add Category"
2. Enter Name: "Power Tools"
3. Select Parent: "Construction Equipment"
4. Click "Save Category"

Result: "Power Tools" appears under "Construction Equipment"

### Example 3: Reorganizing Categories

1. Click Edit on "Power Tools"
2. Change Parent Category to different main category
3. Click "Save Category"

Result: Category moved to new parent

### Example 4: Renaming Category

1. Click Edit on category
2. Update Name fields (English/Amharic)
3. Click "Save Category"

Result: Category name updated everywhere

## ⚠️ Important Notes

### Before Deleting
- Check if category has products assigned
- Products will need manual recategorization
- Delete subcategories before deleting parent category
- Deletion cannot be undone

### Validation Rules
- **English Name**: Required, cannot be empty
- **Parent Category**: Optional, can be "None" for main categories
- **Duplicate Names**: System allows but not recommended

### Performance
- Tree view automatically expands/collapses for better performance
- All categories load at once (no pagination)
- Changes reflect immediately after save

## 🌐 Multilingual Support

### Language Display
- Primary: English name always displayed
- Secondary: Amharic name shown in parentheses if provided
- Both languages editable in form

### Best Practice
- Always provide Amharic translations
- Use official Amharic terminology
- Test display in both languages

## 🔐 Security

### Access Control
- Admin role required
- Token-based authentication
- CRUD operations logged
- Read-only for non-admin users (via API)

### Permissions
- **View**: All authenticated users (via product pages)
- **Create/Edit/Delete**: Admin only

## 🐛 Troubleshooting

### "Failed to save category"
- Check admin token is valid
- Verify all required fields filled
- Ensure English name is provided
- Check network connection

### "Failed to delete category"
- Category may have associated products
- Subcategories must be deleted first
- Check admin permissions

### Categories not loading
- Verify you're logged in as admin
- Clear browser cache
- Check API endpoint is accessible
- Review browser console for errors

## 📊 Data Structure

### Category Object
```json
{
  "id": "uuid",
  "name": "Cement",
  "name_amharic": "ሲሚንቶ",
  "description": "Various types of cement",
  "description_amharic": "የተለያዩ የሲሚንቶ ዓይነቶች",
  "parent_id": "uuid or null",
  "subcategories": [],
  "_product_count": 15
}
```

## 🔗 API Integration

### Backend Endpoints
- **GET** `/api/categories/` - List all categories
- **POST** `/api/categories/` - Create category (admin only)
- **PATCH** `/api/categories/{id}/` - Update category (admin only)
- **DELETE** `/api/categories/{id}/` - Delete category (admin only)

### Authentication
All write operations require:
```
Authorization: Token {admin_token}
```

## ✅ Success Indicators

### After Creating Category
- Success message appears
- Category appears in tree view
- Product count shows as 0
- Can immediately edit or delete

### After Editing Category
- Success message appears
- Changes reflect in tree view
- Related products show updated category
- Subcategories remain intact

### After Deleting Category
- Success message appears
- Category removed from tree view
- Products require recategorization

## 📱 Mobile Responsive

- Touch-friendly buttons
- Scrollable tree view
- Responsive form layout
- Works on tablets and phones

---

## 🎉 Ready to Use!

The Categories Management system is production-ready and fully functional. All CRUD operations are working with proper validation, error handling, and user feedback.

**Questions or Issues?** Check the browser console for detailed error messages.

---

**Last Updated:** November 1, 2025  
**Component:** `/components/admin/categories-management.tsx`  
**Route:** `/app/admin/categories/page.tsx`  
**API:** `/backend/api/views.py` (CategoryViewSet)
