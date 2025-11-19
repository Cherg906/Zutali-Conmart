"use client"

import { useState, useEffect } from "react"
import { 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  Upload,
  Image as ImageIcon,
  XCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Category {
  id: string
  name: string
  name_amharic?: string
  description?: string
  description_amharic?: string
  parent_id?: string | null
  subcategories?: Category[]
  _product_count?: number
  images?: string[]
  category_images?: string[]
}

interface CategoryImage {
  id?: string
  url: string
  file?: File
}

const normalizeCategory = (category: any): Category => {
  const normalizedImages = Array.isArray(category.images)
    ? category.images
    : Array.isArray(category.category_images)
    ? category.category_images
    : []

  return {
    ...category,
    images: normalizedImages,
    subcategories: Array.isArray(category.subcategories)
      ? category.subcategories.map(normalizeCategory)
      : [],
  }
}

export function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    name: '',
    name_amharic: '',
    description: '',
    description_amharic: '',
    parent_id: null as string | null
  })
  const [categoryImages, setCategoryImages] = useState<CategoryImage[]>([])
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null)
  const [initialCategoryImages, setInitialCategoryImages] = useState<CategoryImage[] | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: string]: number}>({})

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token')
    if (!token) {
      window.location.href = '/admin/login'
      return
    }
    setAuthToken(token)
  }, [])

  useEffect(() => {
    if (authToken) {
      loadCategories()
    }
  }, [authToken])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/categories/', {
        headers: {
          'Authorization': `Token ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const rawList = Array.isArray(data) ? data : data?.categories || []
        const normalizedList: Category[] = rawList.map(normalizeCategory)
        setCategories(normalizedList)
      } else {
        console.error('Failed to load categories:', response.status)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetForm = () => {
    if (initialFormData) {
      setFormData(initialFormData)
    } else {
      setFormData({
        name: '',
        name_amharic: '',
        description: '',
        description_amharic: '',
        parent_id: null
      })
    }

    if (initialCategoryImages) {
      setCategoryImages(initialCategoryImages)
    } else {
      setCategoryImages([])
    }
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      name_amharic: '',
      description: '',
      description_amharic: '',
      parent_id: null
    })
    setCategoryImages([])
    setInitialFormData(null)
    setInitialCategoryImages(null)
    setDialogOpen(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name || '',
      name_amharic: category.name_amharic || '',
      description: category.description || '',
      description_amharic: category.description_amharic || '',
      parent_id: category.parent_id || null
    })
    // Load existing images
    const existingImages = (category.images || []).map(url => ({ url }))
    setCategoryImages(existingImages)
    setInitialFormData({
      name: category.name || '',
      name_amharic: category.name_amharic || '',
      description: category.description || '',
      description_amharic: category.description_amharic || '',
      parent_id: category.parent_id || null
    })
    setInitialCategoryImages(existingImages)
    setDialogOpen(true)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newImages: CategoryImage[] = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      file
    }))

    setCategoryImages(prev => [...prev, ...newImages])
  }

  const handleRemoveImage = (index: number) => {
    setCategoryImages(prev => prev.filter((_, i) => i !== index))
  }

  const rotateImage = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category?.images || category.images.length <= 1) return

    setCurrentImageIndex(prev => ({
      ...prev,
      [categoryId]: ((prev[categoryId] || 0) + 1) % category.images!.length
    }))
  }

  // Auto-rotate images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      categories.forEach(category => {
        if (category.images && category.images.length > 1) {
          rotateImage(category.id)
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [categories])

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}/`
        : '/api/categories/'
      
      const method = editingCategory ? 'PATCH' : 'POST'
      
      // Check if there are new images to upload
      const hasNewImages = categoryImages.some(img => img.file)
      
      let response
      let usedImageFallback = false
      
      // Try with images first if backend supports it
      let attemptedImageUpload = false
      if (hasNewImages) {
        attemptedImageUpload = true
        try {
          const formDataToSend = new FormData()
          formDataToSend.append('name', formData.name)
          if (formData.name_amharic) formDataToSend.append('name_amharic', formData.name_amharic)
          if (formData.description) formDataToSend.append('description', formData.description)
          if (formData.description_amharic) formDataToSend.append('description_amharic', formData.description_amharic)
          if (formData.parent_id) formDataToSend.append('parent_id', formData.parent_id)
          
          // Add new image files
          categoryImages.forEach(img => {
            if (img.file) {
              formDataToSend.append('images', img.file)
            }
          })
          
          // Keep track of existing image URLs
          const existingImageUrls = categoryImages.filter(img => !img.file).map(img => img.url)
          formDataToSend.append('existing_images', JSON.stringify(existingImageUrls))
          
          console.log('📤 Attempting to save category with images...')
          
          response = await fetch(url, {
            method,
            headers: {
              'Authorization': `Token ${authToken}`,
            },
            body: formDataToSend
          })
          
          // If backend doesn't support images yet, fall back to JSON
          if (!response.ok) {
            console.warn(`⚠️ Image upload not supported (Status: ${response.status}). Saving without images instead.`)
            // Force fallback - don't throw error
            response = undefined as any
            usedImageFallback = true
          } else {
            console.log('✅ Category with images saved successfully!')
          }
        } catch (error) {
          // Silent fallback - this is expected when backend doesn't support images
          console.warn('⚠️ Image upload not available. Saving category without images...')
          response = undefined as any
          usedImageFallback = true
        }
      }
      
      // Save without images if no images or if FormData failed
      if (!hasNewImages || !response || !response.ok) {
        console.log('💾 Saving category (JSON mode)...')
        
        try {
          response = await fetch(url, {
            method,
            headers: {
              'Authorization': `Token ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
          })
        } catch (fetchError) {
          console.error('❌ Network error while saving category:', fetchError)
          throw new Error('Network error: Unable to connect to server. Please check your connection.')
        }
      }

      if (!response || !response.ok) {
        const contentType = response?.headers.get('content-type')
        let errorMessage = 'Failed to save category'
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.detail || JSON.stringify(errorData)
          } else {
            const errorText = await response.text()
            errorMessage = errorText || `Server returned ${response?.status || 'Unknown'}`
          }
        } catch (parseError) {
          errorMessage = `Server error (Status: ${response?.status || 'Unknown'})`
        }
        
        throw new Error(errorMessage)
      }

      // Success!
      if (attemptedImageUpload && !response.headers.get('content-type')?.includes('multipart')) {
        console.log('✅ Category saved successfully (without images)')
      } else {
        console.log('✅ Category saved successfully')
      }
      
      const successMessage = attemptedImageUpload && usedImageFallback
        ? `Category ${editingCategory ? 'updated' : 'created'} successfully!\n\nNote: Image upload requires backend update. Category saved without images.`
        : `Category ${editingCategory ? 'updated' : 'created'} successfully!`
      
      alert(successMessage)
      setDialogOpen(false)
      setCategoryImages([])
      await loadCategories()
    } catch (error) {
      // Only log if it's a real error (not an empty object or expected fallback)
      const isEmptyError = !error || (typeof error === 'object' && Object.keys(error).length === 0)
      
      if (!isEmptyError) {
        console.error('❌ Category Save Error:', error)
      }
      
      // More descriptive error message
      let errorMessage = ''
      if (error instanceof Error && error.message) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null && Object.keys(error).length > 0) {
        errorMessage = JSON.stringify(error)
      }
      
      // Only show alert if there's a real error message
      if (errorMessage && errorMessage !== '{}') {
        alert(`Failed to save category: ${errorMessage}\n\nPlease check the console for details.`)
      } else {
        // This shouldn't happen with our fallback logic, but just in case
        alert('Failed to save category. Please check:\n\n• All required fields are filled\n• Your network connection\n• Backend server is running\n\nThen try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Products using this category will need to be recategorized.')) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${authToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      alert('Category deleted successfully!')
      await loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category. It may have associated products or subcategories.')
    }
  }

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const renderCategory = (category: Category, level: number = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const indent = level * 24

    return (
      <div key={category.id}>
        <div 
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="flex items-center gap-3 flex-1">
            {hasSubcategories ? (
              <button 
                onClick={() => toggleExpand(category.id)}
                className="p-1 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            {/* Category Image */}
            {category.images && category.images.length > 0 ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                <img 
                  src={category.images[currentImageIndex[category.id] || 0]}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
                {category.images.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    {(currentImageIndex[category.id] || 0) + 1}/{category.images.length}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{category.name}</h3>
                {category.name_amharic && (
                  <span className="text-sm text-muted-foreground">({category.name_amharic})</span>
                )}
              </div>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
              )}
            </div>

            {typeof category._product_count === 'number' && (
              <Badge variant="outline">{category._product_count} products</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleEdit(category)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDelete(category.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {hasSubcategories && isExpanded && (
          <div className="mt-2 space-y-2">
            {category.subcategories!.map(sub => renderCategory(sub, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const mainCategories = categories.filter(c => !c.parent_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading categories...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-6 w-6" />
                Categories Management
              </CardTitle>
              <CardDescription>
                Manage product categories and subcategories
              </CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mainCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No categories yet. Click "Add Category" to create one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mainCategories.map(category => renderCategory(category))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name (English) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cement"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_amharic">Name (Amharic)</Label>
                <Input
                  id="name_amharic"
                  value={formData.name_amharic}
                  onChange={(e) => setFormData({ ...formData, name_amharic: e.target.value })}
                  placeholder="e.g., ሲሚንቶ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description (English)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description_amharic">Description (Amharic)</Label>
                <Textarea
                  id="description_amharic"
                  value={formData.description_amharic}
                  onChange={(e) => setFormData({ ...formData, description_amharic: e.target.value })}
                  placeholder="አጭር ገለፃ..."
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category (Optional)</Label>
              <Select 
                value={formData.parent_id || "none"} 
                onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category (leave empty for main category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Main Category)</SelectItem>
                  {mainCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty to create a main category, or select a parent to create a subcategory
              </p>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="images">Category Images (Optional)</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('images')?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Images
                  </Button>
                </div>
                
                {categoryImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {categoryImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.url}
                          alt={`Category image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload multiple images for this category. Images will rotate automatically in the display. (Max 5 images recommended)
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleResetForm}
              disabled={saving || (!initialFormData && !initialCategoryImages && !editingCategory)}
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving ? 'Saving...' : 'Save Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
