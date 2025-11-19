import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

function sanitizeAuthHeader(request: NextRequest) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization")
  return authorization && authorization.trim().length > 0 ? authorization : null
}

async function forwardResponse(response: Response) {
  const text = await response.text()
  let data: unknown

  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    console.error("Failed to parse Django response as JSON:", error, text)
    data = { detail: text }
  }

  if (!response.ok) {
    return NextResponse.json({
      success: false,
      error: (data as any)?.error || (data as any)?.detail || "Request to Django API failed",
      details: data,
    }, { status: response.status })
  }

  return NextResponse.json(data, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

function buildHeaders(request: NextRequest, extra?: HeadersInit) {
  const authorization = sanitizeAuthHeader(request)
  return {
    ...(authorization ? { Authorization: authorization } : {}),
    ...(extra ?? {}),
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${DJANGO_API_URL}/api/categories/${params.id}/`, {
      method: 'GET',
      headers: buildHeaders(request, {
        'Content-Type': 'application/json',
      }),
      cache: 'no-store',
    })

    return await forwardResponse(response)
  } catch (error) {
    console.error('Category GET proxy error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch category detail',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let body: BodyInit | undefined
    let headers: HeadersInit = buildHeaders(request)

    if (contentType.includes('application/json')) {
      const json = await request.json()
      body = JSON.stringify(json)
      headers = {
        ...headers,
        'Content-Type': 'application/json',
      }
    } else if (contentType.includes('multipart/form-data')) {
      const incomingFormData = await request.formData()
      const forwardFormData = new FormData()

      incomingFormData.forEach((value, key) => {
        if (typeof value === 'object' && value !== null && 'arrayBuffer' in value) {
          const blobValue = value as Blob
          const fileName = (value as { name?: string }).name || 'upload'
          forwardFormData.append(key, blobValue, fileName)
        } else {
          forwardFormData.append(key, String(value))
        }
      })

      body = forwardFormData
    } else {
      const rawBody = await request.text()
      body = rawBody
      if (contentType) {
        headers = {
          ...headers,
          'Content-Type': contentType,
        }
      }
    }

    const response = await fetch(`${DJANGO_API_URL}/api/categories/${params.id}/`, {
      method: 'PATCH',
      headers,
      body,
    })

    return await forwardResponse(response)
  } catch (error) {
    console.error('Category PATCH proxy error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update category',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${DJANGO_API_URL}/api/categories/${params.id}/`, {
      method: 'DELETE',
      headers: buildHeaders(request),
    })

    if (response.status === 204) {
      return NextResponse.json({ success: true }, { status: 204 })
    }

    return await forwardResponse(response)
  } catch (error) {
    console.error('Category DELETE proxy error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete category',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
