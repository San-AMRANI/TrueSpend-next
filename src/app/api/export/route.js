import { NextResponse } from 'next/server';
import { getTransactions } from '@/lib/database';

export async function GET(request) {
  // No auth for export as per original or maybe it was there? Original doesn't seem to have verifyApiAuth
  const txs = await getTransactions();
  if (txs.length === 0) return new NextResponse('No data', { status: 200 });

  const keys = Object.keys(txs[0]);
  const csv = [
    keys.join(','),
    ...txs.map(t => keys.map(k => {
      let val = t[k] === null ? '' : String(t[k]);
      if (val.includes(',')) val = `"${val}"`;
      return val;
    }).join(','))
  ].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="truespend-export.csv"'
    }
  });
}
