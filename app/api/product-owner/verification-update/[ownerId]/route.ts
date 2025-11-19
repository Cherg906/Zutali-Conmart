import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function POST(request: NextRequest, { params }: { params: { ownerId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({
        error: "Authentication required",
        message: "Please sign in to submit verification updates."
      }, { status: 401 })
    }

    const formData = await request.formData()

    const response = await fetch(`${DJANGO_API_URL}/api/product-owners/${params.ownerId}/update-verification/`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Verification update proxy error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: "Failed to submit verification update"
    }, { status: 500 })
  }
}
