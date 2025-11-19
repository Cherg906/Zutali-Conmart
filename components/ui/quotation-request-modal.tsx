"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/lib/language-context"
import { Calculator, MapPin, MessageSquare, Upload, AlertCircle, BadgeCheck } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Product {
  id: string
  name: string
  name_amharic?: string
  price?: number
  unit: string
  min_order_quantity?: number
  delivery_available?: boolean
  owner: {
    business_name: string
    business_phone?: string
  }
}

interface QuotationRequestModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onSuccess?: (message: string) => void
}

export function QuotationRequestModal({ product, isOpen, onClose, onSuccess }: QuotationRequestModalProps) {
  const [quantity, setQuantity] = useState(product.min_order_quantity || 1)
  const [message, setMessage] = useState("")
  const [deliveryLocation, setDeliveryLocation] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t, language } = useLanguage()
  const { toast } = useToast()

  useEffect(() => {
    setQuantity(product.min_order_quantity || 1)
    setDeliveryLocation("")
    setMessage("")
    setSelectedFile(null)
    setError(null)
  }, [product.min_order_quantity, product.id])

  // Get user data from localStorage
  const userData = typeof window !== 'undefined' ? localStorage.getItem('userData') : null
  const user = userData ? JSON.parse(userData) : null
  const userTier = user?.tier || 'free'
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(language === "en" ? "File size must be less than 5MB" : "የፋይሉ መጠን ከ 5 ሜጋ ባይት በታች መሆን አለበት")
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Check if user is logged in
    if (!authToken) {
      toast({
        title: language === "en" ? "Login Required" : "መግባት ያስፈልጋል",
        description: language === "en" 
          ? "Please login to request quotations" 
          : "ጥያቄ ለመጠየቅ እባክዎ ይግቡ",
        variant: "destructive",
      })
      onClose()
      window.location.href = '/login?type=user&returnTo=' + encodeURIComponent(window.location.pathname)
      return
    }
    
    // Tier-based validation
    if (userTier === 'free') {
      toast({
        title: language === "en" ? "Upgrade Required" : "ደረጃ ማሳደግ ያስፈልጋል",
        description: language === "en"
          ? "Please upgrade to a paid plan to request quotations"
          : "የዋጋ ጥያቄ ለመጠየቅ የክፍያ አቅኚ እቅድ ያስፈልጋል",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('product_id', product.id)
      formData.append('quantity', quantity.toString())
      if (message) formData.append('message', message)
      if (deliveryLocation) formData.append('delivery_location', deliveryLocation)
      if (selectedFile) formData.append('request_document', selectedFile)
      
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      })

      const text = await response.text()
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('Failed to parse quotation response:', parseError)
      }

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: language === "en" ? "Session Expired" : "የመግቢያ ጊዜው አልቋል",
            description: language === "en" 
              ? "Your session has expired. Please login again." 
              : "የእርስዎ መግቢያ ጊዜ አልቋል። እባክዎ እንደገና ይግቡ።",
            variant: "destructive",
          })
          window.location.href = '/login?type=user'
          return
        }

        const errorCode = data?.error || data?.code
        const messageFromServer = data?.message || data?.detail || data?.error || 'Failed to send quotation request'

        if (errorCode === 'upgrade_required' || errorCode === 'quota_exceeded') {
          toast({
            title: language === "en" ? "Upgrade Required" : "ደረጃ ማሳደግ ያስፈልጋል",
            description: messageFromServer,
            variant: "destructive",
          })
          onClose()
          return
        }

        if (errorCode === 'verification_required') {
          toast({
            title: language === "en" ? "Verification Needed" : "ማረጋገጫ ያስፈልጋል",
            description: messageFromServer,
            variant: "destructive",
          })
          onClose()
          return
        }

        setError(messageFromServer)
        return
      }

      const successMessage = language === "en"
        ? "Your quotation request has been submitted successfully"
        : "የዋጋ ጥያቄዎ በተሳካ ሁኔታ ቀርቧል"

      if (onSuccess) {
        onSuccess(successMessage)
      } else {
        toast({
          title: language === "en" ? "Success!" : "ተሳክቷል!",
          description: successMessage,
        })
      }
      
      // Reset form
      setQuantity(product.min_order_quantity || 1)
      setMessage("")
      setDeliveryLocation("")
      setSelectedFile(null)
      
      onClose()
      
    } catch (err) {
      console.error('Error submitting quotation:', err)
      setError(
        language === "en"
          ? err instanceof Error ? err.message : 'Failed to submit quotation request'
          : 'የዋጋ ጥያቄ ለመላክ አልተቻለም'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const estimatedTotal = product.price ? product.price * quantity : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {language === "en" ? "Request Quotation" : "ጥያቄ ይጠይቁ"}
              </DialogTitle>
              <DialogDescription>
                {language === "en" 
                  ? `Get a custom quote for ${product.name} from ${product.owner.business_name}`
                  : `ከ${product.owner.business_name} ለ${product.name_amharic || product.name} ብጁ ዋጋ ያግኙ`
                }
              </DialogDescription>
            </div>
            {userTier !== 'free' && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                userTier === 'premium' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                <BadgeCheck className="h-3.5 w-3.5" />
                {userTier === 'premium' 
                  ? language === 'en' ? 'Premium' : 'ፕሪሚየም' 
                  : language === 'en' ? 'Standard' : 'መደበኛ'}
              </span>
            )}
          </div>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{language === "en" ? "Error" : "ስህተት"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="font-medium">{language === "en" ? product.name : (product.name_amharic || product.name)}</h4>
            <p className="text-sm text-muted-foreground">
              {language === "en" ? "Supplier" : "አቅራቢ"}: {product.owner.business_name}
            </p>
            {product.price && (
              <p className="text-sm text-muted-foreground">
                {language === "en" ? "Listed Price" : "የተዘረዘረ ዋጋ"}: {product.price.toLocaleString()} ETB/{product.unit}
              </p>
            )}
          </div>

          {/* Tier Notice */}
          {userTier === 'standard' && (
            <Alert className="bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-700" />
              <AlertTitle className="text-blue-800">
                {language === "en" ? "Standard Plan" : "መደበኛ እቅድ"}
              </AlertTitle>
              <AlertDescription className="text-blue-700">
                {language === "en"
                  ? "Standard Verified users can request up to 10 quotations each month."
                  : "የመደበኛ ደረጃ ተጠቃሚዎች በወር እስከ 10 የዋጋ ጥያቄዎች መጠየቅ ይችላሉ።"}
              </AlertDescription>
            </Alert>
          )}

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity">
              {language === "en" ? "Quantity" : "መጠን"} ({product.unit})
            </Label>
            <Input
              id="quantity"
              type="number"
              min={product.min_order_quantity || 1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="mt-2"
              required
            />
            {product.min_order_quantity && (
              <p className="text-xs text-muted-foreground mt-1">
                {language === "en" ? "Minimum order" : "ዝቅተኛ ትዕዛዝ"}: {product.min_order_quantity} {product.unit}
              </p>
            )}
          </div>

          {/* Estimated Total */}
          {estimatedTotal && (
            <div className="rounded-lg border bg-primary/5 p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {language === "en" ? "Estimated Total" : "የተገመተ ጠቅላላ"}:
                </span>
                <span className="text-lg font-bold text-primary">
                  {estimatedTotal.toLocaleString()} ETB
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "en" ? "Final price may vary based on quotation" : "የመጨረሻ ዋጋ በጥያቄ ላይ በመመስረት ሊለያይ ይችላል"}
              </p>
            </div>
          )}

          {/* Delivery Location */}
          {product.delivery_available && (
            <div>
              <Label htmlFor="delivery-location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {language === "en" ? "Delivery Location" : "የማድረሻ ቦታ"}
              </Label>
              <Input
                id="delivery-location"
                placeholder={language === "en" ? "Enter delivery address..." : "የማድረሻ አድራሻ ያስገቡ..."}
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Message */}
          <div>
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {language === "en" ? "Additional Message" : "ተጨማሪ መልእክት"}
              <span className="text-muted-foreground text-xs">
                ({language === "en" ? "Optional" : "አማራጭ"})
              </span>
            </Label>
            <Textarea
              id="message"
              placeholder={language === "en" 
                ? "Any specific requirements or questions..." 
                : "ማንኛውም ልዩ መስፈርቶች ወይም ጥያቄዎች..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Document Upload */}
          <div>
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {language === "en" ? "Attach Document" : "ሰነድ አያያዝ"}
              <span className="text-muted-foreground text-xs">
                ({language === "en" ? "Optional" : "አማራጭ"})
              </span>
            </Label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="hidden"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 justify-start"
                disabled={isSubmitting}
              >
                {selectedFile 
                  ? selectedFile.name
                  : language === "en" 
                    ? "Choose file..." 
                    : "ፋይል ይምረጡ..."}
              </Button>
              {selectedFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={isSubmitting}
                >
                  {language === "en" ? "Remove" : "አስወግድ"}
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {language === "en" 
                ? "PDF, Word, Excel, or images (max 5MB)" 
                : "PDF፣ Word፣ Excel ወይም ምስሎች (ከ5MB በታች)"}
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <div className="text-xs text-muted-foreground text-left w-full sm:text-right">
              {language === "en"
                ? "By submitting, you agree to our Terms of Service and Privacy Policy"
                : "በማስገባት የኛን የአገልግሎት ውሎች እና የግላዊነት ፖሊሲ ተቀብለዋል"}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {language === "en" ? "Cancel" : "ሰርዝ"}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full sm:w-auto"
              >
                {isSubmitting 
                  ? (language === "en" ? "Sending..." : "በመላክ ላይ...") 
                  : (language === "en" ? "Send Quotation Request" : "የዋጋ ጥያቄ ላክ")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
