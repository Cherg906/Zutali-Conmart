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

    // Call Django profile API
    const response = await fetch(`${DJANGO_API_URL}/api/profile/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Failed to fetch profile",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      profile: data,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authorization token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Token ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(6) // Remove 'Token ' prefix
    const body = await request.json()

    // Call Django profile update API
    const response = await fetch(`${DJANGO_API_URL}/api/profile/`, {
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
        error: data.error || "Failed to update profile",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: data,
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
