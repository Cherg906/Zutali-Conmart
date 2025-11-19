import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

    // Call Django API
    const response = await fetch(`${DJANGO_API_URL}/api/products/${productId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Product not found",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      product: data,
    })
  } catch (error) {
    console.error("Product fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

    // Get authorization token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Token ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(6) // Remove 'Token ' prefix
    const body = await request.json()

    // Call Django API
    const response = await fetch(`${DJANGO_API_URL}/api/products/${productId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Failed to update product",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      product: data,
    })
  } catch (error) {
    console.error("Product update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

    // Get authorization token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Token ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(6) // Remove 'Token ' prefix

    // Call Django API
    const response = await fetch(`${DJANGO_API_URL}/api/products/${productId}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
    })

    if (!response.ok) {
      const data = await response.json()
      return NextResponse.json({
        error: data.error || "Failed to delete product",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Product deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '')
      : authHeader.startsWith('Token ')
        ? authHeader.substring(6)
        : ''
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/products/${productId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }

    if (!response.ok) {
      return NextResponse.json({
        error: data?.error || "Failed to update product",
        details: data,
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      product: data,
    })
  } catch (error) {
    console.error("Product patch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

    // Call Django API to increment view count
    const response = await fetch(`${DJANGO_API_URL}/api/products/${productId}/increment_view/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Failed to increment view count",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "View count incremented successfully",
      view_count: data.view_count
    })
  } catch (error) {
    console.error('Product view increment error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to increment view count'
    }, { status: 500 })
  }
}