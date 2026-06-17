export function computeNextAvailableDate(activeDays: number[]): string | null {
  if (!activeDays || activeDays.length === 0) return null;
  const today = new Date();
  const todayDow = today.getDay();
  for (let offset = 0; offset < 7; offset++) {
    const candidate = (todayDow + offset) % 7;
    if (activeDays.includes(candidate)) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      return date.toISOString().slice(0, 10);
    }
  }
  return null;
}
