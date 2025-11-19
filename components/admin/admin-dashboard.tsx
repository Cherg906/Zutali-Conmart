"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Package, 
  FileText, 
  ShieldCheck, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  FolderTree,
  BadgeCheck,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/lib/language-context"

interface AdminStats {
  users: {
    total: number
    verified: number
    pending: number
    rejected: number
  }
  productOwners: {
    total: number
    verified: number
    pending: number
    rejected: number
  }
  products: {
    total: number
    active: number
    underReview: number
    approved: number
    rejected: number
  }
  verificationRequests: {
    users: number
    productOwners: number
    total: number
  }
  productModeration: {
    pending: number
    approved: number
    rejected: number
  }
}

export function AdminDashboard() {
  const { language } = useLanguage()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const buildAuthHeader = useCallback((token: string | null) => {
    if (!token) return null
    if (token.startsWith('Token ') || token.startsWith('Bearer ')) {
      return token
    }
    return `Token ${token}`
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token')
    if (token) {
      setAuthToken(token)
    }
  }, [])

  const loadDashboardData = useCallback(async () => {
    const authHeader = buildAuthHeader(authToken)
    if (!authHeader) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/dashboard/?t=${Date.now()}`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        setStats({
          users: {
            total: data.users?.total || 0,
            verified: data.users?.verified || 0,
            pending: data.users?.pending || 0,
            rejected: data.users?.rejected || 0,
          },
          productOwners: {
            total: data.product_owners?.total || 0,
            verified: data.product_owners?.verified || 0,
            pending: data.product_owners?.pending || 0,
            rejected: data.product_owners?.rejected || 0,
          },
          products: {
            total: data.products?.total || 0,
            active: data.products?.active || 0,
            underReview: data.products?.under_review || 0,
            approved: data.products?.approved || 0,
            rejected: data.products?.rejected || 0,
          },
          verificationRequests: {
            users: data.verification_requests?.users || 0,
            productOwners: data.verification_requests?.product_owners || 0,
            total: (data.verification_requests?.users || 0) + (data.verification_requests?.product_owners || 0)
          },
          productModeration: {
            pending: data.product_moderation?.pending || 0,
            approved: data.product_moderation?.approved || 0,
            rejected: data.product_moderation?.rejected || 0,
          }
        })
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [authToken, buildAuthHeader])

  useEffect(() => {
    if (authToken) {
      loadDashboardData()
    }
  }, [authToken, loadDashboardData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-semibold">Error loading dashboard</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'am' ? 'አስተዳደር ዳሽቦርድ' : 'Admin Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'am' ? 'የመድረክ እንቅስቃሴዎችን ይቆጣጠሩ እና ያስተዳድሩ' : 'Monitor and manage platform activities'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => router.push('/admin/categories')}
            variant="default"
          >
            <FolderTree className="h-4 w-4 mr-2" />
            {language === 'am' ? 'ምድቦች' : 'Categories'}
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {language === 'am' ? 'አድስ' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.verified} verified · {stats.users.pending} pending · {stats.users.rejected} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Owners</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productOwners.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.productOwners.verified} verified · {stats.productOwners.pending} pending · {stats.productOwners.rejected} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.products.approved} approved · {stats.products.underReview} under review · {stats.products.rejected} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-sm text-muted-foreground uppercase">Users</div>
                <div className="text-xl font-semibold">{stats.verificationRequests.users}</div>
              </div>
              <div className="h-8 w-px bg-border" aria-hidden />
              <div>
                <div className="text-sm text-muted-foreground uppercase">Product Owners</div>
                <div className="text-xl font-semibold">{stats.verificationRequests.productOwners}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Access key administrative functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              onClick={() => router.push('/admin/categories')}
              className="h-24 flex-col gap-2"
              variant="outline"
            >
              <FolderTree className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Manage Categories</div>
                <div className="text-xs text-muted-foreground">Add, edit, delete categories</div>
              </div>
            </Button>

            <Button 
              className="h-24 flex-col gap-2"
              variant="outline"
              onClick={() => router.push('/admin/users')}
            >
              <Users className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">User Verifications</div>
                <div className="text-xs text-muted-foreground">
                  Pending: {stats.verificationRequests.users}
                </div>
                <div className="text-xs text-muted-foreground">
                  Verified: {stats.users.verified}
                </div>
                <div className="text-xs text-muted-foreground">
                  Rejected: {stats.users.rejected}
                </div>
              </div>
            </Button>

            <Button 
              className="h-24 flex-col gap-2"
              variant="outline"
              onClick={() => router.push('/admin/product-owners')}
            >
              <BadgeCheck className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Product Owner Verifications</div>
                <div className="text-xs text-muted-foreground">
                  Pending: {stats.verificationRequests.productOwners}
                </div>
                <div className="text-xs text-muted-foreground">
                  Verified: {stats.productOwners.verified}
                </div>
                <div className="text-xs text-muted-foreground">
                  Rejected: {stats.productOwners.rejected}
                </div>
              </div>
            </Button>

            <Button 
              className="h-24 flex-col gap-2"
              variant="outline"
              onClick={() => router.push('/admin/products')}
            >
              <FileText className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Product Moderation</div>
                <div className="text-xs text-muted-foreground">
                  Pending: {stats.productModeration.pending}
                </div>
                <div className="text-xs text-muted-foreground">
                  Approved: {stats.productModeration.approved}
                </div>
                <div className="text-xs text-muted-foreground">
                  Rejected: {stats.productModeration.rejected}
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Overview</CardTitle>
          <CardDescription>Key metrics and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Verified Users</p>
                  <p className="text-sm text-muted-foreground">Users with verified status</p>
                </div>
              </div>
              <Badge className="bg-green-500">{stats.users.verified}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Verified Product Owners</p>
                  <p className="text-sm text-muted-foreground">Product owners with verified status</p>
                </div>
              </div>
              <Badge className="bg-blue-500">{stats.productOwners.verified}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Pending User Verifications</p>
                  <p className="text-sm text-muted-foreground">Users awaiting verification</p>
                </div>
              </div>
              <Badge variant="outline">{stats.verificationRequests.users}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">Pending Product Owner Verifications</p>
                  <p className="text-sm text-muted-foreground">Product owners awaiting verification</p>
                </div>
              </div>
              <Badge variant="outline">{stats.verificationRequests.productOwners}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Active Products</p>
                  <p className="text-sm text-muted-foreground">Live on marketplace</p>
                </div>
              </div>
              <Badge variant="outline">{stats.products.approved}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
