import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EventSchema = z.object({
  event: z.enum(["shown", "accepted", "dismissed", "installed"]),
  path: z.string().trim().min(1).max(255),
  hint_mode: z.enum(["ios", "browser"]).nullable().optional(),
});

/* Public: log a PWA prompt event (no auth required — landing pages too) */
export const logPwaInstallEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => EventSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const userAgent = getRequestHeader("user-agent") ?? null;
      await (supabaseAdmin as any).from("pwa_install_events").insert({
        event: data.event,
        path: data.path,
        hint_mode: data.hint_mode ?? null,
        user_agent: userAgent,
      });
    } catch {
      // Fire-and-forget: nunca quebrar UX por telemetria
    }
    return { ok: true };
  });

/* Admin: aggregated conversion stats per route */
export const adminGetPwaInstallStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("pwa_install_events")
      .select("event, path, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const byPath = new Map<
      string,
      { path: string; shown: number; accepted: number; dismissed: number; installed: number }
    >();
    for (const row of (data as Array<{ event: string; path: string }>) ?? []) {
      const key = row.path;
      const cur =
        byPath.get(key) ??
        { path: key, shown: 0, accepted: 0, dismissed: 0, installed: 0 };
      if (row.event in cur) (cur as any)[row.event] += 1;
      byPath.set(key, cur);
    }
    return {
      rows: [...byPath.values()].sort((a, b) => b.shown - a.shown),
    };
  });
