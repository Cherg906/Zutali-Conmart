"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Star, MapPin, BadgeCheck, Truck, Phone, Mail, MessageSquare, Heart, Share2, ChevronLeft, Facebook, MessageCircle, Send, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ProductCard } from "@/components/product/product-card"
import { QuotationRequestModal } from "@/components/ui/quotation-request-modal"
import { MessageSupplierModal } from "@/components/ui/message-supplier-modal"
import { useAuth } from "@/app/context/auth-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

type ApiProductImage = string | { image?: string | null; url?: string | null; file?: string | null }

type SpecificationRow = {
  attribute: string
  value: string
}

type ApiProductOwner = {
  id: string
  business_name: string
  business_description?: string | null
  business_address?: string | null
  business_phone?: string | null
  business_email?: string | null
  city?: string | null
  location?: string | null
  verification_status?: string | null
  delivery_available?: boolean | null
  payment_methods?: string[] | null
}

type ApiProduct = {
  id: string
  name: string
  name_amharic?: string | null
  description?: string | null
  description_amharic?: string | null
  price?: number | string | null
  price_negotiable?: boolean | null
  has_quotation_price?: boolean | null
  quotation_available?: boolean | null
  available_quantity?: number | string | null
  min_order_quantity?: number | string | null
  unit?: string | null
  status?: string | null
  primary_image?: string | null
  images?: ApiProductImage[] | null
  specifications?: unknown
  average_rating?: number | string | null
  review_count?: number | string | null
  category?: { id?: string; name?: string | null; slug?: string | null } | string | null
  subcategory?: { id?: string; name?: string | null; slug?: string | null } | string | null
  owner?: ApiProductOwner | null
  location?: string | null
  delivery_available?: boolean | null
  brand?: string | null
  model?: string | null
  videos?: string[] | null
}

type ApiReview = {
  id: string
  rating: number
  comment?: string | null
  created_at?: string | null
  updated_at?: string | null
  verified_purchase?: boolean | null
  user?: {
    first_name?: string | null
    last_name?: string | null
    username?: string | null
  } | null
}

type ReviewDisplay = {
  id: string
  rating: number
  comment: string
  date: string
  author: string
  verified: boolean
}

type ProductCardProduct = Parameters<typeof ProductCard>[0]["product"]

const extractImageUrl = (image: ApiProductImage | null | undefined): string | null => {
  if (!image) {
    return null
  }

  if (typeof image === "string") {
    return image
  }

  return image.image || image.url || image.file || null
}

const buildImageGallery = (product: ApiProduct | null): string[] => {
  if (!product) {
    return ["/placeholder.svg"]
  }

  const gallery: string[] = []

  if (product.primary_image) {
    gallery.push(product.primary_image)
  }

  if (Array.isArray(product.images)) {
    for (const entry of product.images) {
      const url = extractImageUrl(entry)
      if (url) {
        gallery.push(url)
      }
    }
  }

  const unique = Array.from(new Set(gallery.filter(Boolean)))
  return unique.length ? unique : ["/placeholder.svg"]
}

