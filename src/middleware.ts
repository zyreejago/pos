
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log(`[Middleware] Path: ${request.nextUrl.pathname}`);
  // Simplest action: just pass through
  return NextResponse.next();
}

// Match all paths for this basic test to ensure it's being invoked
export const config = {
  matcher: '/:path*',
};
