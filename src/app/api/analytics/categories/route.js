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
    const categoryMap = {};

    for (const tx of transactions) {
      if (tx.type !== 'Expense' || tx.category === 'Debt Repayment') continue;
      const category = tx.category || 'Uncategorized';
      const trueSpend = (Number.parseFloat(tx.amount) || 0) - (Number.parseFloat(tx.reimbursable_amount) || 0);
      categoryMap[category] = (categoryMap[category] || 0) + trueSpend;
    }

    const data = Object.entries(categoryMap)
      .filter(([, value]) => value > 0)
      .map(([category, trueSpend]) => ({ category, trueSpend: +trueSpend.toFixed(2) }))
      .sort((left, right) => right.trueSpend - left.trueSpend);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analytics categories failed', error);
    return NextResponse.json({ error: error?.message || 'Failed to build category analytics' }, { status: 500 });
  }
}
