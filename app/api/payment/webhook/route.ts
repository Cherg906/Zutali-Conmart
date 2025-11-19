// app/api/payment/webhook/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export const runtime = 'nodejs'

// Disable body parsing since we need the raw body for signature verification
export const dynamic = 'force-dynamic'

// Helper to read the raw request body
async function getRawBody(readable: any) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export async function POST(request: Request) {
  try {
    // Get the raw body
    const rawBody = await getRawBody(request.body)
    const body = JSON.parse(rawBody.toString())

    // Verify the webhook signature
    const signature = request.headers.get('x-chapa-signature-256')
    if (!signature) {
      return NextResponse.json(
        { success: false, message: 'No signature provided' },
        { status: 400 }
      )
    }

    // Verify the signature
    const secret = process.env.CHAPA_WEBHOOK_SECRET
    if (!secret) {
      console.error('CHAPA_WEBHOOK_SECRET is not set')
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      )
    }

    const hmac = crypto.createHmac('sha256', secret)
    const digest = hmac.update(rawBody).digest('hex')

    if (signature !== digest) {
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      )
    }

    const djangoResponse = await fetch(`${DJANGO_API_URL}/api/payments/callback/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await djangoResponse.json()
    return NextResponse.json(data, { status: djangoResponse.status })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { success: false, message: 'Webhook error' },
      { status: 500 }
    )
  }
}