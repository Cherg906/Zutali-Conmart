// ... existing imports ...
import { useChapaPayment } from "@/lib/chapa-payment"
import { useSession } from "next-auth/react"

// ... existing interfaces ...

export function SubscriptionPayment({ 
  userType, 
  currentTier, 
  onPaymentSuccess, 
  onPaymentError 
}: SubscriptionPaymentProps) {
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const [loading, setLoading] = useState<string | null>(null)
  
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
      const user = session?.user
      const response = await initializePayment({
        amount: tier.price.toString(),
        currency: tier.currency,
        email: user?.email || 'user@example.com',
        first_name: user?.name?.split(' ')[0] || 'User',
        last_name: user?.name?.split(' ')[1] || 'Customer',
        tx_ref: `zutali_${Date.now()}`,
        callback_url: `${window.location.origin}/api/payment/verify`,
        return_url: `${window.location.origin}/dashboard/subscription?status=success`,
        title: `Zutali Conmart - ${tier.name} Subscription`,
        description: `${tier.name} subscription for ${userType} (${tier.price} ${tier.currency})`,
        meta: {
          user_id: user?.id,
          tier_id: tier.id,
          user_type: userType
        }
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