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

function getDestClient(url?: string | null) {
  const finalUrl = url ?? process.env.NEW_SUPABASE_URL;
  const key = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
  if (!finalUrl || !key) throw new Error("Destino não configurado (NEW_SUPABASE_URL / NEW_SUPABASE_SERVICE_ROLE_KEY).");
  return createClient(finalUrl, key, { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } });
}

// ----------------- CRUD -----------------

export const listSyncDestinations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("sync_destinations")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return { destinations: data ?? [] };
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  site_url: z.string().url(),
  legacy_domains: z.array(z.string()).default([]),
  supabase_url: z.string().url(),
  supabase_project_ref: z.string().optional().nullable(),
  supabase_publishable_key: z.string().optional().nullable(),
  service_role_secret_name: z.string().default("NEW_SUPABASE_SERVICE_ROLE_KEY"),
  is_default: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export const upsertSyncDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    // If setting as default, unset others first
    if (data.is_default) {
      await supabaseAdmin.from("sync_destinations").update({ is_default: false }).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const { data: row, error } = await supabaseAdmin
      .from("sync_destinations")
      .upsert(data as any, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { destination: row };
  });

export const deleteSyncDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("sync_destinations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------------- Remap URLs -----------------

// Tabelas conhecidas que armazenam URLs de callback/domínio. Cada entrada lista
// as colunas que devem ser reescritas quando encontrarem qualquer legacy_domain.
const URL_TABLES: Array<{ table: string; columns: string[] }> = [
  { table: "system_settings",           columns: ["site_url", "public_url", "webhook_base_url"] },
  { table: "pdf_branding",              columns: ["logo_url", "footer_url", "cover_url", "website"] },
  { table: "product_landings",          columns: ["share_url", "canonical_url"] },
  { table: "horoscope_landing_settings",columns: ["base_url", "share_url"] },
  { table: "mercado_pago_settings",     columns: ["webhook_url", "success_url", "failure_url", "pending_url"] },
  { table: "affiliate_settings",        columns: ["site_url", "webhook_url"] },
  { table: "evolution_settings",        columns: ["webhook_url"] },
  { table: "twilio_settings",           columns: ["webhook_url"] },
];

const remapSchema = z.object({
  destinationId: z.string().uuid().optional(),
  dryRun: z.boolean().default(true),
});

export const remapDestinationUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => remapSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    // Load destination config (default or specified)
    const q = supabaseAdmin.from("sync_destinations").select("*");
    const { data: destRow, error: destErr } = data.destinationId
      ? await q.eq("id", data.destinationId).maybeSingle()
      : await q.eq("is_default", true).maybeSingle();
    if (destErr) throw new Error(destErr.message);
    if (!destRow) throw new Error("Nenhum destino cadastrado. Cadastre um destino primeiro.");

    const siteUrl: string = String((destRow as any).site_url).replace(/\/+$/, "");
    const legacy: string[] = (((destRow as any).legacy_domains as string[]) ?? []).filter(Boolean);
    if (legacy.length === 0) throw new Error("Cadastre pelo menos 1 domínio antigo em 'legacy_domains'.");

    const client = getDestClient((destRow as any).supabase_url);
    const stmts: string[] = [];
    const report: {
      site_url: string;
      legacy: string[];
      tableUpdates: Array<{ table: string; column: string; rows: number }>;
      cronJobs: Array<{ jobid: number; jobname: string; before: string; after: string }>;
      applied: boolean;
    } = { site_url: siteUrl, legacy, tableUpdates: [], cronJobs: [], applied: !data.dryRun };

    // 1) Reescrever URLs em tabelas via SQL (REPLACE em cadeia)
    for (const { table, columns } of URL_TABLES) {
      for (const col of columns) {
        // Build REPLACE(REPLACE(col, 'legacy1', site), 'legacy2', site)
        let expr = `"${col}"`;
        const orClauses: string[] = [];
        for (const dom of legacy) {
          const esc = dom.replace(/'/g, "''");
          expr = `REPLACE(${expr}, '${esc}', '${siteUrl}')`;
          orClauses.push(`"${col}" LIKE '%${esc}%'`);
        }
        const sql = `
          DO $$
          DECLARE v_count int;
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name='${table}' AND column_name='${col}') THEN
              UPDATE public."${table}" SET "${col}" = ${expr}
              WHERE ${orClauses.join(" OR ")};
              GET DIAGNOSTICS v_count = ROW_COUNT;
              RAISE NOTICE '${table}.${col}: % rows', v_count;
            END IF;
          END $$;`;
        stmts.push(sql);
        report.tableUpdates.push({ table, column: col, rows: 0 }); // count reportado via NOTICE; sem contagem exata aqui
      }
    }

    // 2) Cron jobs — inspecionar comandos e reescrever
    const { data: jobs, error: jobsErr } = await client.rpc("admin_cron_status" as any);
    if (jobsErr) {
      // If RPC missing on destination, skip cron rewrite gracefully.
      report.cronJobs = [];
    } else {
      for (const j of ((jobs as any[]) ?? [])) {
        let newCmd = String(j.command ?? "");
        let touched = false;
        for (const dom of legacy) {
          if (newCmd.includes(dom)) {
            newCmd = newCmd.split(dom).join(siteUrl);
            touched = true;
          }
        }
        if (touched) {
          report.cronJobs.push({ jobid: j.jobid, jobname: j.jobname, before: j.command, after: newCmd });
          const esc = newCmd.replace(/'/g, "''");
          stmts.push(`SELECT cron.alter_job(job_id => ${j.jobid}, command => '${esc}');`);
        }
      }
    }

    if (data.dryRun) {
      return { ok: true, dryRun: true, report, statementsCount: stmts.length };
    }

    // Aplica em lote via exec_sql no destino
    const { error: execErr } = await client.rpc("exec_sql" as any, { sql_query: stmts.join("\n") });
    if (execErr) throw new Error(`Falha ao aplicar reescrita: ${execErr.message}`);

    return { ok: true, dryRun: false, report, statementsCount: stmts.length };
  });
