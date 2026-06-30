import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StatusKey = "contacted" | "negotiating" | "converted";

export type CrmStatusAutomation = {
  status: StatusKey;
  email_enabled: boolean;
  email_subject: string;
  email_body: string;
  whatsapp_enabled: boolean;
  whatsapp_message: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listCrmStatusAutomations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("crm_status_automations" as any)
      .select("*")
      .order("status");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as CrmStatusAutomation[];
  });

const SaveSchema = z.object({
  status: z.enum(["contacted", "negotiating", "converted"]),
  email_enabled: z.boolean(),
  email_subject: z.string().trim().max(200),
  email_body: z.string().trim().max(5000),
  whatsapp_enabled: z.boolean(),
  whatsapp_message: z.string().trim().max(2000),
});

export const saveCrmStatusAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("crm_status_automations" as any)
      .upsert(data as any, { onConflict: "status" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Core dispatcher — called from updateCrmLead when status transitions
export async function runStatusAutomation(leadId: string, newStatus: string) {
  if (!["contacted", "negotiating", "converted"].includes(newStatus)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: lead }, { data: cfgRow }] = await Promise.all([
    supabaseAdmin
      .from("crm_leads")
      .select("id,email,full_name,phone,landing_slug,customer_data")
      .eq("id", leadId)
      .maybeSingle(),
    supabaseAdmin
      .from("crm_status_automations" as any)
      .select("*")
      .eq("status", newStatus)
      .maybeSingle(),
  ]);
  if (!lead || !cfgRow) return;
  const l = lead as any;
  const cfg = cfgRow as any;

  const vars: Record<string, string> = {
    nome: l.full_name || "amigo(a)",
    produto: l.landing_slug || "nosso produto",
    email: l.email,
  };
  const fill = (t: string) =>
    (t || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");

  const logEntry = async (
    channel: "email" | "whatsapp",
    status: "sent" | "failed",
    subject: string | null,
    body: string,
    recipient: string,
    errorMessage?: string,
  ) => {
    try {
      await supabaseAdmin.from("crm_followup_history" as any).insert({
        lead_id: leadId,
        attempt_number: 1,
        status,
        subject,
        body,
        recipient_email: recipient,
        error_message: errorMessage ?? null,
        channel,
        trigger_type: "status_change",
        metadata: { transition_to: newStatus },
      } as any);
    } catch (e) {
      console.error("[status-automation] log failed", e);
    }
  };

  // ---- EMAIL ----
  if (cfg.email_enabled && l.email) {
    const subject = fill(cfg.email_subject);
    const body = fill(cfg.email_body);
    try {
      const { data: smtp } = await supabaseAdmin
        .from("smtp_settings" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!smtp || !(smtp as any).enabled) {
        throw new Error("SMTP não configurado ou desabilitado.");
      }
      const sm = smtp as any;
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: sm.host,
        port: sm.port,
        secure: !!sm.secure,
        auth: { user: sm.username, pass: sm.password },
      });
      await transporter.sendMail({
        from: `"${sm.from_name || sm.from_email}" <${sm.from_email}>`,
        to: l.email,
        replyTo: sm.reply_to || undefined,
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
      });
      await logEntry("email", "sent", subject, body, l.email);
    } catch (e: any) {
      console.error("[status-automation] email failed", e);
      await logEntry("email", "failed", subject, body, l.email, e?.message ?? String(e));
    }
  }

  // ---- WHATSAPP ----
  if (cfg.whatsapp_enabled) {
    const cd = (l.customer_data ?? {}) as Record<string, any>;
    const rawPhone = String(
      cd.phone_e164 ?? cd.whatsapp ?? l.phone ?? cd.phone ?? cd.telefone ?? "",
    ).replace(/\D+/g, "");
    const message = fill(cfg.whatsapp_message);
    if (!rawPhone) {
      await logEntry("whatsapp", "failed", null, message, l.email, "Telefone do lead não encontrado.");
    } else {
      const phone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
      try {
        const { data: evo } = await supabaseAdmin
          .from("evolution_settings" as any)
          .select("*")
          .eq("enabled", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const e = evo as any;
        if (!e?.base_url || !e?.global_api_key || !e?.instance_name) {
          throw new Error("Evolution API (WhatsApp) não configurada.");
        }
        const base = String(e.base_url).replace(/\/+$/, "");
        const url = `${base}/message/sendText/${encodeURIComponent(e.instance_name)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { apikey: e.global_api_key, "Content-Type": "application/json" },
          body: JSON.stringify({ number: phone, text: message }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`Evolution HTTP ${res.status}: ${t.slice(0, 200) || res.statusText}`);
        }
        await logEntry("whatsapp", "sent", null, message, l.email);
      } catch (err: any) {
        await logEntry("whatsapp", "failed", null, message, l.email, err?.message ?? String(err));
      }
    }
  }
}
