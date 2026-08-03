import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getDebts, addDebt, settleDebt } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const d = await getDebts();
  return NextResponse.json(d);
}

export async function POST(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  if (body.debt_id !== undefined) {
    await settleDebt(body);
  } else {
    await addDebt(body);
  }
  return NextResponse.json({ success: true });
}
