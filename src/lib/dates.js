export function getDaysUntilPayday(payday) {
  // NOTE: This is a temporary, stable implementation to prevent server crashes.
  // A more robust date calculation will be implemented next.
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  if (currentDay > payday) {
    return (daysInMonth - currentDay) + payday;
  } else {
    return payday - currentDay;
  }
}
