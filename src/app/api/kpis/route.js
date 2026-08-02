import { NextResponse } from 'next/server';
import { verifyApiAuth, verifyCookieToken } from '@/lib/auth';
import { calculateKpis, getDaysUntilPayday, calculateDailyAllowance } from '@/lib/logic';

export async function GET(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!verifyCookieToken(cookie) && !verifyApiAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const kpis = calculateKpis();
  const days = getDaysUntilPayday();
  const dailyAllowance = calculateDailyAllowance(kpis.totalLiquidity);
  return NextResponse.json({ ...kpis, daysUntilPayday: days, dailyAllowance });
}
