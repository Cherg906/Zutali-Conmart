import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const planCode = body?.plan_code

    if (!planCode) {
      return NextResponse.json({ error: "plan_code is required" }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization") ?? undefined

    const response = await fetch(`${DJANGO_API_URL}/api/payments/initialize/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Payment initialization proxy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
