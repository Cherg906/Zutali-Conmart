import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

async function fetchProductDetails(productIds: Set<string>) {
  const results = new Map<string, any>()

  await Promise.all(
    Array.from(productIds).map(async (productId) => {
      if (!productId) return

      try {
        const response = await fetch(`${DJANGO_API_URL}/api/products/${productId}/`, {
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          return
        }

        const data = await response.json()
        results.set(productId, data)
      } catch (error) {
        console.error(`Failed to fetch product ${productId}:`, error)
      }
    }),
  )

  return results
}

function normalizeProductReference(raw: any, productMap: Map<string, any>) {
  if (!raw) return null

  if (typeof raw === "object" && raw !== null) {
    const id = raw.id ?? raw.pk ?? raw.uuid ?? raw
    const normalizedId = typeof id === "string" ? id : String(id)
    const fallback = productMap.get(normalizedId)
    return {
      id: normalizedId,
      name: raw.name ?? fallback?.name ?? fallback?.title ?? null,
      ...raw,
    }
  }

  const normalizedId = typeof raw === "string" ? raw : String(raw)
  const fallback = productMap.get(normalizedId)

  if (!fallback) {
    return {
      id: normalizedId,
      name: null,
    }
  }

  return {
    id: normalizedId,
    name: fallback?.name ?? fallback?.title ?? null,
  }
}

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7)
    }
    if (authHeader.startsWith("Token ")) {
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

    const response = await fetch(`${DJANGO_API_URL}/api/messages/conversations/`, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || data?.message || "Failed to fetch conversations",
          details: data,
        },
        { status: response.status },
      )
    }

    const conversations = Array.isArray(data) ? data : data?.results ?? data

    const productIds = new Set<string>()
    conversations.forEach((conversation: any) => {
      const rawProduct = conversation?.last_message?.product
      if (!rawProduct) return

      if (typeof rawProduct === "object" && rawProduct !== null) {
        const id = rawProduct.id ?? rawProduct.pk ?? rawProduct.uuid
        if (id) {
          productIds.add(typeof id === "string" ? id : String(id))
        }
      } else {
        productIds.add(typeof rawProduct === "string" ? rawProduct : String(rawProduct))
      }
    })

    const productMap = await fetchProductDetails(productIds)

    const normalizedConversations = conversations.map((conversation: any) => {
      if (!conversation?.last_message) return conversation

      return {
        ...conversation,
        last_message: {
          ...conversation.last_message,
          product: normalizeProductReference(conversation.last_message.product, productMap),
        },
      }
    })

    return NextResponse.json({
      success: true,
      conversations: normalizedConversations,
    })
  } catch (error) {
    console.error("Conversations fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
