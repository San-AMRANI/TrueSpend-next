import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { deleteCategory } from '@/lib/database';

function auth(request) {
  const cookie = request.headers.get('cookie') || '';
  return verifyCookieToken(cookie) || verifyApiAuth(request);
}

export async function DELETE(request, { params }) {
  const { name } = await params;
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  deleteCategory(decodeURIComponent(name));
  return NextResponse.json({ message: 'Category deleted' });
}
