import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }
    if (authHeader.startsWith('Token ')) {
      return authHeader.substring(6)
    }
  }
  return null
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const quotationId = searchParams.get("quotation_id")

    if (!quotationId) {
      return NextResponse.json({ error: "Quotation ID is required" }, { status: 400 })
    }

    const response = await fetch(`${DJANGO_API_URL}/api/quotations/${quotationId}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json(
        {
          error: data?.error || data?.detail || "Failed to delete quotation",
          details: data,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({ success: true, message: "Quotation deleted" })
  } catch (error) {
    console.error("Quotation deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const productOwnerId = searchParams.get("product_owner_id")

    let url = `${DJANGO_API_URL}/api/quotations/`
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId)
    if (productOwnerId) params.append('product_owner_id', productOwnerId)
    if (params.toString()) url += `?${params.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.error || "Failed to fetch quotations"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      quotations: data.results || data,
    })
  } catch (error) {
    console.error("Quotations fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const incomingForm = await request.formData()
    const productId = incomingForm.get("product_id")
    const quantity = incomingForm.get("quantity")

    if (!productId || !quantity) {
      return NextResponse.json({ error: "Product ID and quantity are required" }, { status: 400 })
    }

    const forwardForm = new FormData()
    incomingForm.forEach((value, key) => {
      if (typeof value === "string" || value instanceof Blob) {
        forwardForm.append(key === "product" ? "product_id" : key, value)
      }
    })

    if (!forwardForm.has("product_id")) {
      forwardForm.append("product_id", productId)
    }

    const response = await fetch(`${DJANGO_API_URL}/api/quotations/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
      },
      body: forwardForm,
    })

    const text = await response.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch (parseError) {
      console.error("Quotation response parse error:", parseError)
      data = { raw: text }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || data?.message || "Failed to create quotation request",
          details: data,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Quotation request sent successfully",
      quotation: data,
    })
  } catch (error) {
    console.error("Quotation creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
