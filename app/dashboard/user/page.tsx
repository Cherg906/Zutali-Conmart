"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Heart, MessageSquare, FileText, BadgeCheck, Star, XCircle, Clock, Trash2, ChevronDown, ChevronRight, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProductCard } from "@/components/product/product-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/app/context/auth-context"
import { UserVerificationStatus } from "@/components/profile/user-verification-status"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"

const userTiers = [
  {
    value: "free",
    name: "Free User",
    price: 0,
    features: ["Browse products", "View supplier details", "No quotation requests"],
    planCode: null,
  },
  {
    value: "standard",
    name: "Standard Verified",
    price: 50,
    features: ["All Free features", "10 quotations/month", "Verified badge", "Priority support"],
    planCode: "standard_user",
  },
  {
    value: "premium",
    name: "Premium Verified",
    price: 200,
    features: ["All Standard features", "Unlimited quotations", "Direct messaging", "Premium support"],
    planCode: "premium_user",
  },
]

const DJANGO_BASE_URL = process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8000"

const resolveMediaUrl = (path: unknown): string | null => {
  if (!path || typeof path !== "string") return null
  return path.startsWith("http") ? path : `${DJANGO_BASE_URL}${path}`
}

type DashboardStats = {
  favorites_count: number
  quotations_count: number
  pending_quotations: number
  reviews_count: number
  messages_total: number
  messages_unread: number
}

const defaultStats: DashboardStats = {
  favorites_count: 0,
  quotations_count: 0,
  pending_quotations: 0,
  reviews_count: 0,
  messages_total: 0,
  messages_unread: 0,
}

type ProductOwnerVerificationStatus = "verified" | "pending" | "rejected"

type DashboardProductOwner = {
  id: string
  business_name: string
  average_rating: number
  total_reviews: number
  verification_status: ProductOwnerVerificationStatus
  delivery_available: boolean
  location: string
  city?: string | null
}

type DashboardCategory = {
  name: string
  name_amharic?: string | null
}

type ProductStatus = "active" | "inactive" | "out_of_stock" | "under_review" | "rejected"

type DashboardProduct = {
  id: string
  name: string
  description: string
  description_amharic?: string | null
  images?: string[]
  primary_image?: string | null
  price?: number
  price_negotiable: boolean
  has_quotation_price: boolean
  brand?: string | null
  unit: string
  available_quantity?: number
  status: ProductStatus
  average_rating: number
  total_reviews: number
  view_count: number
  quotation_requests_count: number
  delivery_available?: boolean
  owner: DashboardProductOwner
  created_at: string
  category?: DashboardCategory | null
  subcategory?: DashboardCategory | null
}

type DashboardQuotation = {
  id: string
  status: string
  quantity: number
  created_at: string
  updated_at: string
  message?: string | null
  delivery_location?: string | null
  response?: string | null
  price_quote?: number | null
  request_document?: string | null
  response_document?: string | null
  product: DashboardProduct | null
}

type DashboardReview = {
  id: string
  rating: number
  comment?: string | null
  created_at: string
  product: DashboardProduct | null
}

type DashboardMessage = {
  id: string
  content: string
  created_at: string
  sender: { id: string }
  receiver: { id: string }
  product?: {
    id: string
    name?: string | null
  } | null
  is_read?: boolean
}

type DashboardConversation = {
  partner: {
    id: string
    username?: string | null
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    role?: string | null
    avatar?: string | null
  }
  messages: DashboardMessage[]
  last_message: DashboardMessage | null
  unread_count: number
  message_count: number
}

const parseNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeMessage = (message: any): DashboardMessage | null => {
  if (!message) return null

  const product = message?.product
    ? {
        id: String(message.product.id ?? message.product),
        name:
          message.product.name ??
          message.product.product_name ??
          message.product.product_title ??
          null,
      }
    : null

  return {
    id: String(message?.id ?? ""),
    content: message?.content ?? "",
    created_at: message?.created_at ?? new Date().toISOString(),
    sender: { id: String(message?.sender?.id ?? message?.sender ?? "") },
    receiver: { id: String(message?.receiver?.id ?? message?.receiver ?? "") },
    product,
    is_read: typeof message?.is_read === "boolean" ? message.is_read : Boolean(message?.is_read),
  }
}

const normalizeOwner = (owner: any): DashboardProductOwner => {
  const rawStatusValue = typeof owner?.verification_status === "string" ? owner.verification_status : "pending"
  const verification_status: ProductOwnerVerificationStatus =
    rawStatusValue === "verified" || rawStatusValue === "rejected" ? rawStatusValue : "pending"

  return {
    id: owner?.id ?? "",
    business_name: owner?.business_name ?? "Unknown Supplier",
    average_rating: parseNumber(owner?.average_rating),
    total_reviews: Math.round(parseNumber(owner?.total_reviews)),
    verification_status,
    delivery_available: Boolean(owner?.delivery_available),
    location: owner?.location ?? "Unknown",
    city: owner?.city ?? null,
  }
}

