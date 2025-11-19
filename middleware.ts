// Django-based authentication middleware
// For now, we'll keep it simple since Django handles auth via tokens in API routes

import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Django handles authentication via tokens in API routes
  // No middleware needed for client-side auth
  return null
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
