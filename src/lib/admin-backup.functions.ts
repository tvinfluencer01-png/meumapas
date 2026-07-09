import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export const adminExportDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    // Get all public tables dynamically
    const { data: tableRows, error: tableError } = await supabaseAdmin.rpc("get_public_tables" as any);
    
    let tables: string[] = [];
    if (tableError || !tableRows) {
      // Fallback to hardcoded list if RPC fails or returns nothing
      tables = [
        "profiles", "user_roles", "user_settings", "user_credits", 
        "credit_costs", "credit_packages", "credit_transactions",
        "birth_data", "client_profiles", "astro_charts", "reports",
        "numerology_reports", "tarot_readings", "kabbalah_meditations",
        "calendar_favorites", "horoscope_subscriptions", "horoscope_log",
        "notification_preferences", "notification_log", "system_settings",
        "mercado_pago_settings", "twilio_settings", "evolution_settings",
        "addon_settings", "payment_orders", "user_subscriptions",
        "pdf_branding", "role_audit_log", "app_logs", "ai_conversations",
        "ai_messages"
      ];
    } else {
      tables = (tableRows as any[]).map(r => r.table_name);
    }

    let sql = "-- Backup gerado em " + new Date().toISOString() + "\n";
    sql += "-- Sistema: Código Cósmico\n";
    sql += "-- Este arquivo contém a ESTRUTURA e os DADOS para migração completa.\n\n";
    
    sql += "BEGIN;\n\n";

    // 0. Export Enums
    const { data: enums, error: enumError } = await supabaseAdmin.rpc("get_public_enums" as any);
    if (!enumError && enums && enums.length > 0) {
      sql += "-- -----------------------------------------------------\n";
      sql += "-- Tipos ENUM\n";
      sql += "-- -----------------------------------------------------\n\n";
      
      // Group by type name
      const groupedEnums: Record<string, string[]> = {};
      enums.forEach((e: any) => {
        if (!groupedEnums[e.type_name]) groupedEnums[e.type_name] = [];
        groupedEnums[e.type_name].push(e.enum_label);
      });

      for (const [typeName, labels] of Object.entries(groupedEnums)) {
        sql += `DO $$\nBEGIN\n`;
        sql += `  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN\n`;
        sql += `    CREATE TYPE public.${typeName} AS ENUM (${labels.map(l => `'${l}'`).join(", ")});\n`;
        sql += `  END IF;\n`;
        sql += `END $$;\n\n`;
      }
    }


    for (const table of tables) {
      // 1. Get structure
      const { data: cols, error: structError } = await supabaseAdmin.rpc("get_table_structure", { t_name: table });
      
      sql += `\n-- -----------------------------------------------------\n`;
      sql += `-- Tabela public.${table}\n`;
      sql += `-- -----------------------------------------------------\n\n`;

      if (structError) {
        sql += `-- Erro ao obter estrutura da tabela ${table}: ${structError.message}\n`;
      } else if (cols && cols.length > 0) {
        sql += `CREATE TABLE IF NOT EXISTS public.${table} (\n`;
        const colLines = cols.map((c: any) => {
          let type = c.data_type.toUpperCase();
          // If the type starts with _, it's a native Postgres array type (e.g., _text -> text[])
          if (type.startsWith("_")) {
            type = type.substring(1) + "[]";
          }
          let line = `  ${c.column_name} ${type}`;
          if (c.is_nullable === "NO") line += " NOT NULL";
          if (c.column_default) line += ` DEFAULT ${c.column_default}`;
          return line;
        });
        
        // Add Primary Key constraint
        const pks = cols.filter((c: any) => c.is_primary_key).map((c: any) => c.column_name);
        if (pks.length > 0) {
          colLines.push(`  CONSTRAINT ${table}_pkey PRIMARY KEY (${pks.join(", ")})`);
        }
        
        sql += colLines.join(",\n");
        sql += "\n);\n\n";
        
        sql += `DELETE FROM public.${table}; -- Limpa dados existentes sem exigir privilégios de owner\n\n`;
      }

      // 2. Get data — excluindo o super admin
      const superAdminId = await getSuperAdminUserId();
      const userCol: string | null =
        table === "profiles" ? "id" : (cols as any[] | null)?.some((c: any) => c.column_name === "user_id") ? "user_id" : null;
      let dataQuery = (supabaseAdmin.from(table as any) as any).select("*");
      if (superAdminId && userCol) dataQuery = dataQuery.neq(userCol, superAdminId);
      const { data, error } = await dataQuery;
      if (error) {
        sql += `-- Erro ao exportar dados da tabela ${table}: ${error.message}\n`;
        continue;
      }

      if (data && data.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          const columns = Object.keys(batch[0]).join(", ");
          
          sql += `INSERT INTO public.${table} (${columns}) VALUES\n`;
          
          const rows = batch.map((row: any) => {
            const values = Object.entries(row).map(([colName, val]) => {
              if (val === null) return "NULL";
              
              // Find column info to check if it's an array
              const colInfo = cols?.find((c: any) => c.column_name === colName);
              const udtType = colInfo?.data_type?.toUpperCase();
              const isArray = udtType?.startsWith("_") || udtType?.includes("ARRAY");

              if (isArray && Array.isArray(val)) {
                // Postgres array literal format: '{"val1", "val2"}'
                const escapedValues = val.map(v => {
                  if (v === null) return "NULL";
                  const s = String(v).replace(/"/g, '\\"');
                  return `"${s}"`;
                });
                return `'{${escapedValues.join(", ")}}'`;
              }

              if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === "boolean") return val ? "true" : "false";
              if (typeof val === "object") {
                // If it's an object but not caught by isArray above, it's likely JSONB
                return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
              }
              return val;
            });
            return `(${values.join(", ")})`;
          });

          sql += rows.join(",\n") + ";\n";
        }
      } else {
        sql += `-- Tabela ${table} não possui registros para inserção.\n`;
      }
    }

    sql += "\nCOMMIT;\n";

    return { sql };
  });