const normalizeProduct = (product: any): DashboardProduct => {
  const normalizedOwner = normalizeOwner(product?.owner)
  const priceValue = product?.price
  const rawStatus = (product?.status ?? "active") as ProductStatus

  return {
    id: product?.id ?? "",
    name: product?.name ?? "Untitled Product",
    description: product?.description ?? "",
    description_amharic: product?.description_amharic ?? null,
    images: Array.isArray(product?.images) ? product.images : [],
    primary_image: product?.primary_image ?? null,
    price: priceValue === null || priceValue === undefined ? undefined : parseNumber(priceValue),
    price_negotiable: Boolean(product?.price_negotiable),
    has_quotation_price: Boolean(product?.has_quotation_price),
    brand: product?.brand ?? null,
    unit: product?.unit ?? "",
    available_quantity: product?.available_quantity === null || product?.available_quantity === undefined
      ? undefined
      : parseNumber(product.available_quantity),
    status: rawStatus,
    average_rating: parseNumber(product?.average_rating),
    total_reviews: Math.round(parseNumber(product?.total_reviews)),
    view_count: Math.round(parseNumber(product?.view_count)),
    quotation_requests_count: Math.round(parseNumber(product?.quotation_requests_count)),
    delivery_available: product?.delivery_available ?? normalizedOwner.delivery_available,
    owner: normalizedOwner,
    created_at: product?.created_at ?? new Date().toISOString(),
    category: product?.category ?? null,
    subcategory: product?.subcategory ?? null,
  }
}

const normalizeQuotation = (quotation: any): DashboardQuotation => ({
  id: quotation?.id?.toString() ?? "",
  status: quotation?.status ?? "pending",
  quantity: parseNumber(quotation?.quantity),
  created_at: quotation?.created_at ?? quotation?.updated_at ?? new Date().toISOString(),
  updated_at: quotation?.updated_at ?? quotation?.created_at ?? new Date().toISOString(),
  message: quotation?.message ?? null,
  delivery_location: quotation?.delivery_location ?? null,
  response: quotation?.response ?? null,
  price_quote:
    quotation?.price_quote === null || quotation?.price_quote === undefined || quotation?.price_quote === ""
      ? null
      : parseNumber(quotation.price_quote),
  request_document: resolveMediaUrl(quotation?.request_document),
  response_document: resolveMediaUrl(quotation?.response_document),
  product: quotation?.product ? normalizeProduct(quotation.product) : null,
})

const normalizeReview = (review: any): DashboardReview => ({
  id: review?.id?.toString() ?? "",
  rating: parseNumber(review?.rating),
  comment: review?.comment ?? null,
  created_at: review?.created_at ?? new Date().toISOString(),
  product: review?.product ? normalizeProduct(review.product) : null,
})

