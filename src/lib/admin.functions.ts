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

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      search: z.string().trim().max(120).optional().default(""),
      page: z.number().int().min(1).max(50).optional().default(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const perPage = 50;
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: data.page,
      perPage,
    });
    if (error) throw new Error(error.message);

    const ids = list.users.map((u) => u.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .eq("role", "admin");
    const adminSet = new Set((roles ?? []).map((r) => r.user_id));

    const q = data.search.toLowerCase();
    const users = list.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        full_name:
          (u.user_metadata?.full_name as string | undefined) ??
          (u.user_metadata?.name as string | undefined) ??
          "",
        created_at: u.created_at,
        is_admin: adminSet.has(u.id),
      }))
      .filter((u) =>
        q
          ? u.email.toLowerCase().includes(q) ||
            u.full_name.toLowerCase().includes(q)
          : true,
      );

    return { users, page: data.page, perPage, hasMore: list.users.length === perPage };
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      user_id: z.string().uuid(),
      is_admin: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId && !data.is_admin) {
      throw new Error("Você não pode remover seu próprio acesso de admin.");
    }
    if (data.is_admin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: data.user_id, role: "admin" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }

    // Audit log (best-effort: fetch emails for readability)
    const [{ data: actor }, { data: target }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(context.userId),
      supabaseAdmin.auth.admin.getUserById(data.user_id),
    ]);
    await supabaseAdmin.from("role_audit_log").insert({
      target_user_id: data.user_id,
      target_email: target?.user?.email ?? null,
      actor_user_id: context.userId,
      actor_email: actor?.user?.email ?? null,
      role: "admin",
      action: data.is_admin ? "grant" : "revoke",
    });

    return { ok: true };
  });

export const listRoleAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      limit: z.number().int().min(1).max(200).optional().default(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("role_audit_log")
      .select("id, target_user_id, target_email, actor_user_id, actor_email, role, action, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { entries: rows ?? [] };
  });

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

type TwilioAccountInfo = {
  status: string;
  friendly_name: string;
  type: string;
};

async function validateTwilioCredentials(
  accountSid: string,
  authToken: string,
): Promise<TwilioAccountInfo> {
  let res: Response;
  try {
    const auth = btoa(`${accountSid}:${authToken}`);
    res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      { method: "GET", headers: { Authorization: `Basic ${auth}` } },
    );
  } catch {
    throw new Error("Não foi possível contatar a Twilio. Verifique sua conexão e tente novamente.");
  }
  if (res.status === 401) {
    throw new Error("Credenciais inválidas: a Twilio rejeitou o Account SID ou o Auth Token.");
  }
  if (res.status === 404) {
    throw new Error("Account SID não encontrado na Twilio.");
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({} as { message?: string }));
    throw new Error(`Twilio recusou as credenciais (HTTP ${res.status}): ${j?.message ?? "erro desconhecido"}.`);
  }
  const json = await res.json().catch(() => ({} as Partial<TwilioAccountInfo>));
  return {
    status: String(json?.status ?? "unknown"),
    friendly_name: String(json?.friendly_name ?? ""),
    type: String(json?.type ?? ""),
  };
}

export const testTwilioCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      account_sid: z.string().trim().min(1, "Account SID é obrigatório"),
      auth_token: z.string().trim().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let tokenToCheck = data.auth_token?.trim() || "";
    if (!tokenToCheck) {
      const { data: existing } = await supabaseAdmin
        .from("twilio_settings")
        .select("auth_token")
        .eq("id", true)
        .maybeSingle();
      tokenToCheck = existing?.auth_token ?? "";
    }
    if (!tokenToCheck) {
      throw new Error("Informe o Auth Token para validar as credenciais.");
    }
    const info = await validateTwilioCredentials(data.account_sid, tokenToCheck);
    return { ok: true, ...info };
  });

export const saveTwilioSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Validate credentials against Twilio before persisting (only when SID is set)
    if (data.account_sid) {
      let tokenToCheck = data.auth_token?.trim() || "";
      if (!tokenToCheck) {
        const { data: existing } = await supabaseAdmin
          .from("twilio_settings")
          .select("auth_token")
          .eq("id", true)
          .maybeSingle();
        tokenToCheck = existing?.auth_token ?? "";
      }
      if (!tokenToCheck) {
        throw new Error("Informe o Auth Token para validar as credenciais.");
      }
      const info = await validateTwilioCredentials(data.account_sid, tokenToCheck);
      if (info.status !== "active") {
        throw new Error(`Conta Twilio está com status "${info.status}", não é possível salvar.`);
      }
    }

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
