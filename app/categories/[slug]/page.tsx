"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ProductFilters, DEFAULT_PRICE_RANGE } from "@/components/product/product-filters"
import { ProductCard } from "@/components/product/product-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SlidersHorizontal, ArrowLeft } from "lucide-react"
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
  parent?: Category | null
}

const buildAIImageUrl = (prompt: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(`${prompt}, photorealistic, ultra detailed, vivid lighting, 4k`)}?width=960&height=720`

const SUBCATEGORY_IMAGE_MAP: Record<string, string> = {
  "cement-concrete": buildAIImageUrl("Commercial photograph of stacked cement bags, wet concrete mixer, active construction site"),
  "sand-gravel-aggregates": buildAIImageUrl("Industrial photo of sand and gravel piles with aggregate conveyor belts"),
  "bricks-blocks-masonry": buildAIImageUrl("Close-up of masonry worker stacking red bricks with mortar on construction site"),
  "steel-metal-products": buildAIImageUrl("Rows of structural steel beams and metal pipes in warehouse"),
  "timber-wood-products": buildAIImageUrl("Lumber yard with stacked timber boards and wooden beams"),
  "roofing-materials": buildAIImageUrl("Rooftop installation with asphalt shingles and roofing tools"),
  "glass-glazing": buildAIImageUrl("Modern facade glazing installation with reflective glass panels"),
  "drywall-plaster-ceiling-boards": buildAIImageUrl("Construction workers fitting drywall ceiling boards in interior"),
  "tiles-flooring": buildAIImageUrl("Floor tiler installing ceramic tiles with spacers"),
  "paints-coatings": buildAIImageUrl("Paint buckets and rollers preparing to coat interior walls"),
  "wall-finishes": buildAIImageUrl("Artisan applying textured plaster wall finish in upscale interior"),
  "doors-windows-frames": buildAIImageUrl("Carpenters installing modern door and window frames"),
  "interior-furniture-fixtures": buildAIImageUrl("Stylish interior with custom furniture and lighting fixtures"),
  "sanitaryware-bathroom-fittings": buildAIImageUrl("Luxury bathroom showroom with modern sanitaryware fittings"),
  "plumbing-pipes": buildAIImageUrl("Mechanical room with organized pvc and copper plumbing pipes"),
  "electrical-materials": buildAIImageUrl("Electrician handling coils of electrical cables and switchgear"),
  "hvac-systems": buildAIImageUrl("HVAC technicians installing large air ducts and vents"),
  "water-supply-pumps": buildAIImageUrl("Industrial water supply pumps in mechanical plant room"),
  "gas-supply-systems": buildAIImageUrl("Gas supply manifold with yellow safety pipelines"),
  "concrete-admixtures": buildAIImageUrl("Chemicals being measured and poured into concrete mix with laboratory beakers"),
  "waterproofing-solutions": buildAIImageUrl("Worker applying waterproof membrane on rooftop"),
  "adhesives-sealants-grouts": buildAIImageUrl("Tile installer spreading adhesive and grout with notched trowel"),
  "protective-coatings": buildAIImageUrl("Industrial spray painting protective coating on steel beams"),
  "flooring-compounds": buildAIImageUrl("Self-leveling flooring compound being poured on subfloor"),
  "thermal-insulation": buildAIImageUrl("Installer placing fiberglass insulation between wall studs"),
  "acoustic-insulation": buildAIImageUrl("Acoustic panels being installed to soundproof interior"),
  "fireproofing-materials": buildAIImageUrl("Technician spraying fireproof coating on structural steel"),
  "solar-renewable-energy-products": buildAIImageUrl("Technicians mounting solar panels on commercial roof"),
  "hand-tools": buildAIImageUrl("Workbench with neatly arranged hand tools like hammers and wrenches"),
  "power-tools": buildAIImageUrl("Display of modern cordless power tools on workshop bench"),
  "fasteners": buildAIImageUrl("Macro shot of assorted bolts nuts and screws organized in bins"),
  "measuring-layout-tools": buildAIImageUrl("Workbench display of measuring tape, spirit level, calipers, and layout square for precision woodworking"),
  "safety-materials": buildAIImageUrl("Construction safety gear including helmets vests gloves on table"),
  "earthmoving-equipment": buildAIImageUrl("Excavators and bulldozers moving earth on large site"),
  "concrete-equipment": buildAIImageUrl("Concrete pump truck pouring concrete at high rise"),
  "material-handling": buildAIImageUrl("Warehouse forklifts moving pallets of construction materials"),
  "compaction-equipment": buildAIImageUrl("Road roller compacting soil on infrastructure project"),
  "scaffolding-formwork": buildAIImageUrl("Layered scaffolding and formwork around building under construction"),
  "generators-compressors": buildAIImageUrl("Portable industrial generators and air compressors at job site"),
  "temporary-structures": buildAIImageUrl("Temporary modular site offices with signage"),
  "safety-signage": buildAIImageUrl("Construction site entrance with safety signage and barriers"),
  "waste-management-recycling": buildAIImageUrl("Construction waste sorting with recycling dumpsters"),
  "surveying-instruments": buildAIImageUrl("Surveyor operating total station instrument on tripod"),
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const [category, setCategory] = useState<Category | null>(null)
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showProducts, setShowProducts] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [brandOptions, setBrandOptions] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE)
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [deliveryOnly, setDeliveryOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const hasInitialLoadRef = useRef(false)
  const { language, t } = useLanguage()

  const loadProducts = useCallback(
    async (
      subcategoryId: string,
      options?: {
        brand?: string | null
        refreshBrands?: boolean
        minPrice?: number
        maxPrice?: number
        location?: string | null
        inStock?: boolean
        deliveryAvailable?: boolean
        verifiedOnly?: boolean
      },
    ) => {
      setProductsLoading(true)
      setProductsError(null)
      const brand = options?.brand ?? null
      const refreshBrands = options?.refreshBrands ?? false
      const minPrice = options?.minPrice
      const maxPrice = options?.maxPrice
      const location = options?.location ?? null
      const inStock = options?.inStock ?? false
      const deliveryAvailable = options?.deliveryAvailable ?? false
      const verified = options?.verifiedOnly ?? false

      try {
        const params = new URLSearchParams({ subcategory: subcategoryId })
        if (brand) {
          params.set("brand", brand)
        }
        if (minPrice !== undefined) {
          params.set("min_price", String(minPrice))
        }
        if (maxPrice !== undefined) {
          params.set("max_price", String(maxPrice))
        }
        if (location) {
          params.set("location", location)
        }
        if (inStock) {
          params.set("in_stock", "true")
        }
        if (deliveryAvailable) {
          params.set("delivery_available", "true")
        }
        if (verified) {
          params.set("verified_owner", "true")
        }

        const url = `/api/products?${params.toString()}`
        const response = await fetch(url)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load products")
        }

        const list = Array.isArray(data?.products) ? data.products : []
        const normalizedList = list.map((item: any) => ({
          ...item,
          delivery_available:
            typeof item?.delivery_available === "boolean"
              ? item.delivery_available
              : item?.owner?.delivery_available ?? false,
          owner: {
            delivery_available: item?.owner?.delivery_available ?? item?.delivery_available ?? false,
            ...(item?.owner ?? {}),
          },
        }))

        setProducts(normalizedList)

        if (!brand || refreshBrands) {
          const uniqueBrands = Array.from(
            new Set(
              normalizedList
                .map((item: any) => (item?.brand ? String(item.brand).trim() : ""))
                .filter((value: string): value is string => Boolean(value)),
            ),
          ) as string[]
          setBrandOptions(uniqueBrands)
        }
      } catch (error) {
        console.error("Error loading products:", error)
        setProductsError("Unable to load products. Please try again later.")
        setProducts([])
        if (!brand || options?.refreshBrands) {
          setBrandOptions([])
        }
      } finally {
        setProductsLoading(false)
      }
    },
    [],
  )

  const handleBrandChange = (brand: string | null) => {
    setSelectedBrand(brand)
    if (category && showProducts) {
      const minPrice = priceRange[0] > DEFAULT_PRICE_RANGE[0] ? priceRange[0] : undefined
      const maxPrice = priceRange[1] < DEFAULT_PRICE_RANGE[1] ? priceRange[1] : undefined
      void loadProducts(category.id, {
        brand,
        refreshBrands: false,
        minPrice,
        maxPrice,
        location: locationFilter,
        inStock: inStockOnly,
        deliveryAvailable: deliveryOnly,
        verifiedOnly,
      })
    }
  }

  const handleResetFilters = () => {
    setSelectedBrand(null)
    setPriceRange([...DEFAULT_PRICE_RANGE] as [number, number])
    setLocationFilter(null)
    setInStockOnly(false)
    setDeliveryOnly(false)
    setVerifiedOnly(false)
    hasInitialLoadRef.current = false
  }

  const handleApplyFilters = () => {
    if (!category || !showProducts) {
      return
    }

    const minPrice = priceRange[0] > DEFAULT_PRICE_RANGE[0] ? priceRange[0] : undefined
    const maxPrice = priceRange[1] < DEFAULT_PRICE_RANGE[1] ? priceRange[1] : undefined

    void loadProducts(category.id, {
      brand: selectedBrand,
      refreshBrands: false,
      minPrice,
      maxPrice,
      location: locationFilter,
      inStock: inStockOnly,
      deliveryAvailable: deliveryOnly,
      verifiedOnly,
    })
  }

  useEffect(() => {
    // Reset brand selection when slug changes
    setSelectedBrand(null)
    setBrandOptions([])
    setPriceRange([...DEFAULT_PRICE_RANGE] as [number, number])
    setLocationFilter(null)
    setInStockOnly(false)
    setDeliveryOnly(false)
    setVerifiedOnly(false)
    hasInitialLoadRef.current = false
  }, [params.slug])

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        console.log('🔍 Fetching category data from Next.js API proxy')
        const response = await fetch('/api/categories?page_size=100')
        console.log('📡 Category response status:', response.status)
        if (response.ok) {
          const data = await response.json()

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

          // Ensure categoriesData is an array before using it
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

          console.log('📊 Flattened categories:', allCategories.length)

          // Find the current category
          const currentCategory = allCategories.find((cat: Category) => cat.slug === params.slug)

          if (currentCategory) {
            setCategory(currentCategory)
            console.log('📦 Current category:', currentCategory.name, 'ID:', currentCategory.id, 'Parent ID:', currentCategory.parent_id)

            // Check if this is a main category (no parent) or subcategory (has parent)
            if (!currentCategory.parent_id || currentCategory.parent_id === null) {
              // This is a main category - show subcategories
              console.log('📂 Main category detected - loading subcategories')
              console.log('🔍 Looking for categories with parent_id:', currentCategory.id)
              console.log('🔍 All categories:', allCategories.map((cat: Category) => ({
                name: cat.name,
                id: cat.id,
                parent_id: cat.parent_id
              })))
              
              const relatedSubcategories = allCategories.filter((cat: Category) =>
                cat.parent_id === currentCategory.id
              )
              console.log('📋 Found subcategories:', relatedSubcategories.length)
              console.log('📋 Subcategory names:', relatedSubcategories.map((cat: Category) => cat.name))

              setSubcategories(relatedSubcategories)
              setShowProducts(false)
              setProducts([])
              setBrandOptions([])
              hasInitialLoadRef.current = false
            } else {
              // This is a subcategory - show products
              console.log('📦 Subcategory detected - loading products')
              setShowProducts(true)
              await loadProducts(currentCategory.id, {
                brand: null,
                refreshBrands: true,
                minPrice: priceRange[0] > DEFAULT_PRICE_RANGE[0] ? priceRange[0] : undefined,
                maxPrice: priceRange[1] < DEFAULT_PRICE_RANGE[1] ? priceRange[1] : undefined,
                location: locationFilter,
                inStock: inStockOnly,
                deliveryAvailable: deliveryOnly,
                verifiedOnly: verifiedOnly,
              })
              hasInitialLoadRef.current = true
            }
          } else {
            console.error('❌ Category not found for slug:', params.slug)
          }
        }
      } catch (error) {
        console.error('Error fetching category data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategoryData()
  }, [params.slug, loadProducts, priceRange, locationFilter, inStockOnly, deliveryOnly, verifiedOnly])

  useEffect(() => {
    if (!category || !showProducts) {
      return
    }

    const minPrice = priceRange[0] > DEFAULT_PRICE_RANGE[0] ? priceRange[0] : undefined
    const maxPrice = priceRange[1] < DEFAULT_PRICE_RANGE[1] ? priceRange[1] : undefined

    void loadProducts(category.id, {
      brand: selectedBrand,
      refreshBrands: !hasInitialLoadRef.current,
      minPrice,
      maxPrice,
      location: locationFilter,
      inStock: inStockOnly,
      deliveryAvailable: deliveryOnly,
      verifiedOnly,
    }).then(() => {
      if (!hasInitialLoadRef.current) {
        hasInitialLoadRef.current = true
      }
    })
  }, [category, showProducts, selectedBrand, priceRange, locationFilter, inStockOnly, deliveryOnly, verifiedOnly, loadProducts])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Category not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link href="/categories" className="text-muted-foreground hover:text-foreground">
          {t("categories.allCategories")}
        </Link>
        <span className="mx-2 text-muted-foreground">/</span>
        <span className="font-medium">
          {language === "en" ? category.name : category.name_amharic}
        </span>
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">
          {language === "en" ? category.name : category.name_amharic}
        </h1>
        <p className="text-muted-foreground">
          {language === "en" ? category.description : category.description_amharic}
        </p>
      </div>

      {/* Show subcategories or products */}
      {!showProducts ? (
        // Show subcategories
        <div>
          <h2 className="mb-6 text-2xl font-semibold">Subcategories</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subcategories.map((subcategory) => (
              <Link key={subcategory.id} href={`/categories/${subcategory.slug}`} className="group">
                <Card className="overflow-hidden transition-all hover:shadow-lg">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {(() => {
                      const fallbackImage = SUBCATEGORY_IMAGE_MAP[subcategory.slug]
                      const imageSrc = subcategory.category_images?.[0] || fallbackImage || "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop"
                      return (
                      <img
                        src={imageSrc}
                        alt={language === "en" ? subcategory.name : subcategory.name_amharic}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      )
                    })()}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="mb-1 font-semibold group-hover:text-primary">
                      {language === "en" ? subcategory.name : subcategory.name_amharic}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {subcategory.product_count || 0} {t("home.productsCount")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        // Show products
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-6">
            <ProductFilters
              brands={brandOptions}
              selectedBrand={selectedBrand}
              onBrandChange={handleBrandChange}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              location={locationFilter}
              onLocationChange={setLocationFilter}
              inStock={inStockOnly}
              onInStockChange={setInStockOnly}
              deliveryAvailable={deliveryOnly}
              onDeliveryAvailableChange={setDeliveryOnly}
              verifiedOnly={verifiedOnly}
              onVerifiedOnlyChange={setVerifiedOnly}
              onReset={handleResetFilters}
              onApplyFilters={handleApplyFilters}
            />
          </aside>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Products</h2>
              <Button
                variant="outline"
                onClick={() => {
                  if (!category) return
                  const minPrice = priceRange[0] > DEFAULT_PRICE_RANGE[0] ? priceRange[0] : undefined
                  const maxPrice = priceRange[1] < DEFAULT_PRICE_RANGE[1] ? priceRange[1] : undefined
                  void loadProducts(category.id, {
                    brand: selectedBrand,
                    refreshBrands: false,
                    minPrice,
                    maxPrice,
                    location: locationFilter,
                    inStock: inStockOnly,
                    deliveryAvailable: deliveryOnly,
                    verifiedOnly,
                  })
                }}
                disabled={productsLoading}
              >
                Refresh
              </Button>
            </div>
            {productsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading products...</div>
            ) : productsError ? (
              <div className="text-center py-12 text-destructive">{productsError}</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No products found for this subcategory.</div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      ...product,
                      images: Array.isArray(product.images) ? product.images : [],
                      owner: product.owner ?? {
                        id: '',
                        business_name: 'Unknown Supplier',
                        average_rating: 0,
                        total_reviews: 0,
                        verification_status: 'pending',
                        delivery_available: false,
                        location: product.location ?? '',
                        city: product.city ?? '',
                      },
                    }}
                    onFavoriteToggle={() => {}}
                    isFavorited={false}
                    showQuickActions={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
