import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { deleteTransaction } from '@/lib/database';

function auth(request) {
  const cookie = request.headers.get('cookie') || '';
  return verifyCookieToken(cookie) || verifyApiAuth(request);
}

// DELETE /api/transactions/[id]
export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  deleteTransaction(parseInt(id));
  return NextResponse.json({ message: `Transaction ${id} deleted` });
}
