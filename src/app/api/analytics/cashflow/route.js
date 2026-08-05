import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { getTransactions } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const transactions = await getTransactions();
    const dayMap = {};

    for (const tx of transactions) {
      const amount = Number.parseFloat(tx.amount) || 0;
      const day = tx.date;
      if (!dayMap[day]) {
        dayMap[day] = { date: day, income: 0, expense: 0, trueSpend: 0 };
      }

      if (tx.type === 'Income') {
        dayMap[day].income += amount;
      } else if (tx.type === 'Expense') {
        dayMap[day].expense += amount;
        if (tx.category !== 'Debt Repayment') {
          dayMap[day].trueSpend += amount - (Number.parseFloat(tx.reimbursable_amount) || 0);
        }
      }
    }

    const data = Object.values(dayMap).sort((left, right) => left.date.localeCompare(right.date));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analytics cashflow failed', error);
    return NextResponse.json({ error: error?.message || 'Failed to build cashflow analytics' }, { status: 500 });
  }
}
