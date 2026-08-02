import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getSetting, updateSetting } from '@/lib/database';

function auth(request) {
  const cookie = request.headers.get('cookie') || '';
  return verifyCookieToken(cookie) || verifyApiAuth(request);
}

export async function GET(request, { params }) {
  const { key } = await params;
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ key: key, value: getSetting(key) });
}
