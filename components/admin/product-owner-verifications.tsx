"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, Eye, RefreshCw, Download, BadgeCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface DocumentEntry {
  name: string
  label?: string
  url: string
  path: string
}

interface VerificationDocumentsPayload {
  trade_license: string | null
  trade_registration: string | null
  vat_registration: string | null
  tin_certificate: string | null
  files: DocumentEntry[]
}

interface VerificationRequest {
  id: string
  product_owner: {
    id: string
    user: {
      username: string
      email: string
      first_name: string
      last_name: string
    }
    business_name: string
    phone_number: string
    verification_status: 'pending' | 'verified' | 'rejected' | 'expired'
    tier?: 'basic' | 'premium' | 'enterprise'
  }
  verification_documents: VerificationDocumentsPayload
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  submitted_at: string
  approved_at?: string
  verification_expires_at?: string
  document_validity_period?: number // in days
  parent_verification?: string | null
  child_verifications?: VerificationRequest[]
  is_update?: boolean
}

export function ProductOwnerVerifications() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)

  const getAuthHeader = () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token')
    if (!token) return null
    if (token.startsWith('Token ') || token.startsWith('Bearer ')) {
      return token
    }
    return `Token ${token}`
  }

  const buildHeaders = () => {
    const authHeader = getAuthHeader()
    if (!authHeader) return undefined
    return {
      'Authorization': authHeader.startsWith('Bearer ')
        ? authHeader
        : authHeader,
      'Content-Type': 'application/json',
    }
  }

  // Helper function to check verification expiration
  const getExpirationStatus = (request: VerificationRequest) => {
    if (!request.verification_expires_at || request.status !== 'approved') {
      return null
    }
    
    const expiresAt = new Date(request.verification_expires_at)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', days: Math.abs(daysUntilExpiry), color: 'red' }
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring-soon', days: daysUntilExpiry, color: 'orange' }
    } else if (daysUntilExpiry <= 60) {
      return { status: 'warning', days: daysUntilExpiry, color: 'yellow' }
    }
    
    return { status: 'valid', days: daysUntilExpiry, color: 'green' }
  }

  const loadRequests = async () => {
    try {
      setLoading(true)
      const headers = buildHeaders()

      const response = await fetch('http://localhost:8000/api/admin/verification-requests/', {
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        setRequests(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading verification requests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleApprove = async (requestId: string) => {
    try {
      setProcessing(true)
      const headers = buildHeaders()

      const response = await fetch(`http://localhost:8000/api/admin/verification-requests/${requestId}/approve/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      })

      if (response.ok) {
        alert('Product owner verified successfully!')
        await loadRequests()
        setDetailsOpen(false)
      } else {
        alert('Failed to approve verification')
      }
    } catch (error) {
      console.error('Error approving:', error)
      alert('Error approving verification')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      setProcessing(true)
      const headers = buildHeaders()

      const response = await fetch(`http://localhost:8000/api/admin/verification-requests/${selectedRequest.id}/reject/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rejection_reason: rejectionReason })
      })

      if (response.ok) {
        alert('Verification request rejected')
        await loadRequests()
        setRejectDialogOpen(false)
        setDetailsOpen(false)
        setRejectionReason("")
      } else {
        alert('Failed to reject verification')
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Error rejecting verification')
    } finally {
      setProcessing(false)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const approvedRequests = requests.filter(r => r.status === 'approved')
  const rejectedRequests = requests.filter(r => r.status === 'rejected')

  const renderDocumentLink = (label: string, url: string | null) => {
    if (!url) return null
    return (
      <a
        key={label}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary hover:underline flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        <span>{label}</span>
      </a>
    )
  }

  const renderSupplementalFiles = (entries: DocumentEntry[]) => {
    if (!entries || entries.length === 0) return null
    return (
      <div className="mt-2 space-y-1">
        {entries.map((entry, idx) => (
          <a
            key={`${entry.path}-${idx}`}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-2"
          >
            <Download className="h-3 w-3" />
            <span>{entry.label || entry.name}</span>
          </a>
        ))}
      </div>
    )
  }

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
          <h1 className="text-3xl font-bold">Product Owner Verifications</h1>
          <p className="text-muted-foreground">Review and manage product owner verification requests</p>
        </div>
        <Button onClick={loadRequests} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            <BadgeCheck className="h-4 w-4 mr-2" />
            Verified ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verification Requests</CardTitle>
              <CardDescription>Product owners awaiting verification</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{request.product_owner.business_name}</p>
                          {request.product_owner.tier && (
                            <Badge variant="outline" className="capitalize">
                              {request.product_owner.tier} Tier
                            </Badge>
                          )}
                          {request.is_update && (
                            <Badge variant="secondary" className="text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Update
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.product_owner.user.first_name} {request.product_owner.user.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{request.product_owner.user.email}</p>
                        {request.parent_verification && (
                          <p className="text-xs text-blue-600 mt-1">
                            Updating previous verification
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedRequest(request)
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

        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle>Verified Product Owners</CardTitle>
              <CardDescription>Product owners with verified status</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No verified product owners</p>
              ) : (
                <div className="space-y-4">
                  {approvedRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <BadgeCheck className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{request.product_owner.business_name}</p>
                            {request.product_owner.tier && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {request.product_owner.tier}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {request.product_owner.user.first_name} {request.product_owner.user.last_name}
                          </p>
                          {(() => {
                            const expirationStatus = getExpirationStatus(request)
                            if (expirationStatus) {
                              return (
                                <p className={`text-xs mt-1 ${
                                  expirationStatus.status === 'expired' ? 'text-red-600' :
                                  expirationStatus.status === 'expiring-soon' ? 'text-orange-600' :
                                  expirationStatus.status === 'warning' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {expirationStatus.status === 'expired' 
                                    ? `Expired ${expirationStatus.days} days ago`
                                    : `Expires in ${expirationStatus.days} days`
                                  }
                                </p>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const expirationStatus = getExpirationStatus(request)
                          if (expirationStatus?.status === 'expired') {
                            return <Badge variant="destructive">Expired</Badge>
                          } else if (expirationStatus?.status === 'expiring-soon') {
                            return <Badge className="bg-orange-500">Expiring Soon</Badge>
                          } else if (expirationStatus?.status === 'warning') {
                            return <Badge className="bg-yellow-500">Expires Soon</Badge>
                          }
                          return <Badge className="bg-green-500">Verified Product Owner</Badge>
                        })()}
                      </div>
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
              <CardTitle>Rejected Verifications</CardTitle>
              <CardDescription>Product owners whose verification was rejected</CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No rejected requests</p>
              ) : (
                <div className="space-y-4">
                  {rejectedRequests.map(request => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{request.product_owner.business_name}</p>
                              {request.product_owner.tier && (
                                <Badge variant="outline" className="capitalize text-xs">
                                  {request.product_owner.tier}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {request.product_owner.user.first_name} {request.product_owner.user.last_name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="destructive">Rejected</Badge>
                      </div>
                      {request.rejection_reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Reason:</span> {request.rejection_reason}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verification Request Details</DialogTitle>
            <DialogDescription>Review product owner information and documents</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Business Name</Label>
                <p className="text-sm font-semibold">{selectedRequest.product_owner.business_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Owner Name</Label>
                  <p className="text-sm">
                    {selectedRequest.product_owner.user.first_name} {selectedRequest.product_owner.user.last_name}
                  </p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedRequest.product_owner.user.email}</p>
                </div>
              </div>
              <div>
                <Label>Phone Number</Label>
                <p className="text-sm">{selectedRequest.product_owner.phone_number}</p>
              </div>
              {selectedRequest.product_owner.tier && (
                <div>
                  <Label>Product Owner Tier</Label>
                  <Badge variant="outline" className="capitalize">
                    {selectedRequest.product_owner.tier} Tier
                  </Badge>
                </div>
              )}

              {/* Verification Validity Period */}
              {selectedRequest.approved_at && (
                <div className="space-y-2">
                  <Label>Verification Period</Label>
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Approved on:</span>
                      <span className="font-medium">
                        {new Date(selectedRequest.approved_at).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedRequest.verification_expires_at && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Expires on:</span>
                          <span className="font-medium">
                            {new Date(selectedRequest.verification_expires_at).toLocaleDateString()}
                          </span>
                        </div>
                        {(() => {
                          const expirationStatus = getExpirationStatus(selectedRequest)
                          if (expirationStatus) {
                            return (
                              <div className={`mt-2 p-2 rounded text-sm ${
                                expirationStatus.status === 'expired' ? 'bg-red-100 text-red-800' :
                                expirationStatus.status === 'expiring-soon' ? 'bg-orange-100 text-orange-800' :
                                expirationStatus.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                <p className="font-medium">
                                  {expirationStatus.status === 'expired' 
                                    ? `⚠️ Verification expired ${expirationStatus.days} days ago`
                                    : expirationStatus.status === 'expiring-soon'
                                    ? `⚠️ Verification expires in ${expirationStatus.days} days`
                                    : expirationStatus.status === 'warning'
                                    ? `⏰ Verification expires in ${expirationStatus.days} days`
                                    : `✓ Valid for ${expirationStatus.days} more days`
                                  }
                                </p>
                                {expirationStatus.status !== 'valid' && (
                                  <p className="text-xs mt-1">
                                    Product owner should be notified to submit updated documents
                                  </p>
                                )}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </>
                    )}
                    {selectedRequest.document_validity_period && (
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-muted-foreground">Validity Period:</span>
                        <span className="font-medium">{selectedRequest.document_validity_period} days</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Verification Type */}
              {selectedRequest.is_update && (
                <div className="p-3 border rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">
                      Document Update Request
                    </p>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    This is a re-verification request with updated documents
                  </p>
                </div>
              )}

              {/* Previous Verification Link */}
              {selectedRequest.parent_verification && (
                <div className="p-3 border rounded-lg bg-muted/30">
                  <Label>Previous Verification</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    This request is an update to a previous verification (ID: {selectedRequest.parent_verification.substring(0, 8)}...)
                  </p>
                  <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                    View Previous Documents
                  </Button>
                </div>
              )}

              {/* Verification History */}
              {selectedRequest.child_verifications && selectedRequest.child_verifications.length > 0 && (
                <div className="p-3 border rounded-lg bg-muted/30">
                  <Label>Verification History</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    This verification has {selectedRequest.child_verifications.length} update(s)
                  </p>
                  <div className="mt-2 space-y-1">
                    {selectedRequest.child_verifications.map((child, index) => (
                      <div key={child.id} className="text-xs p-2 border rounded">
                        <p className="font-medium">Update #{index + 1}</p>
                        <p className="text-muted-foreground">
                          Status: <span className="capitalize">{child.status}</span> | 
                          Submitted: {new Date(child.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedRequest.verification_documents && (
                <div>
                  <Label>Current Verification Documents</Label>
                  <div className="mt-2 p-3 border rounded-lg bg-muted/30 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Review the uploaded business documents below.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {renderDocumentLink('Trade License', selectedRequest.verification_documents.trade_license)}
                      {renderDocumentLink('Trade Registration', selectedRequest.verification_documents.trade_registration)}
                      {renderDocumentLink('VAT Registration', selectedRequest.verification_documents.vat_registration)}
                      {renderDocumentLink('TIN Certificate', selectedRequest.verification_documents.tin_certificate)}
                    </div>
                    {selectedRequest.verification_documents.files && selectedRequest.verification_documents.files.length > 0 && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Supplementary Documents</p>
                        {renderSupplementalFiles(selectedRequest.verification_documents.files)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedRequest?.status === 'pending' && (
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
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Approve & Verify'}
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
            <DialogTitle>Reject Verification</DialogTitle>
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
