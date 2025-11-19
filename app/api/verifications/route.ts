import { NextRequest, NextResponse } from 'next/server'

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const response = await fetch(`${DJANGO_API_URL}/api/verifications/`, {
      method: 'GET',
      headers: {
        // Accept either 'Token x' or 'Bearer x' from client and normalize to Token for Django
        'Authorization': authHeader.startsWith('Bearer ')
          ? `Token ${authHeader.replace('Bearer ', '')}`
          : authHeader,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    // Normalize document URLs to absolute media URLs using product_owner file fields when present
    const normalized = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
    const withDocs = normalized.map((item: any) => {
      const po = item?.product_owner || {}
      const docs = item?.documents || {}
      const docUrl = (path?: string | null) => {
        if (!path) return null
        // If already absolute, return as-is
        if (/^https?:\/\//i.test(path)) return path
        // If it looks like a media relative path, prefix the backend base
        const base = DJANGO_API_URL.replace(/\/api\/?$/, '')
        const normalizedPath = path.startsWith('/media/') ? path : `/media/${path.replace(/^\/+/, '')}`
        return `${base}${normalizedPath}`
      }
      const buildFromName = (folder: string, name?: string | null) => {
        if (!name) return null
        const base = DJANGO_API_URL.replace(/\/api\/?$/, '')
        const filename = encodeURIComponent(name)
        return `${base}/media/${folder}/${filename}`
      }

      const mappedDocs: Record<string, string | null> = {
        tradeLicense:
          docUrl(po.trade_license)
          || docUrl(docs.trade_license)
          || buildFromName('verification/trade_licenses', docs.trade_license),
        tradeRegistration:
          docUrl(po.trade_registration)
          || docUrl(docs.trade_registration)
          || buildFromName('verification/trade_registrations', docs.trade_registration),
        vatRegistration:
          docUrl(po.vat_registration)
          || docUrl(docs.vat_registration)
          || buildFromName('verification/vat_registrations', docs.vat_registration),
        tinCertificate:
          docUrl(po.tin_certificate)
          || docUrl(docs.tin_certificate)
          || buildFromName('verification/tin_certificates', docs.tin_certificate),
      }
      return {
        ...item,
        documents: mappedDocs,
      }
    })

    return NextResponse.json(Array.isArray(data) ? withDocs : { ...(data || {}), results: withDocs }, { status: response.status })
  } catch (error) {
    console.error('Error fetching verifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    )
  }
}

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
    const response = await fetch(`${DJANGO_API_URL}/api/verifications/`, {
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
      console.error('Non-JSON response from Django (verifications POST):', text?.slice(0, 200))
      data = { error: 'Invalid response from server' }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error submitting verification:', error)
    return NextResponse.json(
      { error: 'Failed to submit verification request' },
      { status: 500 }
    )
  }
}
