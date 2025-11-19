"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { 
  Heart, 
  Star, 
  MapPin, 
  Eye, 
  ShoppingCart, 
  Shield, 
  Truck,
  DollarSign,
  MessageCircle,
  Badge as BadgeIcon,
  Package,
  BadgeCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLanguage } from "@/lib/language-context"

interface ProductOwner {
  id: string
  business_name: string
  average_rating: number
  total_reviews: number
  verification_status: 'pending' | 'verified' | 'rejected'
  delivery_available: boolean
  location: string
  city?: string
}

interface Product {
  id: string
  name: string
  name_amharic?: string
  description: string
  description_amharic?: string
  images?: string[]
  primary_image?: string
  price?: number
  price_negotiable: boolean
  has_quotation_price: boolean
  brand?: string
  unit: string
  available_quantity?: number
  status: 'active' | 'inactive' | 'out_of_stock' | 'under_review' | 'rejected'
  average_rating: number
  total_reviews: number
  view_count: number
  quotation_requests_count: number
  delivery_available?: boolean
  owner: ProductOwner
  created_at: string
  category?: {
    name: string
    name_amharic?: string
  }
}

interface ProductCardProps {
  product: Product
  onFavoriteToggle: (productId: string) => void
  isFavorited: boolean
  showOwnerInfo?: boolean
  showQuickActions?: boolean
}

export function ProductCard({ 
  product, 
  onFavoriteToggle, 
  isFavorited, 
  showOwnerInfo = true,
  showQuickActions = true 
}: ProductCardProps) {
  const { t, language } = useLanguage()
  const [imageLoading, setImageLoading] = useState(true)

  const ownerRatingRaw = product.owner?.average_rating
  const ownerRating = typeof ownerRatingRaw === "number" ? ownerRatingRaw : Number(ownerRatingRaw) || 0
  const productImages = Array.isArray(product.images) ? product.images.filter(Boolean) : []
  const heroImage = product.primary_image || productImages[0] || "/placeholder.svg"

  const productName = language === 'am' && product.name_amharic 
    ? product.name_amharic 
    : product.name

  const productDescription = language === 'am' && product.description_amharic 
    ? product.description_amharic 
    : product.description

  const categoryName = language === 'am' && product.category?.name_amharic
    ? product.category.name_amharic
    : product.category?.name

  const formatPrice = (price?: number) => {
    if (!price) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price).replace('ETB', 'ETB ')
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-3 w-3 ${
          index < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : index < rating
            ? 'fill-yellow-200 text-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="text-xs bg-green-100 text-green-800">{t("product.inStock")}</Badge>
      case 'out_of_stock':
        return <Badge className="text-xs bg-red-100 text-red-800">{t("product.outOfStock")}</Badge>
      case 'under_review':
        return <Badge className="text-xs bg-yellow-100 text-yellow-800">Under Review</Badge>
      default:
        return null
    }
  }

  return (
    <TooltipProvider>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border-0 shadow-sm">
        {/* Product Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Link href={`/products/${product.id}`}>
            {heroImage ? (
              <Image
                src={heroImage}
                alt={productName}
                fill
                className={`object-cover transition-all duration-300 group-hover:scale-105 ${
                  imageLoading ? 'blur-sm' : 'blur-0'
                }`}
                onLoadingComplete={() => setImageLoading(false)}
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full bg-muted">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </Link>

          {/* Overlay Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.owner.verification_status === 'verified' && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge className="text-xs bg-blue-100 text-blue-800 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {t("product.verifiedSupplier")}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This supplier is verified with proper business documentation</p>
                </TooltipContent>
              </Tooltip>
            )}
            {(product.delivery_available ?? product.owner.delivery_available) && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge className="text-xs bg-green-100 text-green-800 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Delivery
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delivery service available</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            {getStatusBadge(product.status)}
          </div>

          {/* Favorite Button */}
          <div className="absolute bottom-2 right-2">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full w-8 h-8 p-0 bg-white/80 backdrop-blur-sm hover:bg-white"
              onClick={() => onFavoriteToggle(product.id)}
            >
              <Heart 
                className={`h-4 w-4 ${
                  isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'
                }`} 
              />
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Category */}
          {categoryName && (
            <Badge variant="outline" className="text-xs">
              {categoryName}
            </Badge>
          )}

          {/* Product Name */}
          <Link href={`/products/${product.id}`}>
            <h3 className="font-medium text-base leading-5 line-clamp-2 group-hover:text-primary transition-colors">
              {productName}
            </h3>
          </Link>

          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-muted-foreground">
              Brand: <span className="font-medium">{product.brand}</span>
            </p>
          )}

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {productDescription}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {renderStars(product.average_rating)}
            </div>
            <span className="text-sm text-muted-foreground">
              {product.average_rating > 0 ? product.average_rating.toFixed(1) : '0.0'}
            </span>
            <span className="text-sm text-muted-foreground">
              ({product.total_reviews} {product.total_reviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {product.price ? (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg text-primary">
                    {formatPrice(product.price)}
                  </span>
                  {product.price_negotiable && (
                    <Badge variant="outline" className="text-xs">Negotiable</Badge>
                  )}
                </div>
              ) : product.has_quotation_price ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">Price on Request</span>
                  <Badge variant="outline" className="text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Quote
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground">Contact for pricing</span>
              )}
              <div className="text-xs text-muted-foreground">
                per {product.unit}
                {product.available_quantity && (
                  <> • {product.available_quantity} available</>
                )}
              </div>
            </div>
          </div>

          {/* Supplier Info */}
          {showOwnerInfo && (
            <div className="pt-2 border-t">
              <Link href={`/suppliers/${product.owner.id}`}>
                <div className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {product.owner.business_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">
                        {product.owner.business_name}
                      </p>
                      {product.owner.verification_status === 'verified' && (
                        <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {renderStars(ownerRating).slice(0, 3)}
                        <span>{ownerRating.toFixed(1)}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {product.owner.city || product.owner.location}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </CardContent>

        {/* Quick Actions */}
        {showQuickActions && (
          <CardFooter className="p-3 pt-0 space-y-2">
            <div className="flex gap-2 w-full">
              <Link href={`/products/${product.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </Link>
              {product.has_quotation_price && (
                <Link href={`/products/${product.id}?action=quote`} className="flex-1">
                  <Button size="sm" className="w-full">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {t("product.requestQuote")}
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {product.view_count} views
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {product.quotation_requests_count} quotes
                </span>
              </div>
              <span>
                {new Date(product.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardFooter>
        )}
      </Card>
    </TooltipProvider>
  )
}
