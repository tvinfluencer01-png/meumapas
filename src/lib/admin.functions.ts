import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const bootstrapSuperAdmin = createServerFn({ method: "POST" }).handler(
  async () => {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
    const password = process.env.SUPER_ADMIN_PASSWORD ?? "";
    if (!email || !password) {
      return {
        ok: false as const,
        email: null,
        password: null,
        message: "Credenciais de Super Admin indisponíveis no runtime atual. Recarregue o preview e tente novamente.",
      };
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

    return { ok: true as const, email, password, message: null };
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
    const safeIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
    const [{ data: roles }, { data: subs }, { data: pkgs }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", safeIds)
        .eq("role", "admin"),
      supabaseAdmin
        .from("user_subscriptions")
        .select("user_id, addon_id, status, current_period_end")
        .in("user_id", safeIds)
        .eq("status", "active"),
      supabaseAdmin
        .from("landing_packages")
        .select("slug, name"),
    ]);
    const adminSet = new Set((roles ?? []).map((r) => r.user_id));

    const { CREDIT_PACKAGES, SUBSCRIPTION_ADDONS } = await import("@/lib/addons.catalog");
    const nameById = new Map<string, string>();
    for (const p of pkgs ?? []) nameById.set(p.slug, p.name);
    for (const a of [...CREDIT_PACKAGES, ...SUBSCRIPTION_ADDONS]) if (!nameById.has(a.id)) nameById.set(a.id, a.name);


    const plansByUser = new Map<string, string[]>();
    const now = Date.now();
    for (const s of subs ?? []) {
      if (s.current_period_end && new Date(s.current_period_end).getTime() < now) continue;
      const label = nameById.get(s.addon_id) ?? s.addon_id;
      const arr = plansByUser.get(s.user_id) ?? [];
      if (!arr.includes(label)) arr.push(label);
      plansByUser.set(s.user_id, arr);
    }

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
        plans: plansByUser.get(u.id) ?? [],
      }))
      .filter((u) =>
        q
          ? u.email.toLowerCase().includes(q) ||
            u.full_name.toLowerCase().includes(q)
          : true,
      );


    return { users, page: data.page, perPage, hasMore: list.users.length === perPage };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      full_name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(200),
      password: z.string().min(8).max(100),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });

    if (error) throw new Error(error.message);

    if (created.user) {
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: data.full_name })
        .eq("id", created.user.id);
    }

    return { ok: true, user_id: created.user!.id };
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

export const getSystemGlobalSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      whatsapp_number: data?.whatsapp_number ?? "",
      credit_value_cents: data?.credit_value_cents ?? 0,
    };
  });

export const saveSystemGlobalSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      whatsapp_number: z.string().trim().max(30).optional(),
      credit_value_cents: z.number().int().min(0).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("system_settings")
      .upsert(
        {
          id: "global",
          whatsapp_number: data.whatsapp_number,
          credit_value_cents: data.credit_value_cents,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPublicSystemSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("whatsapp_number")
      .eq("id", "global")
      .maybeSingle();
    return { whatsapp_number: data?.whatsapp_number ?? "" };
  });

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
      Body: "✨ Código Cósmico: integração Twilio configurada com sucesso!",
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

// --- Server function diagnostics ------------------------------------------
export const listServerFnLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      fn: z.string().trim().max(120).optional(),
      hours: z.number().int().min(1).max(720).optional().default(24),
      limit: z.number().int().min(1).max(200).optional().default(100),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();

    let query = supabaseAdmin
      .from("app_logs")
      .select("id, created_at, event, user_id, payload")
      .eq("event", "serverfn_error")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const { data: logs, error } = await query;
    if (error) throw new Error(error.message);

    // Filter by fn name (in payload) client-side since payload is jsonb
    const filtered = data.fn
      ? (logs ?? []).filter((l: any) =>
          String(l.payload?.fn ?? "").toLowerCase().includes(data.fn!.toLowerCase()),
        )
      : (logs ?? []);

    // Hydrate user emails
    const userIds = Array.from(
      new Set(filtered.map((l: any) => l.user_id).filter(Boolean)),
    ) as string[];

    const emailsById: Record<string, string> = {};
    const namesById: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      for (const p of profs ?? []) namesById[p.id] = p.full_name ?? "";

      // emails via auth admin
      for (const uid of userIds) {
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (u?.user?.email) emailsById[uid] = u.user.email;
        } catch {
          /* ignore */
        }
      }
    }

    return {
      logs: filtered.map((l: any) => ({
        id: l.id,
        created_at: l.created_at,
        event: l.event,
        fn: l.payload?.fn ?? null,
        message: l.payload?.message ?? null,
        stack: l.payload?.stack ?? null,
        extra: (() => {
          const { fn, message, stack, ...rest } = l.payload ?? {};
          return rest;
        })(),
        user_id: l.user_id,
        user_email: l.user_id ? emailsById[l.user_id] ?? null : null,
        user_name: l.user_id ? namesById[l.user_id] ?? null : null,
      })),
    };
  });

