"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { SearchWithSuggestions } from "@/components/ui/search-with-suggestions"
import { useLanguage } from "@/lib/language-context"

interface Category {
  id: string
  name: string
  name_amharic: string
  slug: string
  description: string
  description_amharic: string
  icon: string
  category_images: string[]
  product_count?: number
  parent_id?: string | null
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { language, t } = useLanguage()

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('🔍 Fetching categories from Next.js API proxy')
        const response = await fetch('/api/categories?page_size=100', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        })
        console.log('📡 Response status:', response.status)
        console.log('✅ Response ok:', response.ok)

        if (response.ok) {
          const data = await response.json()
          console.log('📊 Categories data received:', data)

          // Handle different response formats from Next.js API proxy
          let categoriesData = []

          if (Array.isArray(data)) {
            categoriesData = data
          } else if (data && typeof data === 'object') {
            if (Array.isArray(data.results)) {
              categoriesData = data.results
            } else if (Array.isArray(data.categories)) {
              categoriesData = data.categories
            } else if (data.success && Array.isArray(data.categories)) {
              categoriesData = data.categories
            }
          }

          // Ensure categoriesData is an array before filtering
          if (!Array.isArray(categoriesData)) {
            console.warn('Categories API returned non-array data:', data)
            categoriesData = []
          }

          // Flatten the nested structure: include both main categories and their subcategories
          const allCategories: Category[] = []
          categoriesData.forEach((cat: any) => {
            // Add the main category
            allCategories.push({
              id: cat.id,
              name: cat.name,
              name_amharic: cat.name_amharic,
              slug: cat.slug,
              description: cat.description,
              description_amharic: cat.description_amharic,
              icon: cat.icon,
              category_images: cat.category_images,
              product_count: cat.product_count,
              parent_id: cat.parent_id,
            })
            
            // Add all subcategories if they exist
            if (Array.isArray(cat.subcategories)) {
              cat.subcategories.forEach((subcat: any) => {
                allCategories.push({
                  id: subcat.id,
                  name: subcat.name,
                  name_amharic: subcat.name_amharic,
                  slug: subcat.slug,
                  description: subcat.description,
                  description_amharic: subcat.description_amharic,
                  icon: subcat.icon,
                  category_images: subcat.category_images,
                  product_count: subcat.product_count,
                  parent_id: subcat.parent_id,
                })
              })
            }
          })

          console.log('📊 Total categories (flattened):', allCategories.length)

          // Filter to show only main categories (those without a parent)
          // Main categories don't have a parent_id field or it's null
          const mainCategories = allCategories.filter((cat: Category) => 
            !cat.parent_id || cat.parent_id === null
          )

          console.log('✅ Found main categories:', mainCategories.length, mainCategories.map((cat: Category) => cat.name))
          console.log('📋 Category details:', mainCategories.map((cat: Category) => ({ 
            id: cat.id,
            name: cat.name, 
            slug: cat.slug,
            parent_id: cat.parent_id 
          })))
          
          // Check if any categories are missing slugs
          const missingSlug = mainCategories.filter((cat: Category) => !cat.slug)
          if (missingSlug.length > 0) {
            console.error('⚠️ Categories missing slugs:', missingSlug.map((cat: Category) => cat.name))
          }

          setCategories(mainCategories)
          setFilteredCategories(mainCategories)
        } else {
          console.error('❌ API response not ok:', response.status, response.statusText)
          // No fallback - show empty state
          setCategories([])
          setFilteredCategories([])
        }
      } catch (error) {
        console.error('🚨 Error fetching categories:', error)
        console.error('🔍 Error details:', {
          message: error?.message,
          name: error?.name,
          stack: error?.stack
        })
        // No fallback - show empty state if API fails
        console.error('🚨 Failed to load categories from API')
        setCategories([])
        setFilteredCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredCategories(categories)
      return
    }
    
    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(query.toLowerCase()) ||
      category.name_amharic.toLowerCase().includes(query.toLowerCase()) ||
      category.description.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredCategories(filtered)
  }

  const handleSuggestionSelect = (suggestion: any) => {
    if (suggestion.type === 'category') {
      const category = categories.find(c => c.name === suggestion.title)
      if (category) {
        window.location.href = `/categories/${category.slug}`
      }
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">{t("categories.allCategories")}</h1>
        <p className="text-muted-foreground">Browse construction materials by category</p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <SearchWithSuggestions
          placeholder="Search categories..."
          onSearch={handleSearch}
          onSuggestionSelect={handleSuggestionSelect}
          className="max-w-md"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCategories.map((category) => (
          <Link key={category.id} href={`/categories/${category.slug}`} className="group">
            <Card className="flex flex-col gap-6 overflow-hidden py-6 transition-all hover:shadow-lg">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={category.category_images?.[0] || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop"}
                  alt={language === "en" ? category.name : category.name_amharic}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <CardContent className="flex flex-col gap-2 px-6 pb-0">
                <h3 className="text-lg font-semibold group-hover:text-primary">
                  {language === "en" ? category.name : category.name_amharic}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {language === "en" ? category.description : category.description_amharic}
                </p>
                {category.product_count && (
                  <p className="text-xs text-muted-foreground">
                    {category.product_count} {t("home.productsCount")}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("categories.noProducts")}</p>
        </div>
      )}
    </div>
  )
}