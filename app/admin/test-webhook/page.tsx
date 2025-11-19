// app/admin/test-webhook/page.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestWebhookPage() {
  const [payload, setPayload] = useState(JSON.stringify({
    event: 'charge.success',
    data: {
      tx_ref: 'test_' + Date.now(),
      amount: '100',
      currency: 'ETB',
      meta: {
        user_id: 'test_user_id',
        tier_id: 'premium_user',
        user_type: 'user'
      }
    }
  }, null, 2))

  const testWebhook = async () => {
    try {
      const response = await fetch('/api/payment/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-chapa-signature-256': 'test_signature' // In production, this should be a valid HMAC signature
        },
        body: payload
      })

      const result = await response.json()
      alert(`Webhook test ${response.ok ? 'succeeded' : 'failed'}: ${JSON.stringify(result, null, 2)}`)
    } catch (error) {
      console.error('Webhook test failed:', error)
      alert('Webhook test failed: ' + error.message)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Webhook</h1>
      <div className="space-y-4">
        <div>
          <Label htmlFor="payload">Webhook Payload</Label>
          <textarea
            id="payload"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="w-full h-64 p-2 border rounded font-mono text-sm"
          />
        </div>
        <Button onClick={testWebhook}>Test Webhook</Button>
      </div>
    </div>
  )
}