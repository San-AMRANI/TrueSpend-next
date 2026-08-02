import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { updateSetting } from '@/lib/database';

export async function POST(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { key, value } = await request.json();
  await updateSetting(key, value);
  return NextResponse.json({ success: true });
}
