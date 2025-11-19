import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the form data from the request
    const formData = await request.formData()

    // Forward the form data to Django
    const response = await fetch(`${DJANGO_API_URL}/api/profile/verification-document/`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader.startsWith('Bearer ')
          ? `Token ${authHeader.replace('Bearer ', '')}`
          : authHeader,
      },
      body: formData,
    })

    const text = await response.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      console.error('Non-JSON response from Django (verification document POST):', text?.slice(0, 200))
      data = { error: 'Invalid response from server' }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error uploading verification document:', error)
    return NextResponse.json(
      { error: 'Failed to upload verification document' },
      { status: 500 }
    )
  }
}

