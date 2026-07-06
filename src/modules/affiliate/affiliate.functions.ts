import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidCpf, normalizeCpf } from "./lib/cpf";
import { generateAffiliateCode, generateSecret } from "./lib/codes";

// ─────────────────────────────────────────────────────────────
// WhatsApp verification helpers
// ─────────────────────────────────────────────────────────────
function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}
function maskWhatsapp(w: string) {
  const d = w.replace(/\D/g, "");
  if (d.length < 4) return "***";
  return `${d.slice(0, 2)}****${d.slice(-2)}`;
}
async function sendWhatsappCode(phone: string, code: string) {
  const { getAdmin } = await import("./affiliate.server");
  const admin = await getAdmin();
  const { data: evo } = await admin
    .from("evolution_settings" as any)
    .select("*")
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const e = evo as any;
  if (!e?.base_url || !e?.global_api_key || !e?.instance_name) {
    throw new Error("Envio de WhatsApp indisponível: Evolution API não configurada.");
  }
  const base = String(e.base_url).replace(/\/+$/, "");
  const text =
    `✨ Programa de Afiliados\n\nSeu código de confirmação é: *${code}*\n\nEle expira em 10 minutos. Use-o para ativar seu login.`;
  const res = await fetch(`${base}/message/sendText/${encodeURIComponent(e.instance_name)}`, {
    method: "POST",
    headers: { apikey: e.global_api_key, "Content-Type": "application/json" },
    body: JSON.stringify({ number: phone.replace(/\D/g, ""), text }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao enviar código via WhatsApp (HTTP ${res.status}): ${t.slice(0, 160)}`);
  }
}
async function issueVerificationCode(affiliateId: string, phone: string) {
  const { getAdmin } = await import("./affiliate.server");
  const admin = await getAdmin();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await admin
    .from("affiliate_verification_codes" as any)
    .update({ consumed_at: new Date().toISOString() })
    .eq("affiliate_id", affiliateId)
    .is("consumed_at", null);
  await admin.from("affiliate_verification_codes" as any).insert({
    affiliate_id: affiliateId,
    code_hash: hashCode(code),
    channel: "whatsapp",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  await sendWhatsappCode(phone, code);
}


// ─────────────────────────────────────────────────────────────
// Public: register affiliate (creates auth user + profile)
// ─────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  fullName: z.string().min(3).max(120),
  email: z.string().email(),
  whatsapp: z.string().min(8).max(20),
  cpf: z.string(),
  password: z.string().min(8).max(72),
  passwordConfirm: z.string().min(8).max(72),
});

export const registerAffiliate = createServerFn({ method: "POST" })
  .inputValidator((input) => RegisterSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.password !== data.passwordConfirm) {
      throw new Error("As senhas não conferem.");
    }
    const cpf = normalizeCpf(data.cpf);
    if (!isValidCpf(cpf)) throw new Error("CPF inválido.");

    const { getAdmin, writeAudit } = await import("./affiliate.server");
    const { emit } = await import("./lib/events");
    const admin = await getAdmin();

    // Reject duplicate CPF early (returns friendlier error than DB constraint).
    const { data: existsCpf } = await admin
      .from("affiliate_profiles" as any)
      .select("id")
      .eq("cpf", cpf)
      .maybeSingle();
    if (existsCpf) throw new Error("CPF já cadastrado como afiliado.");

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, affiliate: true },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Não foi possível criar a conta.");
    }
    const userId = created.user.id;

    // Determine auto-approval.
    const { data: settings } = await admin
      .from("affiliate_settings" as any)
      .select("auto_approve, default_commission_rate")
      .eq("id", "global")
      .maybeSingle();
    const autoApprove = !!(settings as any)?.auto_approve;

    const affiliateCode = generateAffiliateCode(data.fullName);
    const apiKey = generateSecret(32);
    const token = generateSecret(24);

    const { data: profile, error: profErr } = await admin
      .from("affiliate_profiles" as any)
      .insert({
        user_id: userId,
        full_name: data.fullName,
        email: data.email,
        whatsapp: data.whatsapp,
        cpf,
        status: autoApprove ? "approved" : "pending",
        affiliate_code: affiliateCode,
        api_key_hash: apiKey.hash,
        token_hash: token.hash,
        default_commission_rate: (settings as any)?.default_commission_rate ?? null,
        approved_at: autoApprove ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (profErr || !profile) {
      // Rollback the auth user so the email can be retried.
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      throw new Error(profErr?.message ?? "Falha ao criar perfil de afiliado.");
    }

    // Grant affiliate role.
    await admin.from("affiliate_user_roles" as any).insert({ user_id: userId, role: "affiliate" });

    // Default link.
    const slug = (affiliateCode as string).toLowerCase();
    await admin.from("affiliate_links" as any).insert({
      affiliate_id: (profile as any).id,
      slug,
      label: "Link principal",
      destination_url: "/",
      active: true,
    });

    await writeAudit({
      actorId: userId,
      action: "affiliate.registered",
      entity: "affiliate_profile",
      entityId: (profile as any).id,
      diff: { autoApprove },
    });

    // Admin notification.
    await admin.from("affiliate_notifications" as any).insert({
      to_admin: true,
      title: autoApprove ? "Novo afiliado aprovado" : "Novo afiliado aguardando aprovação",
      body: `${data.fullName} (${data.email})`,
      affiliate_id: (profile as any).id,
    });

    await emit("affiliate.registered", { affiliateId: (profile as any).id });
    if (autoApprove) await emit("affiliate.approved", { affiliateId: (profile as any).id });

    // Send WhatsApp verification code. Credentials are only revealed after
    // the affiliate confirms the code on the verification screen.
    let whatsappSent = true;
    let sendError: string | null = null;
    try {
      await issueVerificationCode((profile as any).id, data.whatsapp);
    } catch (e: any) {
      whatsappSent = false;
      sendError = e?.message ?? "Falha ao enviar código.";
    }

    return {
      ok: true,
      affiliateId: (profile as any).id,
      affiliateCode,
      status: (profile as any).status,
      needsVerification: true,
      whatsappMasked: maskWhatsapp(data.whatsapp),
      whatsappSent,
      sendError,
    };
  });

// ─────────────────────────────────────────────────────────────
// Public: resend WhatsApp verification code
// ─────────────────────────────────────────────────────────────
export const resendAffiliateVerification = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ affiliateId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { getAdmin } = await import("./affiliate.server");
    const admin = await getAdmin();
    const { data: rl } = await admin.rpc("affiliate_check_rate_limit", {
      _bucket: `verif:${data.affiliateId}`,
      _limit: 5,
      _window_seconds: 3600,
    });
    if (rl === false) throw new Error("Muitas tentativas. Aguarde antes de solicitar outro código.");
    const { data: prof } = await admin
      .from("affiliate_profiles" as any)
      .select("id, whatsapp, whatsapp_verified_at")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!prof) throw new Error("Afiliado não encontrado.");
    if ((prof as any).whatsapp_verified_at) return { ok: true, alreadyVerified: true };
    await issueVerificationCode((prof as any).id, (prof as any).whatsapp);
    return { ok: true, whatsappMasked: maskWhatsapp((prof as any).whatsapp) };
  });

// ─────────────────────────────────────────────────────────────
// Public: verify WhatsApp code → activates login and reveals credentials
// ─────────────────────────────────────────────────────────────
export const verifyAffiliateWhatsapp = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      affiliateId: z.string().uuid(),
      code: z.string().regex(/^\d{6}$/),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getAdmin, writeAudit } = await import("./affiliate.server");
    const admin = await getAdmin();

    const { data: prof } = await admin
      .from("affiliate_profiles" as any)
      .select("id, user_id, affiliate_code, whatsapp_verified_at")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!prof) throw new Error("Afiliado não encontrado.");

    const { data: row } = await admin
      .from("affiliate_verification_codes" as any)
      .select("*")
      .eq("affiliate_id", data.affiliateId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) throw new Error("Nenhum código ativo. Solicite um novo.");
    const r = row as any;
    if (new Date(r.expires_at).getTime() < Date.now()) {
      throw new Error("Código expirado. Solicite um novo.");
    }
    if (r.attempts >= 5) throw new Error("Muitas tentativas. Solicite um novo código.");
    if (r.code_hash !== hashCode(data.code)) {
      await admin
        .from("affiliate_verification_codes" as any)
        .update({ attempts: r.attempts + 1 })
        .eq("id", r.id);
      throw new Error("Código inválido.");
    }

    const apiKey = generateSecret(32);
    const token = generateSecret(24);

    await admin
      .from("affiliate_profiles" as any)
      .update({
        whatsapp_verified_at: new Date().toISOString(),
        api_key_hash: apiKey.hash,
        token_hash: token.hash,
      })
      .eq("id", data.affiliateId);

    await admin
      .from("affiliate_verification_codes" as any)
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", r.id);

    await writeAudit({
      actorId: (prof as any).user_id,
      action: "affiliate.whatsapp_verified",
      entity: "affiliate_profile",
      entityId: data.affiliateId,
    });

    return {
      ok: true,
      affiliateCode: (prof as any).affiliate_code,
      credentials: { apiKey: apiKey.raw, token: token.raw },
    };
  });


// ─────────────────────────────────────────────────────────────
// Authenticated: my profile + stats
// ─────────────────────────────────────────────────────────────
export const getMyAffiliate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("affiliate_profiles" as any)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile) return { profile: null, links: [], stats: null };

    const [{ data: links }, { count: clicks }, { count: conversions }, { data: commissions }] =
      await Promise.all([
        context.supabase
          .from("affiliate_links" as any)
          .select("*")
          .eq("affiliate_id", (profile as any).id),
        context.supabase
          .from("affiliate_clicks" as any)
          .select("*", { count: "exact", head: true })
          .eq("affiliate_id", (profile as any).id),
        context.supabase
          .from("affiliate_conversions" as any)
          .select("*", { count: "exact", head: true })
          .eq("affiliate_id", (profile as any).id),
        context.supabase
          .from("affiliate_commissions" as any)
          .select("amount_cents, status")
          .eq("affiliate_id", (profile as any).id),
      ]);

    const totalCents = (commissions ?? []).reduce(
      (s: number, c: any) => s + (c.amount_cents ?? 0),
      0,
    );
    const pendingCents = (commissions ?? [])
      .filter((c: any) => c.status === "pending")
      .reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0);
    const paidCents = (commissions ?? [])
      .filter((c: any) => c.status === "paid")
      .reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0);

    return {
      profile,
      links: links ?? [],
      stats: { clicks: clicks ?? 0, conversions: conversions ?? 0, totalCents, pendingCents, paidCents },
    };
  });

// ─────────────────────────────────────────────────────────────
// Authenticated: regenerate API key
// ─────────────────────────────────────────────────────────────
export const regenerateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { writeAudit } = await import("./affiliate.server");
    const apiKey = generateSecret(32);
    const { data, error } = await context.supabase
      .from("affiliate_profiles" as any)
      .update({ api_key_hash: apiKey.hash })
      .eq("user_id", context.userId)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit({
      actorId: context.userId,
      action: "affiliate.api_key_regenerated",
      entity: "affiliate_profile",
      entityId: (data as any).id,
    });
    return { apiKey: apiKey.raw };
  });

// ─────────────────────────────────────────────────────────────
// Admin: list, approve, reject, settings
// ─────────────────────────────────────────────────────────────
async function ensureAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_affiliate_role", {
    _user_id: context.userId,
    _role: "affiliate_admin",
  });
  if (data !== true) throw new Error("Acesso restrito ao painel administrativo.");
}

export const adminListAffiliates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ status: z.string().optional(), q: z.string().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let query = context.supabase
      .from("affiliate_profiles" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data.status) query = query.eq("status", data.status);
    if (data.q) query = query.ilike("full_name", `%${data.q}%`);
    const { data: rows } = await query;
    return rows ?? [];
  });

const SetStatusSchema = z.object({
  affiliateId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "suspended"]),
  reason: z.string().optional(),
});

export const adminSetAffiliateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SetStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { writeAudit } = await import("./affiliate.server");
    const { emit } = await import("./lib/events");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = context.userId;
    }
    if (data.reason) patch.rejection_reason = data.reason;
    const { error } = await context.supabase
      .from("affiliate_profiles" as any)
      .update(patch)
      .eq("id", data.affiliateId);
    if (error) throw new Error(error.message);
    await writeAudit({
      actorId: context.userId,
      action: `affiliate.${data.status}`,
      entity: "affiliate_profile",
      entityId: data.affiliateId,
      diff: { status: data.status, reason: data.reason },
    });
    if (data.status === "approved") await emit("affiliate.approved", { affiliateId: data.affiliateId });
    if (data.status === "rejected") await emit("affiliate.rejected", { affiliateId: data.affiliateId });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────
// Admin: edit affiliate profile
// ─────────────────────────────────────────────────────────────
const UpdateAffiliateSchema = z.object({
  affiliateId: z.string().uuid(),
  fullName: z.string().min(3).max(120).optional(),
  email: z.string().email().optional(),
  whatsapp: z.string().min(8).max(20).optional(),
});

export const adminUpdateAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateAffiliateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { getAdmin, writeAudit } = await import("./affiliate.server");
    const admin = await getAdmin();

    const { data: prof, error: profErr } = await admin
      .from("affiliate_profiles" as any)
      .select("user_id")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (profErr || !prof) throw new Error("Afiliado não encontrado.");

    const patch: Record<string, unknown> = {};
    if (data.fullName) patch.full_name = data.fullName;
    if (data.email) patch.email = data.email;
    if (data.whatsapp) patch.whatsapp = data.whatsapp;
    if (Object.keys(patch).length) {
      const { error } = await admin
        .from("affiliate_profiles" as any)
        .update(patch)
        .eq("id", data.affiliateId);
      if (error) throw new Error(error.message);
    }

    if (data.email) {
      const { error: uErr } = await admin.auth.admin.updateUserById((prof as any).user_id, {
        email: data.email,
      });
      if (uErr) throw new Error(uErr.message);
    }

    await writeAudit({
      actorId: context.userId,
      action: "affiliate.update",
      entity: "affiliate_profile",
      entityId: data.affiliateId,
      diff: patch,
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────
// Admin: set new password
// ─────────────────────────────────────────────────────────────
const SetPasswordSchema = z.object({
  affiliateId: z.string().uuid(),
  password: z.string().min(8).max(72),
});

export const adminSetAffiliatePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SetPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { getAdmin, writeAudit } = await import("./affiliate.server");
    const admin = await getAdmin();
    const { data: prof } = await admin
      .from("affiliate_profiles" as any)
      .select("user_id")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!prof) throw new Error("Afiliado não encontrado.");
    const { error } = await admin.auth.admin.updateUserById((prof as any).user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await writeAudit({
      actorId: context.userId,
      action: "affiliate.password_set",
      entity: "affiliate_profile",
      entityId: data.affiliateId,
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────
// Admin: send password reset email
// ─────────────────────────────────────────────────────────────
const SendResetSchema = z.object({
  affiliateId: z.string().uuid(),
  redirectTo: z.string().url().optional(),
});

export const adminSendAffiliatePasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SendResetSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { getAdmin, writeAudit } = await import("./affiliate.server");
    const admin = await getAdmin();
    const { data: prof } = await admin
      .from("affiliate_profiles" as any)
      .select("email")
      .eq("id", data.affiliateId)
      .maybeSingle();
    if (!prof || !(prof as any).email) throw new Error("Email do afiliado não encontrado.");
    const { error } = await admin.auth.resetPasswordForEmail((prof as any).email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    await writeAudit({
      actorId: context.userId,
      action: "affiliate.password_reset_sent",
      entity: "affiliate_profile",
      entityId: data.affiliateId,
    });
    return { ok: true, email: (prof as any).email };
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("affiliate_settings" as any)
      .select("*")
      .eq("id", "global")
      .maybeSingle();
    return data;
  });

const SettingsSchema = z.object({
  auto_approve: z.boolean(),
  default_commission_rate: z.number().min(0).max(100),
  cookie_window_days: z.number().int().min(1).max(365),
  min_withdraw_cents: z.number().int().min(0),
});

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("affiliate_settings" as any)
      .update(data)
      .eq("id", "global");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
