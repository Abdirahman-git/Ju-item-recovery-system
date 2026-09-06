import { NextResponse } from 'next/server';

/** Next.js 16: `proxy` replaces deprecated `middleware` file convention. */
export function proxy(request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Skip static assets and API route handlers (API must not go through page routing).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
