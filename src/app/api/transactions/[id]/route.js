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
  const id = parseInt(params.id);
  await deleteTransaction(id);
  return NextResponse.json({ success: true });
}
