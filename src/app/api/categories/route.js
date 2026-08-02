import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getCategories, addCategory } from '@/lib/database';

export async function GET(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const c = await getCategories();
  return NextResponse.json(c);
}

export async function POST(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name } = await request.json();
  const success = await addCategory(name);
  if (success) return NextResponse.json({ success: true });
  return NextResponse.json({ error: 'Exists' }, { status: 400 });
}
