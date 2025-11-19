import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("product_id")

    let url = `${DJANGO_API_URL}/api/reviews/`
    if (productId) {
      url += `?product_id=${productId}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.error || "Failed to fetch reviews"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      reviews: data.results || data,
    })
  } catch (error) {
    console.error("Reviews fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, rating, comment } = body

    // Validate required fields
    if (!product_id || !rating) {
      return NextResponse.json({ error: "Product ID and rating are required" }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    const response = await fetch(`${DJANGO_API_URL}/api/reviews/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id,
        rating,
        comment: comment || '',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.error || "Failed to submit review",
        details: data
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Review submitted successfully",
      review: data,
    })
  } catch (error) {
    console.error("Review creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
