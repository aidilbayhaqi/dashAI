export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return "Belum ada update realtime";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatPeriod(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(new Date(`${startDate}T00:00:00`))} – ${formatter.format(new Date(`${endDate}T00:00:00`))}`;
}

export function formatTrend(value: number | null): string {
  if (value === null) return "Belum ada baseline";
  if (value === 0) return "Stabil";
  const absolute = Math.abs(value).toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  });
  return value > 0 ? `Naik ${absolute}%` : `Turun ${absolute}%`;
}
