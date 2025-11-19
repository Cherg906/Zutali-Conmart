import { NextRequest, NextResponse } from 'next/server'

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id } = params

    // Forward the review request to Django
    const response = await fetch(`${DJANGO_API_URL}/api/verifications/${id}/review/`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader.startsWith('Bearer ')
          ? `Token ${authHeader.replace('Bearer ', '')}`
          : authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Django API error:', response.status, data)
      return NextResponse.json(
        data || { error: 'Failed to review verification request' },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error reviewing verification:', error)
    return NextResponse.json(
      { error: 'Failed to review verification request' },
      { status: 500 }
    )
  }
}
