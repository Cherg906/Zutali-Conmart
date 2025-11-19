import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

function getAuthHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return null
  }
  if (authHeader.startsWith("Token ") || authHeader.startsWith("Bearer ")) {
    return authHeader
  }
  return null
}

async function proxyRequest(request: NextRequest, method: "GET" | "PUT") {
  const authHeader = getAuthHeader(request)
  if (!authHeader) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  try {
    let body: BodyInit | undefined
    const headers: Record<string, string> = {
      Authorization: authHeader,
    }

    if (method === "PUT") {
      const payload = await request.json()
      headers["Content-Type"] = "application/json"
      body = JSON.stringify(payload)
    }

    const response = await fetch(`${DJANGO_API_URL}/api/profile/product-owner/`, {
      method,
      headers,
      body,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || "Failed to process product owner profile request",
          details: data,
        },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Product owner profile proxy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, "GET")
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, "PUT")
}
