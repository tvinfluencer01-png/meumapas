// Helpers to compute the local calendar context (date/hour/dow) for a given IANA timezone.

export type LocalContext = {
  today: string; // YYYY-MM-DD in the given tz
  currentLocalHour: number; // 0-23
  currentLocalMinute: number; // 0-59
  currentMinutesOfDay: number;
  localDow: number; // 0=Sun ... 6=Sat
};

const DOW_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const cache = new Map<string, { at: number; ctx: LocalContext }>();

export function localContextFor(timezone: string | null | undefined, now = new Date()): LocalContext {
  const tz = timezone && timezone.trim() ? timezone : "America/Sao_Paulo";
  // Cache within the same minute for the same tz.
  const bucket = Math.floor(now.getTime() / 60000);
  const key = `${tz}@${bucket}`;
  const hit = cache.get(key);
  if (hit) return hit.ctx;

  let parts: Record<string, string>;
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, weekday: "short",
    }).formatToParts(now).reduce<Record<string, string>>((a, p) => (a[p.type] = p.value, a), {});
  } catch {
    // fallback to Sao Paulo if the tz is invalid
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, weekday: "short",
    }).formatToParts(now).reduce<Record<string, string>>((a, p) => (a[p.type] = p.value, a), {});
  }

  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const currentLocalHour = Number(parts.hour) % 24;
  const currentLocalMinute = Number(parts.minute) % 60;
  const ctx: LocalContext = {
    today,
    currentLocalHour,
    currentLocalMinute,
    currentMinutesOfDay: currentLocalHour * 60 + currentLocalMinute,
    localDow: DOW_MAP[parts.weekday] ?? 0,
  };
  cache.set(key, { at: bucket, ctx });
  // Cap cache size.
  if (cache.size > 200) {
    for (const k of Array.from(cache.keys()).slice(0, 100)) cache.delete(k);
  }
  return ctx;
}
