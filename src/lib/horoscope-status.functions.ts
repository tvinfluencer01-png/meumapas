import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type UserHoroscopeStatus = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  enabled: boolean;
  frequency: string;
  last_sent_on: string | null;
  delivered_today: number;
  errors_today: number;
  pending: boolean;
  last_log_at: string | null;
  last_status: string | null;
  last_detail: string | null;
};

export type HoroscopeStatusResult = {
  lastCronRun: {
    started: string | null;
    ended: string | null;
    status: string | null;
    message: string | null;
  } | null;
  totals: { delivered: number; errors: number; pending: number; subscribers: number };
  users: UserHoroscopeStatus[];
};

export const getHoroscopeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HoroscopeStatusResult> => {
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("forbidden");

    // Last cron run for daily-horoscope job
    const { data: cronRows } = await supabaseAdmin.rpc("admin_cron_status");
    const cron = (cronRows ?? []).find((r: any) =>
      String(r.command || "").includes("daily-horoscope") ||
      String(r.jobname || "").includes("horoscope"),
    );
    const lastCronRun = cron
      ? {
          started: cron.last_run_started,
          ended: cron.last_run_ended,
          status: cron.last_status,
          message: cron.last_return_message,
        }
      : null;

    // Subscribers
    const { data: subs } = await supabaseAdmin
      .from("horoscope_subscriptions")
      .select("user_id, enabled, frequency, last_sent_on, email");
    const subscribers = subs ?? [];

    // Today's logs
    const today = new Date().toISOString().slice(0, 10);
    const { data: logs } = await supabaseAdmin
      .from("horoscope_log")
      .select("user_id, status, detail, created_at, date")
      .eq("date", today)
      .order("created_at", { ascending: false });
    const logList = logs ?? [];

    const userIds = Array.from(new Set(subscribers.map((s) => s.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as any[] };
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

    let delivered = 0;
    let errors = 0;
    let pending = 0;

    const users: UserHoroscopeStatus[] = subscribers.map((s) => {
      const userLogs = logList.filter((l) => l.user_id === s.user_id);
      const del = userLogs.filter((l) => l.status === "sent" || l.status === "delivered" || l.status === "ok").length;
      const err = userLogs.filter((l) => l.status === "error" || l.status === "failed").length;
      const isPending = s.enabled && s.last_sent_on !== today && del === 0;
      delivered += del;
      errors += err;
      if (isPending) pending += 1;
      const last = userLogs[0];
      return {
        user_id: s.user_id,
        email: s.email,
        full_name: profileMap.get(s.user_id) ?? null,
        enabled: s.enabled,
        frequency: s.frequency,
        last_sent_on: s.last_sent_on,
        delivered_today: del,
        errors_today: err,
        pending: isPending,
        last_log_at: last?.created_at ?? null,
        last_status: last?.status ?? null,
        last_detail: last?.detail ?? null,
      };
    });

    users.sort((a, b) => Number(b.pending) - Number(a.pending) || b.errors_today - a.errors_today);

    return {
      lastCronRun,
      totals: { delivered, errors, pending, subscribers: subscribers.length },
      users,
    };
  });