// ===== Mercado Pago integration =====

const MP_ENV = z.enum(["sandbox", "production"]);

export const getMercadoPagoSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("mercado_pago_settings")
      .select("public_key, environment, enabled, updated_at, access_token, webhook_secret")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      public_key: data?.public_key ?? "",
      environment: (data?.environment as "sandbox" | "production") ?? "sandbox",
      enabled: data?.enabled ?? false,
      updated_at: data?.updated_at ?? null,
      has_access_token: !!data?.access_token,
      has_webhook_secret: !!data?.webhook_secret,
    };
  });

const MpSaveSchema = z.object({
  public_key: z.string().trim().max(200).optional().default(""),
  access_token: z.string().trim().max(400).optional().default(""),
  webhook_secret: z.string().trim().max(200).optional().default(""),
  environment: MP_ENV,
  enabled: z.boolean(),
});

async function validateMercadoPagoToken(token: string) {
  let res: Response;
  try {
    res = await fetch("https://api.mercadopago.com/users/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Não foi possível contatar o Mercado Pago. Verifique sua conexão.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("Access Token inválido ou sem permissão.");
  }
  if (!res.ok) {
    throw new Error(`Mercado Pago recusou as credenciais (HTTP ${res.status}).`);
  }
  const json = (await res.json().catch(() => ({}))) as {
    id?: number;
    nickname?: string;
    email?: string;
    site_id?: string;
  };
  return {
    id: json.id ?? null,
    nickname: json.nickname ?? "",
    email: json.email ?? "",
    site_id: json.site_id ?? "",
  };
}

export const testMercadoPagoCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ access_token: z.string().trim().optional().default("") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let token = data.access_token?.trim() || "";
    if (!token) {
      const { data: existing } = await supabaseAdmin
        .from("mercado_pago_settings")
        .select("access_token")
        .eq("id", true)
        .maybeSingle();
      token = existing?.access_token ?? "";
    }
    if (!token) throw new Error("Informe o Access Token para validar.");
    const info = await validateMercadoPagoToken(token);
    return { ok: true, ...info };
  });

export const saveMercadoPagoSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MpSaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // If access token provided, validate it. If enabling without a new token, validate existing.
    if (data.access_token || data.enabled) {
      let token = data.access_token?.trim() || "";
      if (!token) {
        const { data: existing } = await supabaseAdmin
          .from("mercado_pago_settings")
          .select("access_token")
          .eq("id", true)
          .maybeSingle();
        token = existing?.access_token ?? "";
      }
      if (data.enabled && !token) {
        throw new Error("Informe o Access Token antes de ativar a integração.");
      }
      if (token) await validateMercadoPagoToken(token);
    }

    const update = {
      public_key: data.public_key || null,
      environment: data.environment,
      enabled: data.enabled,
      updated_by: context.userId,
      ...(data.access_token && data.access_token.length > 0
        ? { access_token: data.access_token }
        : {}),
      ...(data.webhook_secret && data.webhook_secret.length > 0
        ? { webhook_secret: data.webhook_secret }
        : {}),
    };
    const { error } = await supabaseAdmin
      .from("mercado_pago_settings")
      .update(update)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== User management (admin actions) =====


