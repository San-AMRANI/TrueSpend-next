import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getTransactions, addTransaction, deleteTransaction } from '@/lib/database';

function auth(request) {
  const cookie = request.headers.get('cookie') || '';
  return verifyCookieToken(cookie) || verifyApiAuth(request);
}

// GET /api/transactions
export async function GET(request) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getTransactions());
}

// POST /api/transactions
export async function POST(request) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const id = addTransaction(body);
  return NextResponse.json({ message: 'Transaction created', id }, { status: 201 });
}
