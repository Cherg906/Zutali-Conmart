// app/api/payment/verify/route.ts
import { NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body?.tx_ref) {
      return NextResponse.json({ error: "tx_ref is required" }, { status: 400 })
    }

    const response = await fetch(`${DJANGO_API_URL}/api/payments/callback/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Payment verification proxy error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}