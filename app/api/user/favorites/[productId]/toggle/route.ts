import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function POST(request: NextRequest, { params }: { params: { productId: string } }) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { productId } = params
  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`${DJANGO_API_URL}/api/user/favorites/${productId}/toggle/`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || "Failed to update favorite",
          details: data,
        },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Favorite toggle proxy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
