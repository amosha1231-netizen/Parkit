// Keep in sync with public.quote_agorot() in supabase/migrations/0001_init.sql
export const SERVICE_FEE_RATE = 0.15;

export function quoteAgorot(hourAgorot: number, dayAgorot: number, minutes: number): number {
  const days = Math.floor(minutes / 1440);
  const restHours = Math.ceil((minutes % 1440) / 60);
  return days * dayAgorot + Math.min(restHours * hourAgorot, dayAgorot);
}

export function quote(hourAgorot: number, dayAgorot: number, start: Date, end: Date) {
  const minutes = Math.ceil((end.getTime() - start.getTime()) / 60000);
  const price = quoteAgorot(hourAgorot, dayAgorot, minutes);
  const fee = Math.round(price * SERVICE_FEE_RATE);
  return { price, fee, total: price + fee };
}

export function shekels(agorot: number): string {
  return "₪" + (agorot / 100).toLocaleString("he-IL", { maximumFractionDigits: 2 });
}
