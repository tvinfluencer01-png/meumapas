import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export type SmtpSettings = {
  id: string | null;
  provider: "gmail" | "custom";
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
  enabled: boolean;
};

const EMPTY: SmtpSettings = {
  id: null,
  provider: "custom",
  host: "",
  port: 587,
  secure: false,
  username: "",
  password: "",
  from_email: "",
  from_name: "",
  reply_to: null,
  enabled: false,
};

export const getSmtpSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SmtpSettings> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("smtp_settings" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return EMPTY;
    const r = data as any;
    return {
      id: r.id,
      provider: r.provider,
      host: r.host,
      port: r.port,
      secure: r.secure,
      username: r.username,
      password: r.password,
      from_email: r.from_email,
      from_name: r.from_name,
      reply_to: r.reply_to,
      enabled: r.enabled,
    };
  });

const SaveSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  provider: z.enum(["gmail", "custom"]),
  host: z.string().trim().min(1, "Host é obrigatório").max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().min(1, "Usuário é obrigatório").max(255),
  password: z.string().min(1, "Senha é obrigatória").max(500),
  from_email: z.string().trim().email("E-mail inválido").max(255),
  from_name: z.string().trim().min(1, "Nome do remetente").max(120),
  reply_to: z.string().trim().email().max(255).nullable().optional(),
  enabled: z.boolean(),
});

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      provider: data.provider,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      password: data.password,
      from_email: data.from_email,
      from_name: data.from_name,
      reply_to: data.reply_to || null,
      enabled: data.enabled,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("smtp_settings" as any)
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    // Singleton: if any row exists, update it instead of inserting
    const { data: existing } = await supabaseAdmin
      .from("smtp_settings" as any)
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing && (existing as any).id) {
      const id = (existing as any).id as string;
      const { error } = await supabaseAdmin
        .from("smtp_settings" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("smtp_settings" as any)
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as any).id as string };
  });

const TestSchema = z.object({
  to: z.string().trim().email("Destinatário inválido"),
  subject: z.string().trim().min(1).max(200).default("Teste SMTP - Código Cósmico"),
  body: z.string().trim().min(1).max(2000).default("Este é um e-mail de teste enviado pelo painel administrativo."),
});

export const sendSmtpTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TestSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("smtp_settings" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Configure o SMTP antes de enviar um teste.");
    const s = row as any;
    if (!s.host || !s.username || !s.password || !s.from_email) {
      throw new Error("Preencha host, usuário, senha e remetente.");
    }

    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: !!s.secure,
      auth: { user: s.username, pass: s.password },
    });

    try {
      await transporter.sendMail({
        from: `"${s.from_name || s.from_email}" <${s.from_email}>`,
        to: data.to,
        replyTo: s.reply_to || undefined,
        subject: data.subject,
        text: data.body,
        html: `<p>${data.body.replace(/\n/g, "<br/>")}</p>`,
      });
      return { ok: true };
    } catch (e: any) {
      throw new Error(`Falha ao enviar: ${e?.message ?? String(e)}`);
    }
  });