const normaliseSpecifications = (specs: ApiProduct["specifications"]): SpecificationRow[] => {
  if (!specs) {
    return []
  }

  if (Array.isArray(specs)) {
    return specs
      .map((row: any) => ({
        attribute: String(row?.attribute ?? row?.key ?? "").trim(),
        value: String(row?.value ?? row?.val ?? "").trim(),
      }))
      .filter((row) => row.attribute && row.value)
  }

  if (typeof specs === "object") {
    return Object.entries(specs as Record<string, unknown>)
      .map(([attribute, value]) => ({
        attribute: String(attribute).trim(),
        value: value === null || value === undefined ? "" : String(value).trim(),
      }))
      .filter((row) => row.attribute && row.value)
  }

  return []
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatCurrency = (value: number | null): string | null => {
  if (value === null) {
    return null
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace("ETB", "ETB ")
}

const formatReviewDate = (value: string | null | undefined): string => {
  if (!value) {
    return ""
  }

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }

  return new Date(timestamp).toLocaleDateString()
}

const mapReviewForDisplay = (review: ApiReview): ReviewDisplay => {
  const firstName = review.user?.first_name?.trim() ?? ""
  const lastName = review.user?.last_name?.trim() ?? ""
  const username = review.user?.username?.trim() ?? "Anonymous"

  const author = [firstName, lastName].filter(Boolean).join(" ") || username

  return {
    id: String(review.id),
    rating: toNumberOrNull(review.rating) ?? 0,
    comment: (review.comment ?? "").trim(),
    date: formatReviewDate(review.created_at ?? review.updated_at),
    author,
    verified: Boolean(review.verified_purchase),
  }
}

const allowedProductStatuses: ProductCardProduct["status"][] = [
  "active",
  "inactive",
  "out_of_stock",
  "under_review",
  "rejected",
]

const mapApiProductToCardProduct = (item: ApiProduct): ProductCardProduct => {
  const owner = item.owner ?? {
    id: "",
    business_name: "Supplier",
    location: "",
    delivery_available: false,
  }

  const imageList = Array.isArray(item.images)
    ? item.images
        .map((entry) => extractImageUrl(entry) ?? undefined)
        .filter((url): url is string => Boolean(url))
    : []

  const price = toNumberOrNull(item.price)
  const availableQuantity = toNumberOrNull(item.available_quantity)
  const averageRating = toNumberOrNull(item.average_rating) ?? 0
  const reviewCount = toNumberOrNull(item.review_count) ?? 0
  const viewCount = toNumberOrNull((item as any)?.view_count) ?? 0
  const quotationRequests = toNumberOrNull((item as any)?.quotation_requests_count) ?? 0
  const priceNegotiable = Boolean((item as any)?.price_negotiable)
  const hasQuotationPrice = Boolean(item.has_quotation_price)
  const brand = typeof (item as any)?.brand === "string" ? (item as any).brand : undefined
  const statusValue = typeof item.status === "string" ? item.status.toLowerCase() : "active"
  const status = (allowedProductStatuses.includes(statusValue as ProductCardProduct["status"]) 
    ? statusValue 
    : "active") as ProductCardProduct["status"]
  const deliveryAvailable = Boolean((item as any)?.delivery_available ?? owner.delivery_available)
  const ownerAverageRating = toNumberOrNull((owner as any)?.average_rating) ?? 0
  const ownerTotalReviews = toNumberOrNull((owner as any)?.total_reviews) ?? 0
  const ownerVerification = owner?.verification_status === "verified"
    ? "verified"
    : owner?.verification_status === "rejected"
      ? "rejected"
      : "pending"
  const ownerLocation = owner?.location || owner?.city || ""
  const createdAt = typeof (item as any)?.created_at === "string"
    ? (item as any).created_at
    : new Date().toISOString()

  return {
    id: String(item.id),
    name: item.name,
    description: item.description ?? "",
    images: imageList,
    primary_image: item.primary_image ?? imageList[0] ?? "/placeholder.svg",
    price: price ?? undefined,
    price_negotiable: priceNegotiable,
    has_quotation_price: hasQuotationPrice,
    brand,
    unit: item.unit ?? "",
    available_quantity: availableQuantity ?? undefined,
    status,
    average_rating: averageRating,
    total_reviews: reviewCount,
    view_count: viewCount,
    quotation_requests_count: quotationRequests,
    delivery_available: deliveryAvailable,
    owner: {
      id: String(owner.id ?? ""),
      business_name: owner.business_name ?? "Supplier",
      average_rating: ownerAverageRating,
      total_reviews: ownerTotalReviews,
      verification_status: ownerVerification,
      delivery_available: Boolean(owner.delivery_available),
      location: ownerLocation,
      city: owner.city ?? undefined,
    },
    created_at: createdAt,
    category: item.category && typeof item.category === "object" ? { name: item.category.name ?? "" } : undefined,
  }
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ReviewDisplay[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [similarProducts, setSimilarProducts] = useState<ApiProduct[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [favorites, setFavorites] = useState<string[]>([])
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [favoriteUpdating, setFavoriteUpdating] = useState<string | null>(null)
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null)

  const { user, token } = useAuth()
  const { toast } = useToast()

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const productUrl = useMemo(() => {
    const path = `/products/${encodeURIComponent(params.slug)}`
    if (typeof window !== "undefined") {
      return `${window.location.origin}${path}`
    }
    if (appBaseUrl) {
      return `${appBaseUrl.replace(/\/$/, "")}${path}`
    }
    return ""
  }, [params.slug, appBaseUrl])

  const shareOptions = useMemo(() => {
    if (!productUrl) {
      return [] as Array<{ label: string; icon: React.ComponentType<{ className?: string }>; href: string }>
    }
    const encodedUrl = encodeURIComponent(productUrl)
    const message = product?.name ? `${product.name} on Zutali Conmart` : "Check this product on Zutali Conmart"
    const encodedMessage = encodeURIComponent(`${message} - ${productUrl}`)

    return [
      {
        label: "Facebook",
        icon: Facebook,
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        label: "Messenger",
        icon: MessageCircle,
        href: `https://www.messenger.com/t/?link=${encodedUrl}`,
      },
      {
        label: "WhatsApp",
        icon: MessageSquare,
        href: `https://wa.me/?text=${encodedMessage}`,
      },
      {
        label: "Telegram",
        icon: Send,
        href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
      },
    ]
  }, [productUrl, product?.name])

  const handleShareCopy = useCallback(async () => {
    if (!productUrl) {
      toast({
        title: "Link unavailable",
        description: "We couldn't build a share link for this product right now.",
        variant: "destructive",
      })
      return
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(productUrl)
      } else {
        const tempInput = document.createElement("input")
        tempInput.value = productUrl
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand("copy")
        document.body.removeChild(tempInput)
      }

      toast({
        title: "Link copied",
        description: "Product link copied to clipboard.",
      })
    } catch (error) {
      console.error("Copy share link failed", error)
      toast({
        title: "Copy failed",
        description: "Please try copying the link manually.",
        variant: "destructive",
      })
    }
  }, [productUrl, toast])

  useEffect(() => {
    const fetchProduct = async () => {
      setProductLoading(true)
      setProductError(null)

      try {
        const response = await fetch(`/api/products/${encodeURIComponent(params.slug)}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load product")
        }

        setProduct(payload?.product ?? payload ?? null)
      } catch (error: any) {
        console.error("Product load error", error)
        setProductError(error?.message || "Unable to load product. Please try again later.")
        setProduct(null)
      } finally {
        setProductLoading(false)
      }
    }

    fetchProduct()
  }, [params.slug])

  useEffect(() => {
    const fetchReviews = async (productId: string) => {
      setReviewsLoading(true)
      setReviewsError(null)

      try {
        const response = await fetch(`/api/reviews?product_id=${encodeURIComponent(productId)}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load reviews")
        }

        const list = Array.isArray(payload?.reviews) ? payload.reviews : payload?.results ?? payload ?? []
        setReviews(list.map(mapReviewForDisplay))
      } catch (error: any) {
        console.error("Reviews load error", error)
        setReviewsError(error?.message || "Unable to load reviews right now.")
        setReviews([])
      } finally {
        setReviewsLoading(false)
      }
    }

    if (product?.id) {
      fetchReviews(product.id)
    } else {
      setReviews([])
    }
  }, [product?.id])

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      setSimilarLoading(true)
      try {
        const searchParams = new URLSearchParams({ limit: "6" })

        const categoryId =
          typeof product?.subcategory === "object" && product?.subcategory?.id
            ? String(product.subcategory.id)
            : typeof product?.subcategory === "string"
              ? product.subcategory
              : typeof product?.category === "object" && product?.category?.id
                ? String(product.category.id)
                : typeof product?.category === "string"
                  ? product.category
                  : ""

        if (categoryId) {
          searchParams.set("subcategory", categoryId)
        }

        const response = await fetch(`/api/products?${searchParams.toString()}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load similar products")
        }

        const list = Array.isArray(payload?.products) ? payload.products : payload?.results ?? []
        const filtered = Array.isArray(list)
          ? list
              .map((item: any) => ({ ...item, id: String(item?.id ?? "") }))
              .filter((item: any) => item.id && item.id !== product?.id)
          : []

        setSimilarProducts(filtered.slice(0, 3))
      } catch (error) {
        console.error("Similar products load error", error)
        setSimilarProducts([])
      } finally {
        setSimilarLoading(false)
      }
    }

    if (product) {
      void fetchSimilarProducts()
    }
  }, [product])

  const loadFavoriteState = useCallback(async () => {
    if (!token || !product?.id) {
      return
    }

    try {
      const response = await fetch("/api/user/dashboard", {
        headers: {
          Authorization: `Token ${token}`,
        },
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to load favorites")
      }

      const favoriteIds = Array.isArray(data?.favorites)
        ? data.favorites
            .map((item: any) => {
              if (!item) return null
              if (typeof item === "string") return item
              if (typeof item?.id === "string" || typeof item?.id === "number") {
                return String(item.id)
              }
              if (typeof item?.product_id === "string" || typeof item?.product_id === "number") {
                return String(item.product_id)
              }
              return null
            })
            .filter(Boolean) as string[]
        : []

      setFavorites(favoriteIds)
    } catch (error) {
      console.error("Failed to load favorite status", error)
    }
  }, [token, product?.id])

  useEffect(() => {
    void loadFavoriteState()
  }, [loadFavoriteState])

  // Track product view
  useEffect(() => {
    if (product?.id) {
      // Increment view count
      fetch(`/api/products/${product.id}`, {
        method: 'POST',
      }).catch(error => {
        console.error('Failed to increment view count:', error)
      })
    }
  }, [product?.id])

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!token) {
      alert("Please login to manage favorites")
      window.location.href = "/login?type=user"
      return
    }

    if (favoriteUpdating) {
      return
    }

    setFavoriteUpdating(productId)

    try {
      const response = await fetch(`/api/user/favorites/${productId}/toggle`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update favorite")
      }

      const isFavorited = typeof data?.is_favorited === "boolean"
        ? data.is_favorited
        : data?.status === "added"

      setFavorites((prev) => {
        const next = new Set(prev)
        if (isFavorited) {
          next.add(productId)
        } else {
          next.delete(productId)
        }
        return Array.from(next)
      })
    } catch (error) {
      console.error("Favorite toggle error", error)
      alert("Failed to update favorite. Please try again.")
    } finally {
      setFavoriteUpdating(null)
    }
  }, [token, favoriteUpdating])

  const handleFavoriteToggle = useCallback((productId: string) => {
    void toggleFavorite(productId)
  }, [toggleFavorite])

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user is logged in
    const authToken = localStorage.getItem('authToken')
    if (!authToken) {
      alert("Please login to submit a review")
      window.location.href = '/login?type=user'
      return
    }

    if (reviewRating === 0) {
      alert("Please select a rating")
      return
    }

    setIsSubmittingReview(true)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          product_id: product.id.toString(),
          rating: reviewRating,
          comment: reviewComment
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          alert("Please login to submit a review")
          window.location.href = '/login?type=user'
          return
        }
        throw new Error(data.error || 'Failed to submit review')
      }

      alert("Review submitted successfully!")
      
      // Reset form
      setReviewRating(0)
      setReviewComment("")
      
    } catch (error) {
      console.error('Review submission error:', error)
      alert("Failed to submit review. Please try again.")
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const gallery = useMemo(() => buildImageGallery(product), [product])
  const specifications = useMemo(() => normaliseSpecifications(product?.specifications), [product?.specifications])
  const priceNumber = useMemo(() => toNumberOrNull(product?.price), [product?.price])
  const formattedPrice = useMemo(() => formatCurrency(priceNumber), [priceNumber])

  const { reviewAverage, reviewCount } = useMemo(() => {
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)
      return {
        reviewAverage: total / reviews.length,
        reviewCount: reviews.length,
      }
    }

    return {
      reviewAverage: toNumberOrNull(product?.average_rating) ?? 0,
      reviewCount: toNumberOrNull(product?.review_count) ?? 0,
    }
  }, [reviews, product?.average_rating, product?.review_count])
  const minOrderQuantity = useMemo(() => {
    if (!product) return 1
    return toNumberOrNull((product as any)?.min_order_quantity ?? (product as any)?.minimum_order_quantity) ?? 1
  }, [product])

  const seller = product?.owner ?? null
  const showDeliveryBadge = Boolean(seller?.delivery_available)
  const quotationEnabled = Boolean(product?.quotation_available || product?.has_quotation_price)

  const currentProductId = product?.id ? String(product.id) : null
  const currentProductFavorited = currentProductId ? favorites.includes(currentProductId) : false

  const userTier = (user?.tier ?? "free") as string
  const isUserVerified = user?.verification_status === "verified"
  const isPremiumVerified = userTier === "premium" && isUserVerified
  const loginRedirectPath = `/login?type=user&returnTo=${encodeURIComponent(`/products/${params.slug}`)}`
  const upgradeUrl = "/dashboard/user?tab=subscriptions"
  const upgradeMessage = "The requested feature is not available in your tier, please upgrade for better experience."

  const handleOpenQuotationModal = useCallback(() => {
    if (!token) {
      toast({
        title: "Login required",
        description: "Please login to request a quotation.",
        variant: "destructive",
      })
      if (typeof window !== "undefined") {
        window.location.href = loginRedirectPath
      }
      return
    }

    if (userTier === "free") {
      toast({
        title: "Upgrade required",
        description: upgradeMessage,
        variant: "destructive",
      })
      setUpgradeNotice(upgradeMessage)
      setTimeout(() => {
        setUpgradeNotice(null)
      }, 5000)
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.href = upgradeUrl
        }, 2000)
      }
      return
    }

    if (!isUserVerified) {
      toast({
        title: "Verification required",
        description: "Please complete verification to request quotations with your plan.",
        variant: "destructive",
      })
      return
    }

    setShowQuotationModal(true)
  }, [token, toast, userTier, isUserVerified, loginRedirectPath, upgradeUrl])

  const handleOpenMessageModal = useCallback(() => {
    if (!token) {
      toast({
        title: "Login required",
        description: "Please login to message suppliers.",
        variant: "destructive",
      })
      if (typeof window !== "undefined") {
        window.location.href = loginRedirectPath
      }
      return
    }

    if (!isPremiumVerified) {
      toast({
        title: "Premium access required",
        description: upgradeMessage,
        variant: "destructive",
      })
      setUpgradeNotice(upgradeMessage)
      setTimeout(() => {
        setUpgradeNotice(null)
      }, 5000)
      if (typeof window !== "undefined" && userTier !== "premium") {
        setTimeout(() => {
          window.location.href = upgradeUrl
        }, 2000)
      }
      return
    }

    setShowMessageModal(true)
  }, [token, toast, isPremiumVerified, loginRedirectPath, userTier, upgradeUrl])

  if (productLoading) {
    return <div className="container mx-auto px-4 py-16">Loading product...</div>
  }

  if (productError || !product) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-destructive">
          <h1 className="mb-2 text-2xl font-semibold">Product unavailable</h1>
          <p className="mb-6 text-sm text-destructive/80">{productError || "The product you are looking for could not be found."}</p>
          <Button asChild>
            <Link href="/categories">Browse categories</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span>/</span>
        <Link href="/categories" className="hover:text-primary">
          Categories
        </Link>
        <span>/</span>
        {product.category && typeof product.category === "object" && product.category?.slug ? (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-primary">
              {product.category.name || "Category"}
            </Link>
            <span>/</span>
          </>
        ) : null}
        {product.subcategory && typeof product.subcategory === "object" && product.subcategory?.slug ? (
          <>
            <Link href={`/categories/${product.subcategory.slug}`} className="hover:text-primary">
              {product.subcategory.name || "Subcategory"}
            </Link>
            <span>/</span>
          </>
        ) : null}
        <span className="text-foreground">{product.name}</span>
      </div>

      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/categories">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Categories
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Images */}
        <div>
          <div className="mb-4 aspect-square overflow-hidden rounded-lg bg-muted">
            <img src={gallery[selectedImage] || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {gallery.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                  selectedImage === index ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={image || "/placeholder.svg"} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-balance">{product.name}</h1>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(reviewAverage) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {reviewAverage.toFixed(1)} ({reviewCount} reviews)
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => currentProductId && handleFavoriteToggle(currentProductId)}
                className={currentProductFavorited ? "text-red-500" : ""}
                disabled={favoriteUpdating === currentProductId}
              >
                <Heart className={`h-5 w-5 ${currentProductFavorited ? "fill-current" : ""}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" disabled={!productUrl} aria-label="Share product">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Share this product</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {shareOptions.length === 0 ? (
                    <DropdownMenuItem disabled>No share options available</DropdownMenuItem>
                  ) : (
                    shareOptions.map(({ label, icon: Icon, href }) => (
                      <DropdownMenuItem asChild key={label}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </a>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(event) => { event.preventDefault(); handleShareCopy() }}>
                    <Copy className="h-4 w-4" />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Price & Stock */}
          <div className="mb-6 rounded-lg border bg-muted/30 p-4">
            <div className="mb-2 flex items-baseline gap-2">
              {formattedPrice ? (
                <span className="text-3xl font-bold text-primary">{formattedPrice}</span>
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">Contact for pricing</span>
              )}
              {product.unit ? <span className="text-sm text-muted-foreground">per {product.unit}</span> : null}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant={Number(product?.available_quantity) > 0 ? "success" : "destructive"}>
                {Number(product?.available_quantity) > 0 ? "In Stock" : "Out of Stock"}
              </Badge>
              {Number(product?.available_quantity) > 0 && (
                <span className="text-muted-foreground">{product?.available_quantity} available</span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="mb-2 font-semibold">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>

          {/* Key Features */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {showDeliveryBadge && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-sm">Delivery Available</span>
              </div>
            )}
            {quotationEnabled && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <span className="text-sm">Quotation Available</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {upgradeNotice ? (
              <Alert variant="destructive">
                <AlertTitle>Upgrade required</AlertTitle>
                <AlertDescription>{upgradeNotice}</AlertDescription>
              </Alert>
            ) : null}
            {quotationEnabled ? (
              <Button size="lg" className="w-full" onClick={handleOpenQuotationModal}>
                Request Quotation
              </Button>
            ) : null}
            <Button size="lg" variant="outline" className="w-full bg-transparent" onClick={handleOpenMessageModal}>
              <MessageSquare className="mr-2 h-5 w-5" />
              Message Supplier
            </Button>
          </div>

          {/* Delivery Info */}
          {product.location && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <strong>Location:</strong> {product.location}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-12">
        <Tabs defaultValue="specifications" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="supplier">Supplier Info</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviewCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-6">
                {specifications.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {specifications.map((row) => (
                      <div key={row.attribute} className="flex justify-between border-b pb-2">
                        <span className="font-medium">{row.attribute}</span>
                        <span className="text-muted-foreground">{row.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No specifications provided for this product.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supplier" className="mt-6">
            <Card>
              <CardContent className="p-6">
                {seller ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                        {seller.business_name?.charAt(0) ?? "S"}
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-xl font-semibold">{seller.business_name}</h3>
                          {seller.verification_status === "verified" ? <BadgeCheck className="h-5 w-5 text-primary" /> : null}
                        </div>
                        {seller.business_description ? (
                          <p className="text-sm text-muted-foreground">{seller.business_description}</p>
                        ) : null}
                        <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                          {seller.location || seller.city || seller.business_address ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{seller.location || seller.city || seller.business_address}</span>
                            </div>
                          ) : null}
                          {seller.business_phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{seller.business_phone}</span>
                            </div>
                          ) : null}
                          {seller.business_email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{seller.business_email}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button asChild>
                            <Link href={`/suppliers/${seller.id}`}>View Supplier Profile</Link>
                          </Button>
                          <Button variant="outline" className="bg-transparent" onClick={handleOpenMessageModal}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    </div>

                    {Array.isArray(seller.payment_methods) && seller.payment_methods.length ? (
                      <div className="border-t pt-6">
                        <h4 className="mb-3 font-semibold">Payment Methods</h4>
                        <div className="flex flex-wrap gap-2">
                          {seller.payment_methods.map((method) => (
                            <Badge key={method} variant="outline">
                              {method}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Supplier information is not available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Write a Review</h3>
                <form className="space-y-4" onSubmit={handleReviewSubmit}>
                  <div>
                    <Label htmlFor="rating">Rating</Label>
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-6 w-6 cursor-pointer transition-colors ${
                            star <= reviewRating 
                              ? "fill-amber-400 text-amber-400" 
                              : "fill-muted text-muted hover:fill-amber-400 hover:text-amber-400"
                          }`}
                          onClick={() => setReviewRating(star)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="review">Your Review</Label>
                    <Textarea
                      id="review"
                      placeholder="Share your experience with this product..."
                      className="mt-2"
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isSubmittingReview}>
                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-semibold">{review.author}</span>
                          {review.verified && <Badge variant="secondary">Verified Purchase</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Similar Products */}
      <div className="mt-16">
        <h2 className="mb-6 text-2xl font-bold">Similar Products</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {similarProducts.map((item) => {
            const mapped = mapApiProductToCardProduct(item)
            const mappedId = mapped.id
            return (
              <ProductCard 
                key={mappedId} 
                product={mapped}
                onFavoriteToggle={handleFavoriteToggle}
                isFavorited={favorites.includes(mappedId)}
              />
            )
          })}
        </div>
      </div>

      {/* Quotation Request Modal */}
      {seller ? (
        <QuotationRequestModal
          product={{
            id: product.id,
            name: product.name,
            name_amharic: product.name_amharic,
            price: product.price ? Number(product.price) : undefined,
            unit: product.unit,
            min_order_quantity: product.min_order_quantity ? Number(product.min_order_quantity) : undefined,
            delivery_available: product.delivery_available,
            owner: {
              business_name: product.owner.business_name,
              business_phone: product.owner.business_phone,
            },
          }}
          isOpen={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          onSuccess={(message) => {
            setShowQuotationModal(false)
            toast({
              title: "Success!",
              description: message,
            })
          }}
        />
      ) : null}

      {/* Message Supplier Modal */}
      {seller ? (
        <MessageSupplierModal
          supplier={{
            id: seller.id,
            business_name: seller.business_name,
            business_phone: seller.business_phone ?? "",
            business_email: seller.business_email ?? "",
            verification_status: seller.verification_status === "verified" ? "verified" : "pending",
          }}
          productName={product.name}
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          onSuccess={() => {
            // Could add success handling here
          }}
        />
      ) : null}
    </div>
  )
}
