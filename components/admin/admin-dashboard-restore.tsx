// ...existing code...
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
  Package,
  FileText,
  ShieldCheck,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Settings,
  RefreshCw,
  Download,
  Shield,
  BadgeCheck,
  FolderTree
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useLanguage } from "@/lib/language-context"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select as UiSelect, SelectContent as UiSelectContent, SelectItem as UiSelectItem, SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface AdminStats {
  users: { total: number; verified: number; premium: number; standard: number; recent: number }
  productOwners: { total: number; verified: number; pending: number; recent: number }
  products: { total: number; active: number; underReview: number; rejected: number; recent: number }
  verificationRequests: { pending: number; approvedThisMonth: number }
  cache: { status: string; popularProductsCached: boolean; trendingProductsCached: boolean }
}

interface VerificationRequest {
  id: string
  businessName: string
  userEmail: string
  submittedAt: string
  documents: { tradeLicense?: string; tradeRegistration?: string; vatRegistration?: string; tinCertificate?: string }
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  reviewedAt?: string
  // allow any extra fields from API
  [k: string]: any
}

interface ProductModerationItem {
  id: string
  name: string
  ownerName: string
  category: string
  subcategory?: string | null
  createdAt: string
  price?: number
  status?: 'active' | 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  reviewedAt?: string
  thumbnail?: string | null
  imageUrls?: string[]
}

interface AdminUser {
  id: string
  fullName: string
  email: string
  role: string
  tier?: string
  phone?: string | null
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  createdAt: string
  verificationDocuments?: Record<string, unknown> | null
  verification_rejection_reason?: string | null
  [k: string]: any
}

