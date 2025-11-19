import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerClient()
    const quotationId = params.id
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: updatedQuotation, error } = await supabase
      .from("quotations")
      .update({
        status: body.status,
        response_message: body.response_message,
        quoted_price: body.quoted_price,
      })
      .eq("id", quotationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Quotation updated successfully",
      quotation: updatedQuotation,
    })
  } catch (error) {
    console.error("[v0] Quotation update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
