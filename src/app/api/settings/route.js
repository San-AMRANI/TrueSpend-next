import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { updateSetting } from '@/lib/database';

function auth(request) {
  const cookie = request.headers.get('cookie') || '';
  return verifyCookieToken(cookie) || verifyApiAuth(request);
}

export async function POST(request) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { key, value } = await request.json();
  updateSetting(key, value);
  return NextResponse.json({ message: 'Setting updated' });
}
