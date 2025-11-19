"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle, XCircle, Clock, Upload, AlertTriangle, RefreshCw, BadgeCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/app/context/auth-context"

const DJANGO_BASE_URL = process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8000"

type DocumentEntry = {
  name: string
  label?: string
  url: string
  path: string
}

interface VerificationRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  submitted_at: string
  approved_at?: string
  verification_expires_at?: string
  document_validity_period?: number
  is_update: boolean
  documents?: DocumentEntry[]
}

interface ProductOwnerStatus {
  product_owner_id: string
  business_name: string
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired'
  current_verification?: VerificationRequest
  pending_update?: VerificationRequest
  can_update: boolean
  tier?: string
  documents?: DocumentEntry[]
}

interface ProductOwnerVerificationStatusProps {
  onStatusChange?: (status: ProductOwnerStatus | null) => void
}

export function ProductOwnerVerificationStatus({ onStatusChange }: ProductOwnerVerificationStatusProps) {
  const [status, setStatus] = useState<ProductOwnerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tradeLicense, setTradeLicense] = useState<File | null>(null)
  const [tradeRegistration, setTradeRegistration] = useState<File | null>(null)
  const [vatRegistration, setVatRegistration] = useState<File | null>(null)
  const [tinCertificate, setTinCertificate] = useState<File | null>(null)
  const [updateReason, setUpdateReason] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [validityPeriod, setValidityPeriod] = useState("")
  const [expiryError, setExpiryError] = useState<string | null>(null)
  const { token, refreshProfile } = useAuth()

  const buildAuthHeader = useCallback(() => {
    if (!token) return null
    if (token.startsWith('Token ') || token.startsWith('Bearer ')) {
      return token
    }
    return `Token ${token}`
  }, [token])

  const loadVerificationStatus = useCallback(async () => {
    try {
      const authHeader = buildAuthHeader()
      if (!authHeader) {
        setStatus(null)
        setError('Authentication required. Please sign in again.')
        return
      }

      const response = await fetch(`/api/product-owner/verification-status?t=${Date.now()}`, {
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
        setStatus(data)
        onStatusChange?.(data)
        setError(null)
      } else if (response.status === 401) {
        setStatus(null)
        onStatusChange?.(null)
        setError('Session expired. Please log in again to view your verification status.')
      }
    } catch (error) {
      console.error('Error loading verification status:', error)
      setError('Unable to load verification status right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [buildAuthHeader])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setStatus(null)
      onStatusChange?.(null)
      setError('Authentication required. Please sign in again.')
      return
    }
    setLoading(true)
    void loadVerificationStatus()
  }, [token, loadVerificationStatus])

  const handleSingleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.files?.[0] ?? null)
  }

  const handleSubmitUpdate = async () => {
    if (!tradeLicense || !tradeRegistration || !vatRegistration || !tinCertificate) {
      alert('Please upload all required documents (trade license, trade registration, VAT registration, and TIN certificate).')
      return
    }

    const token = localStorage.getItem('authToken')
    if (!token) {
      alert('Authentication token missing. Please sign in again and retry.')
      return
    }

    if (expiresAt && validityPeriod) {
      setExpiryError("Please provide either a specific expiration date or a validity period in days, not both.")
      return
    }

    if (!expiresAt && !validityPeriod) {
      setExpiryError("Please provide the trade license expiration date or the validity period in days.")
      return
    }

    setExpiryError(null)

    try {
      setSubmitting(true)
      const formData = new FormData()
      formData.append('trade_license', tradeLicense)
      formData.append('trade_registration', tradeRegistration)
      formData.append('vat_registration', vatRegistration)
      formData.append('tin_certificate', tinCertificate)
      if (updateReason.trim()) {
        formData.append('reason_for_update', updateReason.trim())
      }

      if (expiresAt) {
        formData.append('verification_expires_at', expiresAt)
      }
      if (validityPeriod) {
        formData.append('document_validity_period', validityPeriod)
      }

      const authHeader = buildAuthHeader()
      if (!authHeader) {
        alert('Authentication token missing. Please sign in again and retry.')
        setSubmitting(false)
        return
      }

      const response = await fetch(`/api/product-owner/verification-update/${status?.product_owner_id}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
        },
        body: formData
      })

      if (response.ok) {
        alert('Verification documents submitted successfully!')
        setUpdateDialogOpen(false)
        setTradeLicense(null)
        setTradeRegistration(null)
        setVatRegistration(null)
        setTinCertificate(null)
        setUpdateReason("")
        setExpiresAt("")
        setValidityPeriod("")
        setExpiryError(null)
        await refreshProfile()
        await loadVerificationStatus()
      } else {
        const errorPayload = await response.json().catch(() => ({}))
        alert(errorPayload?.error || 'Failed to submit documents')
      }
    } catch (error) {
      console.error('Error submitting documents:', error)
      alert('Error submitting documents')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    setUpdateDialogOpen(open)
    if (!open) {
      setTradeLicense(null)
      setTradeRegistration(null)
      setVatRegistration(null)
      setTinCertificate(null)
      setUpdateReason("")
      setExpiresAt("")
      setValidityPeriod("")
      setExpiryError(null)
    }
  }

  const getExpirationStatus = () => {
    if (!status?.current_verification?.verification_expires_at || status.verification_status !== 'verified') {
      return null
    }
    
    const expiresAt = new Date(status.current_verification.verification_expires_at)
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Owner Verification</CardTitle>
          <CardDescription>Sign in to view your verification progress</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Verification Status Unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  const expirationStatus = getExpirationStatus()

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Owner Verification</CardTitle>
              <CardDescription>Your business verification status</CardDescription>
            </div>
            {status.tier && (
              <Badge variant="outline" className="capitalize">
                {status.tier} Tier
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {status.verification_status === 'verified' ? (
                <BadgeCheck className="h-6 w-6 text-green-500" />
              ) : status.verification_status === 'pending' ? (
                <Clock className="h-6 w-6 text-yellow-500" />
              ) : status.verification_status === 'rejected' ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : status.verification_status === 'expired' ? (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-gray-500" />
              )}
              <div>
                <p className="font-semibold">
                  {status.verification_status === 'verified' ? 'Verified Product Owner' :
                   status.verification_status === 'pending' ? 'Verification Pending' :
                   status.verification_status === 'rejected' ? 'Verification Rejected' :
                   status.verification_status === 'expired' ? 'Verification Expired' :
                   'Not Verified'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status.business_name}
                </p>
              </div>
            </div>
            <Badge className={
              status.verification_status === 'verified' ? 'bg-green-500' :
              status.verification_status === 'pending' ? 'bg-yellow-500' :
              status.verification_status === 'rejected' ? 'bg-red-500' :
              status.verification_status === 'expired' ? 'bg-red-500' :
              'bg-gray-500'
            }>
              {status.verification_status.charAt(0).toUpperCase() + status.verification_status.slice(1)}
            </Badge>
          </div>

          {/* Pending Update Notice */}
          {status.pending_update && (
            <Alert className="border-blue-500 bg-blue-50">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Update Request Pending</AlertTitle>
              <AlertDescription className="text-blue-800">
                You have a document update request being reviewed. Submitted on {new Date(status.pending_update.submitted_at).toLocaleDateString()}.
              </AlertDescription>
            </Alert>
          )}

          {/* Submitted Documents */}
          {status.current_verification?.documents && status.current_verification.documents.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Submitted Documents</Label>
              <ul className="space-y-1 text-sm">
                {status.current_verification.documents.map((doc, index) => {
                  const relativePath = doc.url || doc.path
                  const resolvedUrl = relativePath?.startsWith('http')
                    ? relativePath
                    : `${DJANGO_BASE_URL.replace(/\/$/, '')}/${(relativePath ?? '').replace(/^\//, '')}`

                  return (
                    <li key={`${doc.path}-${index}`} className="flex items-center justify-between gap-3 rounded border px-3 py-2">
                      <span className="truncate capitalize">{doc.label || doc.name}</span>
                      <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        View
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Expiration Warning for Verified Status */}
          {status.verification_status === 'verified' && expirationStatus && (
            <Alert className={
              expirationStatus.status === 'expired' ? 'border-red-500 bg-red-50' :
              expirationStatus.status === 'expiring-soon' ? 'border-orange-500 bg-orange-50' :
              expirationStatus.status === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-green-500 bg-green-50'
            }>
              <AlertTriangle className={`h-4 w-4 ${
                expirationStatus.status === 'expired' ? 'text-red-600' :
                expirationStatus.status === 'expiring-soon' ? 'text-orange-600' :
                expirationStatus.status === 'warning' ? 'text-yellow-600' :
                'text-green-600'
              }`} />
              <AlertTitle className={
                expirationStatus.status === 'expired' ? 'text-red-900' :
                expirationStatus.status === 'expiring-soon' ? 'text-orange-900' :
                expirationStatus.status === 'warning' ? 'text-yellow-900' :
                'text-green-900'
              }>
                {expirationStatus.status === 'expired' ? '⚠️ Verification Expired' :
                 expirationStatus.status === 'expiring-soon' ? '⚠️ Verification Expiring Soon' :
                 expirationStatus.status === 'warning' ? '⏰ Verification Expires Soon' :
                 '✓ Verification Valid'}
              </AlertTitle>
              <AlertDescription className={
                expirationStatus.status === 'expired' ? 'text-red-800' :
                expirationStatus.status === 'expiring-soon' ? 'text-orange-800' :
                expirationStatus.status === 'warning' ? 'text-yellow-800' :
                'text-green-800'
              }>
                {expirationStatus.status === 'expired' 
                  ? `Your verification expired ${expirationStatus.days} days ago. Please update your documents immediately to maintain your verified status.`
                  : `Your verification expires in ${expirationStatus.days} days. ${expirationStatus.status !== 'valid' ? 'Please update your documents soon to avoid interruption.' : ''}`
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Verification Period */}
          {status.current_verification?.approved_at && (
            <div className="p-4 border rounded-lg space-y-2">
              <Label className="text-sm font-medium">Verification Period</Label>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved on:</span>
                  <span className="font-medium">
                    {new Date(status.current_verification.approved_at).toLocaleDateString()}
                  </span>
                </div>
                {status.current_verification.verification_expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires on:</span>
                    <span className="font-medium">
                      {new Date(status.current_verification.verification_expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {status.current_verification.document_validity_period && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Validity Period:</span>
                    <span className="font-medium">{status.current_verification.document_validity_period} days</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {status.verification_status === 'rejected' && status.current_verification?.rejection_reason && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Rejection Reason</AlertTitle>
              <AlertDescription>{status.current_verification.rejection_reason}</AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          {status.can_update && !status.pending_update && (
            <Button 
              onClick={() => setUpdateDialogOpen(true)}
              className="w-full"
              variant={expirationStatus?.status === 'expired' || expirationStatus?.status === 'expiring-soon' ? 'destructive' : 'default'}
            >
              <Upload className="h-4 w-4 mr-2" />
              {status.verification_status === 'unverified' ? 'Submit Verification Documents' :
               status.verification_status === 'expired' ? 'Renew Verification - Urgent' :
               expirationStatus?.status === 'expiring-soon' ? 'Update Documents - Expiring Soon' :
               'Update Verification Documents'}
            </Button>
          )}

          {status.verification_status === 'pending' && !status.pending_update && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your verification is being reviewed by our team. You'll be notified once it's processed.
              </p>
            </div>
          )}

          {/* Benefits of Verification */}
          {status.verification_status === 'unverified' && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Benefits of Verification:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Display "Verified Product Owner" badge</li>
                <li>• Increase customer trust</li>
                <li>• Priority in search results</li>
                <li>• Access to premium features</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Documents Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {status.verification_status === 'unverified' ? 'Submit Verification Documents' : 'Update Verification Documents'}
            </DialogTitle>
            <DialogDescription>
              {status.verification_status === 'verified' 
                ? 'Updating your documents will create a new verification request. Your current verified status will remain until the new request is approved.'
                : 'Upload the required business documents. Provide the trade license expiration or validity period so our team can verify it.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="trade-license-upload">Trade License *</Label>
                <Input
                  id="trade-license-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleSingleFileChange(setTradeLicense)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload the most recent copy of your trade license.
                </p>
                {tradeLicense && (
                  <p className="text-xs text-primary mt-1">Selected: {tradeLicense.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="trade-registration-upload">Trade Registration *</Label>
                <Input
                  id="trade-registration-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleSingleFileChange(setTradeRegistration)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Provide your official trade registration document.
                </p>
                {tradeRegistration && (
                  <p className="text-xs text-primary mt-1">Selected: {tradeRegistration.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vat-registration-upload">VAT Registration *</Label>
                <Input
                  id="vat-registration-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleSingleFileChange(setVatRegistration)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload your VAT registration certificate.
                </p>
                {vatRegistration && (
                  <p className="text-xs text-primary mt-1">Selected: {vatRegistration.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="tin-certificate-upload">TIN Certificate *</Label>
                <Input
                  id="tin-certificate-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleSingleFileChange(setTinCertificate)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Provide your Tax Identification Number certificate.
                </p>
                {tinCertificate && (
                  <p className="text-xs text-primary mt-1">Selected: {tinCertificate.name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po-verification-expires-at">Trade License Valid Until (Date)</Label>
                <Input
                  id="po-verification-expires-at"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the expiration date printed on your trade license, if available.
                </p>
              </div>
              <div>
                <Label htmlFor="po-document-validity-period">Or Trade License Validity (Days)</Label>
                <Input
                  id="po-document-validity-period"
                  type="number"
                  min={1}
                  value={validityPeriod}
                  onChange={(e) => setValidityPeriod(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Provide the number of days the trade license remains valid if no exact expiration date is printed.
                </p>
              </div>
            </div>

            {expiryError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Invalid Expiration Input</AlertTitle>
                <AlertDescription>{expiryError}</AlertDescription>
              </Alert>
            )}

            {status.verification_status !== 'unverified' && (
              <div>
                <Label htmlFor="reason">Reason for Update (Optional)</Label>
                <Textarea
                  id="reason"
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  placeholder="E.g., Documents expiring, updated business information, change of ownership, etc."
                  rows={3}
                  className="mt-2"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUpdate}
              disabled={
                submitting ||
                !tradeLicense ||
                !tradeRegistration ||
                !vatRegistration ||
                !tinCertificate
              }
            >
              {submitting ? 'Submitting...' : 'Submit Documents'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
