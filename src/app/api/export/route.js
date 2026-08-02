import { NextResponse } from 'next/server';
import { verifyCookieToken } from '@/lib/auth';
import { getTransactions } from '@/lib/database';

export async function GET(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const transactions = getTransactions();
  const headers = ['id','date','title','amount','type','source_wallet','category','notes','reimbursable_amount','linked_contact'];
  const csvRows = [headers.join(',')];
  
  for (const tx of transactions) {
    const row = headers.map(h => {
      const val = tx[h] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
    csvRows.push(row);
  }
  
  const csv = csvRows.join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="truespend_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
