"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, Eye, RefreshCw, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/language-context"

interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  verification_status: 'pending' | 'verified' | 'rejected' | 'expired'
  tier?: 'basic' | 'premium' | 'enterprise'
  created_at: string
  rejection_reason?: string
  parent_verification?: string | null
  child_verifications?: User[]
  is_update?: boolean
  verification_documents?: any
  verified_at?: string
  verification_expires_at?: string
  document_validity_period?: number // in days
}

export function UserVerifications() {
  const { language } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)

  // Helper function to check verification expiration
  const getExpirationStatus = (user: User) => {
    if (!user.verification_expires_at || user.verification_status !== 'verified') {
      return null
    }
    
    const expiresAt = new Date(user.verification_expires_at)
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

  const loadUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token')
      
      const response = await fetch('http://localhost:8000/api/admin/users/?role=user', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleApprove = async (userId: string) => {
    try {
      setProcessing(true)
      const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token')
      
      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}/review-verification/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' })
      })

      if (response.ok) {
        alert('User verified successfully!')
        await loadUsers()
        setDetailsOpen(false)
      } else {
        alert('Failed to verify user')
      }
    } catch (error) {
      console.error('Error approving user:', error)
      alert('Error verifying user')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      setProcessing(true)
      const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token')
      
      const response = await fetch(`http://localhost:8000/api/admin/users/${selectedUser.id}/review-verification/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'reject',
          rejection_reason: rejectionReason
        })
      })

      if (response.ok) {
        alert('User verification rejected')
        await loadUsers()
        setRejectDialogOpen(false)
        setDetailsOpen(false)
        setRejectionReason("")
      } else {
        alert('Failed to reject user')
      }
    } catch (error) {
      console.error('Error rejecting user:', error)
      alert('Error rejecting user')
    } finally {
      setProcessing(false)
    }
  }

  const pendingUsers = users.filter(u => u.verification_status === 'pending')
  const verifiedUsers = users.filter(u => u.verification_status === 'verified')
  const rejectedUsers = users.filter(u => u.verification_status === 'rejected')

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
          <h1 className="text-3xl font-bold">User Verifications</h1>
          <p className="text-muted-foreground">Review and manage user verification requests</p>
        </div>
        <Button onClick={loadUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            <CheckCircle className="h-4 w-4 mr-2" />
            Verified ({verifiedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-4 w-4 mr-2" />
            Rejected ({rejectedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending User Verifications</CardTitle>
              <CardDescription>Users awaiting verification approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending verifications</p>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{user.first_name} {user.last_name}</p>
                          {user.tier && (
                            <Badge variant="outline" className="capitalize">
                              {user.tier} Tier
                            </Badge>
                          )}
                          {user.is_update && (
                            <Badge variant="secondary" className="text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Update
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                        {user.parent_verification && (
                          <p className="text-xs text-blue-600 mt-1">
                            Updating previous verification
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedUser(user)
                            setDetailsOpen(true)
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
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
              <CardTitle>Verified Users</CardTitle>
              <CardDescription>Users with verified status</CardDescription>
            </CardHeader>
            <CardContent>
              {verifiedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No verified users</p>
              ) : (
                <div className="space-y-4">
                  {verifiedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{user.first_name} {user.last_name}</p>
                            {user.tier && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {user.tier}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {(() => {
                            const expirationStatus = getExpirationStatus(user)
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
                          const expirationStatus = getExpirationStatus(user)
                          if (expirationStatus?.status === 'expired') {
                            return <Badge variant="destructive">Expired</Badge>
                          } else if (expirationStatus?.status === 'expiring-soon') {
                            return <Badge className="bg-orange-500">Expiring Soon</Badge>
                          } else if (expirationStatus?.status === 'warning') {
                            return <Badge className="bg-yellow-500">Expires Soon</Badge>
                          }
                          return <Badge className="bg-green-500">Verified</Badge>
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
              <CardDescription>Users whose verification was rejected</CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No rejected verifications</p>
              ) : (
                <div className="space-y-4">
                  {rejectedUsers.map(user => (
                    <div key={user.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{user.first_name} {user.last_name}</p>
                              {user.tier && (
                                <Badge variant="outline" className="capitalize text-xs">
                                  {user.tier}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Badge variant="destructive">Rejected</Badge>
                      </div>
                      {user.rejection_reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Reason:</span> {user.rejection_reason}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Review user information and take action</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm">{selectedUser.first_name} {selectedUser.last_name}</p>
              </div>
              <div>
                <Label>Username</Label>
                <p className="text-sm">@{selectedUser.username}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm">{selectedUser.email}</p>
              </div>
              {selectedUser.phone && (
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm">{selectedUser.phone}</p>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <p className="text-sm capitalize">{selectedUser.verification_status}</p>
              </div>

              {/* Verification Validity Period */}
              {selectedUser.verified_at && (
                <div className="space-y-2">
                  <Label>Verification Period</Label>
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Verified on:</span>
                      <span className="font-medium">
                        {new Date(selectedUser.verified_at).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedUser.verification_expires_at && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Expires on:</span>
                          <span className="font-medium">
                            {new Date(selectedUser.verification_expires_at).toLocaleDateString()}
                          </span>
                        </div>
                        {(() => {
                          const expirationStatus = getExpirationStatus(selectedUser)
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
                                    User should be notified to submit updated documents
                                  </p>
                                )}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </>
                    )}
                    {selectedUser.document_validity_period && (
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-muted-foreground">Validity Period:</span>
                        <span className="font-medium">{selectedUser.document_validity_period} days</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedUser.tier && (
                <div>
                  <Label>User Tier</Label>
                  <Badge variant="outline" className="capitalize">
                    {selectedUser.tier} Tier
                  </Badge>
                </div>
              )}
              
              {/* Verification Type */}
              {selectedUser.is_update && (
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
              {selectedUser.parent_verification && (
                <div className="p-3 border rounded-lg bg-muted/30">
                  <Label>Previous Verification</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    This request is an update to a previous verification (ID: {selectedUser.parent_verification.substring(0, 8)}...)
                  </p>
                  <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                    View Previous Documents
                  </Button>
                </div>
              )}

              {/* Verification History */}
              {selectedUser.child_verifications && selectedUser.child_verifications.length > 0 && (
                <div className="p-3 border rounded-lg bg-muted/30">
                  <Label>Verification History</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    This verification has {selectedUser.child_verifications.length} update(s)
                  </p>
                  <div className="mt-2 space-y-1">
                    {selectedUser.child_verifications.map((child, index) => (
                      <div key={child.id} className="text-xs p-2 border rounded">
                        <p className="font-medium">Update #{index + 1}</p>
                        <p className="text-muted-foreground">
                          Status: <span className="capitalize">{child.verification_status}</span> | 
                          Submitted: {new Date(child.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedUser.verification_documents && (
                <div>
                  <Label>Current Verification Documents</Label>
                  <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Documents submitted for verification
                    </p>
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      <Download className="h-3 w-3 mr-1" />
                      View Documents
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedUser?.verification_status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRejectDialogOpen(true)
                  }}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedUser.id)}
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
