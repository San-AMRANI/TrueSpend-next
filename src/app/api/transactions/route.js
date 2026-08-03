import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getTransactions, addTransaction } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const txs = await getTransactions();
  return NextResponse.json(txs);
}

export async function POST(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const id = await addTransaction(body);
  return NextResponse.json({ success: true, id });
}
