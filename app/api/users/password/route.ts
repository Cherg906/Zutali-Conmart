import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  try {
    // Get authorization token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Token ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(6) // Remove 'Token ' prefix
    const body = await request.json()
    const { current_password, new_password } = body

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      )
    }

    // Call Django password change API (we'll need to create this endpoint)
    // For now, use Django's built-in set_password through profile update
    // Actually, Django REST Framework has a change_password endpoint, but we need to create it
    // Let's call a custom endpoint or use the profile endpoint if it supports password
    
    // Call Django password change endpoint
    const response = await fetch(`${DJANGO_API_URL}/api/profile/change-password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({
        current_password,
        new_password,
      }),
    })

    const text = await response.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      console.error('Non-JSON response from Django (password change):', text?.slice(0, 200))
      data = { error: 'Invalid response from server' }
    }

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || data.message || "Failed to change password",
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    console.error("Password change error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

