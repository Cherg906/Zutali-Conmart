import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const formData = await request.formData()
    const quotationId = formData.get("quotation_id")?.toString()
    if (!quotationId) {
      return NextResponse.json({ error: "Quotation ID is required" }, { status: 400 })
    }

    const forwardForm = new FormData()
    Array.from(formData.entries()).forEach(([key, value]) => {
      if (typeof value === "string" || value instanceof Blob) {
        forwardForm.append(key, value)
      }
    })

    const response = await fetch(`${DJANGO_API_URL}/api/quotations/${quotationId}/respond/`, {
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
          error: data?.error || data?.message || "Failed to submit quotation response",
          details: data,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Quotation response submitted successfully",
      quotation: data,
    })
  } catch (error) {
    console.error("Quotation response submit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
