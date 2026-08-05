
import { NextResponse } from 'next/server';
import { initDb } from '@/lib/database';

export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error initializing database', error: error.message }, { status: 500 });
  }
}
