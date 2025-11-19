"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle, XCircle, Clock, Eye, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/app/context/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  stock_quantity: number
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  supplier: {
    business_name: string
    user: {
      first_name: string
      last_name: string
      email: string
    }
  }
  category: {
    id?: string
    name: string
  }
  subcategory?: {
    id?: string
    name: string
  } | null
  images: Array<{ image_url: string }>
  created_at: string
}

interface CategoryOption {
  id: string
  name: string
  subcategories: Array<{
    id: string
    name: string
  }>
}

export function ProductModeration() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)
  const { token } = useAuth()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("")

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      if (!token) {
        setProducts([])
        return
      }
      const response = await fetch('/api/admin/products', {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadCategories = useCallback(async () => {
    if (!token) return
    try {
      setCategoryLoading(true)
      const response = await fetch('/api/categories', {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })
      if (!response.ok) return
      const json = await response.json()
      const data: CategoryOption[] = (json?.categories ?? []).map((category: any) => ({
        id: category.id,
        name: category.name,
        subcategories: Array.isArray(category.subcategories)
          ? category.subcategories.map((sub: any) => ({ id: sub.id, name: sub.name }))
          : [],
      }))
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setCategoryLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedCategoryId("")
      setSelectedSubcategoryId("")
      return
    }

    const categoryId = selectedProduct.category?.id ?? ""
    const subcategoryId = selectedProduct.subcategory?.id ?? ""
    setSelectedCategoryId(categoryId)
    setSelectedSubcategoryId(subcategoryId)
  }, [selectedProduct])

  const currentSubcategories = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId)?.subcategories ?? []
    : []

  const handleApprove = async (productId: string) => {
    try {
      setProcessing(true)
      if (!token) {
        alert('Authentication required to approve products.')
        return
      }
      const response = await fetch(`/api/admin/products/${productId}/moderate`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          category_id: selectedCategoryId || null,
          subcategory_id: selectedSubcategoryId || null,
        })
      })

      if (response.ok) {
        alert('Product approved successfully!')
        await loadProducts()
        setDetailsOpen(false)
      } else {
        alert('Failed to approve product')
      }
    } catch (error) {
      console.error('Error approving product:', error)
      alert('Error approving product')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedProduct || !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      setProcessing(true)
      if (!token) {
        alert('Authentication required to reject products.')
        return
      }
      const response = await fetch(`/api/admin/products/${selectedProduct.id}/moderate`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'reject',
          rejection_reason: rejectionReason,
          category_id: selectedCategoryId || null,
          subcategory_id: selectedSubcategoryId || null,
        })
      })

      if (response.ok) {
        alert('Product rejected')
        await loadProducts()
        setRejectDialogOpen(false)
        setDetailsOpen(false)
        setRejectionReason("")
      } else {
        alert('Failed to reject product')
      }
    } catch (error) {
      console.error('Error rejecting product:', error)
      alert('Error rejecting product')
    } finally {
      setProcessing(false)
    }
  }

  const pendingProducts = products.filter(p => p.status === 'pending')
  const approvedProducts = products.filter(p => p.status === 'approved')
  const rejectedProducts = products.filter(p => p.status === 'rejected')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Moderation</h1>
          <p className="text-muted-foreground">Review and moderate product listings</p>
        </div>
        <Button onClick={loadProducts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({pendingProducts.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved ({approvedProducts.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected ({rejectedProducts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Products</CardTitle>
              <CardDescription>Products awaiting moderation approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending products</p>
              ) : (
                <div className="space-y-4">
                  {pendingProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {product.images[0] && (
                          <img
                            src={product.images[0].image_url}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            By {product.supplier.business_name}
                          </p>
                          <p className="text-sm font-medium">${product.price}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedProduct(product)
                          setDetailsOpen(true)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Products</CardTitle>
              <CardDescription>Products available on marketplace</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No approved products</p>
              ) : (
                <div className="space-y-4">
                  {approvedProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {product.images[0] && (
                          <img
                            src={product.images[0].image_url}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              By {product.supplier.business_name}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-500">Approved</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Products</CardTitle>
              <CardDescription>Products that did not meet guidelines</CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No rejected products</p>
              ) : (
                <div className="space-y-4">
                  {rejectedProducts.map(product => (
                    <div key={product.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          {product.images[0] && (
                            <img
                              src={product.images[0].image_url}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex items-center gap-3">
                            <XCircle className="h-5 w-5 text-red-500" />
                            <div>
                              <p className="font-semibold">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                By {product.supplier.business_name}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Badge variant="destructive">Rejected</Badge>
                      </div>
                      {product.rejection_reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Reason:</span> {product.rejection_reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>Review product information</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedProduct.images[0] && (
                  <img
                    src={selectedProduct.images[0].image_url}
                    alt={selectedProduct.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <div className="space-y-2">
                  <div>
                    <Label>Product Name</Label>
                    <p className="text-sm font-semibold">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <Label>Price</Label>
                    <p className="text-sm">${selectedProduct.price}</p>
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <p className="text-sm">{selectedProduct.stock_quantity} units</p>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={(value) => {
                        setSelectedCategoryId(value)
                        setSelectedSubcategoryId("")
                      }}
                      disabled={categoryLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subcategory</Label>
                    <Select
                      value={selectedSubcategoryId}
                      onValueChange={(value) => setSelectedSubcategoryId(value)}
                      disabled={categoryLoading || !selectedCategoryId || currentSubcategories.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedCategoryId ? "Select subcategory" : "Select a category first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {currentSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <p className="text-sm">{selectedProduct.description}</p>
              </div>
              <div>
                <Label>Supplier</Label>
                <p className="text-sm font-semibold">{selectedProduct.supplier.business_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.supplier.user.first_name} {selectedProduct.supplier.user.last_name}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedProduct?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedProduct.id)}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Approve'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Product</DialogTitle>
            <DialogDescription>Please provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Processing...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
