import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [], categories: [] })
    }

    // Call Django search API
    const response = await fetch(`${DJANGO_API_URL}/api/search/?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Search failed",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      products: data.products || [],
      categories: data.categories || [],
    })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
