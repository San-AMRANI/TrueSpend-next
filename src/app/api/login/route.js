
import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'your-default-secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-default-admin-password';

export async function POST(request) {
  const { password } = await request.json();

  if (password === ADMIN_PASSWORD) {
    const token = sign({ user: 'admin' }, SECRET, { expiresIn: '7d' });
    return NextResponse.json({ success: true, token });
  } else {
    return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
  }
}
