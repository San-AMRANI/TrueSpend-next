export function getDaysUntilPayday(payday) {
  const today = new Date();
  const nextPayday = new Date(today.getFullYear(), today.getMonth(), payday);
  if (nextPayday <= today) nextPayday.setMonth(nextPayday.getMonth() + 1);
  const diff = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}