// ============================================================
// Sync entre bancos (Lovable Cloud → Novo Supabase)
// ============================================================

function getDestinationClient() {
  const url = process.env.NEW_SUPABASE_URL;
  const key = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Destino não configurado. Defina os secrets NEW_SUPABASE_URL e NEW_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

// Tabelas ignoradas (efêmeras, gerenciadas por outros processos ou já com estado local)
const SYNC_IGNORE = new Set<string>([
  "db_sync_state",
  "affiliate_rate_limits",
  "affiliate_cache",
  "affiliate_verification_codes",
  "mp_webhook_logs",
  "app_logs",
  "notification_log",
  "horoscope_log",
  "pwa_install_events",
  "affiliate_processing_queue",
  "affiliate_event_queue",
]);

async function listTablesWithMeta() {
  const { data: tRows, error: tErr } = await supabaseAdmin.rpc("get_public_tables" as any);
  if (tErr) throw new Error(`Falha ao listar tabelas: ${tErr.message}`);
  const tables = ((tRows as any[]) ?? [])
    .map((r) => r.table_name as string)
    .filter((t) => !SYNC_IGNORE.has(t));

  const meta: Array<{ table: string; hasUpdatedAt: boolean; pk: string[]; userCol: string | null }> = [];
  for (const table of tables) {
    const { data: cols } = await supabaseAdmin.rpc("get_table_structure", { t_name: table });
    const colsArr = (cols as any[]) ?? [];
    const hasUpdatedAt = colsArr.some((c) => c.column_name === "updated_at");
    const pk = colsArr.filter((c) => c.is_primary_key).map((c) => c.column_name as string);
    const colNames = new Set(colsArr.map((c: any) => c.column_name as string));
    // Coluna que identifica o "dono" do registro — usada para excluir o super admin da sync/export
    let userCol: string | null = null;
    if (table === "profiles") userCol = "id";
    else if (colNames.has("user_id")) userCol = "user_id";
    meta.push({ table, hasUpdatedAt, pk, userCol });
  }
  return meta;
}

// Super admin cujos dados NÃO devem ser exportados nem sincronizados para o novo banco.
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "sac@ms3.com.br").toLowerCase();
let _superAdminIdCache: string | null | undefined;
async function getSuperAdminUserId(): Promise<string | null> {
  if (_superAdminIdCache !== undefined) return _superAdminIdCache;
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const found = data.users.find((u) => (u.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL);
      if (found) return (_superAdminIdCache = found.id);
      if (data.users.length < 200) break;
    }
  } catch { /* ignore */ }
  return (_superAdminIdCache = null);
}

