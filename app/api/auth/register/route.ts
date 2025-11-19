import { type NextRequest, NextResponse } from "next/server"
import { z } from 'zod'

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, confirmPassword, userType, tier, fullName, phone, businessName, businessDescription, businessAddress } = body

    // Validation schema
    const registerSchema = z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      password: z.string().min(6),
      confirmPassword: z.string().min(6),
      userType: z.enum(['user', 'product_owner']),
      tier: z.string(),
      fullName: z.string().min(1),
      businessName: z.string().optional(),
      businessDescription: z.string().optional(),
      businessAddress: z.string().optional(),
    })

    const parsedBody = registerSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: parsedBody.error.formErrors
      }, { status: 400 })
    }

    // Prepare data for Django API
    const djangoPayload = {
      username: email || phone,
      email: email || '',
      password,
      password_confirm: confirmPassword,
      first_name: fullName.split(' ')[0] || '',
      last_name: fullName.split(' ').slice(1).join(' ') || '',
      role: userType,
      tier,
      phone: phone || '',
      business_name: businessName || '',
      business_description: businessDescription || '',
      business_address: businessAddress || '',
    }

    // Call Django registration API
    const response = await fetch(`${DJANGO_API_URL}/api/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(djangoPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: data.error || "Registration failed",
        message: data.message || "Please try again"
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful! You can now login.",
      user: data.user,
      token: data.token
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again."
    }, { status: 500 })
  }
}
