// app/payment/success/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language-context'
import { useAuth } from '@/app/context/auth-context'

export default function PaymentSuccess() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, language } = useLanguage()
  const { refreshProfile } = useAuth()
  const [verifying, setVerifying] = useState(true)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  useEffect(() => {
    const status = searchParams.get('status')
    const txRef = searchParams.get('tx_ref')

    if (status !== 'success' || !txRef) {
      setVerifying(false)
      router.push('/')
      return
    }
    const verifyPayment = async () => {
      try {
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tx_ref: txRef, status }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || data?.message || 'Verification failed')
        }

        await refreshProfile()
        setVerificationError(null)
      } catch (error: any) {
        console.error('Payment verification error:', error)
        setVerificationError(error?.message || 'Unable to confirm payment. Please contact support.')
      } finally {
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [router, searchParams])

  return (
    <div className="container flex h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center space-y-6 text-center">
        {verifying ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {language === 'am' ? 'ክፍያው እየተረጋገጠ ነው...' : 'Verifying your payment...'}
            </p>
          </>
        ) : (
          <>
            <div className={`rounded-full p-4 ${verificationError ? 'bg-red-100' : 'bg-green-100'}`}>
              <svg
                className={`h-12 w-12 ${verificationError ? 'text-red-600' : 'text-green-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={verificationError ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'}
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">
              {verificationError
                ? language === 'am'
                  ? 'ክፍያ ማረጋገጥ አልተሳካም'
                  : 'Payment Verification Failed'
                : language === 'am'
                ? 'ክፍያው በተሳካ ሁኔታ ተጠናቋል!'
                : 'Payment Successful!'}
            </h1>
            <p className="text-muted-foreground">
              {verificationError
                ? verificationError
                : language === 'am'
                ? 'የእርስዎ ምዝገባ በተሳካ ሁኔታ ተረጋግጧል። አሁን ሁሉንም ባህሪያት መጠቀም ትችላለህ።'
                : 'Your subscription has been verified. You can now access all premium features.'}
            </p>
            <div className="flex w-full gap-4">
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                {language === 'am' ? 'ወደ ዳሽቦርድ ይሂዱ' : 'Go to Dashboard'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}