export const getSyncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const destinationConfigured = !!(
      process.env.NEW_SUPABASE_URL && process.env.NEW_SUPABASE_SERVICE_ROLE_KEY
    );

    let destinationReachable = false;
    let destinationError: string | null = null;
    if (destinationConfigured) {
      try {
        const dest = getDestinationClient();
        const { error } = await dest.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
        if (error && !/permission|does not exist/i.test(error.message)) throw error;
        destinationReachable = true;
      } catch (e: any) {
        destinationError = e.message ?? String(e);
      }
    }

    const { data: history } = await supabaseAdmin
      .from("db_sync_state")
      .select("*")
      .order("last_sync_at", { ascending: false });

    const lastGlobal = history?.[0]?.last_sync_at ?? null;

    // Sugestão de estratégia
    let suggestion: "incremental" | "upsert_all" | "full_replace" = "full_replace";
    let suggestionReason = "Nenhuma sincronização anterior detectada. Recomenda-se enviar tudo pela primeira vez.";
    if (lastGlobal) {
      suggestion = "incremental";
      suggestionReason = `Última sincronização em ${new Date(lastGlobal).toLocaleString("pt-BR")}. Enviar apenas alterações desde então.`;
    }

    return {
      destinationConfigured,
      destinationReachable,
      destinationError,
      destinationUrl: process.env.NEW_SUPABASE_URL ?? null,
      lastGlobal,
      history: history ?? [],
      suggestion,
      suggestionReason,
    };
  });

const strategySchema = z.object({
  strategy: z.enum(["incremental", "upsert_all", "full_replace"]),
});

export const syncToNewDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => strategySchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const dest = getDestinationClient();
    const meta = await listTablesWithMeta();

    const results: Array<{ table: string; rows: number; strategy: string; error?: string }> = [];
    const startedAt = new Date().toISOString();

    const superAdminId = await getSuperAdminUserId();

    for (const { table, hasUpdatedAt, pk, userCol } of meta) {
      try {
        let effective = data.strategy;
        if (effective === "incremental" && !hasUpdatedAt) effective = "upsert_all";

        let query = supabaseAdmin.from(table as any).select("*");

        if (effective === "incremental") {
          const { data: last } = await supabaseAdmin
            .from("db_sync_state")
            .select("last_max_updated_at")
            .eq("table_name", table)
            .maybeSingle();
          const since = last?.last_max_updated_at;
          if (since) query = query.gt("updated_at", since);
        }

        // Exclui o super admin já na origem quando aplicável
        if (superAdminId && userCol) query = query.neq(userCol, superAdminId);

        const { data: rows, error: srcErr } = await query;
        if (srcErr) throw new Error(`Origem: ${srcErr.message}`);

        if (effective === "full_replace") {
          // apagar todos no destino — preservando o super admin
          let del = dest.from(table as any).delete().gte("created_at", "1900-01-01");
          if (superAdminId && userCol) del = del.neq(userCol, superAdminId);
          const { error: delErr } = await del;
          if (delErr && !/does not exist|column .* does not exist/i.test(delErr.message)) {
            // fallback: delete all sem filtro de created_at
            let del2 = dest.from(table as any).delete().not("ctid", "is", null as any);
            if (superAdminId && userCol) del2 = del2.neq(userCol, superAdminId);
            const { error: delErr2 } = await del2;
            if (delErr2) throw new Error(`Destino delete: ${delErr2.message}`);
          }
        }


        const arr = (rows as any[]) ?? [];
        let synced = 0;
        let maxUpdated: string | null = null;

        if (arr.length > 0) {
          const batchSize = 200;
          for (let i = 0; i < arr.length; i += batchSize) {
            const batch = arr.slice(i, i + batchSize);
            if (hasUpdatedAt) {
              for (const r of batch) {
                if (r.updated_at && (!maxUpdated || r.updated_at > maxUpdated)) maxUpdated = r.updated_at;
              }
            }
            const upsertOpts = pk.length > 0 ? { onConflict: pk.join(",") } : undefined;
            const { error: upErr } = await dest.from(table as any).upsert(batch, upsertOpts as any);
            if (upErr) throw new Error(`Destino upsert: ${upErr.message}`);
            synced += batch.length;
          }
        }

        await supabaseAdmin.from("db_sync_state").upsert(
          {
            table_name: table,
            last_sync_at: new Date().toISOString(),
            last_max_updated_at: maxUpdated,
            last_strategy: effective,
            rows_synced: synced,
            last_error: null,
          },
          { onConflict: "table_name" },
        );

        results.push({ table, rows: synced, strategy: effective });
      } catch (e: any) {
        const msg = e.message ?? String(e);
        await supabaseAdmin.from("db_sync_state").upsert(
          {
            table_name: table,
            last_sync_at: new Date().toISOString(),
            last_strategy: data.strategy,
            rows_synced: 0,
            last_error: msg,
          },
          { onConflict: "table_name" },
        );
        results.push({ table, rows: 0, strategy: data.strategy, error: msg });
      }
    }

    const okCount = results.filter((r) => !r.error).length;
    const totalRows = results.reduce((s, r) => s + r.rows, 0);
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      strategy: data.strategy,
      results,
      summary: { tables: results.length, ok: okCount, rows: totalRows },
    };
  });

