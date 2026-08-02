import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getCategories, addCategory, deleteCategory } from '@/lib/database';

function auth(request) {
  const cookie = request.headers.get('cookie') || '';
  return verifyCookieToken(cookie) || verifyApiAuth(request);
}

export async function GET(request) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getCategories());
}

export async function POST(request) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name } = await request.json();
  const ok = addCategory(name);
  if (!ok) return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
  return NextResponse.json({ message: 'Category created' }, { status: 201 });
}
