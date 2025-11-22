// ... existing imports ...
import { useState } from "react"
import { useChapaPayment } from "@/lib/chapa-payment"
import { useLanguage } from "@/lib/language-context"

// Interface definitions
interface SubscriptionTier {
  id: string
  name: string
  price: number
  currency: string
  features: string[]
  popular?: boolean
}

interface SubscriptionPaymentProps {
  userType: 'product_owner' | 'user'
  currentTier?: string
  onPaymentSuccess: (result: {
    tier: string
    amount: number
    currency: string
    status: string
  }) => void
  onPaymentError: (error: {
    message: string
    error?: any
  }) => void
}

export function SubscriptionPayment({ 
  userType, 
  currentTier, 
  onPaymentSuccess, 
  onPaymentError 
}: SubscriptionPaymentProps) {
  const { t, language } = useLanguage()
  const [loading, setLoading] = useState<string | null>(null)
  
  // Get user data from localStorage (same pattern as other components)
  const getUserData = () => {
    if (typeof window !== 'undefined') {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}')
      return userData
    }
    return {}
  }
  
  const user = getUserData()
  
  const { initializePayment } = useChapaPayment(
    process.env.NEXT_PUBLIC_CHAPA_PUBLIC_KEY || '',
    process.env.NODE_ENV !== 'production'
  )

  // ... existing code ...

  const handlePayment = async (tier: SubscriptionTier) => {
    if (tier.price === 0) {
      // Handle free tier selection
      onPaymentSuccess({
        tier: tier.id,
        amount: 0,
        currency: tier.currency,
        status: 'completed'
      })
      return
    }

    setLoading(tier.id)

    try {
      const userData = getUserData()
      const response = await initializePayment({
        amount: tier.price,
        currency: tier.currency,
        email: userData.email || 'user@example.com',
        first_name: userData.first_name || userData.username || 'User',
        last_name: userData.last_name || 'Customer',
        callback_url: `${window.location.origin}/api/payment/verify`,
        return_url: `${window.location.origin}/dashboard/subscription?status=success`,
        title: `Zutali Conmart - ${tier.name} Subscription`,
        description: `${tier.name} subscription for ${userType} (${tier.price} ${tier.currency})`
      })

      if (response.success) {
        // Redirect will happen automatically
        console.log('Redirecting to Chapa payment...')
      } else {
        throw new Error(response.error || 'Payment initialization failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      onPaymentError({
        message: error instanceof Error ? error.message : 'Payment failed. Please try again.',
        error
      })
      setLoading(null)
    }
  }

  // ... rest of the component ...
}