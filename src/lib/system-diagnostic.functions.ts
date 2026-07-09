import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export type CheckStatus = "ok" | "warn" | "fail" | "skip";
export type CheckResult = {
  group: string;
  name: string;
  status: CheckStatus;
  detail: string;
  meta?: any;
  durationMs: number;
};

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; error: string | null; ms: number }> {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { result, error: null, ms: Date.now() - t0 };
  } catch (e: any) {
    return { result: null, error: e?.message ?? String(e), ms: Date.now() - t0 };
  }
}

function getDestClient() {
  const url = process.env.NEW_SUPABASE_URL;
  const key = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } });
}

// Tables checked for row-count parity (representative core tables)
const CORE_TABLES = [
  "profiles", "user_roles", "user_credits", "credit_costs", "credit_packages",
  "reports", "astro_charts", "numerology_reports", "tarot_readings",
  "horoscope_plans", "horoscope_subscriptions", "affiliate_profiles",
  "product_landings", "product_orders", "system_settings",
];

export const runSystemDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const checks: CheckResult[] = [];
    const add = (c: CheckResult) => checks.push(c);

    // ========== INFRA & BANCO ==========
    {
      const r = await timed(async () => {
        const { error } = await supabaseAdmin.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
        if (error) throw error;
        return true;
      });
      add({ group: "Infra & Banco", name: "Lovable Cloud DB (origem)", status: r.error ? "fail" : "ok",
        detail: r.error ?? "Conexão OK", durationMs: r.ms });
    }

    const dest = getDestClient();
    if (!dest) {
      add({ group: "Infra & Banco", name: "Novo Supabase (destino)", status: "skip",
        detail: "NEW_SUPABASE_URL / NEW_SUPABASE_SERVICE_ROLE_KEY não configurados", durationMs: 0 });
    } else {
      const r = await timed(async () => {
        const { error } = await dest.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
        if (error) throw error;
        return true;
      });
      add({ group: "Infra & Banco", name: "Novo Supabase (destino)", status: r.error ? "fail" : "ok",
        detail: r.error ?? `Conexão OK — ${process.env.NEW_SUPABASE_URL}`, durationMs: r.ms });

      const rpcCheck = await timed(async () => {
        const { error } = await dest.rpc("exec_sql" as any, { sql_query: "SELECT 1;" });
        if (error) throw error;
        return true;
      });
      add({ group: "Infra & Banco", name: "RPC exec_sql no destino", status: rpcCheck.error ? "fail" : "ok",
        detail: rpcCheck.error ?? "Disponível", durationMs: rpcCheck.ms });
    }

    // Cron jobs
    {
      const r = await timed(async () => {
        const { data, error } = await supabaseAdmin.rpc("admin_cron_status");
        if (error) throw error;
        return (data as any[]) ?? [];
      });
      if (r.error) {
        add({ group: "Infra & Banco", name: "Cron jobs", status: "fail", detail: r.error, durationMs: r.ms });
      } else {
        const jobs = r.result ?? [];
        const total = jobs.length;
        const inactive = jobs.filter((j: any) => !j.active).length;
        const failed = jobs.filter((j: any) => j.last_status === "failed" || (j.last_http_status && j.last_http_status >= 400));
        add({
          group: "Infra & Banco", name: "Cron jobs",
          status: failed.length > 0 ? "warn" : "ok",
          detail: `${total} jobs • ${total - inactive} ativos • ${failed.length} com falha recente`,
          meta: { failedNames: failed.map((f: any) => f.jobname), inactiveNames: jobs.filter((j: any) => !j.active).map((j: any) => j.jobname) },
          durationMs: r.ms,
        });
      }
    }

    // Tables without RLS / policies
    {
      const r = await timed(async () => {
        const [{ data: tRows }, { data: pRows }] = await Promise.all([
          supabaseAdmin.rpc("get_public_tables" as any),
          supabaseAdmin.rpc("get_public_policies" as any),
        ]);
        const tables = ((tRows as any[]) ?? []).map((t) => t.table_name as string);
        const withPolicies = new Set(((pRows as any[]) ?? []).map((p) => p.table_name as string));
        const noPolicies = tables.filter((t) => !withPolicies.has(t));
        return { tables: tables.length, noPolicies };
      });
      if (r.error) {
        add({ group: "Infra & Banco", name: "Tabelas sem políticas RLS", status: "warn", detail: r.error, durationMs: r.ms });
      } else {
        const np = r.result!.noPolicies;
        add({
          group: "Infra & Banco", name: "Tabelas sem políticas RLS",
          status: np.length === 0 ? "ok" : "warn",
          detail: np.length === 0 ? `Todas ${r.result!.tables} tabelas têm ao menos 1 policy` : `${np.length} tabela(s) sem policy: ${np.slice(0, 6).join(", ")}${np.length > 6 ? "…" : ""}`,
          meta: { noPolicies: np },
          durationMs: r.ms,
        });
      }
    }

    // ========== CONSISTÊNCIA DE DADOS (origem × destino) ==========
    if (dest) {
      const r = await timed(async () => {
        const rows: Array<{ table: string; src: number | null; dst: number | null; diff: number | null }> = [];
        for (const t of CORE_TABLES) {
          const [{ count: sc }, { count: dc }] = await Promise.all([
            supabaseAdmin.from(t as any).select("*", { head: true, count: "exact" }),
            dest.from(t as any).select("*", { head: true, count: "exact" }),
          ]);
          const src = sc ?? null;
          const dst = dc ?? null;
          rows.push({ table: t, src, dst, diff: src !== null && dst !== null ? src - dst : null });
        }
        return rows;
      });
      if (r.error) {
        add({ group: "Consistência", name: "Contagem de linhas origem × destino", status: "fail", detail: r.error, durationMs: r.ms });
      } else {
        const rows = r.result!;
        const divergent = rows.filter((x) => x.diff !== null && x.diff !== 0);
        add({
          group: "Consistência", name: "Contagem de linhas origem × destino",
          status: divergent.length === 0 ? "ok" : "warn",
          detail: divergent.length === 0
            ? `${rows.length} tabelas conferem`
            : `${divergent.length}/${rows.length} tabela(s) divergem`,
          meta: { rows },
          durationMs: r.ms,
        });
      }

      // Schema diff summary
      const s = await timed(async () => {
        const [{ data: sT }, { data: dT }] = await Promise.all([
          supabaseAdmin.rpc("get_public_tables" as any),
          dest.rpc("get_public_tables" as any),
        ]);
        const src = new Set(((sT as any[]) ?? []).map((r) => r.table_name as string));
        const dst = new Set(((dT as any[]) ?? []).map((r) => r.table_name as string));
        const missing: string[] = [];
        for (const t of src) if (!dst.has(t)) missing.push(t);
        return { srcCount: src.size, dstCount: dst.size, missing };
      });
      if (s.error) {
        add({ group: "Consistência", name: "Tabelas presentes no destino", status: "fail", detail: s.error, durationMs: s.ms });
      } else {
        add({
          group: "Consistência", name: "Tabelas presentes no destino",
          status: s.result!.missing.length === 0 ? "ok" : "warn",
          detail: s.result!.missing.length === 0
            ? `Destino tem todas as ${s.result!.srcCount} tabelas`
            : `${s.result!.missing.length} faltando: ${s.result!.missing.slice(0, 5).join(", ")}${s.result!.missing.length > 5 ? "…" : ""}`,
          meta: { missing: s.result!.missing, srcCount: s.result!.srcCount, dstCount: s.result!.dstCount },
          durationMs: s.ms,
        });
      }
    }

    // ========== INTEGRAÇÕES EXTERNAS ==========
    // Mercado Pago
    {
      const r = await timed(async () => {
        const { data } = await supabaseAdmin.from("mercado_pago_settings").select("*").maybeSingle();
        if (!data) return { configured: false };
        const token = (data as any).access_token as string | null;
        if (!token) return { configured: false };
        const res = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${token}` } });
        return { configured: true, ok: res.ok, status: res.status };
      });
      const cfg = r.result as any;
      if (r.error) add({ group: "Integrações", name: "Mercado Pago", status: "fail", detail: r.error, durationMs: r.ms });
      else if (!cfg?.configured) add({ group: "Integrações", name: "Mercado Pago", status: "skip", detail: "Não configurado", durationMs: r.ms });
      else add({ group: "Integrações", name: "Mercado Pago", status: cfg.ok ? "ok" : "fail",
        detail: cfg.ok ? "Token válido (users/me OK)" : `HTTP ${cfg.status} em /users/me`, durationMs: r.ms });
    }

    // Twilio
    {
      const r = await timed(async () => {
        const { data } = await supabaseAdmin.from("twilio_settings").select("*").maybeSingle();
        if (!data) return { configured: false };
        const sid = (data as any).account_sid as string | null;
        const token = (data as any).auth_token as string | null;
        if (!sid || !token) return { configured: false };
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
          headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
        });
        return { configured: true, ok: res.ok, status: res.status };
      });
      const cfg = r.result as any;
      if (r.error) add({ group: "Integrações", name: "Twilio", status: "fail", detail: r.error, durationMs: r.ms });
      else if (!cfg?.configured) add({ group: "Integrações", name: "Twilio", status: "skip", detail: "Não configurado", durationMs: r.ms });
      else add({ group: "Integrações", name: "Twilio", status: cfg.ok ? "ok" : "fail",
        detail: cfg.ok ? "Credenciais válidas" : `HTTP ${cfg.status}`, durationMs: r.ms });
    }

    // Evolution (WhatsApp)
    {
      const r = await timed(async () => {
        const { data } = await supabaseAdmin.from("evolution_settings").select("*").maybeSingle();
        if (!data) return { configured: false };
        const base = (data as any).base_url as string | null;
        const key = ((data as any).global_api_key ?? (data as any).api_key) as string | null;
        const enabled = (data as any).enabled !== false;
        if (!base || !key || !enabled) return { configured: false };
        const res = await fetch(`${base.replace(/\/+$/, "")}/instance/fetchInstances`, { headers: { apikey: key } });
        return { configured: true, ok: res.ok, status: res.status };
      });
      const cfg = r.result as any;
      if (r.error) add({ group: "Integrações", name: "Evolution API (WhatsApp)", status: "fail", detail: r.error, durationMs: r.ms });
      else if (!cfg?.configured) add({ group: "Integrações", name: "Evolution API (WhatsApp)", status: "skip", detail: "Não configurado", durationMs: r.ms });
      else add({ group: "Integrações", name: "Evolution API (WhatsApp)", status: cfg.ok ? "ok" : "fail",
        detail: cfg.ok ? "Endpoint acessível" : `HTTP ${cfg.status}`, durationMs: r.ms });
    }

    // SMTP (config only)
    {
      const r = await timed(async () => {
        const { data } = await supabaseAdmin.from("smtp_settings").select("host, port, username").maybeSingle();
        return data as any;
      });
      if (r.error) add({ group: "Integrações", name: "SMTP", status: "fail", detail: r.error, durationMs: r.ms });
      else if (!r.result?.host) add({ group: "Integrações", name: "SMTP", status: "skip", detail: "Não configurado", durationMs: r.ms });
      else add({ group: "Integrações", name: "SMTP", status: "ok",
        detail: `${r.result.host}:${r.result.port} (${r.result.username ?? "sem usuário"}) — não testado envio`, durationMs: r.ms });
    }

    // Lovable AI Gateway
    add({
      group: "Integrações", name: "Lovable AI Gateway",
      status: process.env.LOVABLE_API_KEY ? "ok" : "warn",
      detail: process.env.LOVABLE_API_KEY ? "LOVABLE_API_KEY presente" : "LOVABLE_API_KEY ausente",
      durationMs: 0,
    });

    // ========== SERVER FUNCTIONS INTERNAS (pings) ==========
    const pings: Array<{ name: string; table: string }> = [
      { name: "Créditos (credit_costs)", table: "credit_costs" },
      { name: "Horóscopo (horoscope_plans)", table: "horoscope_plans" },
      { name: "Afiliados (affiliate_profiles)", table: "affiliate_profiles" },
      { name: "Relatórios (reports)", table: "reports" },
      { name: "Tarot (tarot_readings)", table: "tarot_readings" },
      { name: "Numerologia (numerology_reports)", table: "numerology_reports" },
      { name: "Produtos (product_landings)", table: "product_landings" },
      { name: "Pedidos (product_orders)", table: "product_orders" },
    ];
    for (const p of pings) {
      const r = await timed(async () => {
        const { count, error } = await supabaseAdmin.from(p.table as any).select("*", { head: true, count: "exact" });
        if (error) throw error;
        return count ?? 0;
      });
      add({
        group: "Módulos",
        name: p.name,
        status: r.error ? "fail" : r.ms > 800 ? "warn" : "ok",
        detail: r.error ?? `${r.result} linhas • ${r.ms}ms`,
        durationMs: r.ms,
      });
    }

    // ========== RESUMO ==========
    const summary = {
      ok: checks.filter((c) => c.status === "ok").length,
      warn: checks.filter((c) => c.status === "warn").length,
      fail: checks.filter((c) => c.status === "fail").length,
      skip: checks.filter((c) => c.status === "skip").length,
      total: checks.length,
    };

    // Markdown report
    const emoji = (s: CheckStatus) => (s === "ok" ? "✅" : s === "warn" ? "⚠️" : s === "fail" ? "❌" : "⏭️");
    const groups = Array.from(new Set(checks.map((c) => c.group)));
    const md = [
      `# Autodiagnóstico do Sistema`,
      `_Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}_`,
      ``,
      `**Resumo:** ${summary.ok} OK • ${summary.warn} atenção • ${summary.fail} falha • ${summary.skip} ignorado (total ${summary.total})`,
      ``,
      ...groups.flatMap((g) => [
        `## ${g}`,
        ...checks.filter((c) => c.group === g).map((c) => `- ${emoji(c.status)} **${c.name}** — ${c.detail} _(${c.durationMs}ms)_`),
        ``,
      ]),
    ].join("\n");

    return { generatedAt: new Date().toISOString(), summary, checks, markdown: md };
  });

