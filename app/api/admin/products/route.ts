import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({
        error: "Authentication required",
        message: "Please sign in as an admin to view products."
      }, { status: 401 })
    }

    const upstreamUrl = new URL("/api/admin/products/", DJANGO_API_URL)
    const requestUrl = new URL(request.url)
    const status = requestUrl.searchParams.get("status")
    if (status) {
      upstreamUrl.searchParams.set("status", status)
    }

    const response = await fetch(upstreamUrl, {
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
    console.error("Admin products proxy error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: "Failed to load products for moderation."
    }, { status: 500 })
  }
}