export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      user_id: z.string().uuid(),
      full_name: z.string().trim().max(120).optional(),
      email: z.string().trim().email().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const updates: { email?: string; user_metadata?: Record<string, unknown> } = {};
    if (data.email) updates.email = data.email;
    if (typeof data.full_name === "string") {
      updates.user_metadata = { full_name: data.full_name };
    }
    if (Object.keys(updates).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        data.user_id,
        updates,
      );
      if (error) throw new Error(error.message);
    }
    if (typeof data.full_name === "string") {
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: data.full_name })
        .eq("id", data.user_id);
    }
    return { ok: true };
  });

export const adminSetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      user_id: z.string().uuid(),
      password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.user_id,
      { password: data.password },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId) {
      throw new Error("Você não pode excluir o próprio usuário.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUserSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: subs, error } = await supabaseAdmin
      .from("user_subscriptions")
      .select("id, addon_id, status, current_period_end, created_at, updated_at")
      .eq("user_id", data.user_id)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { subscriptions: subs ?? [] };
  });

export const adminSetUserSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      user_id: z.string().uuid(),
      addon_id: z.string().trim().min(1).max(64),
      active: z.boolean(),
      days: z.number().int().min(1).max(3650).optional().default(30),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.active) {
      const periodEnd = new Date(
        Date.now() + (data.days ?? 30) * 86_400_000,
      ).toISOString();
      const { data: existing } = await supabaseAdmin
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", data.user_id)
        .eq("addon_id", data.addon_id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "active",
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .insert({
            user_id: data.user_id,
            addon_id: data.addon_id,
            status: "active",
            current_period_end: periodEnd,
          });
        if (error) throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", data.user_id)
        .eq("addon_id", data.addon_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminApplyLandingPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      user_id: z.string().uuid(),
      package_slug: z.string().trim().min(1).max(120),
      mode: z.enum(["add", "replace"]).default("add"),
      days: z.number().int().min(1).max(3650).optional().default(30),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from("landing_packages")
      .select("*")
      .eq("slug", data.package_slug)
      .maybeSingle();
    if (pkgErr) throw new Error(pkgErr.message);
    if (!pkg) throw new Error("Pacote não encontrado.");

    const periodEnd = new Date(Date.now() + (data.days ?? 30) * 86_400_000).toISOString();
    const addons = Array.isArray((pkg as any).included_addons)
      ? ((pkg as any).included_addons as string[])
      : [];

    if (data.mode === "replace") {
      // Cancel all current active subscriptions for this user
      await supabaseAdmin
        .from("user_subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("user_id", data.user_id)
        .eq("status", "active");
    }

    // Activate each addon from the package
    for (const addonId of addons) {
      const { data: existing } = await supabaseAdmin
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", data.user_id)
        .eq("addon_id", addonId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "active",
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .insert({
            user_id: data.user_id,
            addon_id: addonId,
            status: "active",
            current_period_end: periodEnd,
          });
        if (error) throw new Error(error.message);
      }
    }

    // Credit monthly credits if any
    const creditsPerMonth = (pkg as any).credits_per_month ?? 0;
    if (creditsPerMonth > 0) {
      await supabaseAdmin.rpc("adjust_credits", {
        _user_id: data.user_id,
        _amount: creditsPerMonth,
        _kind: "admin_grant",
        _reference: `Admin · ${data.mode === "replace" ? "mudou para" : "adicionou"} pacote ${pkg.name}`,
      });
    }

    await supabaseAdmin.from("app_logs").insert({
      event: "admin_apply_landing_package",
      user_id: context.userId,
      payload: {
        target_user_id: data.user_id,
        package_slug: data.package_slug,
        package_name: pkg.name,
        mode: data.mode,
        days: data.days,
        addons,
        credits_granted: creditsPerMonth,
      },
    });

    return {
      ok: true,
      package_name: pkg.name,
      addons,
      credits_granted: creditsPerMonth,
    };
  });

// --- Evolution API (WhatsApp) ---------------------------------------------

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D+/g, "");
}

export const getEvolutionSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (supabaseAdmin as any)
      .from("evolution_settings")
      .select("base_url, instance_name, enabled, updated_at, global_api_key")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      base_url: data?.base_url ?? "",
      instance_name: data?.instance_name ?? "",
      enabled: data?.enabled ?? false,
      updated_at: data?.updated_at ?? null,
      has_api_key: !!data?.global_api_key,
    };
  });

