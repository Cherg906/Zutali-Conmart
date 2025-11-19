"use client"

import { useState } from "react"
import { Search, Filter, X, MapPin, Star, DollarSign, Package, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/language-context"

interface SidebarFilters {
  searchQuery: string
  priceRange: [number, number]
  selectedCity: string
  selectedBrands: string[]
  verifiedOnly: boolean
  inStockOnly: boolean
  hasQuotationPrice: boolean
  deliveryAvailable: boolean
  selectedCategories: string[]
  minRating: number
}

interface SidebarProps {
  filters: SidebarFilters
  onFiltersChange: (filters: SidebarFilters) => void
  categories: Array<{ id: string; name: string; name_amharic?: string }>
  brands: string[]
  cities: string[]
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ 
  filters, 
  onFiltersChange, 
  categories, 
  brands, 
  cities, 
  isOpen, 
  onClose 
}: SidebarProps) {
  const { t, language } = useLanguage()
  const [tempFilters, setTempFilters] = useState<SidebarFilters>(filters)

  const updateFilters = (updates: Partial<SidebarFilters>) => {
    const newFilters = { ...tempFilters, ...updates }
    setTempFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    const clearedFilters: SidebarFilters = {
      searchQuery: "",
      priceRange: [0, 100000],
      selectedCity: "",
      selectedBrands: [],
      verifiedOnly: false,
      inStockOnly: false,
      hasQuotationPrice: false,
      deliveryAvailable: false,
      selectedCategories: [],
      minRating: 0
    }
    setTempFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const toggleBrand = (brand: string) => {
    const newBrands = tempFilters.selectedBrands.includes(brand)
      ? tempFilters.selectedBrands.filter(b => b !== brand)
      : [...tempFilters.selectedBrands, brand]
    updateFilters({ selectedBrands: newBrands })
  }

  const toggleCategory = (categoryId: string) => {
    const newCategories = tempFilters.selectedCategories.includes(categoryId)
      ? tempFilters.selectedCategories.filter(c => c !== categoryId)
      : [...tempFilters.selectedCategories, categoryId]
    updateFilters({ selectedCategories: newCategories })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (tempFilters.searchQuery) count++
    if (tempFilters.selectedCity) count++
    if (tempFilters.selectedBrands.length > 0) count++
    if (tempFilters.verifiedOnly) count++
    if (tempFilters.inStockOnly) count++
    if (tempFilters.hasQuotationPrice) count++
    if (tempFilters.deliveryAvailable) count++
    if (tempFilters.selectedCategories.length > 0) count++
    if (tempFilters.minRating > 0) count++
    if (tempFilters.priceRange[0] > 0 || tempFilters.priceRange[1] < 100000) count++
    return count
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-80 bg-background border-r 
        transform transition-transform duration-300 ease-in-out z-50 lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}>
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <h2 className="text-lg font-semibold">{t("categories.filterBy")}</h2>
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary">{getActiveFiltersCount()}</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Clear All Filters */}
          {getActiveFiltersCount() > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="w-full"
            >
              {t("categories.clearFilters")}
            </Button>
          )}

          {/* Search Construction Materials */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                {t("common.search")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="search"
                placeholder={t("header.searchPlaceholder")}
                value={tempFilters.searchQuery}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* Price Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("categories.priceRange")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Slider
                value={tempFilters.priceRange}
                onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                max={100000}
                min={0}
                step={1000}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{tempFilters.priceRange[0]} ETB</span>
                <span>{tempFilters.priceRange[1]} ETB</span>
              </div>
            </CardContent>
          </Card>

          {/* City/Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t("categories.location")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={tempFilters.selectedCity}
                onValueChange={(value) => updateFilters({ selectedCity: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Categories */}
          {categories.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {t("common.categories")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.slice(0, 8).map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={tempFilters.selectedCategories.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <Label
                      htmlFor={`category-${category.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {language === 'am' && category.name_amharic ? category.name_amharic : category.name}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Brands */}
          {brands.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Brands
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {brands.slice(0, 8).map((brand) => (
                  <div key={brand} className="flex items-center space-x-2">
                    <Checkbox
                      id={`brand-${brand}`}
                      checked={tempFilters.selectedBrands.includes(brand)}
                      onCheckedChange={() => toggleBrand(brand)}
                    />
                    <Label
                      htmlFor={`brand-${brand}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {brand}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Rating Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4" />
                Minimum Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={tempFilters.minRating.toString()}
                onValueChange={(value) => updateFilters({ minRating: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any rating</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="2">2+ Stars</SelectItem>
                  <SelectItem value="1">1+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Additional Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verified-only"
                  checked={tempFilters.verifiedOnly}
                  onCheckedChange={(checked) => updateFilters({ verifiedOnly: checked as boolean })}
                />
                <Label htmlFor="verified-only" className="text-sm">
                  {t("categories.verified")}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="in-stock-only"
                  checked={tempFilters.inStockOnly}
                  onCheckedChange={(checked) => updateFilters({ inStockOnly: checked as boolean })}
                />
                <Label htmlFor="in-stock-only" className="text-sm">
                  {t("categories.inStock")}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delivery-available"
                  checked={tempFilters.deliveryAvailable}
                  onCheckedChange={(checked) => updateFilters({ deliveryAvailable: checked as boolean })}
                />
                <Label htmlFor="delivery-available" className="text-sm">
                  Delivery Available
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quotation-price"
                  checked={tempFilters.hasQuotationPrice}
                  onCheckedChange={(checked) => updateFilters({ hasQuotationPrice: checked as boolean })}
                />
                <Label htmlFor="quotation-price" className="text-sm">
                  Quotation Price Available
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}