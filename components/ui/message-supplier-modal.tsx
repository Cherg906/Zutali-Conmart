"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/lib/language-context"
import { MessageSquare, Building2, Phone, Mail } from "lucide-react"

interface Supplier {
  id: string
  business_name: string
  business_phone?: string
  business_email?: string
  verification_status?: string
}

interface MessageSupplierModalProps {
  supplier: Supplier
  productName?: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function MessageSupplierModal({ supplier, productName, isOpen, onClose, onSuccess }: MessageSupplierModalProps) {
  const [subject, setSubject] = useState(productName ? `Inquiry about ${productName}` : "Product Inquiry")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t, language } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user is logged in
    const authToken = localStorage.getItem('authToken')
    if (!authToken) {
      alert(language === "en" ? "Please login to send messages" : "መልእክት ለመላክ እባክዎ ይግቡ")
      onClose()
      window.location.href = '/login?type=user'
      return
    }

    if (!message.trim()) {
      alert(language === "en" ? "Please enter a message" : "እባክዎ መልእክት ያስገቡ")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          product_owner_id: supplier.id,
          message: message.trim(),
          subject: subject.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          alert(language === "en" ? "Please login to send messages" : "መልእክት ለመላክ እባክዎ ይግቡ")
          window.location.href = '/login?type=user'
          return
        }
        throw new Error(data.error || 'Failed to send message')
      }

      alert(language === "en" ? "Message sent successfully!" : "መልእክት በተሳካ ሁኔታ ተልኳል!")
      onSuccess?.()
      onClose()
      
      // Reset form
      setSubject(productName ? `Inquiry about ${productName}` : "Product Inquiry")
      setMessage("")
      
    } catch (error) {
      console.error('Message sending error:', error)
      alert(language === "en" ? "Failed to send message. Please try again." : "መልእክት መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {language === "en" ? "Message Supplier" : "አቅራቢን መልእክት ላክ"}
          </DialogTitle>
          <DialogDescription>
            {language === "en" 
              ? `Send a direct message to ${supplier.business_name}`
              : `ወደ ${supplier.business_name} ቀጥተኛ መልእክት ላክ`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supplier Info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{supplier.business_name}</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {supplier.business_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{supplier.business_phone}</span>
                    </div>
                  )}
                  {supplier.business_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{supplier.business_email}</span>
                    </div>
                  )}
                  {supplier.verification_status === 'verified' && (
                    <div className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      ✓ {language === "en" ? "Verified Supplier" : "የተረጋገጠ አቅራቢ"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">
              {language === "en" ? "Subject" : "ርዕስ"}
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2"
              required
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">
              {language === "en" ? "Message" : "መልእክት"} *
            </Label>
            <Textarea
              id="message"
              placeholder={language === "en" 
                ? "Write your message to the supplier..." 
                : "ለአቅራቢው መልእክትዎን ይጻፉ..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2"
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {language === "en" 
                ? "Be specific about your requirements, quantities, and delivery needs."
                : "ስለ መስፈርቶችዎ፣ መጠኖች እና የማድረሻ ፍላጎቶች ግልጽ ይሁኑ።"
              }
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {language === "en" ? "Cancel" : "ሰርዝ"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (language === "en" ? "Sending..." : "በመላክ ላይ...") 
                : (language === "en" ? "Send Message" : "መልእክት ላክ")
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
