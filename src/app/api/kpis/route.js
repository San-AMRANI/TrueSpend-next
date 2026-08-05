
import { NextResponse } from 'next/server';
import { getTransactions } from '@/lib/database';
import { getSettings } from '@/lib/database';
import { getDebts } from '@/lib/database';

export async function GET() {
  try {
    const txs = await getTransactions();
    const debts = await getDebts();
    const settings = await getSettings();

    let bankBalance = 0;
    let cashBalance = 0;

    for (const t of txs) {
      const amt = parseFloat(t.amount);
      if (t.type === 'Income') {
        if (t.source_wallet === 'Bank') bankBalance += amt;
        else cashBalance += amt;
      } else if (t.type === 'Expense') {
        if (t.source_wallet === 'Bank') bankBalance -= amt;
        else cashBalance -= amt;
      } else if (t.type === 'Transfer') {
        bankBalance -= amt;
        cashBalance += amt;
      }
    }

    const totalLiquidity = bankBalance + cashBalance;
    const netBalance = totalLiquidity - debts.filter(d => d.type === 'Payable').reduce((sum, d) => sum + d.remaining_balance, 0);

    const monthlyAllowance = settings.find(s => s.key === 'monthly_allowance')?.value || 0;
    const payday = settings.find(s => s.key === 'payday')?.value || 1;

    const today = new Date();
    const nextPayday = new Date(today.getFullYear(), today.getMonth(), payday);
    if (today.getDate() > payday) {
      nextPayday.setMonth(nextPayday.getMonth() + 1);
    }
    const daysUntilPayday = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));

    const dailyAllowance = (netBalance - monthlyAllowance) / daysUntilPayday;

    const kpis = {
      bankBalance,
      cashBalance,
      totalLiquidity,
      netBalance,
      daysUntilPayday,
      dailyAllowance,
    };

    return NextResponse.json(kpis);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
