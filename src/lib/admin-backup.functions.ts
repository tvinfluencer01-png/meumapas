import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

    // 1. Get all public tables
    const { data: tableRows, error: tableError } = await (supabaseAdmin as any).rpc("get_schema_metadata", {}).catch(async () => {
      // Fallback if RPC doesn't exist (we'll try to use raw queries via from().select())
      // But we can't easily do raw SQL via supabase client without a dedicated RPC or edge function
      // So we'll use the hardcoded list but enhance it with metadata discovery if possible
      return { data: null, error: { message: "RPC not found" } };
    });

    const tables = [
      "profiles",
      "user_roles",
      "user_settings",
      "user_credits",
      "credit_costs",
      "credit_packages",
      "credit_transactions",
      "birth_data",
      "client_profiles",
      "astro_charts",
      "reports",
      "numerology_reports",
      "tarot_readings",
      "kabbalah_meditations",
      "calendar_favorites",
      "horoscope_subscriptions",
      "horoscope_log",
      "notification_preferences",
      "notification_log",
      "system_settings",
      "mercado_pago_settings",
      "twilio_settings",
      "evolution_settings",
      "addon_settings",
      "payment_orders",
      "user_subscriptions",
      "pdf_branding",
      "role_audit_log",
      "app_logs",
      "ai_conversations",
      "ai_messages",
    ];

    let sql = "-- Backup gerado em " + new Date().toISOString() + "\n";
    sql += "-- Sistema: Código Cósmico\n";
    sql += "-- Este arquivo contém a ESTRUTURA e os DADOS para migração.\n\n";
    
    sql += "BEGIN;\n\n";

    // Since we can't run raw SQL easily via the client to get metadata, 
    // we'll use a trick: query information_schema via a view or just assume standard types
    // for the tables we know.
    
    for (const table of tables) {
      // Get table data
      const { data, error } = await (supabaseAdmin.from(table as any) as any).select("*");
      if (error) {
        sql += `-- Erro ao exportar tabela ${table}: ${error.message}\n`;
        continue;
      }

      sql += `\n-- -----------------------------------------------------\n`;
      sql += `-- Tabela public.${table}\n`;
      sql += `-- -----------------------------------------------------\n\n`;
      
      // Attempt to construct a basic CREATE TABLE if we have at least one row
      if (data && data.length > 0) {
        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        
        sql += `CREATE TABLE IF NOT EXISTS public.${table} (\n`;
        const colDefs = columns.map(col => {
          const val = firstRow[col];
          let type = "TEXT";
          if (typeof val === "number") type = Number.isInteger(val) ? "INTEGER" : "NUMERIC";
          if (typeof val === "boolean") type = "BOOLEAN";
          if (val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val))) type = "TIMESTAMPTZ";
          if (typeof val === "object" && val !== null) type = "JSONB";
          
          // Special cases for common ID columns
          if (col === "id" && typeof val === "string" && val.length === 36) type = "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
          else if (col.endsWith("_id") && typeof val === "string" && val.length === 36) type = "UUID";
          
          return `  ${col} ${type}${col === "id" && !type.includes("PRIMARY KEY") ? " PRIMARY KEY" : ""}`;
        });
        sql += colDefs.join(",\n");
        sql += "\n);\n\n";

        sql += `TRUNCATE TABLE public.${table} CASCADE; -- Limpa dados existentes\n\n`;
        
        const batchSize = 50;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          const cols = Object.keys(batch[0]).join(", ");
          
          sql += `INSERT INTO public.${table} (${cols}) VALUES\n`;
          
          const rows = batch.map((row: any) => {
            const values = Object.entries(row).map(([_, val]) => {
              if (val === null) return "NULL";
              if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === "boolean") return val ? "true" : "false";
              if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return val;
            });
            return `(${values.join(", ")})`;
          });

          sql += rows.join(",\n") + ";\n";
        }
      } else {
        sql += `-- Tabela ${table} está vazia, pulando criação/inserção automática baseada em dados.\n`;
        sql += `-- Sugerimos criar manualmente: CREATE TABLE public.${table} (...);\n`;
      }
    }

    sql += "\nCOMMIT;\n";

    return { sql };
  });
