import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getDebts, addDebt, settleDebt } from '@/lib/database';

function auth(request) {
  const cookie = request.headers.get('cookie') || '';
  return verifyCookieToken(cookie) || verifyApiAuth(request);
}

// GET /api/debts
export async function GET(request) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getDebts());
}

// POST /api/debts
export async function POST(request) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  // If body has debt_id it's a settlement, otherwise create new
  if (body.debt_id !== undefined) {
    settleDebt(body);
    return NextResponse.json({ message: 'Debt settled' });
  }
  addDebt(body);
  return NextResponse.json({ message: 'Debt created' }, { status: 201 });
}
