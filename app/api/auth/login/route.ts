import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, phone, userType } = body
    const role = userType === 'owner' ? 'product_owner' : userType

    // Prepare login data for Django API
    const loginData = {
      username: username || email || phone,
      password,
      role,
    }

    // Call Django login API
    const response = await fetch(`${DJANGO_API_URL}/api/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage =
        data?.message ??
        data?.detail ??
        (Array.isArray(data?.non_field_errors) ? data.non_field_errors[0] : undefined) ??
        (typeof data?.error === "string" ? data.error : undefined) ??
        "Invalid credentials"

      return NextResponse.json({
        error: data?.error || "Login failed",
        message: errorMessage
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      token: data.token,
      message: "Login successful"
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again."
    }, { status: 500 })
  }
}
