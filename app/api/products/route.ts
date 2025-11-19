import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const djangoUrl = new URL(`${DJANGO_API_URL}/api/products/`)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "12")

    searchParams.forEach((value, key) => {
      if (!value) {
        return
      }

      if (key === "limit") {
        djangoUrl.searchParams.set("page_size", value)
      } else {
        djangoUrl.searchParams.set(key, value)
      }
    })

    if (!djangoUrl.searchParams.has("page")) {
      djangoUrl.searchParams.set("page", page.toString())
    }
    if (!djangoUrl.searchParams.has("page_size")) {
      djangoUrl.searchParams.set("page_size", limit.toString())
    }

    // Enforce only active products for unauthenticated/public fetches
    const authHeader = request.headers.get('authorization') ?? ''
    const myProducts = searchParams.get('my_products') === 'true'
    if (!myProducts && !authHeader) {
      if (!djangoUrl.searchParams.has('status')) {
        djangoUrl.searchParams.set('status', 'active')
      }
    }

    // Call Django API
    const response = await fetch(djangoUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('authorization') ?? '',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Failed to fetch products",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      products: data.results || data || [],
      total: data.count || 0,
      page,
      totalPages: Math.ceil((data.count || 0) / limit),
    })
  } catch (error) {
    console.error("Products fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const payload = new FormData()
    formData.forEach((value, key) => {
      if (value === null || value === undefined || value === "") {
        return
      }

      if (value instanceof File) {
        if (key === "images") {
          payload.append("image_files", value, value.name)
        } else {
          payload.append(key, value, value.name)
        }
      } else {
        payload.append(key, String(value))
      }
    })

    const response = await fetch(`${DJANGO_API_URL}/api/products/`, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("authorization") ?? "",
      },
      body: payload,
    })

    const rawBody = await response.text()
    let data: any = null
    try {
      data = rawBody ? JSON.parse(rawBody) : null
    } catch {
      data = rawBody
    }

    if (!response.ok) {
      return NextResponse.json({
        error: data?.error || "Failed to create product",
        details: data,
        status: response.status,
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      product: data,
    })
  } catch (error) {
    console.error("Product creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
