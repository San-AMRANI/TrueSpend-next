import { NextResponse } from 'next/server';
import { verifyCookieToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const VALID_USER = 'SanSpend';
const VALID_PASS = '!4ZwqYFBHX*r@f';

// POST /api/auth/login
export async function POST(request) {
  const { username, password } = await request.json();
  if (username === VALID_USER && password === VALID_PASS) {
    const response = NextResponse.json({ success: true });
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    response.cookies.set('auth_token', 'TrueSpend_Authorized', {
      expires,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return response;
  }
  return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
}

// POST /api/auth/logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', '', { expires: new Date(0), path: '/' });
  return response;
}
