import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function POST(request: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({
        error: "Authentication required",
        message: "Please sign in as an admin to moderate products."
      }, { status: 401 })
    }

    const body = await request.text()
    const upstream = `${DJANGO_API_URL}/api/admin/products/${params.productId}/moderate/`

    const response = await fetch(upstream, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': request.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      body,
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Admin product moderation proxy error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: "Failed to moderate product."
    }, { status: 500 })
  }
}
