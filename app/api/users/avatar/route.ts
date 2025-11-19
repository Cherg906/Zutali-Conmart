import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incomingFormData = await request.formData();
    const formData = new FormData();
    Array.from(incomingFormData.entries()).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch(`${DJANGO_API_URL}/api/profile/avatar/`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