// ============================================================
// Reconciliação de dados: copia linhas faltantes origem → destino
// Não apaga linhas extras no destino. Usa upsert com ignoreDuplicates.
// ============================================================

const ALLOWED_RECONCILE_TABLES = new Set([
  "profiles", "user_roles", "user_credits", "credit_costs", "credit_packages",
  "reports", "astro_charts", "numerology_reports", "tarot_readings",
  "horoscope_plans", "horoscope_subscriptions", "affiliate_profiles",
  "product_landings", "product_orders", "system_settings",
  "birth_data", "client_profiles",
]);

export const reconcileTableRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      table: z.string().min(1),
      conflictColumn: z.string().default("id"),
      pageSize: z.number().int().min(50).max(1000).default(500),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (!ALLOWED_RECONCILE_TABLES.has(data.table)) {
      throw new Error(`Tabela não permitida para reconciliação: ${data.table}`);
    }
    const dest = getDestClient();
    if (!dest) throw new Error("Destino não configurado (NEW_SUPABASE_URL / NEW_SUPABASE_SERVICE_ROLE_KEY).");

    const t0 = Date.now();
    let totalRead = 0;
    let totalUpserted = 0;
    let from = 0;
    // Loop paginado
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const to = from + data.pageSize - 1;
      const { data: rows, error } = await supabaseAdmin
        .from(data.table as any)
        .select("*")
        .range(from, to);
      if (error) throw new Error(`Origem: ${error.message}`);
      if (!rows || rows.length === 0) break;
      totalRead += rows.length;

      const { error: upErr, count } = await dest
        .from(data.table as any)
        .upsert(rows as any, { onConflict: data.conflictColumn, ignoreDuplicates: true, count: "exact" });
      if (upErr) throw new Error(`Destino: ${upErr.message}`);
      totalUpserted += count ?? 0;

      if (rows.length < data.pageSize) break;
      from += data.pageSize;
    }

    // Contagens finais
    const [{ count: srcCount }, { count: dstCount }] = await Promise.all([
      supabaseAdmin.from(data.table as any).select("*", { head: true, count: "exact" }),
      dest.from(data.table as any).select("*", { head: true, count: "exact" }),
    ]);

    return {
      ok: true,
      table: data.table,
      read: totalRead,
      inserted: totalUpserted,
      src: srcCount ?? null,
      dst: dstCount ?? null,
      durationMs: Date.now() - t0,
    };
  });
