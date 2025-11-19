import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }
    if (authHeader.startsWith('Token ')) {
      return authHeader.substring(6)
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversation_id")

    let url = `${DJANGO_API_URL}/api/messages/`
    if (conversationId) {
      url += `?conversation_id=${conversationId}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.error || "Failed to fetch messages"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      messages: data.results || data,
    })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required", message: "Please sign in to perform this action." },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const messageId = url.searchParams.get('message_id')
    
    if (!messageId) {
      return NextResponse.json(
        { error: "Missing message_id", message: "Message ID is required." },
        { status: 400 }
      )
    }

    // Forward to Django backend
    const response = await fetch(`${DJANGO_API_URL}/api/messages/${messageId}/mark_read/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Mark message read error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to mark message as read." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get("message_id")

    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
    }

    const response = await fetch(`${DJANGO_API_URL}/api/messages/${messageId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      return NextResponse.json({
        error: data?.error || data?.detail || "Failed to delete message",
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully",
    })
  } catch (error) {
    console.error("Message deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const {
      product_owner_id,
      receiver_id,
      message,
      subject,
      content,
      product_id,
    } = body

    const targetReceiver = receiver_id ?? product_owner_id
    const messageContent = typeof message === "string" && message.trim().length > 0 ? message : content

    // Validate required fields
    if (!targetReceiver || !messageContent) {
      return NextResponse.json({ error: "Receiver ID and message content are required" }, { status: 400 })
    }

    const response = await fetch(`${DJANGO_API_URL}/api/messages/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver_id: targetReceiver,
        content: messageContent,
        product: product_id ?? undefined,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.error || data.detail || data.message || "Failed to send message",
        details: data
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      data: data,
    })
  } catch (error) {
    console.error("Message creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
