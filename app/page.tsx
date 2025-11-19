"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Shield, Truck, Award, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/language-context"

interface Category {
  id: string
  name: string
  name_amharic: string
  slug: string
  description: string
  description_amharic: string
  icon: string
  category_images?: string[]
  images?: string[]
  product_count?: number
}

// Categories are now loaded from Django API only

const features = [
  {
    icon: Shield,
    title: "Verified Suppliers",
    titleAm: "የተረጋገጡ አቅራቢዎች",
    description: "All product owners are verified with proper business documentation",
  },
  {
    icon: Award,
    title: "Quality Assured",
    titleAm: "የተረጋገጠ ጥራት",
    description: "Only sustainable and quality construction materials listed",
  },
  {
    icon: Truck,
    title: "Delivery Options",
    titleAm: "የማድረስ አማራጮች",
    description: "Many suppliers offer delivery services to your location",
  },
  {
    icon: TrendingUp,
    title: "Best Prices",
    titleAm: "ምርጥ ዋጋዎች",
    description: "Compare prices from multiple suppliers to get the best deal",
  },
]

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { t, language } = useLanguage()

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories?page_size=100')
        if (response.ok) {
          const data = await response.json()

          // Safely extract categories array from response
          let allCategories = []

          if (Array.isArray(data)) {
            allCategories = data
          } else if (data && typeof data === 'object') {
            if (Array.isArray(data.results)) {
              allCategories = data.results
            } else if (Array.isArray(data.categories)) {
              allCategories = data.categories
            } else if (data.success && Array.isArray(data.categories)) {
              allCategories = data.categories
            }
          }

          // Ensure allCategories is an array before filtering
          if (!Array.isArray(allCategories)) {
            console.warn('Categories API returned non-array data:', data)
            allCategories = []
          }

          // Filter to show only the 8 main categories
          const mainCategorySlugs = [
            'building-materials',
            'finishes-interiors',
            'mep-mechanical-electrical-plumbing',
            'construction-chemicals',
            'insulation-energy',
            'hardware-tools',
            'construction-equipment-machinery',
            'site-essentials'
          ]

          const normalizedCategories: Category[] = allCategories.map((cat: any) => {
            const images: string[] = Array.isArray(cat.images)
              ? cat.images
              : Array.isArray(cat.category_images)
              ? cat.category_images
              : []

            return {
              ...cat,
              images,
            }
          })

          const mainCategories = normalizedCategories.filter((cat: Category) =>
            mainCategorySlugs.includes(cat.slug)
          )

          setCategories(mainCategories)
        } else {
          // No fallback - show empty state
          setCategories([])
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        // No fallback - show empty state
        setCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4" variant="secondary">
              {t("home.sustainableBadge")}
            </Badge>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-balance md:text-5xl lg:text-6xl">
              {t("home.heroTitle")} <span className="text-primary">{t("home.heroTitleHighlight")}</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground text-pretty leading-relaxed">{t("home.heroSubtitle")}</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/categories">
                  {t("home.browseMaterials")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register?type=owner">{t("home.becomeSupplier")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Shield,
                titleKey: "home.verifiedSuppliers",
                descKey: "home.verifiedSuppliersDesc",
              },
              {
                icon: Award,
                titleKey: "home.qualityAssured",
                descKey: "home.qualityAssuredDesc",
              },
              {
                icon: Truck,
                titleKey: "home.deliveryOptions",
                descKey: "home.deliveryOptionsDesc",
              },
              {
                icon: TrendingUp,
                titleKey: "home.bestPrices",
                descKey: "home.bestPricesDesc",
              },
            ].map((feature, index) => (
              <Card key={index} className="border-none shadow-none bg-transparent">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-balance">{t("home.browseByCategory")}</h2>
            <p className="text-muted-foreground text-pretty">{t("home.browseByCategoryDesc")}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="aspect-[4/3] bg-muted animate-pulse" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-3 bg-muted animate-pulse rounded w-20" />
                  </CardContent>
                </Card>
              ))
            ) : (
              categories.map((category) => {
                const imageSrc = category.images && category.images.length > 0
                  ? category.images[0]
                  : "/cement-bag-industrial.jpg"

                return (
                  <Link key={category.id} href={`/categories/${category.slug}`} className="group">
                    <Card className="overflow-hidden transition-all hover:shadow-lg">
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        <img
                          src={imageSrc}
                          alt={language === "en" ? category.name : category.name_amharic}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="mb-1 font-semibold group-hover:text-primary">
                          {language === "en" ? category.name : category.name_amharic}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {category.product_count || 0} {t("home.productsCount")}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })
            )}
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/categories">
                {t("home.viewAllCategories")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-balance">{t("home.readyToStart")}</h2>
          <p className="mb-8 text-lg text-primary-foreground/90 text-pretty">{t("home.readyToStartDesc")}</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">{t("home.createFreeAccount")}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary bg-transparent"
              asChild
            >
              <Link href="/contact">{t("common.contact")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
