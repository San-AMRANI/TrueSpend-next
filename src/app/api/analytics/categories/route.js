import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getExpensesByCategory } from '@/lib/logic';

function auth(request) {
  const cookie = request.headers.get('cookie') || '';
  return verifyCookieToken(cookie) || verifyApiAuth(request);
}

export async function GET(request) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getExpensesByCategory());
}
