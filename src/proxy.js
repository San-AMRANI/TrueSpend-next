import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // Public paths - always allow
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  
  // API paths - allow REST access via Basic Auth (checked in each route)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Protected pages - require cookie
  const authToken = request.cookies.get('auth_token')?.value;
  if (authToken !== 'TrueSpend_Authorized') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