// ============================================================
// Sync de SCHEMA (DDL) — cria tabelas/colunas/enums faltantes no destino
// ============================================================

type ColRow = {
  column_name: string;
  data_type: string; // udt_name
  is_nullable: string;
  column_default: string | null;
  is_primary_key: boolean;
};

function renderType(udt: string): string {
  const t = udt.toLowerCase();
  if (t.startsWith("_")) return `${t.substring(1)}[]`;
  return t;
}

function colDefSQL(c: ColRow): string {
  let line = `"${c.column_name}" ${renderType(c.data_type)}`;
  if (c.is_nullable === "NO") line += " NOT NULL";
  if (c.column_default) line += ` DEFAULT ${c.column_default}`;
  return line;
}

async function fetchSchema(client: any) {
  const [{ data: tRows }, { data: eRows }] = await Promise.all([
    client.rpc("get_public_tables"),
    client.rpc("get_public_enums"),
  ]);
  const tables = ((tRows as any[]) ?? []).map((r) => r.table_name as string);
  const enums: Record<string, string[]> = {};
  for (const e of (eRows as any[]) ?? []) {
    (enums[e.type_name] ??= []).push(e.enum_label);
  }
  const tableCols: Record<string, ColRow[]> = {};
  for (const t of tables) {
    const { data: cols } = await client.rpc("get_table_structure", { t_name: t });
    tableCols[t] = ((cols as any[]) ?? []) as ColRow[];
  }
  return { tables, enums, tableCols };
}

export const syncSchemaToNewDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ dryRun: z.boolean().default(false) }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const dest = getDestinationClient();

    const [src, dst] = await Promise.all([fetchSchema(supabaseAdmin), fetchSchema(dest)]);

    const statements: string[] = [];
    const report = {
      enumsCreated: [] as string[],
      enumLabelsAdded: [] as string[],
      tablesCreated: [] as string[],
      columnsAdded: [] as string[],
    };

    // 1. Enums
    for (const [name, labels] of Object.entries(src.enums)) {
      const existing = dst.enums[name];
      if (!existing) {
        const vals = labels.map((l) => `'${l.replace(/'/g, "''")}'`).join(", ");
        statements.push(`CREATE TYPE public."${name}" AS ENUM (${vals});`);
        report.enumsCreated.push(name);
      } else {
        for (const l of labels) {
          if (!existing.includes(l)) {
            statements.push(`ALTER TYPE public."${name}" ADD VALUE IF NOT EXISTS '${l.replace(/'/g, "''")}';`);
            report.enumLabelsAdded.push(`${name}.${l}`);
          }
        }
      }
    }

    // 2. Tables
    for (const table of src.tables) {
      const srcCols = src.tableCols[table] ?? [];
      const dstCols = dst.tableCols[table];
      if (!dstCols) {
        // CREATE TABLE
        const lines = srcCols.map(colDefSQL);
        const pks = srcCols.filter((c) => c.is_primary_key).map((c) => `"${c.column_name}"`);
        if (pks.length > 0) lines.push(`CONSTRAINT "${table}_pkey" PRIMARY KEY (${pks.join(", ")})`);
        statements.push(`CREATE TABLE IF NOT EXISTS public."${table}" (\n  ${lines.join(",\n  ")}\n);`);
        statements.push(`GRANT SELECT, INSERT, UPDATE, DELETE ON public."${table}" TO authenticated;`);
        statements.push(`GRANT ALL ON public."${table}" TO service_role;`);
        statements.push(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);
        report.tablesCreated.push(table);
      } else {
        // Diff columns
        const dstNames = new Set(dstCols.map((c) => c.column_name));
        for (const c of srcCols) {
          if (!dstNames.has(c.column_name)) {
            // Adição segura: colunas NOT NULL sem default seriam bloqueadas se houver linhas;
            // relaxamos para nullable temporariamente e ajustamos default se houver.
            const nullable = c.is_nullable === "NO" && !c.column_default ? false : c.is_nullable === "YES";
            const parts = [`"${c.column_name}" ${renderType(c.data_type)}`];
            if (c.column_default) parts.push(`DEFAULT ${c.column_default}`);
            if (!nullable && c.is_nullable === "NO") parts.push("NOT NULL");
            statements.push(`ALTER TABLE public."${table}" ADD COLUMN IF NOT EXISTS ${parts.join(" ")};`);
            report.columnsAdded.push(`${table}.${c.column_name}`);
          }
        }
      }
    }

    if (statements.length === 0) {
      return { ok: true, dryRun: data.dryRun, report, statements, applied: 0, message: "Schemas já estão idênticos." };
    }

    if (data.dryRun) {
      return { ok: true, dryRun: true, report, statements, applied: 0, message: `${statements.length} instrução(ões) pendente(s).` };
    }

    // Aplica em lote
    const sql = statements.join("\n");
    const { error } = await dest.rpc("exec_sql" as any, { sql_query: sql });
    if (error) {
      if (/exec_sql.*does not exist/i.test(error.message)) {
        throw new Error(
          "A função RPC public.exec_sql(text) não existe no banco destino. Crie-a uma vez com: CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN EXECUTE sql_query; END; $$;",
        );
      }
      throw new Error(`Falha ao aplicar DDL: ${error.message}`);
    }

    return { ok: true, dryRun: false, report, statements, applied: statements.length, message: `${statements.length} instrução(ões) aplicada(s).` };
  });

