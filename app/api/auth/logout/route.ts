// app/api/auth/request-verification/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from 'zod'; // Import Zod

const verificationRequestSchema = z.object({
  documents: z.array(z.object({
    name: z.string(),
    url: z.string(), // Assuming you'll store the document URLs
  })),
  userType: z.enum(['user', 'product_owner']),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const parsedBody = verificationRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.formErrors }, { status: 400 });
    }

    const { documents, userType } = parsedBody.data;

    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Determine the profile table based on user type
    let profileTable = '';
    if (userType === 'user') {
        profileTable = 'user_profiles';
    } else if (userType === 'product_owner') {
        profileTable = 'product_owner_profiles';
    } else {
        return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }

    const { error: profileError, data: profileData } = await supabase
        .from(profileTable)
        .select('id')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Insert a new verification request
    const { error: verificationRequestError } = await supabase
      .from('verification_requests')
      .insert({
        product_owner: userType === 'product_owner' ? user.id : null, // Assuming you have a product_owner field in verification_requests
        user: userType === 'user' ? user.id : null, // Assuming you have a user field in verification_requests
        documents: documents,
        status: 'pending',
      });

    if (verificationRequestError) {
      console.error("Verification request error:", verificationRequestError);
      return NextResponse.json({ error: "Failed to submit verification request" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Verification request submitted successfully",
    });
  } catch (error) {
    console.error("[v0] Verification request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}