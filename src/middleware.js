import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;

  // Allow static assets, login page, and auth API
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (authToken === 'TrueSpend_Authorized' && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Allow API routes (they verify auth internally)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Protected routes require auth token
  if (authToken !== 'TrueSpend_Authorized') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
