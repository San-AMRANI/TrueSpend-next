import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getExpensesByCategory } from '@/lib/logic';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await getExpensesByCategory();
  return NextResponse.json(data);
}
