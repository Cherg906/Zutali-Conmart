import { type NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, subject, message } = body

    // Prepare email data for Django backend
    const emailData = {
      to_email: 'chernetg@gmail.com',
      from_email: email,
      from_name: `${firstName} ${lastName}`,
      subject: `Contact Form: ${subject}`,
      message: `
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject}

Message:
${message}

---
This message was sent from the Zutali Conmart contact form.
      `.trim(),
      phone: phone || '',
    }

    // Send to Django backend for email processing
    const response = await fetch(`${DJANGO_API_URL}/api/contact/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to send email')
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon."
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ 
      error: "Failed to send message",
      message: "Please try again or contact us directly."
    }, { status: 500 })
  }
}
