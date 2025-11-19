"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, Upload, AlertTriangle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type DocumentEntry = {
  name: string
  label?: string
  url: string
  path: string
}

interface VerificationStatus {
  status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired'
  verified_at?: string
  verification_expires_at?: string
  document_validity_period?: number
  rejection_reason?: string
  can_update: boolean
  documents?: DocumentEntry[]
}

export function UserVerificationStatus() {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [documents, setDocuments] = useState<File[]>([])
  const [updateReason, setUpdateReason] = useState("")
  const [expiresAt, setExpiresAt] = useState<string>("")
  const [validityPeriod, setValidityPeriod] = useState<string>("")
  const [expiryError, setExpiryError] = useState<string | null>(null)

  useEffect(() => {
    loadVerificationStatus()
  }, [])

  const loadVerificationStatus = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const userData = JSON.parse(localStorage.getItem('userData') || '{}')
      
      const response = await fetch(`http://localhost:8000/api/users/verification-status/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVerificationStatus(data)
      }
    } catch (error) {
      console.error('Error loading verification status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files))
    }
  }

  const handleSubmitUpdate = async () => {
    if (documents.length === 0) {
      alert('Please upload at least one document')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('authToken')
      const userData = JSON.parse(localStorage.getItem('userData') || '{}')
      
      const formData = new FormData()
      documents.forEach(doc => formData.append('documents', doc))
      if (documents[0]) {
        formData.append('id_document', documents[0])
      }
      if (updateReason.trim()) {
        formData.append('reason_for_update', updateReason.trim())
      }

      if (expiresAt && validityPeriod) {
        setExpiryError("Please provide either a specific expiration date or a validity period in days, not both.")
        return
      }

      setExpiryError(null)

      if (expiresAt) {
        formData.append('verification_expires_at', expiresAt)
      }
      if (validityPeriod) {
        formData.append('document_validity_period', validityPeriod)
      }

      const response = await fetch(`http://localhost:8000/api/users/verification/submit/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData
      })

      if (response.ok) {
        alert('Verification documents submitted successfully!')
        setUpdateDialogOpen(false)
        setDocuments([])
        setUpdateReason("")
        setExpiresAt("")
        setValidityPeriod("")
        await loadVerificationStatus()
      } else {
        alert('Failed to submit documents')
      }
    } catch (error) {
      console.error('Error submitting documents:', error)
      alert('Error submitting documents')
    } finally {
      setSubmitting(false)
      setExpiryError(null)
    }
  }

  const getExpirationStatus = () => {
    if (!verificationStatus?.verification_expires_at || verificationStatus.status !== 'verified') {
      return null
    }
    
    const expiresAt = new Date(verificationStatus.verification_expires_at)
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

  if (!verificationStatus) {
    return null
  }

  const expirationStatus = getExpirationStatus()

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>Your account verification information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {verificationStatus.status === 'verified' ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : verificationStatus.status === 'pending' ? (
                <Clock className="h-6 w-6 text-yellow-500" />
              ) : verificationStatus.status === 'rejected' ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : verificationStatus.status === 'expired' ? (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-gray-500" />
              )}
              <div>
                <p className="font-semibold">
                  {verificationStatus.status === 'verified' ? 'Verified Account' :
                   verificationStatus.status === 'pending' ? 'Verification Pending' :
                   verificationStatus.status === 'rejected' ? 'Verification Rejected' :
                   verificationStatus.status === 'expired' ? 'Verification Expired' :
                   'Not Verified'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {verificationStatus.status === 'verified' ? 'Your account is verified' :
                   verificationStatus.status === 'pending' ? 'Your verification is being reviewed' :
                   verificationStatus.status === 'rejected' ? 'Your verification was rejected' :
                   verificationStatus.status === 'expired' ? 'Your verification has expired' :
                   'Submit documents to get verified'}
                </p>
              </div>
            </div>
            <Badge className={
              verificationStatus.status === 'verified' ? 'bg-green-500' :
              verificationStatus.status === 'pending' ? 'bg-yellow-500' :
              verificationStatus.status === 'rejected' ? 'bg-red-500' :
              verificationStatus.status === 'expired' ? 'bg-red-500' :
              'bg-gray-500'
            }>
              {verificationStatus.status.charAt(0).toUpperCase() + verificationStatus.status.slice(1)}
            </Badge>
          </div>

          {/* Expiration Warning for Verified Status */}
          {verificationStatus.status === 'verified' && expirationStatus && (
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
                  ? `Your verification expired ${expirationStatus.days} days ago. Please update your documents immediately.`
                  : `Your verification expires in ${expirationStatus.days} days. ${expirationStatus.status !== 'valid' ? 'Please update your documents soon.' : ''}`
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Verification Period */}
          {verificationStatus.verified_at && (
            <div className="p-4 border rounded-lg space-y-2">
              <Label className="text-sm font-medium">Verification Period</Label>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verified on:</span>
                  <span className="font-medium">
                    {new Date(verificationStatus.verified_at).toLocaleDateString()}
                  </span>
                </div>
                {verificationStatus.verification_expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires on:</span>
                    <span className="font-medium">
                      {new Date(verificationStatus.verification_expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {verificationStatus.document_validity_period && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Validity Period:</span>
                    <span className="font-medium">{verificationStatus.document_validity_period} days</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {verificationStatus.status === 'rejected' && verificationStatus.rejection_reason && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Rejection Reason</AlertTitle>
              <AlertDescription>{verificationStatus.rejection_reason}</AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          {verificationStatus.can_update && (
            <Button 
              onClick={() => setUpdateDialogOpen(true)}
              className="w-full"
              variant={expirationStatus?.status === 'expired' || expirationStatus?.status === 'expiring-soon' ? 'destructive' : 'default'}
            >
              <Upload className="h-4 w-4 mr-2" />
              {verificationStatus.status === 'unverified' ? 'Submit Verification Documents' :
               verificationStatus.status === 'expired' ? 'Renew Verification - Urgent' :
               expirationStatus?.status === 'expiring-soon' ? 'Update Documents - Expiring Soon' :
               'Update Verification Documents'}
            </Button>
          )}

          {verificationStatus.documents && verificationStatus.documents.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Submitted Documents</Label>
              <ul className="space-y-1 text-sm">
                {verificationStatus.documents.map((doc, index) => (
                  <li key={`${doc.path}-${index}`} className="flex items-center justify-between gap-3 rounded border px-3 py-2">
                    <span className="truncate capitalize">{doc.label || doc.name}</span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {verificationStatus.status === 'pending' && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your verification is being reviewed by our team. You'll be notified once it's processed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Documents Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {verificationStatus.status === 'unverified' ? 'Submit Verification Documents' : 'Update Verification Documents'}
            </DialogTitle>
            <DialogDescription>
              {verificationStatus.status === 'verified' 
                ? 'Updating your documents will create a new verification request. Your current verified status will remain until the new request is approved.'
                : 'Upload your identification documents for verification.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="documents">Verification Documents *</Label>
              <Input
                id="documents"
                type="file"
                onChange={handleFileChange}
                multiple
                accept="image/*,.pdf"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload ID, passport, or other official documents (PDF or images)
              </p>
              {documents.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">{documents.length} file(s) selected:</p>
                  <ul className="text-xs text-muted-foreground">
                    {documents.map((file, index) => (
                      <li key={index}>• {file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="verification-expires-at">Valid Until (Date)</Label>
                <Input
                  id="verification-expires-at"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pick the exact expiry date printed on your document.
                </p>
              </div>
              <div>
                <Label htmlFor="document-validity-period">Or Validity Period (Days)</Label>
                <Input
                  id="document-validity-period"
                  type="number"
                  min={1}
                  value={validityPeriod}
                  onChange={(e) => setValidityPeriod(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to calculate from the "Valid Until" date.
                </p>
              </div>
            </div>

            {expiryError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Invalid Expiration Input</AlertTitle>
                <AlertDescription>{expiryError}</AlertDescription>
              </Alert>
            )}

            {verificationStatus.status !== 'unverified' && (
              <div>
                <Label htmlFor="reason">Reason for Update (Optional)</Label>
                <Textarea
                  id="reason"
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  placeholder="E.g., Documents expiring, updated information, etc."
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
            <Button onClick={handleSubmitUpdate} disabled={submitting || documents.length === 0}>
              {submitting ? 'Submitting...' : 'Submit Documents'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
