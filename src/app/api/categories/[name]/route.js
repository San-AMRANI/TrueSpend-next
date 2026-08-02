import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { deleteCategory } from '@/lib/database';

export async function DELETE(request, { params }) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const name = decodeURIComponent(params.name);
  await deleteCategory(name);
  return NextResponse.json({ success: true });
}
