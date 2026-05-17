import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const bootstrapSuperAdmin = createServerFn({ method: "POST" }).handler(
  async () => {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error("SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD não configurados.");
    }

    // Find or create the user
    let userId: string | null = null;
    const { data: list, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw new Error(listErr.message);
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === email,
    );
    if (existing) {
      userId = existing.id;
      // Ensure password matches the env value (idempotent reset)
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Super Admin" },
        });
      if (createErr) throw new Error(createErr.message);
      userId = created.user!.id;
    }

    // Ensure admin role
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId!)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId!, role: "admin" });
      if (insErr) throw new Error(insErr.message);
    }

    return { email, password };
  },
);

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export const getTwilioSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("twilio_settings")
      .select("account_sid, whatsapp_from, messaging_service_sid, sms_from, enabled, updated_at, auth_token")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      account_sid: data?.account_sid ?? "",
      whatsapp_from: data?.whatsapp_from ?? "",
      messaging_service_sid: data?.messaging_service_sid ?? "",
      sms_from: data?.sms_from ?? "",
      enabled: data?.enabled ?? false,
      updated_at: data?.updated_at ?? null,
      has_auth_token: !!data?.auth_token,
    };
  });

const SaveSchema = z.object({
  account_sid: z.string().trim().regex(/^AC[a-zA-Z0-9]{30,40}$/u, "Account SID inválido (deve começar com AC)").or(z.literal("")),
  auth_token: z.string().trim().max(200).optional(),
  whatsapp_from: z.string().trim().max(40).optional().default(""),
  messaging_service_sid: z.string().trim().max(64).optional().default(""),
  sms_from: z.string().trim().max(40).optional().default(""),
  enabled: z.boolean(),
});

export const saveTwilioSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const update = {
      account_sid: data.account_sid || null,
      whatsapp_from: data.whatsapp_from || null,
      messaging_service_sid: data.messaging_service_sid || null,
      sms_from: data.sms_from || null,
      enabled: data.enabled,
      updated_by: context.userId,
      ...(data.auth_token && data.auth_token.length > 0 ? { auth_token: data.auth_token } : {}),
    };
    const { error } = await supabaseAdmin
      .from("twilio_settings")
      .update(update)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTwilioTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      to: z.string().trim().regex(/^\+[1-9]\d{6,14}$/u, "Número deve estar em formato E.164 (+5511999999999)"),
      channel: z.enum(["whatsapp", "sms"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: s, error } = await supabaseAdmin
      .from("twilio_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!s?.account_sid || !s?.auth_token) {
      throw new Error("Configure o Account SID e o Auth Token primeiro.");
    }
    const from =
      data.channel === "whatsapp"
        ? (s.whatsapp_from?.startsWith("whatsapp:") ? s.whatsapp_from : `whatsapp:${s.whatsapp_from ?? ""}`)
        : (s.sms_from ?? "");
    const to = data.channel === "whatsapp" ? `whatsapp:${data.to}` : data.to;
    if (!s.messaging_service_sid && (!from || from === "whatsapp:")) {
      throw new Error(`Defina ${data.channel === "whatsapp" ? "o número WhatsApp remetente" : "o número SMS remetente"} ou o Messaging Service SID.`);
    }

    const body = new URLSearchParams({
      To: to,
      Body: "✨ Cosmic AI: integração Twilio configurada com sucesso!",
    });
    if (s.messaging_service_sid) body.set("MessagingServiceSid", s.messaging_service_sid);
    else body.set("From", from);

    const auth = btoa(`${s.account_sid}:${s.auth_token}`);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${s.account_sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Twilio ${res.status}: ${json?.message ?? "erro desconhecido"}`);
    }
    return { ok: true, sid: json.sid };
  });
