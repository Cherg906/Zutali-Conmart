# Admin Dashboard Reorganization Plan

## Current Status
The admin dashboard has become corrupted during restructuring attempts. The file needs to be rebuilt.

## Required Changes

### 1. Tab Structure Reorganization
Replace the current flat tab list with grouped tabs:

**Current Structure (10 flat tabs):**
- Pending Verifications
- Approved Verifications  
- Rejected Verifications
- Pending Users
- Approved Users
- Rejected Users
- Pending Products
- Approved Products
- Rejected Products
- Analytics

**New Structure (5 main tabs with nested sub-tabs):**

#### Tab 1: Product Owners
- Sub-tabs: Pending | Verified | Rejected

#### Tab 2: Users  
- Sub-tabs: Pending | Approved | Rejected

#### Tab 3: Products
- Sub-tabs: Pending | Approved | Rejected  

#### Tab 4: Categories (NEW)
- Main categories list with add/edit/delete buttons
- Subcategories shown nested under parents
- Form dialog for creating/editing categories with fields:
  - Name (English)
  - Name (Amharic)
  - Description (English)
  - Description (Amharic)
  - Parent Category (dropdown, optional)
- Actions: Add, Edit, Delete with confirmation

#### Tab 5: Analytics
- Existing analytics content

### 2. Categories Management Features

#### Backend Requirements:
- Change CategoryViewSet from ReadOnlyModelViewSet to ModelViewSet
- Add create, update, delete permissions (admin only)

#### Frontend Requirements:
- Add state for categories, categoryFormData, editingCategory
- Implement handleAddCategory(), handleEditCategory(), handleSaveCategory(), handleDeleteCategory()
- Create category list UI with:
  - Tree view showing parent-child relationships
  - Icons for main categories and subcategories
  - Edit and Delete buttons for each category
  - Product count for each category
- Create category form dialog with validation

### 3. Implementation Approach

**Option A: Minimal Changes** (Recommended)
1. Keep existing tab structure
2. Just add a new "Categories" tab at the end
3. Implement categories CRUD UI in that tab

**Option B: Full Reorganization**
1. Create a completely new admin-dashboard-v2.tsx file
2. Copy working functions from old file
3. Build new JSX structure from scratch with proper nesting
4. Test thoroughly before replacing old file

## Next Steps
1. Decide on Option A or B
2. If Option A: Add categories tab only
3. If Option B: Build new file incrementally with testing

## Files Affected
- `/components/admin/admin-dashboard.tsx` - Main file to update
- `/backend/api/views.py` - Change CategoryViewSet to full CRUD
- `/backend/api/permissions.py` - Ensure admin-only for category modifications
