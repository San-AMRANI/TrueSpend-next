import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { deleteTransaction } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(request, { params }) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = Number.parseInt(params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid transaction id' }, { status: 400 });
  }

  try {
    await deleteTransaction(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete transaction', { id, error });
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