export default function UserDashboard() {
  const { user, token, updateUser } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats>(defaultStats)
  const [favoriteProducts, setFavoriteProducts] = useState<DashboardProduct[]>([])
  const [favorites, setFavoritesList] = useState<string[]>([])
  const [quotations, setQuotations] = useState<DashboardQuotation[]>([])
  const [reviews, setReviews] = useState<DashboardReview[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [deletingQuotationId, setDeletingQuotationId] = useState<string | null>(null)
  const [expandedConversations, setExpandedConversations] = useState<Record<string, boolean>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [sendingConversationId, setSendingConversationId] = useState<string | null>(null)
  const [favoritesUpdating, setFavoritesUpdating] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [tempObjectUrl, setTempObjectUrl] = useState<string | null>(null)
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null)
  
  // Verification state
  const [verificationFile, setVerificationFile] = useState<File | null>(null)
  const [verificationSubmitting, setVerificationSubmitting] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  
  // Settings state
  const [firstName, setFirstName] = useState(user?.first_name || "")
  const [lastName, setLastName] = useState(user?.last_name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState(false)
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const displayName = useMemo(() => {
    if (!user) return ""
    if (user.first_name || user.last_name) {
      return [user.first_name, user.last_name].filter(Boolean).join(" ")
    }
    return user.username ?? ""
  }, [user])

  const currentTier = useMemo(() => {
    return user?.tier ?? "free"
  }, [user?.tier])

  const showQuotationFeatures = currentTier !== "free"
  const showMessagingFeatures = true // currentTier === "premium"
  const [conversations, setConversations] = useState<DashboardConversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const currentUserId = user?.id ? String(user.id) : null

  const isVerified = useMemo(() => {
    return user?.verification_status === 'verified'
  }, [user?.verification_status])

  const resolvedAvatar = useMemo(() => {
    if (!user?.avatar) return null
    return user.avatar.startsWith("http")
      ? user.avatar
      : `${process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8000"}${user.avatar}`
  }, [user?.avatar])

  useEffect(() => {
    setAvatarPreview(resolvedAvatar)
  }, [resolvedAvatar])

  // Update form fields when user data changes
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "")
      setLastName(user.last_name || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
    }
  }, [user])

  const fetchDashboardData = useCallback(async () => {
    if (!token) return

    setDashboardLoading(true)
    setDashboardError(null)

    try {
      console.log("Fetching dashboard data from /api/user/dashboard")
      const response = await fetch("/api/user/dashboard", {
        headers: {
          Authorization: `Token ${token}`,
        },
        cache: "no-store",
      })

      console.log("Dashboard API response status:", response.status)
      const data = await response.json()
      console.log("Dashboard API response data:", data)

      if (!response.ok) {
        setDashboardError(data?.message || data?.error || "Failed to load dashboard data.")
        return
      }

      const normalizedFavorites = Array.isArray(data?.favorites) ? data.favorites.map(normalizeProduct) : []
      const normalizedQuotations = Array.isArray(data?.quotations) ? data.quotations.map(normalizeQuotation) : []
      const normalizedReviews = Array.isArray(data?.recent_reviews) ? data.recent_reviews.map(normalizeReview) : []

      setStats({
        ...defaultStats,
        ...(data?.stats ?? {}),
      })
      setFavoriteProducts(normalizedFavorites)
      setFavoritesList(normalizedFavorites.map(product => product.id))
      setQuotations(normalizedQuotations)
      setReviews(normalizedReviews)

      if (data?.verification_status || data?.tier) {
        updateUser(prev => {
          if (!prev) return prev
          const next = { ...prev }
          if (data?.verification_status) {
            next.verification_status = data.verification_status
          }
          if (data?.tier) {
            next.tier = data.tier
          }
          return next
        })
      }
    } catch (error) {
      console.error("Failed to load user dashboard:", error)
      setDashboardError("Failed to load dashboard data. Please try again later.")
    } finally {
      setDashboardLoading(false)
    }
  }, [token, updateUser])

  const handleDeleteQuotation = useCallback(
    async (quotationId: string) => {
      if (!token) {
        toast({
          title: "Sign in required",
          description: "Please sign in again to manage quotations.",
          variant: "destructive",
        })
        return
      }

      const confirmed = window.confirm("Delete this quotation request? This action cannot be undone.")
      if (!confirmed) {
        return
      }

      setDeletingQuotationId(quotationId)

      try {
        const response = await fetch(`/api/quotations?quotation_id=${quotationId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Token ${token}`,
          },
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          const message = data?.error || data?.message || "Failed to delete quotation."
          toast({ title: "Unable to delete", description: message, variant: "destructive" })
          return
        }

        setQuotations((prev) => prev.filter((quotation) => quotation.id !== quotationId))
        toast({ title: "Quotation deleted", description: "The quotation request has been removed." })
        void fetchDashboardData()
      } catch (error) {
        console.error("Failed to delete quotation", error)
        toast({
          title: "Unexpected error",
          description: "Could not delete the quotation. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setDeletingQuotationId(null)
      }
    },
    [token, toast, fetchDashboardData],
  )

  const toggleConversationExpansion = useCallback((conversationId: string) => {
    setExpandedConversations((prev) => ({
      ...prev,
      [conversationId]: !prev[conversationId],
    }))
  }, [])

  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!token) return

    const conversation = conversations.find(c => c.partner.id === conversationId)
    if (!conversation) return

    // Get unread messages in this conversation
    const unreadMessages = conversation.messages.filter(msg => !msg.is_read)
    
    if (unreadMessages.length === 0) return

    try {
      // Mark each unread message as read
      await Promise.all(
        unreadMessages.map(async (message) => {
          const response = await fetch(`/api/messages?message_id=${message.id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Token ${token}`,
            },
          })

          if (!response.ok) {
            console.error(`Failed to mark message ${message.id} as read`)
          }
        })
      )

      // Update local state to reflect read messages
      setConversations(prev => 
        prev.map(conv => {
          if (conv.partner.id === conversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg => ({ ...msg, is_read: true })),
              unread_count: 0,
            }
          }
          return conv
        })
      )

      // Update stats
      setStats(prev => ({
        ...prev,
        messages_unread: Math.max(0, prev.messages_unread - unreadMessages.length),
      }))

      toast({ 
        title: "Messages marked as read", 
        description: `${unreadMessages.length} message(s) marked as read.` 
      })
    } catch (error) {
      console.error("Failed to mark messages as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark messages as read.",
        variant: "destructive",
      })
    }
  }, [token, conversations, toast])

  const handleConversationExpand = useCallback((conversationId: string) => {
    const isCurrentlyExpanded = expandedConversations[conversationId]
    
    // Toggle expansion
    toggleConversationExpansion(conversationId)
    
    // If this is the first time expanding (was previously collapsed), mark messages as read
    if (!isCurrentlyExpanded) {
      markMessagesAsRead(conversationId)
    }
  }, [expandedConversations, toggleConversationExpansion, markMessagesAsRead])

  const handleReplyDraftChange = useCallback((conversationId: string, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [conversationId]: value,
    }))
  }, [])

  
  const loadConversations = useCallback(async () => {
    if (!token || !showMessagingFeatures) {
      setConversations([])
      setConversationsLoading(false)
      setConversationsError(null)
      setStats((prev) => ({
        ...prev,
        messages_total: 0,
        messages_unread: 0,
      }))
      return
    }

    setConversationsLoading(true)
    setConversationsError(null)

    try {
      console.log("Fetching conversations from /api/messages/conversations")
      const response = await fetch("/api/messages/conversations", {
        headers: {
          Authorization: `Token ${token}`,
        },
        cache: "no-store",
      })

      console.log("Messages API response status:", response.status)
      const data = await response.json()
      console.log("Messages API response data:", data)

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to load messages")
      }

      const list = Array.isArray(data?.conversations) ? data.conversations : []

      const normalizedConversations = list.map((item: any) => {
        const partner = {
          id: String(item?.partner?.id ?? ""),
          username: item?.partner?.username ?? null,
          first_name: item?.partner?.first_name ?? null,
          last_name: item?.partner?.last_name ?? null,
          email: item?.partner?.email ?? null,
          role: item?.partner?.role ?? null,
          avatar: resolveMediaUrl(item?.partner?.avatar),
        }

        const normalizedMessages = Array.isArray(item?.messages)
          ? item.messages
              .map((message: any) => normalizeMessage(message))
              .filter((message): message is DashboardMessage => Boolean(message))
          : []

        let normalizedLastMessage = normalizeMessage(item?.last_message)

        if (!normalizedLastMessage && normalizedMessages.length > 0) {
          normalizedLastMessage = normalizedMessages[normalizedMessages.length - 1]
        }

        if (
          normalizedLastMessage &&
          !normalizedMessages.some((message) => message.id && message.id === normalizedLastMessage?.id)
        ) {
          normalizedMessages.push(normalizedLastMessage)
        }

        const messageCountRaw = normalizedMessages.length || parseNumber(item?.message_count, 0)
        const message_count = Math.max(messageCountRaw, normalizedLastMessage ? 1 : 0)

        return {
          partner,
          messages: normalizedMessages,
          last_message: normalizedLastMessage,
          unread_count: parseNumber(item?.unread_count, 0),
          message_count,
        }
      })

      setConversations(normalizedConversations)

      setStats((prev) => {
        const unreadTotal = normalizedConversations.reduce(
          (sum, conversation) => sum + conversation.unread_count,
          0,
        )
        const totalMessages = normalizedConversations.reduce(
          (sum, conversation) => sum + (conversation.message_count || conversation.messages.length),
          0,
        )

        return {
          ...prev,
          messages_total: totalMessages,
          messages_unread: unreadTotal,
        }
      })
    } catch (error: any) {
      console.error("Conversations load error:", error)
      setConversations([])
      setConversationsError(error?.message || "Unable to load messages right now.")
    } finally {
      setConversationsLoading(false)
    }
  }, [token, showMessagingFeatures])

  const handleSendReply = useCallback(
    async (conversationId: string) => {
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in again to send messages.",
          variant: "destructive",
        })
        return
      }

      const draft = replyDrafts[conversationId]?.trim() ?? ""
      if (!draft) {
        toast({
          title: "Message required",
          description: "Enter a message before sending.",
          variant: "destructive",
        })
        return
      }

      const conversation = conversations.find((item) => item.partner.id === conversationId)
      if (!conversation) {
        toast({
          title: "Conversation missing",
          description: "Unable to find this conversation.",
          variant: "destructive",
        })
        return
      }

      setSendingConversationId(conversationId)

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            receiver_id: conversation.partner.id,
            message: draft,
            product_id: conversation.last_message?.product?.id ?? undefined,
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          const message = data?.error || data?.message || "Failed to send message."
          toast({ title: "Unable to send", description: message, variant: "destructive" })
          return
        }

        toast({ title: "Message sent", description: "Your reply has been delivered." })
        setReplyDrafts((prev) => ({
          ...prev,
          [conversationId]: "",
        }))
        await loadConversations()
      } catch (error) {
        console.error("Message send error", error)
        toast({
          title: "Unexpected error",
          description: "Could not send the message. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setSendingConversationId(null)
      }
    },
    [token, replyDrafts, conversations, toast, loadConversations],
  )

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in again to delete messages.",
          variant: "destructive",
        })
        return
      }

      try {
        const response = await fetch(`/api/messages/${messageId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Token ${token}`,
          },
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const message = data?.error || data?.message || "Failed to delete message."
          toast({ title: "Unable to delete", description: message, variant: "destructive" })
          return
        }

        toast({ title: "Message deleted", description: "The message has been removed." })
        await loadConversations()
      } catch (error) {
        console.error("Message delete error", error)
        toast({
          title: "Unexpected error",
          description: "Could not delete the message. Please try again later.",
          variant: "destructive",
        })
      }
    },
    [token, toast, loadConversations],
  )

  useEffect(() => {
    return () => {
      if (tempObjectUrl) {
        URL.revokeObjectURL(tempObjectUrl)
      }
    }
  }, [tempObjectUrl])

  // Load dashboard data on component mount
  useEffect(() => {
    console.log("User dashboard useEffect - token available:", !!token)
    if (token) {
      void fetchDashboardData()
    }
  }, [token, fetchDashboardData])

  // Load conversations on component mount
  useEffect(() => {
    if (token && showMessagingFeatures) {
      void loadConversations()
    }
  }, [token, showMessagingFeatures, loadConversations])

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!token) {
      setAvatarError("You must be logged in to update your avatar.")
      return
    }

    if (tempObjectUrl) {
      URL.revokeObjectURL(tempObjectUrl)
      setTempObjectUrl(null)
    }

    const previewUrl = URL.createObjectURL(file)
    setTempObjectUrl(previewUrl)
    setAvatarPreview(previewUrl)
    setAvatarError(null)
    setAvatarUploading(true)

    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch("/api/users/avatar", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setAvatarError(data.error || "Failed to upload avatar.")
        setAvatarPreview(resolvedAvatar)
        return
      }

      const newAvatarPath = data.avatar || data.user?.avatar || null
      const fullAvatarUrl = newAvatarPath
        ? newAvatarPath.startsWith("http")
          ? newAvatarPath
          : `${process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8000"}${newAvatarPath}`
        : null

      if (fullAvatarUrl) {
        setAvatarPreview(fullAvatarUrl)
      }

      updateUser((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          avatar: data.user?.avatar ?? newAvatarPath ?? prev.avatar ?? null,
        }
      })
    } catch (error) {
      setAvatarError("Failed to upload avatar.")
      setAvatarPreview(resolvedAvatar)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleTierUpgrade = async (tierValue: string) => {
    if (!token) {
      alert("You need to be logged in to upgrade your tier.")
      return
    }

    if (tierValue === currentTier) {
      return
    }

    const targetPlan = userTiers.find((tier) => tier.value === tierValue)

    if (!targetPlan?.planCode) {
      alert("Selected plan is not available for online upgrade.")
      return
    }

    setUpgradingTier(tierValue)

    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ plan_code: targetPlan.planCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || data.error || "Failed to upgrade tier.")
        return
      }

      const checkoutUrl = data.checkout_url

      if (checkoutUrl) {
        window.location.href = checkoutUrl
        return
      }

      alert("Payment session created but no checkout URL returned. Please try again.")
    } catch (error) {
      console.error("Tier upgrade error:", error)
      alert("Failed to upgrade tier. Please try again.")
    } finally {
      setUpgradingTier(null)
    }
  }

  const handleFavoriteToggle = async (productId: string) => {
    if (favoritesUpdating) {
      return
    }

    if (!token) {
      alert("You must be logged in to manage favorites.")
      return
    }

    try {
      setFavoritesUpdating(productId)

      const response = await fetch(`/api/user/favorites/${productId}/toggle`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data?.message || data?.error || "Failed to update favorite.")
        return
      }

      setFavoritesList((prev) => {
        const isFavorited = prev.includes(productId)
        if (isFavorited) {
          return prev.filter((id) => id !== productId)
        }
        return [...prev, productId]
      })

      if (data.stats && typeof data.stats === "object") {
        setStats((prev) => ({
          ...prev,
          favorites_count: Number(data.stats.favorites_count ?? prev.favorites_count),
          quotations_count: Number(data.stats.quotations_count ?? prev.quotations_count),
          pending_quotations: Number(data.stats.pending_quotations ?? prev.pending_quotations),
        }))
      }

      await fetchDashboardData()
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
      alert("Failed to update favorite. Please try again later.")
    } finally {
      setFavoritesUpdating(null)
    }
  }

  const handleVerificationFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setVerificationFile(file || null)
    setVerificationError(null)
    setVerificationSuccess(false)
  }

  const handleVerificationSubmit = async () => {
    if (!verificationFile) {
      setVerificationError("Please select a file to upload")
      return
    }

    if (!token) {
      setVerificationError("You must be logged in to submit verification")
      return
    }

    setVerificationSubmitting(true)
    setVerificationError(null)
    setVerificationSuccess(false)

    try {
      const formData = new FormData()
      formData.append("id_document", verificationFile)

      const response = await fetch("/api/users/verification-document", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setVerificationError(data.error || data.message || "Failed to submit verification request")
        return
      }

      setVerificationSuccess(true)
      setVerificationFile(null)
      const fileInput = document.getElementById("id-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""

      if (data.user?.verification_status || data.verification_status) {
        updateUser((prev) => {
          if (!prev) return prev
          const next = { ...prev }
          const newStatus = data.user?.verification_status || data.verification_status
          if (newStatus) {
            next.verification_status = newStatus
          }
          if (Object.prototype.hasOwnProperty.call(data.user ?? {}, "verification_rejection_reason")) {
            next.verification_rejection_reason = data.user?.verification_rejection_reason ?? null
          }
          return next
        })
      }

      if ((data.user?.verification_status || data.verification_status) === "pending") {
        setTimeout(async () => {
          try {
            const profileResponse = await fetch("/api/users/profile", {
              headers: {
                Authorization: `Token ${token}`,
              },
            })
            if (profileResponse.ok) {
              const profileData = await profileResponse.json()
              if (profileData.profile) {
                updateUser((prev) => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    ...profileData.profile,
                  }
                })
              }
            }
          } catch (err) {
            console.error("Failed to refresh profile:", err)
          }
        }, 2000)
      }
    } catch (error) {
      console.error("Verification submission error:", error)
      setVerificationError("Failed to submit verification request. Please try again.")
    } finally {
      setVerificationSubmitting(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!token) {
      setSettingsError("You must be logged in to update settings")
      return
    }

    setSavingSettings(true)
    setSettingsError(null)
    setSettingsSuccess(false)

    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSettingsError(data.error || data.message || "Failed to update profile")
        return
      }

      setSettingsSuccess(true)
      if (data.profile || data) {
        updateUser((prev) => {
          if (!prev) return prev
          const updatedData = data.profile || data
          return {
            ...prev,
            first_name: updatedData.first_name ?? firstName,
            last_name: updatedData.last_name ?? lastName,
            email: updatedData.email ?? email,
            phone: updatedData.phone ?? phone,
          }
        })
      }

      setTimeout(() => setSettingsSuccess(false), 3000)
    } catch (error) {
      console.error("Settings save error:", error)
      setSettingsError("Failed to save settings. Please try again.")
    } finally {
      setSavingSettings(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!token) {
      setPasswordError("You must be logged in to change password")
      return
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long")
      return
    }

    setChangingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    try {
      const response = await fetch("/api/users/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPasswordError(data.error || data.message || "Failed to change password")
        return
      }

      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (error) {
      console.error("Password change error:", error)
      setPasswordError("Failed to change password. Please try again.")
    } finally {
      setChangingPassword(false)
    }
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleString()
  }

  const nextAvailableTier = useMemo(() => {
    if (currentTier === "free") {
      return userTiers.find((tier) => tier.value === "standard") ?? null
    }
    if (currentTier === "standard") {
      return userTiers.find((tier) => tier.value === "premium") ?? null
    }
    return null
  }, [currentTier])

  const premiumOnlyMessage = !showMessagingFeatures
    ? "Upgrade to Premium Verified to unlock direct messaging with suppliers."
    : null

  const renderTierFeatures = (features: string[]) => (
    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2">
          <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )

  const partnerDisplayName = (conversation: DashboardConversation) => {
    const { partner } = conversation
    const name = [partner.first_name, partner.last_name].filter(Boolean).join(" ")
    if (name) return name
    return partner.username ?? partner.email ?? "Supplier"
  }

  const partnerInitials = (conversation: DashboardConversation) => {
    const display = partnerDisplayName(conversation)
    const initials = display
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
    return initials.slice(0, 2) || "S"
  }

  const lastMessageProductName = (conversation: DashboardConversation) => {
    const product = conversation.last_message?.product
    if (!product) return null
    if (product.name && product.name.trim().length > 0) {
      return product.name
    }
    return product.id ? `Product #${product.id.slice(0, 8)}` : null
  }

  return (
    <div className="space-y-8">
      {dashboardError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {dashboardError}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {displayName || "trader"}</h1>
          <p className="text-muted-foreground">
            Manage your activity, track quotations, and stay in touch with suppliers.
          </p>
          <p className="text-sm text-muted-foreground">Current plan: {currentTier.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          {isVerified ? (
            <Badge className="flex items-center gap-1 bg-green-500 text-white hover:bg-green-600">
              <BadgeCheck className="h-4 w-4" />
              Verified User
            </Badge>
          ) : user?.verification_status === "pending" ? (
            <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 text-yellow-700">
              <Clock className="h-4 w-4" />
              Verification Pending
            </Badge>
          ) : user?.verification_status === "rejected" ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              Verification Rejected
            </Badge>
          ) : (
            <Badge variant="secondary">Unverified User</Badge>
          )}
        </div>
      </div>

      {nextAvailableTier ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Upgrade to {nextAvailableTier.name}</CardTitle>
              <CardDescription>
                Unlock more features including {nextAvailableTier.features.slice(0, 2).join(", ")} and more.
              </CardDescription>
            </div>
            <Button
              onClick={() => void handleTierUpgrade(nextAvailableTier.value)}
              disabled={upgradingTier === nextAvailableTier.value}
            >
              {upgradingTier === nextAvailableTier.value ? "Redirecting..." : "Upgrade Plan"}
            </Button>
          </CardHeader>
          <CardContent>{renderTierFeatures(nextAvailableTier.features)}</CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          {showQuotationFeatures ? <TabsTrigger value="quotations">Quotations</TabsTrigger> : null}
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          {showMessagingFeatures ? <TabsTrigger value="messages">Messages</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Favorites</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.favorites_count}</div>
                <p className="text-xs text-muted-foreground">Saved products</p>
              </CardContent>
            </Card>
            {showQuotationFeatures ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Quotations</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.quotations_count}</div>
                  <p className="text-xs text-muted-foreground">Total requests</p>
                  <p className="text-xs text-muted-foreground">{stats.pending_quotations} pending</p>
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Reviews</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reviews_count}</div>
                <p className="text-xs text-muted-foreground">Feedback given</p>
              </CardContent>
            </Card>
            {showMessagingFeatures ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.messages_unread}</div>
                  <p className="text-xs text-muted-foreground">Unread of {stats.messages_total}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {premiumOnlyMessage ? (
            <Card>
              <CardHeader>
                <CardTitle>Direct Messaging (Premium)</CardTitle>
                <CardDescription>{premiumOnlyMessage}</CardDescription>
              </CardHeader>
              <CardContent>{renderTierFeatures(userTiers.find((tier) => tier.value === "premium")?.features ?? [])}</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Favorite Products</CardTitle>
              <CardDescription>Your saved suppliers and listings</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <p className="text-sm text-muted-foreground">Loading favorites…</p>
              ) : favoriteProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">You have not saved any products yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {favoriteProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onFavoriteToggle={handleFavoriteToggle}
                      isFavorited={favorites.includes(product.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showQuotationFeatures ? (
          <TabsContent value="quotations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quotation Requests</CardTitle>
                <CardDescription>Track supplier responses and follow up quickly.</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <p className="text-sm text-muted-foreground">Loading quotations…</p>
                ) : quotations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You have no quotation requests yet.</p>
                ) : (
                  <div className="space-y-4">
                    {quotations.map((quotation) => (
                      <Card key={quotation.id}>
                        <CardContent className="space-y-3 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="font-semibold">
                                {quotation.product?.name ?? "Untitled product"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Quantity: {quotation.quantity}
                                {quotation.product?.owner?.business_name
                                  ? ` · Supplier: ${quotation.product.owner.business_name}`
                                  : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created {formatDateTime(quotation.created_at)}
                              </p>
                            </div>
                            <Badge
                              variant={
                                quotation.status === "responded" || quotation.status === "accepted"
                                  ? "success"
                                  : quotation.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {quotation.status}
                            </Badge>
                          </div>

                          {quotation.message ? (
                            <div className="rounded-md border border-dashed border-muted p-3 text-sm">
                              <p className="font-medium text-muted-foreground">Your request</p>
                              <p className="mt-1 whitespace-pre-line text-foreground">{quotation.message}</p>
                            </div>
                          ) : null}

                          {quotation.request_document ? (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={quotation.request_document}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                View your document
                              </a>
                            </div>
                          ) : null}

                          {quotation.response || quotation.price_quote !== null || quotation.response_document ? (
                            <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
                              <p className="font-medium text-muted-foreground">
                                Supplier response · {formatDateTime(quotation.updated_at)}
                              </p>
                              {quotation.response ? (
                                <p className="whitespace-pre-line text-foreground">{quotation.response}</p>
                              ) : null}
                              {quotation.price_quote !== null ? (
                                <p>
                                  <span className="text-muted-foreground">Quoted price:</span> {quotation.price_quote} ETB
                                </p>
                              ) : null}
                              {quotation.response_document ? (
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <a
                                    href={quotation.response_document}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline-offset-4 hover:underline"
                                  >
                                    Download supplier document
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Awaiting supplier response.</p>
                          )}

                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDeleteQuotation(quotation.id)}
                              disabled={deletingQuotationId === quotation.id}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {deletingQuotationId === quotation.id ? "Deleting…" : "Delete"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Reviews</CardTitle>
              <CardDescription>Your feedback shared with other buyers</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <p className="text-sm text-muted-foreground">Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">You have not written any reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">{review.product?.name ?? "Product"}</p>
                          <p className="text-xs text-muted-foreground">Reviewed {formatDateTime(review.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {review.rating.toFixed(1)} / 5
                        </div>
                      </div>
                      {review.comment ? (
                        <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-6">
          <UserVerificationStatus />

          <Card>
            <CardHeader>
              <CardTitle>Submit additional documents</CardTitle>
              <CardDescription>Upload identification or supporting files for manual verification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationSuccess ? (
                <p className="text-sm text-green-600">Verification request submitted successfully.</p>
              ) : null}
              {verificationError ? (
                <p className="text-sm text-destructive">{verificationError}</p>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="id-upload">Upload ID document</Label>
                <Input
                  id="id-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  onChange={handleVerificationFileChange}
                />
              </div>
              <div>
                <Button onClick={handleVerificationSubmit} disabled={verificationSubmitting}>
                  {verificationSubmitting ? "Submitting…" : "Submit verification"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile information</CardTitle>
              <CardDescription>Update your personal details and contact information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-20 w-20">
                  {avatarPreview ? <AvatarImage src={avatarPreview} alt={displayName || "User avatar"} /> : null}
                  <AvatarFallback>{displayName ? displayName.charAt(0).toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
                <div className="space-y-2 text-center sm:text-left">
                  {avatarError ? (
                    <p className="text-sm text-destructive">{avatarError}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Upload a square JPG or PNG image (max 5MB).</p>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Button asChild variant="outline" size="sm" disabled={avatarUploading}>
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        {avatarUploading ? "Uploading…" : "Change avatar"}
                      </label>
                    </Button>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={avatarUploading}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-first-name">First name</Label>
                  <Input
                    id="settings-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-last-name">Last name</Label>
                  <Input
                    id="settings-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-phone">Phone</Label>
                  <Input
                    id="settings-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
              </div>

              {settingsError ? <p className="text-sm text-destructive">{settingsError}</p> : null}
              {settingsSuccess ? <p className="text-sm text-green-600">Settings saved successfully.</p> : null}

              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? "Saving…" : "Save changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Keep your account secure with a strong password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-current-password">Current password</Label>
                <Input
                  id="settings-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-new-password">New password</Label>
                <Input
                  id="settings-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-confirm-password">Confirm new password</Label>
                <Input
                  id="settings-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
              {passwordSuccess ? <p className="text-sm text-green-600">Password updated successfully.</p> : null}
              <Button onClick={handlePasswordChange} disabled={changingPassword}>
                {changingPassword ? "Updating…" : "Update password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {showMessagingFeatures ? (
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Supplier conversations</CardTitle>
                <CardDescription>Review your latest messages and follow up quickly.</CardDescription>
              </CardHeader>
              <CardContent>
                {conversationsError ? (
                  <p className="text-sm text-destructive">{conversationsError}</p>
                ) : conversationsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading conversations…</p>
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You have no conversations yet. Start a chat from any product page.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <div key={conversation.partner.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {conversation.partner.avatar ? (
                                <AvatarImage
                                  src={conversation.partner.avatar}
                                  alt={partnerDisplayName(conversation)}
                                />
                              ) : null}
                              <AvatarFallback>{partnerInitials(conversation)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{partnerDisplayName(conversation)}</p>
                              <p className="text-xs text-muted-foreground">
                                {conversation.partner.role === "product_owner" ? "Product owner" : "User"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {conversation.unread_count > 0 ? (
                              <Badge variant="secondary">{conversation.unread_count} unread</Badge>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConversationExpand(conversation.partner.id)}
                              className="text-xs"
                            >
                              {expandedConversations[conversation.partner.id] ? "Hide" : "View"} Messages
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <p className="line-clamp-2">{conversation.last_message?.content ?? ""}</p>
                          {lastMessageProductName(conversation) ? (
                            <p className="text-xs">
                              Product: <span className="font-medium text-foreground">{lastMessageProductName(conversation)}</span>
                            </p>
                          ) : null}
                          <p className="text-xs">{formatDateTime(conversation.last_message?.created_at)}</p>
                          {conversation.message_count > 1 ? (
                            <p className="text-xs text-muted-foreground">
                              {conversation.message_count} messages in this conversation
                            </p>
                          ) : null}
                        </div>

                        {expandedConversations[conversation.partner.id] && (
                          <div className="mt-4 space-y-3 border-t pt-4">
                            <div className="max-h-96 overflow-y-auto space-y-3">
                              {conversation.messages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex ${
                                    message.sender?.id === user?.id ? "justify-end" : "justify-start"
                                  }`}
                                >
                                  <div
                                    className={`max-w-[70%] rounded-lg p-3 relative ${
                                      message.sender?.id === user?.id
                                        ? "bg-primary text-primary-foreground"
                                        : message.is_read
                                        ? "bg-muted"
                                        : "bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                                    }`}
                                  >
                                    {/* Unread indicator */}
                                    {!message.is_read && message.sender?.id !== user?.id && (
                                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="text-sm">{message.content}</p>
                                        {message.product?.name && (
                                          <p className="text-xs opacity-75 mt-1">
                                            Product: {message.product.name}
                                          </p>
                                        )}
                                        <p className="text-xs opacity-75 mt-1">
                                          {formatDateTime(message.created_at)}
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteMessage(message.id)}
                                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="border-t pt-3">
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Type your reply..."
                                  value={replyDrafts[conversation.partner.id] || ""}
                                  onChange={(e) => handleReplyDraftChange(conversation.partner.id, e.target.value)}
                                  className="flex-1"
                                  disabled={sendingConversationId === conversation.partner.id}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSendReply(conversation.partner.id)}
                                  disabled={
                                    !replyDrafts[conversation.partner.id]?.trim() ||
                                    sendingConversationId === conversation.partner.id
                                  }
                                >
                                  {sendingConversationId === conversation.partner.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
