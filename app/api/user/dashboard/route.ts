import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        {
          error: "Authentication required",
          message: "Please sign in to view your dashboard.",
        },
        { status: 401 }
      )
    }

    const response = await fetch(`${DJANGO_API_URL}/api/user/dashboard/`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("User dashboard proxy error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to load user dashboard data.",
      },
      { status: 500 }
    )
  }
}
