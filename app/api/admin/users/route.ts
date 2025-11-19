import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request headers or cookies
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Token ', '') || authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Call Django API
    const response = await fetch(`${DJANGO_API_URL}/api/admin/users/`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Django API error:', response.status, data)
      return NextResponse.json({
        error: data?.error || "Failed to fetch admin users",
        message: data?.message || "Please try again",
      }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Admin users fetch error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: "Failed to load admin users"
    }, { status: 500 })
  }
}
