"use client"

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react"
import { Package, Eye, MessageSquare, BadgeCheck, Upload, Plus, PlusCircle, MinusCircle, Edit, Trash2, TrendingUp, X, Heart, FileText, ChevronDown, ChevronRight, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/app/context/auth-context"
import { ProductOwnerVerificationStatus } from "@/components/profile/product-owner-verification-status"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type CategoryOption = {
  id: string
  name: string
  name_amharic?: string | null
  parent_id?: string | null
  subcategories?: CategoryOption[]
}

type OwnerQuotation = {
  id: string
  status: string
  quantity: number
  created_at: string
  updated_at: string
  message?: string | null
  delivery_location?: string | null
  response?: string | null
  price_quote?: string | number | null
  response_document?: string | null
  product?: {
    id: string
    name: string
    primary_image?: string | null
    unit?: string | null
    quotation_available?: boolean
  } | null
  user?: {
    id?: string
    username?: string | null
    email?: string | null
  } | null
}

type OwnerProduct = {
  id: string
  name: string
  price?: number | string
  available_quantity?: number
  stock_quantity?: number
  view_count?: number
  status?: string
  rejection_reason?: string | null
  admin_notes?: string | null
  is_approved?: boolean
  category_name?: string
  images?: Array<string | { image?: string; url?: string }>
  primary_image?: string
  image?: string
  description?: string
  brand?: string | null
  unit?: string
  location?: string
  quotation_available?: boolean
  delivery_available?: boolean
  category?: string | { id: string } | null
  subcategory?: string | { id: string } | null
  specifications?: SpecificationRow[] | Record<string, string> | null
}

type SpecificationRow = {
  attribute: string
  value: string
}

type ProductOwnerProfile = {
  id?: string
  business_name: string | null
  business_email: string | null
  business_phone: string | null
  business_address: string | null
  business_city: string | null
  business_description: string | null
  [key: string]: unknown
}

type ProductOwnerProfileForm = {
  business_name: string
  business_email: string
  business_phone: string
  business_address: string
  business_city: string
  business_description: string
}

const createEmptyOwnerProfileForm = (): ProductOwnerProfileForm => ({
  business_name: "",
  business_email: "",
  business_phone: "",
  business_address: "",
  business_city: "",
  business_description: "",
})

const ownerTiers = [
  {
    value: "basic",
    name: "Free Trial/Basic",
    price: 0,
    features: ["1 product listing", "Basic analytics", "Email support"],
    productLimit: 1,
    planCode: null,
  },
  {
    value: "standard",
    name: "Standard",
    price: 200,
    features: ["10 product listings", "Advanced analytics", "Receive messages", "Priority support"],
    productLimit: 10,
    planCode: "standard_owner",
  },
  {
    value: "premium",
    name: "Premium",
    price: 500,
    features: ["Unlimited products", "Premium analytics", "Receive messages", "Featured listings", "24/7 support"],
    productLimit: -1,
    planCode: "premium_owner",
  },
]

type OwnerStats = {
  total_products: number
  active_products: number
  total_quotations: number
  pending_quotations: number
  total_reviews: number
  average_rating: number
  verification_status: string
  total_views: number
  total_messages: number
  unread_messages: number
  total_favorites?: number
}

const DJANGO_BASE_URL = process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8000"

const resolveMediaUrl = (path: unknown): string | null => {
  if (!path || typeof path !== "string") return null
  return path.startsWith("http") ? path : `${DJANGO_BASE_URL}${path}`
}

const initialOwnerStats: OwnerStats = {
  total_products: 0,
  active_products: 0,
  total_quotations: 0,
  pending_quotations: 0,
  total_reviews: 0,
  average_rating: 0,
  verification_status: 'unverified',
  total_views: 0,
  total_messages: 0,
  unread_messages: 0,
  total_favorites: 0,
}

type OwnerMessage = {
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

type OwnerConversation = {
  partner: {
    id: string
    username?: string | null
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    role?: string | null
    avatar?: string | null
  }
  messages: OwnerMessage[]
  last_message: OwnerMessage | null
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

const normalizeOwnerMessage = (message: any): OwnerMessage | null => {
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

export default function OwnerDashboard() {
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [quotationAvailable, setQuotationAvailable] = useState(true)
  const [deliveryAvailable, setDeliveryAvailable] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [products, setProducts] = useState<OwnerProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [specRows, setSpecRows] = useState<SpecificationRow[]>([{ attribute: "", value: "" }])
  const [editingProduct, setEditingProduct] = useState<OwnerProduct | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
  const [quotationRequests, setQuotationRequests] = useState<OwnerQuotation[]>([])
  const [quotationsLoading, setQuotationsLoading] = useState(false)
  const [quotationsError, setQuotationsError] = useState<string | null>(null)
  const [deletingQuotationId, setDeletingQuotationId] = useState<string | null>(null)
  const [verificationDocs, setVerificationDocs] = useState<{
    tradeLicense: File | null
    tradeRegistration: File | null
    vatRegistration: File | null
    tinCertificate: File | null
  }>({
    tradeLicense: null,
    tradeRegistration: null,
    vatRegistration: null,
    tinCertificate: null,
  })
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState<ProductOwnerProfile | null>(null)
  const [ownerProfileForm, setOwnerProfileForm] = useState<ProductOwnerProfileForm>(createEmptyOwnerProfileForm())
  const [ownerProfileLoading, setOwnerProfileLoading] = useState(false)
  const [ownerProfileSaving, setOwnerProfileSaving] = useState(false)
  const [ownerProfileError, setOwnerProfileError] = useState<string | null>(null)
  const { user, token } = useAuth()
  const { toast } = useToast()
  const [ownerStatus, setOwnerStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected' | 'expired'>('unverified')
  const [ownerStats, setOwnerStats] = useState<OwnerStats>(initialOwnerStats)
  const [favoriteInsights, setFavoriteInsights] = useState<{ total_favorites: number; top_favorited: Array<{ id: string; name: string; favorites_count: number; primary_image?: string | null }> } | null>(null)
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [favoritesError, setFavoritesError] = useState<string | null>(null)
  const [respondingQuotation, setRespondingQuotation] = useState<OwnerQuotation | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [responsePrice, setResponsePrice] = useState("")
  const [responseDocument, setResponseDocument] = useState<File | null>(null)
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [responseError, setResponseError] = useState<string | null>(null)
  const [ownerConversations, setOwnerConversations] = useState<OwnerConversation[]>([])
  const [ownerConversationsLoading, setOwnerConversationsLoading] = useState(false)
  const [ownerConversationsError, setOwnerConversationsError] = useState<string | null>(null)
  const [expandedOwnerConversations, setExpandedOwnerConversations] = useState<Record<string, boolean>>({})
  const [ownerReplyDrafts, setOwnerReplyDrafts] = useState<Record<string, string>>({})
  const [replyingConversationId, setReplyingConversationId] = useState<string | null>(null)
  const currentTier = useMemo(() => {
    if (user?.role === 'product_owner') {
      return user?.tier ?? "basic"
    }
    return user?.tier ?? "free"
  }, [user?.role, user?.tier])
  const showMessagingFeatures = useMemo(() => currentTier === "standard" || currentTier === "premium", [currentTier])

  const loadOwnerConversations = useCallback(async () => {
    if (!token || !showMessagingFeatures) {
      setOwnerConversations([])
      setOwnerStats((prev) => ({
        ...prev,
        total_messages: 0,
        unread_messages: 0,
      }))
      return
    }

    setOwnerConversationsLoading(true)
    setOwnerConversationsError(null)

    try {
      const response = await fetch("/api/messages/conversations?role=owner", {
        headers: {
          Authorization: `Token ${token}`,
        },
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to load messages")
      }

      const list = Array.isArray(data?.conversations) ? data.conversations : []

      const normalized = list.map((item: any) => {
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
              .map((message: any) => normalizeOwnerMessage(message))
              .filter((message): message is OwnerMessage => Boolean(message))
          : []

        let normalizedLastMessage = normalizeOwnerMessage(item?.last_message)

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

      setOwnerConversations(normalized)

      setOwnerStats((prev) => {
        const unreadTotal = normalized.reduce((sum, conversation) => sum + conversation.unread_count, 0)
        const totalMessages = normalized.reduce(
          (sum, conversation) => sum + (conversation.message_count || conversation.messages.length),
          0,
        )

        return {
          ...prev,
          total_messages: totalMessages,
          unread_messages: unreadTotal,
        }
      })
    } catch (error) {
      console.error("Failed to load owner conversations", error)
      setOwnerConversations([])
      setOwnerConversationsError(error instanceof Error ? error.message : "Unable to load messages right now.")
    } finally {
      setOwnerConversationsLoading(false)
    }
  }, [token, showMessagingFeatures])

  const openRespondDialog = useCallback((quotation: OwnerQuotation) => {
    setRespondingQuotation(quotation)
    setResponseMessage(quotation.response ?? "")
    setResponsePrice(quotation.price_quote ? String(quotation.price_quote) : "")
    setResponseDocument(null)
    setResponseError(null)
  }, [])

  const closeRespondDialog = useCallback(() => {
    setRespondingQuotation(null)
    setResponseMessage("")
    setResponsePrice("")
    setResponseDocument(null)
    setResponseError(null)
  }, [])

  const handleResponseDocumentChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setResponseDocument(file ?? null)
  }, [])

  const handleResponseSubmit = useCallback(async () => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Log in again to respond to this quotation.",
        variant: "destructive",
      })
      return
    }

    if (!respondingQuotation) {
      return
    }

    if (
      !responseMessage.trim() &&
      !responsePrice.trim() &&
      !responseDocument
    ) {
      setResponseError("Provide a message, price quote, or upload a document.")
      return
    }

    const formData = new FormData()
    formData.append("quotation_id", respondingQuotation.id)
    if (responseMessage.trim()) {
      formData.append("response", responseMessage.trim())
    }
    if (responsePrice.trim()) {
      formData.append("price_quote", responsePrice.trim())
    }
    if (responseDocument) {
      formData.append("response_document", responseDocument)
    }

    setSubmittingResponse(true)
    setResponseError(null)

    try {
      const response = await fetch("/api/quotations/respond", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data?.error || data?.message || "Failed to submit response"
        setResponseError(errorMessage)
        toast({
          title: "Unable to respond",
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      const updatedQuotation: OwnerQuotation = data?.quotation ?? data
      setQuotationRequests((prev) =>
        prev.map((item) => (item.id === updatedQuotation.id ? updatedQuotation : item)),
      )
      toast({
        title: "Response sent",
        description: "Your quotation response was shared with the customer.",
      })
      closeRespondDialog()
    } catch (error) {
      console.error("Quotation response submit error:", error)
      const fallbackMessage = "Unexpected error submitting your response."
      setResponseError(fallbackMessage)
      toast({
        title: "Unable to respond",
        description: fallbackMessage,
        variant: "destructive",
      })
    } finally {
      setSubmittingResponse(false)
    }
  }, [token, respondingQuotation, responseMessage, responsePrice, responseDocument, toast, closeRespondDialog])

  const partnerDisplayName = useCallback((conversation: OwnerConversation) => {
    const { partner } = conversation
    const name = [partner.first_name, partner.last_name].filter(Boolean).join(" ")
    if (name) return name
    if (partner.username) return partner.username
    if (partner.email) return partner.email
    return "Customer"
  }, [])

  const partnerInitials = useCallback(
    (conversation: OwnerConversation) => {
      const display = partnerDisplayName(conversation)
      const initials = display
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
      return initials || "C"
    },
    [partnerDisplayName],
  )

  const lastMessageProductName = useCallback((conversation: OwnerConversation) => {
    const lastMessage = conversation.last_message
    return (
      lastMessage?.product?.name ??
      conversation.messages.find((message) => message.product?.name)?.product?.name ??
      null
    )
  }, [])

  const formatDateTime = useCallback((value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ""
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }, [])

  const toggleOwnerConversation = useCallback((conversationId: string) => {
    setExpandedOwnerConversations((prev) => ({
      ...prev,
      [conversationId]: !prev[conversationId],
    }))
  }, [])

  const markOwnerMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!token) return

    const conversation = ownerConversations.find(c => c.partner.id === conversationId)
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
      setOwnerConversations(prev => 
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
      setOwnerStats(prev => ({
        ...prev,
        unread_messages: Math.max(0, prev.unread_messages - unreadMessages.length),
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
  }, [token, ownerConversations, toast])

  const handleOwnerConversationExpand = useCallback((conversationId: string) => {
    const isCurrentlyExpanded = expandedOwnerConversations[conversationId]
    
    // Toggle expansion
    toggleOwnerConversation(conversationId)
    
    // If this is the first time expanding (was previously collapsed), mark messages as read
    if (!isCurrentlyExpanded) {
      markOwnerMessagesAsRead(conversationId)
    }
  }, [expandedOwnerConversations, toggleOwnerConversation, markOwnerMessagesAsRead])

  const handleOwnerReplyDraftChange = useCallback((conversationId: string, value: string) => {
    setOwnerReplyDrafts((prev) => ({
      ...prev,
      [conversationId]: value,
    }))
  }, [])

  const handleOwnerSendReply = useCallback(
    async (conversationId: string) => {
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in again to send messages.",
          variant: "destructive",
        })
        return
      }

      const draft = ownerReplyDrafts[conversationId]?.trim() ?? ""
      if (!draft) {
        toast({
          title: "Message required",
          description: "Enter a message before sending.",
          variant: "destructive",
        })
        return
      }

      const conversation = ownerConversations.find((item) => item.partner.id === conversationId)
      if (!conversation) {
        toast({
          title: "Conversation missing",
          description: "Unable to find this conversation.",
          variant: "destructive",
        })
        return
      }

      setReplyingConversationId(conversationId)

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
        setOwnerReplyDrafts((prev) => ({
          ...prev,
          [conversationId]: "",
        }))
        await loadOwnerConversations()
      } catch (error) {
        console.error("Owner message send error", error)
        toast({
          title: "Unexpected error",
          description: "Could not send the message. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setReplyingConversationId(null)
      }
    },
    [token, ownerReplyDrafts, ownerConversations, toast, loadOwnerConversations],
  )

  const getModerationStatusMeta = useCallback((product: OwnerProduct) => {
    const status = product.status ?? ""

    if (status === "rejected") {
      return { label: "Rejected", variant: "destructive" as const, className: "text-white" }
    }

    if (status === "under_review" || status === "draft") {
      return { label: "Approval pending", variant: "secondary" as const, className: undefined }
    }

    return { label: "Approved", variant: "default" as const, className: undefined }
  }, [])

  const currentPlan = useMemo(() => {
    return ownerTiers.find((tier) => tier.value === currentTier) ?? ownerTiers[0]
  }, [currentTier])

  const productLimit = currentPlan.productLimit
  const [showLimitModal, setShowLimitModal] = useState(false)

  const hasReachedProductLimit = useMemo(() => {
    return productLimit !== -1 && ownerStats.total_products >= productLimit
  }, [productLimit, ownerStats.total_products])

  const nextPlan = useMemo(() => {
    if (currentTier === "basic") {
      return ownerTiers.find((tier) => tier.value === "standard") ?? null
    }
    if (currentTier === "standard") {
      return ownerTiers.find((tier) => tier.value === "premium") ?? null
    }
    return null
  }, [currentTier])

  const handleTierUpgrade = useCallback(async (tierValue: string) => {
    if (!token) {
      alert("You need to be logged in to change your plan.")
      return
    }

    if (tierValue === currentTier) {
      return
    }

    const targetPlan = ownerTiers.find((tier) => tier.value === tierValue)

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
        alert(data.message || data.error || "Failed to update plan.")
        return
      }

      const checkoutUrl = data.checkout_url

      if (checkoutUrl) {
        window.location.href = checkoutUrl
        return
      }

      alert("Payment session created but no checkout URL returned. Please try again.")
    } catch (error) {
      console.error("Tier update error:", error)
      alert("Failed to update plan. Please try again.")
    } finally {
      setUpgradingTier(null)
    }
  }, [token, currentTier])

  const handleLimitModalClose = useCallback((open: boolean) => {
    setShowLimitModal(open)
  }, [])

  const isVerified = ownerStatus === 'verified'
  const verificationBadgeText = useMemo(() => {
    switch (ownerStatus) {
      case 'verified':
        return 'Verified Product Owner'
      case 'pending':
        return 'Verification Pending'
      case 'rejected':
        return 'Verification Rejected'
      case 'expired':
        return 'Verification Expired'
      default:
        return 'Unverified'
    }
  }, [ownerStatus])
  const isEditMode = Boolean(editingProduct)
  const primaryActionLabel = showAddProduct ? (isEditMode ? "Close Editor" : "Cancel") : "Add Product"
  const primaryActionIcon = showAddProduct ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />

  const loadProducts = useCallback(async () => {
    if (!token) {
      setProducts([])
      return
    }

    setProductsLoading(true)
    setProductsError(null)

    try {
      const response = await fetch("/api/products/?my_products=true", {
        headers: {
          Authorization: `Token ${token}`,
        },
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load products")
      }

      const list = Array.isArray(data?.products) ? data.products : []
      const normalizedProducts = list.map((item: any) => ({
        ...item,
        id: String(item.id),
        quotation_available: item.quotation_available ?? true,
      }))
      setProducts(normalizedProducts)
    } catch (error) {
      console.error("Failed to load owner products", error)
      setProductsError("Unable to load products. Please try again later.")
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [token])

  const loadOwnerStats = useCallback(async () => {
    if (!token) {
      setOwnerStats(initialOwnerStats)
      return
    }

    try {
      const response = await fetch('/api/product-owner/dashboard', {
        headers: {
          Authorization: `Token ${token}`,
        },
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to load dashboard data")
      }

      setOwnerStats({
        total_products: parseNumber(data?.total_products, 0),
        active_products: parseNumber(data?.active_products, 0),
        total_quotations: parseNumber(data?.total_quotations, 0),
        pending_quotations: parseNumber(data?.pending_quotations, 0),
        total_reviews: parseNumber(data?.total_reviews, 0),
        average_rating: parseNumber(data?.average_rating, 0),
        verification_status: data?.verification_status ?? "unverified",
        total_views: parseNumber(data?.total_views, 0),
        total_messages: parseNumber(data?.total_messages, 0),
        unread_messages: parseNumber(data?.unread_messages, 0),
        total_favorites: parseNumber(data?.total_favorites, 0),
      })
    } catch (error) {
      console.error("Failed to load owner stats", error)
      setOwnerStats(initialOwnerStats)
    }
  }, [token])

  const handleDeleteQuotation = useCallback(
    async (quotationId: string) => {
      if (!token) {
        toast({
          title: "Authentication required",
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

        setQuotationRequests((prev) => prev.filter((quotation) => quotation.id !== quotationId))
        toast({ title: "Quotation deleted", description: "The quotation request has been removed." })
        await loadOwnerStats()
      } catch (error) {
        console.error("Failed to delete owner quotation", error)
        toast({
          title: "Unexpected error",
          description: "Could not delete the quotation. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setDeletingQuotationId(null)
      }
    },
    [token, toast, loadOwnerStats],
  )

  const loadFavoriteInsights = useCallback(async () => {
    if (!token) {
      setFavoriteInsights(null)
      return
    }

    setFavoritesLoading(true)
    setFavoritesError(null)

    try {
      const response = await fetch('/api/product-owner/favorites/', {
        headers: {
          Authorization: `Token ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load favorite insights')
      }

      setFavoriteInsights({
        total_favorites: data?.total_favorites ?? 0,
        top_favorited: Array.isArray(data?.top_favorited) ? data.top_favorited : [],
      })
    } catch (error) {
      console.error('Failed to load favorite insights', error)
      setFavoritesError('Unable to load favorite insights right now.')
      setFavoriteInsights(null)
    } finally {
      setFavoritesLoading(false)
    }
  }, [token])

  const loadOwnerProfile = useCallback(async () => {
    if (!token) {
      setOwnerProfile(null)
      setOwnerProfileForm(createEmptyOwnerProfileForm())
      return
    }

    setOwnerProfileLoading(true)
    setOwnerProfileError(null)

    try {
      const response = await fetch("/api/product-owner/profile/", {
        headers: {
          Authorization: `Token ${token}`,
        },
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load business profile")
      }

      const profileData: ProductOwnerProfile = (data?.profile || data) as ProductOwnerProfile
      setOwnerProfile(profileData)
      setOwnerProfileForm({
        business_name: profileData.business_name ?? "",
        business_email: profileData.business_email ?? "",
        business_phone: profileData.business_phone ?? "",
        business_address: profileData.business_address ?? "",
        business_city: profileData.business_city ?? "",
        business_description: profileData.business_description ?? "",
      })
    } catch (error) {
      console.error("Failed to load owner profile", error)
      setOwnerProfileError("Unable to load business profile. Please try again later.")
      setOwnerProfile(null)
      setOwnerProfileForm(createEmptyOwnerProfileForm())
    } finally {
      setOwnerProfileLoading(false)
    }
  }, [token])

  const loadQuotationRequests = useCallback(async () => {
    if (!token) {
      setQuotationRequests([])
      return
    }

    setQuotationsLoading(true)
    setQuotationsError(null)

    try {
      const response = await fetch("/api/quotations", {
        headers: {
          Authorization: `Token ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        cache: "no-store",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load quotation requests")
      }

      const list = Array.isArray(data?.quotations) ? data.quotations : []
      setQuotationRequests(list)
    } catch (error) {
      console.error("Failed to load quotation requests", error)
      setQuotationsError("Unable to load quotation requests. Please try again later.")
      setQuotationRequests([])
    } finally {
      setQuotationsLoading(false)
    }
  }, [token])

  const handleOwnerProfileInputChange = (
    field: keyof ProductOwnerProfileForm,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setOwnerProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmitOwnerProfile = async () => {
    if (!token) {
      alert("Please log in to update your business information")
      return
    }

    setOwnerProfileSaving(true)
    setOwnerProfileError(null)

    try {
      const response = await fetch("/api/product-owner/profile/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(ownerProfileForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update business information")
      }

      const profileData: ProductOwnerProfile = (data?.profile || data) as ProductOwnerProfile
      setOwnerProfile(profileData)
      setOwnerProfileForm({
        business_name: profileData.business_name ?? "",
        business_email: profileData.business_email ?? "",
        business_phone: profileData.business_phone ?? "",
        business_address: profileData.business_address ?? "",
        business_city: profileData.business_city ?? "",
        business_description: profileData.business_description ?? "",
      })

      alert("Business information updated successfully")
      void loadOwnerProfile()
    } catch (error) {
      console.error("Failed to save owner profile", error)
      alert(error instanceof Error ? error.message : "Failed to update business information. Please try again.")
    } finally {
      setOwnerProfileSaving(false)
    }
  }

  const handleSubmitVerification = async () => {
    if (!token) {
      alert("Please log in to submit verification")
      return
    }

    // Check if all documents are uploaded
    if (!verificationDocs.tradeLicense || !verificationDocs.tradeRegistration || 
        !verificationDocs.vatRegistration || !verificationDocs.tinCertificate) {
      alert("Please upload all required documents")
      return
    }

    setSubmittingVerification(true)

    try {
      const formData = new FormData()
      formData.append('trade_license', verificationDocs.tradeLicense)
      formData.append('trade_registration', verificationDocs.tradeRegistration)
      formData.append('vat_registration', verificationDocs.vatRegistration)
      formData.append('tin_certificate', verificationDocs.tinCertificate)

      const response = await fetch('/api/verifications/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit verification request')
      }

      alert('Verification request submitted successfully! We will review your documents and get back to you soon.')
      
      // Reset the form
      setVerificationDocs({
        tradeLicense: null,
        tradeRegistration: null,
        vatRegistration: null,
        tinCertificate: null,
      })
    } catch (error) {
      console.error('Failed to submit verification:', error)
      alert(error instanceof Error ? error.message : 'Failed to submit verification request. Please try again.')
    } finally {
      setSubmittingVerification(false)
    }
  }

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true)
      setCategoryError(null)
      try {
        // Add timestamp to force fresh data and bypass any caching
        const timestamp = new Date().getTime()
        const response = await fetch(`/api/categories?t=${timestamp}`, { 
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}))
          throw new Error(errorPayload?.error || "Failed to load categories")
        }

        const data = await response.json()
        console.log('📦 Categories loaded for owner dashboard:', data)
        const list = Array.isArray(data?.categories) ? data.categories : []

        // The API returns categories with nested subcategories array
        const normalized: CategoryOption[] = list.map((category: any) => {
          // Extract subcategories from the nested structure
          const subcategories = Array.isArray(category.subcategories)
            ? category.subcategories.map((subcategory: any) => ({
                id: subcategory.id,
                name: subcategory.name,
                name_amharic: subcategory.name_amharic ?? null,
                parent_id: category.id,
              }))
            : []

          console.log(`📂 Category "${category.name}" has ${subcategories.length} subcategories:`, subcategories.map((s: any) => s.name))

          return {
            id: category.id,
            name: category.name,
            name_amharic: category.name_amharic ?? null,
            parent_id: category.parent_id ?? null,
            subcategories,
          }
        })

        console.log('✅ Normalized categories:', normalized.length)
        setCategories(normalized)
      } catch (error) {
        console.error("Failed to load categories", error)
        setCategoryError("Unable to load categories. Please try again later.")
        setCategories([])
      } finally {
        setCategoriesLoading(false)
      }
    }

    void loadCategories()
  }, [])

  useEffect(() => {
    void loadOwnerConversations()
  }, [loadOwnerConversations])

  useEffect(() => {
    void loadOwnerProfile()
    void loadOwnerStats()
    void loadFavoriteInsights()
    void loadQuotationRequests()
  }, [loadOwnerProfile, loadOwnerStats, loadFavoriteInsights])

  useEffect(() => {
    loadProducts()
    loadOwnerStats()
    loadQuotationRequests()
  }, [loadProducts, loadOwnerStats, loadQuotationRequests])

  const topLevelCategories = useMemo(() => {
    return categories
  }, [categories])

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategory) {
      return []
    }
    const selected = categories.find((category) => category.id === selectedCategory)
    return selected?.subcategories ?? []
  }, [categories, selectedCategory])

  const resetFormState = () => {
    setEditingProduct(null)
    setSpecRows([{ attribute: "", value: "" }])
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setQuotationAvailable(true)
    setDeliveryAvailable(false)
    setFormKey((key) => key + 1)
  }

  const handleStartAddProduct = () => {
    if (hasReachedProductLimit) {
      setShowLimitModal(true)
      return
    }

    resetFormState()
    setShowAddProduct(true)
  }

  const handleCancelForm = () => {
    resetFormState()
    setShowAddProduct(false)
  }

  const handlePrimaryActionClick = () => {
    if (showAddProduct) {
      handleCancelForm()
    } else {
      handleStartAddProduct()
    }
  }

  const extractId = (value: OwnerProduct["category"] | OwnerProduct["subcategory"]) => {
    if (!value) {
      return null
    }
    if (typeof value === "object") {
      const maybeId = (value as { id?: string | number | null })?.id
      if (maybeId === null || maybeId === undefined) {
        return null
      }
      return String(maybeId)
    }
    const asString = String(value)
    return asString.length ? asString : null
  }

  const handleEditProduct = (product: OwnerProduct) => {
    const categoryValue = extractId(product.category)
    const subcategoryValue = extractId(product.subcategory)

    setEditingProduct(product)
    setShowAddProduct(true)
    setFormKey((key) => key + 1)
    setSelectedCategory(categoryValue)
    setSelectedSubcategory(subcategoryValue)
    setQuotationAvailable(product.quotation_available ?? true)
    setDeliveryAvailable(product.delivery_available ?? false)

    const specs = product.specifications
    if (Array.isArray(specs)) {
      setSpecRows(
        specs.length
          ? specs.map((row: any) => ({
              attribute: String(row?.attribute ?? row?.key ?? ""),
              value: String(row?.value ?? row?.val ?? ""),
            }))
          : [{ attribute: "", value: "" }]
      )
    } else if (specs && typeof specs === "object") {
      const rows = Object.entries(specs).map(([attribute, value]) => ({
        attribute,
        value: String(value ?? ""),
      }))
      setSpecRows(rows.length ? rows : [{ attribute: "", value: "" }])
    } else {
      setSpecRows([{ attribute: "", value: "" }])
    }
  }

  const handleRemoveSpecRow = (index: number) => {
    setSpecRows((prev) => {
      if (prev.length === 1) {
        return [{ attribute: "", value: "" }]
      }
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const handleAddSpecRow = () => {
    setSpecRows((prev) => [...prev, { attribute: "", value: "" }])
  }

  const handleSpecChange = (index: number, field: keyof SpecificationRow, value: string) => {
    setSpecRows((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        [field]: value,
      }
      return next
    })
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!token) {
      alert("You need to be logged in to delete a product.")
      return
    }

    const confirmed = window.confirm("Are you sure you want to delete this product?")
    if (!confirmed) {
      return
    }

    setDeletingProductId(productId)

    try {
      const response = await fetch(`/api/products/${productId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Token ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to delete product")
      }

      await loadProducts()
      await loadOwnerStats()
      alert("Product deleted successfully!")
      if (editingProduct?.id === productId) {
        resetFormState()
        setShowAddProduct(false)
      }
    } catch (error) {
      console.error("Product delete error", error)
      alert("Failed to delete product. Please try again.")
    } finally {
      setDeletingProductId(null)
    }
  }

  const handleSaveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      alert("You need to be logged in to add a product.")
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)

    if (!editingProduct && hasReachedProductLimit) {
      setShowLimitModal(true)
      return
    }

    if (!selectedCategory) {
      alert("Please select a category for your product.")
      return
    }

    const specificationPayload = specRows
      .map((row) => ({
        attribute: row.attribute.trim(),
        value: row.value.trim(),
      }))
      .filter((row) => row.attribute && row.value)

    setSavingProduct(true)

    try {
      const brandValue = formData.get("brand")
      const imageFiles = formData.getAll("images").filter((file): file is File => file instanceof File)
      const videoFiles = (() => {
        const videoEntry = formData.get("video")
        return videoEntry instanceof File ? [videoEntry] : []
      })()

      if (imageFiles.length > 4) {
        alert("You can upload a maximum of 4 images.")
        return
      }

      if (videoFiles.length > 1) {
        alert("You can upload only 1 video.")
        return
      }

      if (editingProduct) {
        const updatePayload: Record<string, any> = {
          name: formData.get("product-name"),
          description: formData.get("description"),
          price: formData.get("price") ? Number(formData.get("price")) : null,
          available_quantity: formData.get("stock") ? Number(formData.get("stock")) : null,
          category: selectedCategory,
          subcategory: selectedSubcategory,
          unit: formData.get("unit"),
          location: formData.get("location"),
          quotation_available: quotationAvailable,
          delivery_available: deliveryAvailable,
          specifications: specificationPayload,
          brand: brandValue ? String(brandValue) : null,
          status: "under_review",
          is_approved: false,
          rejection_reason: "",
        }

        const response = await fetch(`/api/products/${editingProduct.id}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify(updatePayload),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error("Product update error:", data)
          alert(data?.error || "Failed to update product. Please try again.")
          return
        }

        alert("Product updated successfully!")
      } else {
        const payload: Record<string, any> = {
          name: formData.get("product-name"),
          description: formData.get("description"),
          price: formData.get("price") || null,
          available_quantity: formData.get("stock") || null,
          category: selectedCategory,
          subcategory: selectedSubcategory,
          unit: formData.get("unit"),
          location: formData.get("location"),
          quotation_available: quotationAvailable ? "true" : "false",
          delivery_available: deliveryAvailable ? "true" : "false",
          brand: brandValue,
        }

        console.log('🚀 Creating product with payload:', {
          category: selectedCategory,
          subcategory: selectedSubcategory,
          name: payload.name
        })

        const multipart = new FormData()
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            multipart.append(key, String(value))
          }
        })

        multipart.append("specifications", JSON.stringify(specificationPayload))

        imageFiles.forEach((file, index) => {
          multipart.append("image_files", file, file.name || `image-${index}`)
        })

        if (videoFiles[0]) {
          const videoFile = videoFiles[0]
          multipart.append("video", videoFile, videoFile.name || "product-video")
        }

        const response = await fetch("/api/products/", {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
          },
          body: multipart,
        })

        const data = await response.json()

        if (!response.ok) {
          console.error("Product save error:", data)
          alert(data?.error || "Failed to save product. Please try again.")
          return
        }

        alert("Product saved successfully!")
      }

      await loadProducts()
      await loadOwnerStats()
      form.reset()
      resetFormState()
      setShowAddProduct(false)
    } catch (error) {
      console.error("Product save error", error)
      alert("Failed to save product. Please try again.")
    } finally {
      setSavingProduct(false)
    }
  }

  const handleLimitUpgrade = useCallback(() => {
    if (nextPlan) {
      setShowLimitModal(false)
      void handleTierUpgrade(nextPlan.value)
    } else {
      setShowLimitModal(false)
    }
  }, [handleTierUpgrade, nextPlan])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Product Owner Dashboard</h1>
          <p className="text-muted-foreground">Manage your products and business</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isVerified ? "success" : ownerStatus === 'pending' ? "outline" : ownerStatus === 'rejected' ? "destructive" : "secondary"}
            className="flex items-center gap-1 capitalize"
          >
            {isVerified && <BadgeCheck className="h-4 w-4" />}
            {verificationBadgeText}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ownerStats.total_products}</div>
                <p className="text-xs text-muted-foreground">
                  {currentPlan.productLimit === -1 ? 'Unlimited products available' : `of ${currentPlan.productLimit} allowed`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ownerStats.total_views}</div>
                <p className="text-xs text-muted-foreground">All-time product views</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Quotation Requests</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ownerStats.total_quotations}</div>
                <p className="text-xs text-muted-foreground">{ownerStats.pending_quotations} pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ownerStats.total_messages}</div>
                <p className="text-xs text-muted-foreground">{ownerStats.unread_messages} unread</p>
              </CardContent>
            </Card>
          </div>

          {/* Upgrade Section */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle>Manage Your Subscription</CardTitle>
              <CardDescription>Unlock more features and list more products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {ownerTiers.map((tier) => {
                  const isCurrentTier = currentTier === tier.value
                  return (
                    <Card key={tier.value} className={isCurrentTier ? "border-primary" : ""}>
                      <CardHeader>
                        <CardTitle className="text-lg">{tier.name}</CardTitle>
                        <div className="text-2xl font-bold">
                          {tier.price} ETB<span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="mb-4 space-y-2 text-sm">
                          {tier.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <BadgeCheck className="h-4 w-4 flex-shrink-0 text-primary" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        {isCurrentTier ? (
                          <Badge className="w-full justify-center">Current Plan</Badge>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => handleTierUpgrade(tier.value)}
                            disabled={upgradingTier === tier.value}
                          >
                            {upgradingTier === tier.value ? "Updating..." : "Upgrade"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          {hasReachedProductLimit && !showAddProduct && (
            <AlertDialog open={showLimitModal} onOpenChange={handleLimitModalClose}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Product limit reached</AlertDialogTitle>
                  <AlertDialogDescription>
                    {currentPlan.productLimit === 1
                      ? "Your Free Trial/Basic plan allows only one product listing. Upgrade to add more products."
                      : "You have used all product slots for your current plan. Upgrade to the next tier to add more listings."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setShowLimitModal(false)}>Maybe later</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLimitUpgrade} disabled={!nextPlan || upgradingTier !== null}>
                    {nextPlan ? `Upgrade to ${nextPlan.name}` : "Close"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Products</CardTitle>
                <CardDescription>Manage your product listings</CardDescription>
              </div>
              <Button onClick={handlePrimaryActionClick}>
                {primaryActionIcon}
                {primaryActionLabel}
              </Button>
            </CardHeader>
            <CardContent>
              {showAddProduct && (
                <Card className="mb-6 border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{isEditMode ? "Edit Product" : "Add New Product"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form key={formKey} className="space-y-4" onSubmit={handleSaveProduct} encType="multipart/form-data">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="product-name">Product Name</Label>
                          <Input
                            id="product-name"
                            name="product-name"
                            placeholder="e.g., Portland Cement 50kg"
                            className="mt-2"
                            defaultValue={editingProduct?.name ?? ""}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={selectedCategory ?? undefined}
                            onValueChange={(value) => {
                              setSelectedCategory(value)
                              setSelectedSubcategory(null)
                            }}
                            disabled={categoriesLoading || !topLevelCategories.length}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                            </SelectTrigger>
                            <SelectContent>
                              {topLevelCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {categoryError ? (
                            <p className="mt-2 text-sm text-destructive">{categoryError}</p>
                          ) : null}
                        </div>
                        <div className="md:col-span-2 lg:col-span-1">
                          <Label htmlFor="subcategory">Subcategory</Label>
                          <Select
                            value={selectedSubcategory ?? undefined}
                            onValueChange={(value) => setSelectedSubcategory(value)}
                            disabled={!selectedCategory || !subcategoryOptions.length}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue
                                placeholder={
                                  !selectedCategory
                                    ? "Select a category first"
                                    : subcategoryOptions.length
                                        ? "Select subcategory"
                                        : "No subcategories available"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {subcategoryOptions.map((subcategory) => (
                                <SelectItem key={subcategory.id} value={subcategory.id}>
                                  {subcategory.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="brand">Brand</Label>
                          <Input
                            id="brand"
                            name="brand"
                            placeholder="e.g., Dangote Cement"
                            className="mt-2"
                            defaultValue={editingProduct?.brand ?? ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="price">Price (ETB)</Label>
                          <Input
                            id="price"
                            name="price"
                            type="number"
                            placeholder="5000"
                            className="mt-2"
                            min="0"
                            defaultValue={editingProduct?.price !== undefined && editingProduct?.price !== null ? String(editingProduct.price) : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="stock">Stock Quantity</Label>
                          <Input
                            id="stock"
                            name="stock"
                            type="number"
                            placeholder="5000"
                            className="mt-2"
                            min="0"
                            defaultValue={editingProduct?.available_quantity !== undefined && editingProduct?.available_quantity !== null ? String(editingProduct.available_quantity) : ""}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="quotation-available">Quotation Available</Label>
                          <div className="mt-2 flex items-center space-x-2">
                            <Switch
                              id="quotation-available"
                              checked={quotationAvailable}
                              onCheckedChange={(checked) => setQuotationAvailable(Boolean(checked))}
                            />
                            <span className="text-sm text-muted-foreground">
                              Allow customers to request quotations for this product.
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="delivery-available">Delivery Available</Label>
                          <div className="mt-2 flex items-center space-x-2">
                            <Switch
                              id="delivery-available"
                              checked={deliveryAvailable}
                              onCheckedChange={(checked) => setDeliveryAvailable(Boolean(checked))}
                            />
                            <span className="text-sm text-muted-foreground">
                              Indicate if you can deliver this product to customers.
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="unit">Unit</Label>
                          <Input
                            id="unit"
                            name="unit"
                            placeholder="e.g., bag, piece, ton"
                            className="mt-2"
                            defaultValue={editingProduct?.unit ?? ""}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            name="location"
                            placeholder="e.g., Addis Ababa"
                            className="mt-2"
                            defaultValue={editingProduct?.location ?? ""}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Describe your product..."
                          className="mt-2"
                          rows={4}
                          defaultValue={editingProduct?.description ?? ""}
                          required
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <Label>Specifications</Label>
                          <Button type="button" variant="secondary" size="sm" onClick={handleAddSpecRow}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add specification
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Provide key attributes and values that describe this product (e.g., Weight: 50kg).
                        </p>
                        <div className="space-y-3">
                          {specRows.map((row, index) => (
                            <div key={`spec-${index}`} className="flex flex-col gap-2 md:flex-row md:items-center">
                              <Input
                                className="md:flex-1"
                                placeholder="Attribute (e.g., Weight)"
                                value={row.attribute}
                                onChange={(event) => handleSpecChange(index, "attribute", event.target.value)}
                              />
                              <Input
                                className="md:flex-1"
                                placeholder="Value (e.g., 50kg)"
                                value={row.value}
                                onChange={(event) => handleSpecChange(index, "value", event.target.value)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSpecRow(index)}
                                disabled={specRows.length === 1}
                              >
                                <MinusCircle className="h-4 w-4" />
                                <span className="sr-only">Remove specification</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="images">Product Images</Label>
                        <Input id="images" name="images" type="file" accept="image/*" multiple className="mt-2" />
                        <p className="mt-2 text-xs text-muted-foreground">Upload up to 4 images.</p>
                      </div>
                      <div>
                        <Label htmlFor="video">Product Video (Optional)</Label>
                        <Input id="video" name="video" type="file" accept="video/*" className="mt-2" />
                        <p className="mt-2 text-xs text-muted-foreground">Upload only 1 video.</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                        <div>
                          <Label htmlFor="quotation-available" className="text-sm font-medium">
                            Quotation availability
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Toggle this on if customers can request a quotation for this product.
                          </p>
                        </div>
                        <Switch
                          id="quotation-available"
                          checked={quotationAvailable}
                          onCheckedChange={setQuotationAvailable}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={savingProduct}>
                          {savingProduct
                            ? isEditMode
                              ? "Updating..."
                              : "Saving..."
                            : isEditMode
                              ? "Update Product"
                              : "Save Product"}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancelForm}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {productsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading products...</p>
                ) : productsError ? (
                  <p className="text-sm text-destructive">{productsError}</p>
                ) : products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products yet. Add your first product above.</p>
                ) : (
                  products.map((product) => {
                    const imageSource = (() => {
                      if (product.primary_image) return product.primary_image
                      if (product.image) return product.image
                      if (Array.isArray(product.images) && product.images.length > 0) {
                        const first = product.images[0] as any
                        if (first?.image) return first.image
                        if (first?.url) return first.url
                        return String(first)
                      }
                      return "/placeholder.svg"
                    })()

                    const stock = product.stock_quantity ?? product.available_quantity ?? "N/A"
                    const views = product.view_count ?? "--"
                    const moderationStatus = getModerationStatusMeta(product)
                    const normalizedStatus = (product.status ?? "").replace(/_/g, " ")
                    const showStatusDetail =
                      normalizedStatus &&
                      !["", "under review", "draft", "rejected"].includes(normalizedStatus)

                    return (
                      <Card key={product.id}>
                        <CardContent className="flex items-center gap-4 p-4">
                          <img
                            src={imageSource}
                            alt={product.name}
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">{product.category_name ?? "Uncategorized"}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <Badge
                                variant={moderationStatus.variant}
                                className={moderationStatus.className}
                              >
                                {moderationStatus.label}
                              </Badge>
                              {showStatusDetail ? (
                                <span className="capitalize text-muted-foreground">({normalizedStatus})</span>
                              ) : null}
                            </div>
                            {product.status === "rejected" && product.rejection_reason ? (
                              <p className="mt-1 text-xs text-destructive">
                                Reason: {product.rejection_reason}
                              </p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
                              <span>Price: {product.price ?? "--"} ETB</span>
                              {product.brand ? <span>Brand: {product.brand}</span> : null}
                              <span>Stock: {stock}</span>
                              <span>Views: {views}</span>
                              <span>Delivery: {product.delivery_available ? "Yes" : "No"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditProduct(product)}
                              aria-label={`Edit ${product.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={deletingProductId === product.id}
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Requests</CardTitle>
              <CardDescription>Manage customer quotation requests</CardDescription>
            </CardHeader>
            <CardContent>
              {quotationsError ? (
                <p className="text-sm text-destructive">{quotationsError}</p>
              ) : quotationsLoading ? (
                <p className="text-muted-foreground">Loading quotation requests…</p>
              ) : quotationRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No quotation requests yet</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {quotationRequests.length} quotation{quotationRequests.length === 1 ? "" : "s"}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => void loadQuotationRequests()}>
                      Refresh
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {quotationRequests.map((quotation) => {
                      const productName = quotation.product?.name ?? "Unknown product"
                      const customer = quotation.user?.username || quotation.user?.email || "Customer"
                      const createdAt = new Date(quotation.created_at).toLocaleString()

                      return (
                        <div key={quotation.id} className="rounded-lg border p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-sm font-medium">{productName}</p>
                              <p className="text-xs text-muted-foreground">Requested by {customer}</p>
                            </div>
                            <Badge variant={quotation.status === "pending" ? "outline" : quotation.status === "responded" ? "default" : "secondary"}>
                              {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Quantity:</span> {quotation.quantity}
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Requested on:</span> {createdAt}
                            </p>
                            {quotation.delivery_location ? (
                              <p className="text-sm md:col-span-2">
                                <span className="text-muted-foreground">Delivery location:</span> {quotation.delivery_location}
                              </p>
                            ) : null}
                            {quotation.message ? (
                              <p className="text-sm md:col-span-2">
                                <span className="text-muted-foreground">Message:</span> {quotation.message}
                              </p>
                            ) : null}
                            {quotation.response ? (
                              <p className="text-sm md:col-span-2">
                                <span className="text-muted-foreground">Your response:</span> {quotation.response}
                              </p>
                            ) : null}
                            {quotation.price_quote ? (
                              <p className="text-sm md:col-span-2">
                                <span className="text-muted-foreground">Quoted price:</span> {quotation.price_quote} ETB
                              </p>
                            ) : null}
                            {quotation.response_document ? (
                              <p className="text-sm md:col-span-2 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <a
                                  href={quotation.response_document}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                  View response document
                                </a>
                              </p>
                            ) : null}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={quotation.status === "responded" ? "outline" : "default"}
                              onClick={() => openRespondDialog(quotation)}
                            >
                              {quotation.status === "responded" ? "Update response" : "Respond"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleDeleteQuotation(quotation.id)}
                              disabled={deletingQuotationId === quotation.id}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {deletingQuotationId === quotation.id ? "Deleting…" : "Delete"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => void loadQuotationRequests()}>
                              Refresh
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={Boolean(respondingQuotation)} onOpenChange={(open) => {
          if (!open) {
            closeRespondDialog()
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Respond to quotation</DialogTitle>
              <DialogDescription>
                Share a price, message, or upload a proforma to reply to the customer.
              </DialogDescription>
            </DialogHeader>

            {respondingQuotation ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Customer request</Label>
                  <div className="mt-1 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {respondingQuotation.product?.name ?? "Product"}
                    </p>
                    <p>Quantity: {respondingQuotation.quantity}</p>
                    {respondingQuotation.message ? <p>Message: {respondingQuotation.message}</p> : null}
                    {respondingQuotation.delivery_location ? (
                      <p>Delivery: {respondingQuotation.delivery_location}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response-message">Message</Label>
                  <Textarea
                    id="response-message"
                    placeholder="Write your response"
                    value={responseMessage}
                    onChange={(event) => setResponseMessage(event.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response-price">Price quote (ETB)</Label>
                  <Input
                    id="response-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                    value={responsePrice}
                    onChange={(event) => setResponsePrice(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank if price is discussed elsewhere.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response-document">Upload proforma or document</Label>
                  <Input
                    id="response-document"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleResponseDocumentChange}
                  />
                  <p className="text-xs text-muted-foreground">Optional. Max size 5MB.</p>
                  {responseDocument ? (
                    <p className="text-xs text-foreground">Selected file: {responseDocument.name}</p>
                  ) : null}
                </div>

                {responseError ? (
                  <p className="text-sm text-destructive">{responseError}</p>
                ) : null}
              </div>
            ) : null}

            <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={closeRespondDialog} disabled={submittingResponse}>
                Cancel
              </Button>
              <Button onClick={() => void handleResponseSubmit()} disabled={submittingResponse}>
                {submittingResponse ? "Sending…" : "Send response"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Communicate with customers</CardDescription>
            </CardHeader>
            {showMessagingFeatures ? (
              <CardContent>
                {ownerConversationsError ? (
                  <p className="text-sm text-destructive">{ownerConversationsError}</p>
                ) : ownerConversationsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading conversations…</p>
                ) : ownerConversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You have no conversations yet. Customers will appear here when they message you.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {ownerConversations.map((conversation) => {
                      const isExpanded = expandedOwnerConversations[conversation.partner.id] ?? false
                      return (
                        <div key={conversation.partner.id} className="rounded-lg border p-4">
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 text-left"
                            onClick={() => handleOwnerConversationExpand(conversation.partner.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Avatar className="h-10 w-10">
                              {conversation.partner.avatar ? (
                                <AvatarImage
                                  src={conversation.partner.avatar}
                                  alt={partnerDisplayName(conversation)}
                                />
                              ) : null}
                              <AvatarFallback>{partnerInitials(conversation)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{partnerDisplayName(conversation)}</p>
                              <p className="text-xs text-muted-foreground">
                                {conversation.partner.role === "product_owner" ? "Product owner" : "Customer"}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {conversation.last_message?.content ?? ""}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                              {conversation.unread_count > 0 ? (
                                <Badge variant="secondary">{conversation.unread_count} unread</Badge>
                              ) : null}
                              <span>{formatDateTime(conversation.last_message?.created_at)}</span>
                              {conversation.message_count > 1 ? (
                                <span>{conversation.message_count} messages</span>
                              ) : null}
                            </div>
                          </button>

                          {isExpanded ? (
                            <div className="mt-4 space-y-3 text-sm">
                              <div className="space-y-2">
                                {conversation.messages.length === 0 ? (
                                  <p className="text-muted-foreground">No messages yet.</p>
                                ) : (
                                  conversation.messages.map((message) => {
                                    const isMine = message.sender?.id === user?.id
                                    const bubbleClasses = isMine
                                      ? "ml-auto max-w-md rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                                      : message.is_read
                                      ? "max-w-md rounded-lg bg-muted px-4 py-2 text-sm text-foreground"
                                      : "max-w-md rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-foreground dark:bg-blue-950 dark:border-blue-800"
                                    return (
                                      <div key={message.id} className="flex flex-col relative">
                                        {/* Unread indicator */}
                                        {!message.is_read && !isMine && (
                                          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                        )}
                                        <div className={bubbleClasses}>
                                          <p className="whitespace-pre-line">{message.content}</p>
                                        </div>
                                        <span className="mt-1 text-xs text-muted-foreground">
                                          {formatDateTime(message.created_at)}
                                        </span>
                                      </div>
                                    )
                                  })
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`owner-reply-${conversation.partner.id}`}>Reply</Label>
                                <Textarea
                                  id={`owner-reply-${conversation.partner.id}`}
                                  placeholder="Write your message"
                                  value={ownerReplyDrafts[conversation.partner.id] ?? ""}
                                  onChange={(event) =>
                                    handleOwnerReplyDraftChange(conversation.partner.id, event.target.value)
                                  }
                                  rows={3}
                                />
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => void handleOwnerSendReply(conversation.partner.id)}
                                    disabled={replyingConversationId === conversation.partner.id}
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    {replyingConversationId === conversation.partner.id ? "Sending…" : "Send reply"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            ) : (
              <CardContent>
                <p className="py-8 text-center text-muted-foreground">
                  Upgrade to Standard or Premium plan to receive messages
                </p>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Favorites</CardTitle>
              <CardDescription>See which products customers save most often</CardDescription>
            </CardHeader>
            <CardContent>
              {favoritesError ? (
                <p className="text-sm text-destructive">{favoritesError}</p>
              ) : favoritesLoading ? (
                <p className="text-muted-foreground">Loading favorite insights...</p>
              ) : favoriteInsights ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Total favorites across your catalog</p>
                      <p className="flex items-center gap-2 text-3xl font-semibold">
                        <Heart className="h-6 w-6 text-red-500" />
                        {favoriteInsights.total_favorites}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => void loadFavoriteInsights()}>
                      Refresh
                    </Button>
                  </div>

                  {favoriteInsights.top_favorited.length === 0 ? (
                    <p className="text-muted-foreground">No favorites yet. Encourage customers to save your products.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {favoriteInsights.top_favorited.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="h-16 w-16 overflow-hidden rounded-md bg-muted">
                              {item.primary_image ? (
                                <img src={item.primary_image} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <Package className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{item.name}</p>
                              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Heart className="h-4 w-4 text-red-500" />
                                {item.favorites_count} favorites
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/products/${item.id}`, "_blank")}
                              title="View product"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Favorites data unavailable.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
            <ProductOwnerVerificationStatus onStatusChange={(status) => setOwnerStatus(status?.verification_status ?? 'unverified')} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Manage your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ownerProfileLoading && (
                <p className="text-sm text-muted-foreground">Loading business information…</p>
              )}
              {ownerProfileError && (
                <p className="text-sm text-destructive">{ownerProfileError}</p>
              )}
              <div>
                <Label htmlFor="business-name">Business Name</Label>
                <Input
                  id="business-name"
                  value={ownerProfileForm.business_name}
                  onChange={handleOwnerProfileInputChange("business_name")}
                  className="mt-2"
                  placeholder="Enter your registered business name"
                  disabled={ownerProfileLoading || ownerProfileSaving}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={ownerProfileForm.business_email}
                  onChange={handleOwnerProfileInputChange("business_email")}
                  className="mt-2"
                  placeholder="business@example.com"
                  disabled={ownerProfileLoading || ownerProfileSaving}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={ownerProfileForm.business_phone}
                  onChange={handleOwnerProfileInputChange("business_phone")}
                  className="mt-2"
                  placeholder="+251 11 123 4567"
                  disabled={ownerProfileLoading || ownerProfileSaving}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={ownerProfileForm.business_address}
                  onChange={handleOwnerProfileInputChange("business_address")}
                  className="mt-2"
                  placeholder="Street, neighborhood"
                  disabled={ownerProfileLoading || ownerProfileSaving}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={ownerProfileForm.business_city}
                  onChange={handleOwnerProfileInputChange("business_city")}
                  className="mt-2"
                  placeholder="Addis Ababa"
                  disabled={ownerProfileLoading || ownerProfileSaving}
                />
              </div>
              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={ownerProfileForm.business_description}
                  onChange={handleOwnerProfileInputChange("business_description")}
                  className="mt-2"
                  rows={4}
                  placeholder="Describe your company and services"
                  disabled={ownerProfileLoading || ownerProfileSaving}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSubmitOwnerProfile}
                  disabled={ownerProfileSaving || ownerProfileLoading}
                >
                  {ownerProfileSaving ? "Saving…" : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOwnerProfileForm(createEmptyOwnerProfileForm())}
                  disabled={ownerProfileLoading || ownerProfileSaving}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