// ============================================================
// Sync de políticas RLS (habilita RLS e replica policies do origem)
// ============================================================

type PolicyRow = {
  table_name: string;
  policy_name: string;
  cmd: string; // ALL | SELECT | INSERT | UPDATE | DELETE
  roles: string[];
  permissive: string; // PERMISSIVE | RESTRICTIVE
  qual: string | null;
  with_check: string | null;
};

function buildPolicyStatements(p: PolicyRow): string[] {
  const table = `public."${p.table_name}"`;
  const stmts: string[] = [
    `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "${p.policy_name}" ON ${table};`,
  ];
  const forClause = p.cmd && p.cmd !== "ALL" ? `FOR ${p.cmd}` : "FOR ALL";
  const roles = (p.roles ?? []).filter((r) => r && r !== "public").join(", ");
  const toClause = roles ? `TO ${roles}` : "";
  const using = p.qual ? `USING (${p.qual})` : "";
  const withCheck = p.with_check ? `WITH CHECK (${p.with_check})` : "";
  const perm = p.permissive === "RESTRICTIVE" ? "AS RESTRICTIVE" : "";
  stmts.push(
    `CREATE POLICY "${p.policy_name}" ON ${table} ${perm} ${forClause} ${toClause} ${using} ${withCheck};`
      .replace(/\s+/g, " ")
      .trim() + ";",
  );
  return stmts;
}

export const syncRlsPoliciesToNewDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ dryRun: z.boolean().default(false) }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const dest = getDestinationClient();

    const [{ data: srcPolRows, error: srcErr }, { data: dstTblRows }] = await Promise.all([
      supabaseAdmin.rpc("get_public_policies" as any),
      dest.rpc("get_public_tables" as any),
    ]);
    if (srcErr) throw new Error(`Origem: ${srcErr.message}`);
    const destTables = new Set(((dstTblRows as any[]) ?? []).map((r) => r.table_name as string));
    const srcPolicies = ((srcPolRows as any[]) ?? []) as PolicyRow[];

    const applicable = srcPolicies.filter((p) => destTables.has(p.table_name));
    const skipped = srcPolicies.filter((p) => !destTables.has(p.table_name));

    const statements: string[] = [];
    const enabledTables = new Set<string>();
    for (const p of applicable) {
      const built = buildPolicyStatements(p);
      // Deduplicate the ALTER TABLE ENABLE RLS per table
      for (const s of built) {
        if (s.startsWith("ALTER TABLE")) {
          if (enabledTables.has(p.table_name)) continue;
          enabledTables.add(p.table_name);
        }
        statements.push(s);
      }
    }

    if (statements.length === 0) {
      return { ok: true, dryRun: data.dryRun, applied: 0, statements, policies: 0, skipped: skipped.length, message: "Nenhuma política aplicável." };
    }

    if (data.dryRun) {
      return { ok: true, dryRun: true, applied: 0, statements, policies: applicable.length, skipped: skipped.length, message: `${applicable.length} política(s) prontas para aplicar.` };
    }

    const { error } = await dest.rpc("exec_sql" as any, { sql_query: statements.join("\n") });
    if (error) {
      if (/exec_sql.*does not exist/i.test(error.message)) {
        throw new Error("Função public.exec_sql(text) não existe no destino. Crie-a antes de aplicar políticas.");
      }
      throw new Error(`Falha ao aplicar políticas: ${error.message}`);
    }
    return { ok: true, dryRun: false, applied: statements.length, statements, policies: applicable.length, skipped: skipped.length, message: `${applicable.length} política(s) sincronizada(s).` };
  });


