import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Token ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(6)
    const { id } = params
    const body = await request.json()

    const response = await fetch(`${DJANGO_API_URL}/api/admin/users/${id}/review-verification/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Failed to review user verification",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: data.message || "User verification reviewed successfully",
      user: data.user,
    })
  } catch (error) {
    console.error("Review user verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