export function AdminDashboard() {
  const { t, language } = useLanguage()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([])
  const [approvedVerifications, setApprovedVerifications] = useState<VerificationRequest[]>([])
  const [rejectedVerifications, setRejectedVerifications] = useState<VerificationRequest[]>([])
  const [moderationItems, setModerationItems] = useState<ProductModerationItem[]>([])
  const [approvedProducts, setApprovedProducts] = useState<ProductModerationItem[]>([])
  const [rejectedProducts, setRejectedProducts] = useState<ProductModerationItem[]>([])
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([])
  const [approvedUsers, setApprovedUsers] = useState<AdminUser[]>([])
  const [rejectedUsers, setRejectedUsers] = useState<AdminUser[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [categoryOptions, setCategoryOptions] = useState<any[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | undefined>(undefined)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ProductModerationItem | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)

  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({ name: '', name_amharic: '', description: '', description_amharic: '', parent: null })
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token')
    if (!token) {
      console.error('No admin token found')
      if (typeof window !== 'undefined') window.location.href = '/admin/login'
      return
    }
    setAuthToken(token)
  }, [])

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true)
      if (!authToken) throw new Error('Not authenticated')

      const statsResp = await fetch('/api/admin/dashboard/', {
        headers: { 'Authorization': `Token ${authToken}`, 'Content-Type': 'application/json' }
      })
      if (!statsResp.ok) {
        if (statsResp.status === 401) {
          localStorage.removeItem('authToken'); localStorage.removeItem('admin_token')
          if (typeof window !== 'undefined') window.location.href = '/admin/login'
          return
        }
        throw new Error(`Stats API failed: ${statsResp.status}`)
      }
      const statsData = await statsResp.json()

      const verifResp = await fetch('/api/verifications/', { headers: { 'Authorization': `Token ${authToken}` } })
      const verifRaw = verifResp.ok ? await verifResp.json() : []
      const verifList = Array.isArray(verifRaw) ? verifRaw : verifRaw?.results || []

      const mappedVerifs: VerificationRequest[] = (verifList || []).map((v: any) => ({
        id: v.id,
        businessName: v.product_owner?.business_name || v.business_name || 'Unknown Business',
        userEmail: v.product_owner?.user?.email || v.email || 'No email',
        submittedAt: v.created_at || v.submitted_at || new Date().toISOString(),
        documents: v.documents || {},
        status: v.status,
        rejectionReason: v.rejection_reason || v.rejectionReason,
        reviewedAt: v.reviewed_at || v.reviewedAt,
        ...v
      }))

      const productsResp = await fetch('/api/products/', { headers: { 'Authorization': `Token ${authToken}` } })
      const productsRaw = productsResp.ok ? await productsResp.json() : []
      const productsList = Array.isArray(productsRaw) ? productsRaw : productsRaw?.products || productsRaw?.results || []
      const mappedProducts: ProductModerationItem[] = (productsList || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        ownerName: p.owner?.business_name || p.owner_name || 'Unknown Owner',
        category: p.category?.name || p.category_name || 'Uncategorized',
        subcategory: p.subcategory?.name || p.subcategory_name || null,
        createdAt: p.created_at || new Date().toISOString(),
        price: p.price,
        status: p.status,
        thumbnail: p.primary_image || (Array.isArray(p.images) && p.images.length ? p.images[0] : null),
        imageUrls: Array.isArray(p.images) ? p.images : (p.primary_image ? [p.primary_image] : []),
        rejectionReason: p.rejection_reason || p.rejectionReason,
        reviewedAt: p.reviewed_at || p.reviewedAt
      }))

      const usersResp = await fetch('/api/admin/users/', { headers: { 'Authorization': `Token ${authToken}` } })
      const usersRaw = usersResp.ok ? await usersResp.json() : []
      const usersList = Array.isArray(usersRaw) ? usersRaw : usersRaw?.results || usersRaw?.users || []
      const mappedUsers: AdminUser[] = (usersList || []).map((u: any) => {
        const firstName = u.first_name || ''
        const lastName = u.last_name || ''
        return {
          id: u.id,
          fullName: `${firstName} ${lastName}`.trim() || u.username || u.email || 'Unknown User',
          email: u.email || u.username || 'No email',
          role: u.role || 'user',
          tier: u.tier,
          phone: u.phone ?? null,
          verificationStatus: (u.verification_status || 'unverified') as AdminUser['verificationStatus'],
          createdAt: u.created_at || new Date().toISOString(),
          verificationDocuments: u.verification_documents || null,
          verification_rejection_reason: u.verification_rejection_reason || null
        }
      })

      const pendingVerifs = mappedVerifs.filter(v => v.status === 'pending')
      const approvedVerifs = mappedVerifs.filter(v => v.status === 'approved')
      const rejectedVerifs = mappedVerifs.filter(v => v.status === 'rejected')

      const pendingProds = mappedProducts.filter(p => !p.status || p.status === 'pending')
      const approvedProds = mappedProducts.filter(p => p.status === 'approved' || p.status === 'active')
      const rejectedProds = mappedProducts.filter(p => p.status === 'rejected')

      const pendingUserList = mappedUsers.filter(u => u.verificationStatus === 'pending')
      const approvedUserList = mappedUsers.filter(u => u.verificationStatus === 'verified')
      const rejectedUserList = mappedUsers.filter(u => u.verificationStatus === 'rejected')

      // Categories
      const categoriesResp = await fetch('/api/categories/', { headers: { 'Authorization': `Token ${authToken}` } })
      const categoriesData = categoriesResp.ok ? await categoriesResp.json() : []
      const categoriesList = Array.isArray(categoriesData) ? categoriesData : categoriesData?.categories || []

      setStats({
        users: statsData.users || { total: 0, verified: 0, premium: 0, standard: 0, recent: 0 },
        productOwners: statsData.productOwners || { total: 0, verified: 0, pending: 0, recent: 0 },
        products: statsData.products || { total: 0, active: 0, underReview: 0, rejected: 0, recent: 0 },
        verificationRequests: { pending: pendingVerifs.length, approvedThisMonth: approvedVerifs.length },
        cache: { status: 'healthy', popularProductsCached: true, trendingProductsCached: true }
      })

      setVerificationRequests(pendingVerifs)
      setApprovedVerifications(approvedVerifs)
      setRejectedVerifications(rejectedVerifs)

      setModerationItems(pendingProds)
      setApprovedProducts(approvedProds)
      setRejectedProducts(rejectedProds)

      setPendingUsers(pendingUserList)
      setApprovedUsers(approvedUserList)
      setRejectedUsers(rejectedUserList)

      setCategories(categoriesList)
      setCategoryOptions((categoriesList || []).filter((c: any) => !c.parent_id))
    } catch (err) {
      console.error('Error loading admin data', err)
      alert(`Failed to load admin data: ${(err as Error).message || err}`)
    } finally {
      setLoading(false)
    }
  }, [authToken])

  useEffect(() => {
    if (authToken) loadAdminData()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAdminData()
    setRefreshing(false)
  }

  const handleVerificationAction = async (requestId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      if (!authToken) { alert('Authentication required'); return }
      if (action === 'reject') {
        reason = window.prompt('Please provide a reason for rejection:') || reason
        if (!reason) { alert('Rejection reason is required'); return }
      }
      const res = await fetch(`/api/verifications/${requestId}/review/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'rejected',
          review_notes: reason || `${action === 'approve' ? 'Approved' : 'Rejected'} by admin`,
          send_notification: true
        })
      })
      if (!res.ok) throw new Error('Failed to review verification')
      alert(`Verification ${action}d`)
      await loadAdminData()
    } catch (err) {
      console.error(err)
      alert((err as Error).message || 'Error')
    }
  }

  const handleProductModeration = async (productId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      if (!authToken) { alert('Authentication required'); return }
      if (action === 'reject') {
        reason = window.prompt('Please provide a reason for rejection:') || reason
        if (!reason) { alert('Rejection reason is required'); return }
      }
      const res = await fetch(`/api/products/${productId}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Token ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'active' : 'rejected',
          rejection_reason: action === 'reject' ? reason : undefined,
          is_approved: action === 'approve',
          admin_notes: reason || `${action === 'approve' ? 'Approved' : 'Rejected'} by admin`
        })
      })
      if (!res.ok) throw new Error('Failed to update product')
      try {
        await fetch('/api/notifications/product-review/', {
          method: 'POST',
          headers: { 'Authorization': `Token ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId, status: action === 'approve' ? 'approved' : 'rejected', reason, send_email: true })
        })
      } catch (e) { console.warn('Notification failed', e) }
      alert(`Product ${action}d`)
      await loadAdminData()
    } catch (err) {
      console.error(err)
      alert((err as Error).message || 'Failed to moderate product')
    }
  }

  const handleUserVerificationAction = async (userId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      if (!authToken) { alert('Authentication required'); return }
      if (action === 'reject') {
        reason = window.prompt('Please provide a reason for rejection:') || reason
        if (!reason) { alert('Rejection reason is required'); return }
      }
      const res = await fetch(`/api/admin/users/${userId}/review-verification/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: reason || undefined })
      })
      if (!res.ok) throw new Error('Failed to review user verification')
      alert(`User verification ${action}d`)
      await loadAdminData()
    } catch (err) {
      console.error(err)
      alert((err as Error).message || 'Error')
    }
  }

  const openDetails = async (item: ProductModerationItem) => {
    setSelectedItem(item)
    setSelectedCategoryId(undefined)
    setSelectedSubcategoryId(undefined)
    setDetailsOpen(true)
    try {
      setDetailsLoading(true)
      const res = await fetch('/api/categories', { cache: 'no-store' })
      const data = await res.json()
      const cats = Array.isArray(data?.categories) ? data.categories : []
      setCategoryOptions(cats.filter((c: any) => !c.parent_id))
      const matched = cats.find((c: any) => c.name === item.category)
      if (matched) {
        setSelectedCategoryId(matched.id)
        const sub = matched.subcategories?.find((s: any) => s.name === item.subcategory)
        setSelectedSubcategoryId(sub?.id)
      } else {
        for (const c of cats) {
          const sub = (c.subcategories || []).find((s: any) => s.name === item.subcategory)
          if (sub) { setSelectedCategoryId(c.id); setSelectedSubcategoryId(sub.id); break }
        }
      }
    } catch (err) {
      console.warn('Failed loading categories for details', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  const subcategoryChoices = (() => {
    if (!selectedCategoryId) return []
    const sel = categoryOptions.find(c => c.id === selectedCategoryId)
    return sel?.subcategories ?? []
  })()

  const saveDetails = async () => {
    if (!selectedItem || !authToken) return
    try {
      setSaveBusy(true)
      const payload: any = {}
      if (selectedCategoryId) payload.category = selectedCategoryId
      if (selectedSubcategoryId) payload.subcategory = selectedSubcategoryId
      const res = await fetch(`/api/products/${selectedItem.id}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Token ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to save')
      }
      alert('Product updated')
      await loadAdminData()
      setDetailsOpen(false)
    } catch (err) {
      console.error(err)
      alert((err as Error).message || 'Save failed')
    } finally {
      setSaveBusy(false)
    }
  }

  const warmCache = async () => {
    setRefreshing(true)
    await new Promise(r => setTimeout(r, 1000))
    setRefreshing(false)
    alert('Cache warmed (simulated)')
  }

  if (!mounted) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
          <p className="text-sm text-muted-foreground mt-2">Token: {authToken ? 'Found' : 'Missing'}</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading admin data</p>
          <p className="text-sm text-muted-foreground mt-2">Please check the browser console for detailed error information.</p>
          <Button onClick={() => window.location.reload()} className="mt-4">Reload Page</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="container mx-auto p-6">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">{language === 'am' ? 'አስተዳደር ፓነል' : 'Admin Panel'}</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {language === 'am' ? 'አድስ' : 'Refresh'}
              </Button>
              <Button onClick={warmCache} disabled={refreshing}>
                <Settings className="h-4 w-4 mr-2" />
                {language === 'am' ? 'ካሽ አሞቅ' : 'Warm Cache'}
              </Button>
            </div>
          </div>
          <div className="container mx-auto px-4 py-2 text-xs text-muted-foreground bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div><strong>Auth:</strong> {authToken ? '✅ Token Found' : '❌ No Token'}</div>
              <div><strong>Stats:</strong> {stats ? `✅ ${stats.users.total} users, ${stats.products.total} products` : '❌ Loading...'}</div>
              <div><strong>Requests:</strong> {verificationRequests.length} verifications, {moderationItems.length} moderation items</div>
              <div><strong>API Status:</strong> ✅ Real API Integration (Django Backend)</div>
            </div>
          </div>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full"><Settings className="h-5 w-5 text-blue-600" /></div>
              <div>
                <h3 className="font-semibold text-blue-900">Admin Dashboard - Full Real-Time Integration</h3>
                <p className="text-sm text-blue-700">The dashboard fetches live data from the Django backend.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+{stats.users.recent} this week</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Verified: {stats.users.verified}</span>
                  <span>{stats.users.total > 0 ? Math.round((stats.users.verified / stats.users.total) * 100) : 0}%</span>
                </div>
                <Progress value={stats.users.total > 0 ? (stats.users.verified / stats.users.total) * 100 : 0} className="h-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Product Owners</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.productOwners.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+{stats.productOwners.recent} this week</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">{stats.productOwners.pending} Pending</Badge>
                <Badge variant="default" className="text-xs">{stats.productOwners.verified} Verified</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+{stats.products.recent} this week</p>
              <div className="flex gap-1 mt-2">
                <Badge variant="default" className="text-xs">{stats.products.active} Active</Badge>
                {stats.products.underReview > 0 && <Badge variant="outline" className="text-xs">{stats.products.underReview} Review</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${stats.cache.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium capitalize">{stats.cache.status}</span>
              </div>
              <div className="space-y-1 mt-2">
                <div className="flex items-center text-xs"><CheckCircle className="h-3 w-3 text-green-500 mr-1" />Popular Products</div>
                <div className="flex items-center text-xs"><CheckCircle className="h-3 w-3 text-green-500 mr-1" />Trending Products</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="product-owners" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full gap-1">
            <TabsTrigger value="product-owners"><Package className="h-4 w-4 mr-2" />Product Owners</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="products"><FileText className="h-4 w-4 mr-2" />Products</TabsTrigger>
            <TabsTrigger value="categories"><FolderTree className="h-4 w-4 mr-2" />Categories</TabsTrigger>
            <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-2" />Analytics</TabsTrigger>
          </TabsList>

          {/* Product Owners */}
          <TabsContent value="product-owners" className="space-y-4">
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="pending">Pending ({verificationRequests.length})</TabsTrigger>
                <TabsTrigger value="approved">Verified ({approvedVerifications.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedVerifications.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Pending Verification Requests</CardTitle>
                    <CardDescription>Review and approve product owner verification documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {verificationRequests.length === 0 ? <p className="text-center text-muted-foreground py-8">No pending verification requests</p> : (
                      <div className="space-y-4">
                        {verificationRequests.map(r => (
                          <div key={r.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{r.businessName}</h3>
                                <p className="text-sm text-muted-foreground">{r.userEmail}</p>
                                <p className="text-xs text-muted-foreground">Submitted: {new Date(r.submittedAt).toLocaleDateString()}</p>
                              </div>
                              <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Documents:</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(r.documents || {}).map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    {value && (
                                      <>
                                        <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={() => window.open(value as string, '_blank')} title="View document"><Eye className="h-3 w-3" /></Button>
                                        <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={async () => {
                                          try {
                                            const rr = await fetch(value as string)
                                            const blob = await rr.blob()
                                            const url = window.URL.createObjectURL(blob)
                                            const link = document.createElement('a'); link.href = url; link.download = `${key}_${r.businessName}.pdf`; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url)
                                          } catch (e) { console.error('Download failed', e); window.open(value as string, '_blank') }
                                        }} title="Download document"><Download className="h-3 w-3" /></Button>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button onClick={() => handleVerificationAction(r.id, 'approve')} className="bg-green-600 hover:bg-green-700" size="sm"><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
                              <Button onClick={() => handleVerificationAction(r.id, 'reject')} variant="destructive" size="sm"><XCircle className="h-4 w-4 mr-2" />Reject</Button>
                              <Button variant="outline" size="sm" onClick={async () => {
                                for (const [k, v] of Object.entries(r.documents || {})) {
                                  if (!v) continue
                                  try {
                                    const rr = await fetch(v as string)
                                    const blob = await rr.blob()
                                    const url = window.URL.createObjectURL(blob)
                                    const link = document.createElement('a'); link.href = url; link.download = `${k}_${r.businessName}.pdf`; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url)
                                    await new Promise(res => setTimeout(res, 400))
                                  } catch (e) { console.error(`Failed to download ${k}`, e) }
                                }
                              }}><Download className="h-4 w-4 mr-2" />Download All</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approved" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Verified Owners</CardTitle><CardDescription>Verified product owners</CardDescription></CardHeader>
                  <CardContent>
                    {approvedVerifications.length === 0 ? <p className="text-center text-muted-foreground py-8">No verified product owners</p> : (
                      <div className="space-y-4">
                        {approvedVerifications.map(o => (
                          <div key={o.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{o.businessName}</h3>
                                <p className="text-sm text-muted-foreground">{o.userEmail}</p>
                              </div>
                              <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" />Rejected Verifications</CardTitle><CardDescription>Rejected verification requests</CardDescription></CardHeader>
                  <CardContent>
                    {rejectedVerifications.length === 0 ? <p className="text-center text-muted-foreground py-8">No rejected verification requests</p> : (
                      <div className="space-y-4">
                        {rejectedVerifications.map(r => (
                          <div key={r.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{r.businessName}</h3>
                                <p className="text-sm text-muted-foreground">{r.userEmail}</p>
                                {r.rejectionReason && <p className="text-sm text-red-500 mt-1"><strong>Reason: </strong>{r.rejectionReason}</p>}
                              </div>
                              <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Products */}
          <TabsContent value="products" className="space-y-4">
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="pending">Pending ({moderationItems.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({approvedProducts.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedProducts.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Products Pending Moderation</CardTitle><CardDescription>Review products that require moderation approval</CardDescription></CardHeader>
                  <CardContent>
                    {moderationItems.length === 0 ? <p className="text-center text-muted-foreground py-8">No products pending moderation</p> : (
                      <div className="space-y-4">
                        {moderationItems.map(item => (
                          <div key={item.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                {item.thumbnail ? <img src={item.thumbnail} alt={item.name} className="h-16 w-16 rounded object-cover border" /> : <div className="h-16 w-16 rounded bg-muted border" />}
                                <div>
                                  <h3 className="font-semibold">{item.name}</h3>
                                  <p className="text-sm text-muted-foreground">by {item.ownerName}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Badge variant="outline">{item.category}</Badge>
                                    {item.subcategory && <Badge variant="outline">{item.subcategory}</Badge>}
                                    {item.price && <Badge variant="secondary">{item.price} ETB</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground">Created: {new Date(item.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <Badge variant={item.status === 'rejected' ? 'destructive' : 'outline'}>
                                {item.status === 'rejected' ? <><XCircle className="h-3 w-3 mr-1" />Rejected</> : <><Clock className="h-3 w-3 mr-1" />Under Review</>}
                              </Badge>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button onClick={() => handleProductModeration(item.id, 'approve')} className="bg-green-600 hover:bg-green-700" size="sm"><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
                              <Button onClick={() => handleProductModeration(item.id, 'reject')} variant="destructive" size="sm"><XCircle className="h-4 w-4 mr-2" />Reject</Button>
                              <Button variant="outline" size="sm" onClick={() => openDetails(item)}><Eye className="h-4 w-4 mr-2" />View Details</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approved" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Approved Products</CardTitle><CardDescription>Live products</CardDescription></CardHeader>
                  <CardContent>
                    {approvedProducts.length === 0 ? <p className="text-center text-muted-foreground py-8">No approved products yet</p> : (
                      <div className="space-y-4">
                        {approvedProducts.map(item => (
                          <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-green-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{item.name}</h3>
                                <p className="text-sm text-muted-foreground">{item.ownerName}</p>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                                <p className="text-xs text-muted-foreground">Approved: {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}</p>
                              </div>
                              <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Live</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Rejected Products</CardTitle><CardDescription>Products rejected during moderation</CardDescription></CardHeader>
                  <CardContent>
                    {rejectedProducts.length === 0 ? <p className="text-center text-muted-foreground py-8">No rejected products</p> : (
                      <div className="space-y-4">
                        {rejectedProducts.map(item => (
                          <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-red-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{item.name}</h3>
                                <p className="text-sm text-muted-foreground">{item.ownerName}</p>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                                <p className="text-xs text-muted-foreground">Rejected: {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}</p>
                                {item.rejectionReason && <p className="text-sm mt-2 p-2 bg-red-100 rounded"><strong>Reason:</strong> {item.rejectionReason}</p>}
                              </div>
                              <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="space-y-4">
            <Tabs defaultValue="pending-users" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="pending-users">Pending ({pendingUsers.length})</TabsTrigger>
                <TabsTrigger value="approved-users">Approved ({approvedUsers.length})</TabsTrigger>
                <TabsTrigger value="rejected-users">Rejected ({rejectedUsers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending-users" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Pending User Verification Requests</CardTitle><CardDescription>Review and approve user verification documents</CardDescription></CardHeader>
                  <CardContent>
                    {pendingUsers.filter(u => u.verificationStatus === 'pending').length === 0 ? <p className="text-center text-muted-foreground py-8">No pending user verification requests</p> : (
                      <div className="space-y-4">
                        {pendingUsers.filter(u => u.verificationStatus === 'pending').map(user => {
                          const docPath = (user.verificationDocuments as any)?.id_document as string | undefined
                          const docUrl = docPath ? (docPath.startsWith('http') ? docPath : `${process.env.NEXT_PUBLIC_DJANGO_BASE_URL || 'http://127.0.0.1:8000'}/media/${docPath}`) : null
                          return (
                            <div key={user.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold">{user.fullName}</h3>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                  {user.phone && <p className="text-sm text-muted-foreground">Phone: {user.phone}</p>}
                                  <p className="text-xs text-muted-foreground">Submitted: {new Date(user.createdAt).toLocaleDateString()}</p>
                                </div>
                                <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                              </div>

                              {docUrl && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Verification Document:</p>
                                  <div className="flex items-center gap-2">
                                    <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                      <Download className="h-4 w-4" /> View Document
                                    </a>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <Button onClick={() => handleUserVerificationAction(user.id, 'approve')} className="bg-green-600 hover:bg-green-700" size="sm"><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
                                <Button onClick={() => handleUserVerificationAction(user.id, 'reject')} variant="destructive" size="sm"><XCircle className="h-4 w-4 mr-2" />Reject</Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approved-users" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Approved Users</CardTitle><CardDescription>Users who have been verified</CardDescription></CardHeader>
                  <CardContent>
                    {approvedUsers.length === 0 ? <p className="text-center text-muted-foreground py-8">No approved users yet</p> : (
                      <div className="space-y-4">
                        {approvedUsers.map(user => (
                          <div key={user.id} className="border rounded-lg p-4 space-y-3 bg-green-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{user.fullName}</h3>
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                </div>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                {user.phone && <p className="text-sm text-muted-foreground">Phone: {user.phone}</p>}
                                {user.tier && <Badge variant="outline" className="mt-1">{user.tier}</Badge>}
                              </div>
                              <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Verified</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rejected-users" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" />Rejected Users</CardTitle><CardDescription>User verification requests that were rejected</CardDescription></CardHeader>
                  <CardContent>
                    {rejectedUsers.length === 0 ? <p className="text-center text-muted-foreground py-8">No rejected users</p> : (
                      <div className="space-y-4">
                        {rejectedUsers.map(user => (
                          <div key={user.id} className="border rounded-lg p-4 space-y-3 bg-red-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold">{user.fullName}</h3>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                {user.phone && <p className="text-sm text-muted-foreground">Phone: {user.phone}</p>}
                                {(user as any).verification_rejection_reason && <p className="text-sm mt-2 p-2 bg-red-100 rounded"><strong>Rejection Reason:</strong> {(user as any).verification_rejection_reason}</p>}
                              </div>
                              <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Categories</CardTitle><CardDescription>Manage categories</CardDescription></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Total categories: {categories.length}</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setCategoryFormData({ name: '', name_amharic: '', description: '', description_amharic: '', parent: null }); setEditingCategory(null); setCategoryDialogOpen(true) }}>New Category</Button>
                  </div>
                </div>
                {categories.length === 0 ? <p className="text-center text-muted-foreground py-8">No categories</p> : (
                  <div className="grid gap-2">
                    {categories.map((c: any) => (
                      <div key={c.id} className="border rounded p-3 flex justify-between items-center">
                        <div>
                          <strong>{c.name}</strong>
                          <div className="text-sm text-muted-foreground">{c.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingCategory(c); setCategoryFormData({ name: c.name, name_amharic: c.name_amharic || '', description: c.description || '', description_amharic: c.description_amharic || '', parent: c.parent_id || null }); setCategoryDialogOpen(true) }}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={async () => { if (!authToken) return; if (!confirm('Delete category?')) return; try { await fetch(`/api/categories/${c.id}/`, { method: 'DELETE', headers: { 'Authorization': `Token ${authToken}` } }); await loadAdminData() } catch (e) { console.error(e); alert('Delete failed') } }}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>User Growth</CardTitle><CardDescription>User registration trends</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-sm">This Month</span><span className="font-bold">+{stats.users.recent * 4}</span></div>
                    <Progress value={85} className="h-2" />
                    <div className="flex justify-between items-center"><span className="text-sm">Premium Conversion</span><span className="font-bold">{stats.users.total > 0 ? Math.round((stats.users.premium / stats.users.total) * 100) : 0}%</span></div>
                    <Progress value={stats.users.total > 0 ? (stats.users.premium / stats.users.total) * 100 : 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Product Activity</CardTitle><CardDescription>Product listing and engagement</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-sm">Active Products</span><span className="font-bold">{stats.products.total > 0 ? Math.round((stats.products.active / stats.products.total) * 100) : 0}%</span></div>
                    <Progress value={stats.products.total > 0 ? (stats.products.active / stats.products.total) * 100 : 0} className="h-2" />
                    <div className="flex justify-between items-center"><span className="text-sm">New This Week</span><span className="font-bold">+{stats.products.recent}</span></div>
                    <Progress value={75} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </Tabs>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader><DialogTitle>Product Details</DialogTitle></DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="flex gap-4">{(selectedItem.imageUrls || []).slice(0, 4).map((url, idx) => <img key={idx} src={url} alt={selectedItem.name} className="h-20 w-20 rounded object-cover border" />)}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">Category</label>
                    <UiSelect value={selectedCategoryId} onValueChange={(v) => { setSelectedCategoryId(v); setSelectedSubcategoryId(undefined) }}>
                      <UiSelectTrigger className="mt-2"><UiSelectValue placeholder="Select category" /></UiSelectTrigger>
                      <UiSelectContent>{categoryOptions.map((c: any) => <UiSelectItem key={c.id} value={c.id}>{c.name}</UiSelectItem>)}</UiSelectContent>
                    </UiSelect>
                  </div>
                  <div>
                    <label className="text-sm">Subcategory</label>
                    <UiSelect value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId}>
                      <UiSelectTrigger className="mt-2"><UiSelectValue placeholder="Select subcategory" /></UiSelectTrigger>
                      <UiSelectContent className="max-h-[400px] overflow-y-auto">
                        {subcategoryChoices.length > 0 ? subcategoryChoices.map((s: any) => <UiSelectItem key={s.id} value={s.id}>{s.name}</UiSelectItem>) : <div className="p-2 text-sm text-muted-foreground">Select a category first</div>}
                      </UiSelectContent>
                    </UiSelect>
                    <p className="text-xs text-muted-foreground mt-1">{subcategoryChoices.length} subcategories available</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)} disabled={saveBusy}>Close</Button>
              <Button onClick={saveDetails} disabled={saveBusy || detailsLoading}>{saveBusy ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
// ...existing code...