import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest) {
  try {
    // Get authorization token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Token ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(6) // Remove 'Token ' prefix
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    // Build Django API URL with query parameters
    const djangoUrl = new URL(`${DJANGO_API_URL}/api/verifications/`)
    if (status) djangoUrl.searchParams.set('status', status)

    // Call Django API
    const response = await fetch(djangoUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Failed to fetch verifications",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      verifications: data.results || data || [],
    })
  } catch (error) {
    console.error("Verifications fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Token ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(6) // Remove 'Token ' prefix
    const body = await request.json()
    const { verification_id, status, admin_notes } = body

    // Call Django API
    const response = await fetch(`${DJANGO_API_URL}/api/verifications/${verification_id}/review/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({
        status,
        admin_notes,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Failed to process verification",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Verification processed successfully",
      verification: data,
    })
  } catch (error) {
    console.error("Verification processing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
