"use client"

import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const cities = ["Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Hawassa", "Bahir Dar", "Jimma", "Adama"]

export const DEFAULT_PRICE_RANGE: [number, number] = [0, 100000]

type ProductFiltersProps = {
  brands: string[]
  selectedBrand: string | null
  onBrandChange: (brand: string | null) => void
  priceRange: [number, number]
  onPriceChange: (range: [number, number]) => void
  location: string | null
  onLocationChange: (location: string | null) => void
  inStock: boolean
  onInStockChange: (value: boolean) => void
  deliveryAvailable: boolean
  onDeliveryAvailableChange: (value: boolean) => void
  verifiedOnly: boolean
  onVerifiedOnlyChange: (value: boolean) => void
  onReset?: () => void
  onApplyFilters?: () => void
}

export function ProductFilters({
  brands,
  selectedBrand,
  onBrandChange,
  priceRange,
  onPriceChange,
  location,
  onLocationChange,
  inStock,
  onInStockChange,
  deliveryAvailable,
  onDeliveryAvailableChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  onReset,
  onApplyFilters,
}: ProductFiltersProps) {
  const handlePriceChange = (value: number[]) => {
    if (Array.isArray(value) && value.length === 2) {
      onPriceChange([value[0], value[1]])
    }
  }

  const handleReset = () => {
    onPriceChange(DEFAULT_PRICE_RANGE)
    onBrandChange(null)
    onLocationChange(null)
    onInStockChange(false)
    onDeliveryAvailableChange(false)
    onVerifiedOnlyChange(false)
    onReset?.()
  }

  return (
    <div className="space-y-6">
      {/* Price Range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price Range (ETB)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={priceRange}
            onValueChange={handlePriceChange}
            max={DEFAULT_PRICE_RANGE[1]}
            step={1000}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{priceRange[0].toLocaleString()} ETB</span>
            <span className="text-muted-foreground">{priceRange[1].toLocaleString()} ETB</span>
          </div>
        </CardContent>
      </Card>

      {/* City Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={location ?? "__all__"}
            onValueChange={(value) => onLocationChange(value === "__all__" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All locations</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Brand Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {brands.length === 0 ? (
            <p className="text-sm text-muted-foreground">No brands available for this subcategory yet.</p>
          ) : (
            brands.map((brand) => {
              const checkboxId = `brand-${brand.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`
              return (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={checkboxId}
                    checked={selectedBrand === brand}
                    onCheckedChange={(checked) => {
                      const isChecked = Boolean(checked)
                      if (isChecked) {
                        onBrandChange(brand)
                      } else if (selectedBrand === brand) {
                        onBrandChange(null)
                      }
                    }}
                  />
                  <Label htmlFor={checkboxId} className="text-sm font-normal cursor-pointer">
                    {brand}
                  </Label>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="in-stock"
              checked={inStock}
              onCheckedChange={(checked) => onInStockChange(Boolean(checked))}
            />
            <Label htmlFor="in-stock" className="text-sm font-normal cursor-pointer">
              In Stock
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="delivery"
              checked={deliveryAvailable}
              onCheckedChange={(checked) => onDeliveryAvailableChange(Boolean(checked))}
            />
            <Label htmlFor="delivery" className="text-sm font-normal cursor-pointer">
              Delivery Available
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="verified"
              checked={verifiedOnly}
              onCheckedChange={(checked) => onVerifiedOnlyChange(Boolean(checked))}
            />
            <Label htmlFor="verified" className="text-sm font-normal cursor-pointer">
              Verified Suppliers Only
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 bg-transparent" onClick={handleReset}>
          Reset Filters
        </Button>
        <Button className="flex-1" onClick={onApplyFilters}>
          Apply Filters
        </Button>
      </div>
    </div>
  )
}