const EvoSaveSchema = z.object({
  base_url: z
    .string()
    .trim()
    .url("URL base inválida (ex: https://api.seudominio.com)")
    .or(z.literal("")),
  global_api_key: z.string().trim().max(400).optional(),
  instance_name: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-zA-Z0-9_-]*$/u, "Use apenas letras, números, hífen e underscore")
    .optional()
    .default(""),
  enabled: z.boolean(),
});

async function evolutionFetch(
  baseUrl: string,
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? "" : "/"}${path}`;
  return fetch(url, {
    ...(init ?? {}),
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export const testEvolutionConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      base_url: z.string().trim().url(),
      global_api_key: z.string().trim().optional().default(""),
      instance_name: z.string().trim().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let key = data.global_api_key?.trim() || "";
    if (!key) {
      const { data: existing } = await (supabaseAdmin as any)
        .from("evolution_settings")
        .select("global_api_key")
        .eq("id", true)
        .maybeSingle();
      key = existing?.global_api_key ?? "";
    }
    if (!key) throw new Error("Informe a API Key global para testar a conexão.");

    // If instance name provided, check its connection state; otherwise list instances
    let res: Response;
    if (data.instance_name) {
      res = await evolutionFetch(
        data.base_url,
        key,
        `/instance/connectionState/${encodeURIComponent(data.instance_name)}`,
        { method: "GET" },
      );
    } else {
      res = await evolutionFetch(data.base_url, key, `/instance/fetchInstances`, { method: "GET" });
    }
    const json = await res.json().catch(() => ({} as any));
    if (res.status === 401 || res.status === 403) {
      throw new Error("API Key inválida ou sem permissão.");
    }
    if (res.status === 404 && data.instance_name) {
      throw new Error(`Instância "${data.instance_name}" não encontrada nesta URL.`);
    }
    if (!res.ok) {
      throw new Error(`Evolution recusou (HTTP ${res.status}): ${JSON.stringify(json).slice(0, 240)}`);
    }
    if (data.instance_name) {
      const state =
        json?.instance?.state ??
        json?.state ??
        json?.status ??
        "unknown";
      return { ok: true, mode: "instance" as const, state: String(state), raw: json };
    }
    const count = Array.isArray(json) ? json.length : 0;
    return { ok: true, mode: "list" as const, instances: count };
  });

export const saveEvolutionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EvoSaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.enabled) {
      if (!data.base_url) throw new Error("Informe a URL base para ativar a Evolution.");
      if (!data.instance_name) throw new Error("Informe o nome da instância para ativar.");
      let key = data.global_api_key?.trim() || "";
      if (!key) {
        const { data: existing } = await (supabaseAdmin as any)
          .from("evolution_settings")
          .select("global_api_key")
          .eq("id", true)
          .maybeSingle();
        key = existing?.global_api_key ?? "";
      }
      if (!key) throw new Error("Informe a API Key para ativar.");
      const res = await evolutionFetch(
        data.base_url,
        key,
        `/instance/connectionState/${encodeURIComponent(data.instance_name)}`,
        { method: "GET" },
      );
      if (!res.ok) {
        throw new Error(`Não foi possível validar a instância (HTTP ${res.status}). Verifique URL, API Key e nome da instância.`);
      }
    }

    const update: Record<string, unknown> = {
      base_url: data.base_url ? normalizeBaseUrl(data.base_url) : null,
      instance_name: data.instance_name || null,
      enabled: data.enabled,
      updated_by: context.userId,
    };
    if (data.global_api_key && data.global_api_key.length > 0) {
      update.global_api_key = data.global_api_key;
    }
    const { error } = await (supabaseAdmin as any)
      .from("evolution_settings")
      .update(update)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendEvolutionTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      to: z
        .string()
        .trim()
        .regex(/^\+?[1-9]\d{7,14}$/u, "Número em formato internacional (ex: +5511999998888)"),
      text: z.string().trim().min(1).max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: s, error } = await (supabaseAdmin as any)
      .from("evolution_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!s?.enabled) throw new Error("Ative a integração Evolution antes de testar.");
    if (!s?.base_url || !s?.global_api_key || !s?.instance_name) {
      throw new Error("Configure URL base, API Key e nome da instância primeiro.");
    }
    const res = await evolutionFetch(
      s.base_url,
      s.global_api_key,
      `/message/sendText/${encodeURIComponent(s.instance_name)}`,
      {
        method: "POST",
        body: JSON.stringify({
          number: digitsOnly(data.to),
          text: data.text ?? "✨ Código Cósmico: integração Evolution API funcionando!",
        }),
      },
    );
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      throw new Error(`Evolution ${res.status}: ${JSON.stringify(json).slice(0, 240)}`);
    }
    const id = json?.key?.id ?? json?.messageId ?? json?.id ?? "ok";
    return { ok: true, id: String(id) };
  });

// ===== Lovable AI key status (admin only) =====
export const getLovableApiKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const key = process.env.LOVABLE_API_KEY ?? "";
    return {
      configured: key.length > 0,
      key: key || null,
    };
  });

export const migrateUserAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      target_user_id: z.string().uuid(),
      old_addon_id: z.string().min(1),
      new_addon_id: z.string().min(1),
      preserve_dates: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: existing } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", data.target_user_id)
      .eq("addon_id", data.old_addon_id)
      .maybeSingle();

    if (!existing) {
      throw new Error("Assinatura de origem não encontrada para este usuário.");
    }

    // Check if new one already exists
    const { data: conflict } = await supabaseAdmin
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", data.target_user_id)
      .eq("addon_id", data.new_addon_id)
      .maybeSingle();

    if (conflict) {
      throw new Error("O usuário já possui o novo plano ativo. Remova-o antes de migrar.");
    }

    // Perform migration
    const { error: insErr } = await supabaseAdmin
      .from("user_subscriptions")
      .insert({
        user_id: data.target_user_id,
        addon_id: data.new_addon_id,
        status: existing.status,
        current_period_end: data.preserve_dates ? existing.current_period_end : null,
        mp_preapproval_id: existing.mp_preapproval_id,
        updated_at: new Date().toISOString()
      });

    if (insErr) throw new Error(`Erro ao criar nova assinatura: ${insErr.message}`);

    const { error: delErr } = await supabaseAdmin
      .from("user_subscriptions")
      .delete()
      .eq("id", existing.id);

    if (delErr) {
      // Cleanup partially migrated state
      await supabaseAdmin.from("user_subscriptions").delete().eq("user_id", data.target_user_id).eq("addon_id", data.new_addon_id);
      throw new Error(`Erro ao remover assinatura antiga: ${delErr.message}`);
    }

    // Log the migration
    await supabaseAdmin.from("app_logs").insert({
      event: "addon_migration",
      user_id: context.userId,
      payload: {
        target_user_id: data.target_user_id,
        from: data.old_addon_id,
        to: data.new_addon_id,
        preserved_dates: data.preserve_dates
      }
    });

    return { ok: true };
  });

export const adminListAllActiveSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("user_subscriptions")
      .select(`
        id, 
        addon_id, 
        status, 
        current_period_end, 
        user_id
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    
    // Hydrate profile names separately to avoid complex joins issues in client
    const userIds = Array.from(new Set(data?.map(s => s.user_id) || []));
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    
    const nameMap = Object.fromEntries(profs?.map(p => [p.id, p.full_name]) || []);

    return (data || []).map(s => ({
      ...s,
      full_name: nameMap[s.user_id] || "Sem nome"
    }));
  });

export const testAstrologyCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().trim().min(1, "User ID é obrigatório"),
      apiKey: z.string().trim().min(1, "API Key é obrigatória"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    
    const auth = btoa(`${data.userId}:${data.apiKey}`);
    
    try {
      const res = await fetch("https://json.astrologyapi.com/v1/sun_sign_prediction/daily/aries", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ timezone: 5.5 })
      });

      if (res.status === 401) {
        throw new Error("Credenciais inválidas: User ID ou API Key incorretos.");
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro na AstrologyAPI (HTTP ${res.status}): ${text || "Erro desconhecido"}`);
      }

      return { ok: true, message: "Conexão estabelecida com sucesso!" };
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Erro ao conectar com AstrologyAPI");
    }
  });





