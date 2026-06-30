import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CrmFollowupSettings = {
  id: string | null;
  enabled: boolean;
  days_after_lead: number;
  days_after_last_email: number;
  max_followups: number;
  subject_template: string;
  body_template: string;
};

const DEFAULTS: CrmFollowupSettings = {
  id: null,
  enabled: false,
  days_after_lead: 1,
  days_after_last_email: 3,
  max_followups: 4,
  subject_template: "Ainda pensando no seu {{produto}}?",
  body_template:
    "Olá {{nome}},\n\nNotamos que você se interessou pelo {{produto}} mas não concluiu a compra. Estamos à disposição para tirar dúvidas.\n\nCaso queira finalizar, é só responder este e-mail.\n\nAbraços,\nEquipe Código Cósmico",
};

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const getCrmFollowupSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CrmFollowupSettings> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("crm_followup_settings" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return DEFAULTS;
    const r = data as any;
    return {
      id: r.id,
      enabled: r.enabled,
      days_after_lead: r.days_after_lead,
      days_after_last_email: r.days_after_last_email,
      max_followups: r.max_followups,
      subject_template: r.subject_template,
      body_template: r.body_template,
    };
  });

const SaveSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  enabled: z.boolean(),
  days_after_lead: z.number().int().min(0).max(365),
  days_after_last_email: z.number().int().min(1).max(365),
  max_followups: z.number().int().min(1).max(20),
  subject_template: z.string().trim().min(1).max(200),
  body_template: z.string().trim().min(1).max(5000),
});

export const saveCrmFollowupSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      enabled: data.enabled,
      days_after_lead: data.days_after_lead,
      days_after_last_email: data.days_after_last_email,
      max_followups: data.max_followups,
      subject_template: data.subject_template,
      body_template: data.body_template,
    };
    const { data: existing } = await supabaseAdmin
      .from("crm_followup_settings" as any)
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing && (existing as any).id) {
      const id = (existing as any).id as string;
      const { error } = await supabaseAdmin
        .from("crm_followup_settings" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("crm_followup_settings" as any)
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as any).id };
  });

// Core dispatch logic — shared by cron route and manual trigger
export async function dispatchPendingFollowups() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: settingsRow } = await supabaseAdmin
    .from("crm_followup_settings" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const s = (settingsRow as any) ?? DEFAULTS;
  if (!s.enabled) return { sent: 0, skipped: 0, reason: "disabled" };

  const { data: smtp } = await supabaseAdmin
    .from("smtp_settings" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!smtp || !(smtp as any).enabled) return { sent: 0, skipped: 0, reason: "smtp_disabled" };

  const now = Date.now();
  const { data: leads } = await supabaseAdmin
    .from("crm_leads")
    .select("id,email,full_name,landing_slug,created_at,last_followup_at,followup_count,status,followup_paused")
    .in("status", ["new", "contacted", "negotiating"])
    .eq("followup_paused", false)
    .lt("followup_count", s.max_followups)
    .limit(200);

  const due: any[] = [];
  for (const l of leads ?? []) {
    const base = l.last_followup_at
      ? new Date(l.last_followup_at).getTime() + s.days_after_last_email * 86400_000
      : new Date(l.created_at).getTime() + s.days_after_lead * 86400_000;
    if (base <= now) due.push(l);
  }

  if (due.length === 0) return { sent: 0, skipped: 0 };

  const nodemailer = (await import("nodemailer")).default;
  const sm = smtp as any;
  const transporter = nodemailer.createTransport({
    host: sm.host,
    port: sm.port,
    secure: !!sm.secure,
    auth: { user: sm.username, pass: sm.password },
  });

  let sent = 0;
  let skipped = 0;
  for (const l of due) {
    const vars: Record<string, string> = {
      nome: l.full_name || "amigo(a)",
      produto: l.landing_slug || "nosso produto",
      email: l.email,
    };
    const fill = (t: string) =>
      t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");
    const attempt = (l.followup_count ?? 0) + 1;
    const subject = fill(s.subject_template);
    const body = fill(s.body_template);
    try {
      await transporter.sendMail({
        from: `"${sm.from_name || sm.from_email}" <${sm.from_email}>`,
        to: l.email,
        replyTo: sm.reply_to || undefined,
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
      });
      const nowIso = new Date().toISOString();
      const nextAt = new Date(now + s.days_after_last_email * 86400_000).toISOString();
      await supabaseAdmin
        .from("crm_leads")
        .update({
          last_followup_at: nowIso,
          last_contact_at: nowIso,
          followup_count: attempt,
          next_followup_at: attempt >= s.max_followups ? null : nextAt,
          status: l.status === "new" ? "contacted" : l.status,
        } as any)
        .eq("id", l.id);
      await supabaseAdmin.from("crm_followup_history" as any).insert({
        lead_id: l.id,
        attempt_number: attempt,
        status: "sent",
        subject,
        body,
        recipient_email: l.email,
      } as any);
      sent++;
    } catch (e: any) {
      skipped++;
      console.error("[crm-followup] failed", l.id, e);
      await supabaseAdmin.from("crm_followup_history" as any).insert({
        lead_id: l.id,
        attempt_number: attempt,
        status: "failed",
        subject,
        body,
        recipient_email: l.email,
        error_message: e?.message ?? String(e),
      } as any);
    }
  }
  return { sent, skipped };
}

export const runCrmFollowupsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return dispatchPendingFollowups();
  });

export const listCrmFollowupHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("crm_followup_history" as any)
      .select("id,lead_id,attempt_number,status,subject,recipient_email,error_message,created_at")
      .eq("lead_id", data.leadId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      lead_id: string;
      attempt_number: number;
      status: "sent" | "failed" | "attempt";
      subject: string | null;
      recipient_email: string;
      error_message: string | null;
      created_at: string;
    }>;
  });
