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
        
        sql += `TRUNCATE TABLE public.${table} CASCADE; -- Limpa dados existentes\n\n`;
      }

      // 2. Get data
      const { data, error } = await (supabaseAdmin.from(table as any) as any).select("*");
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
              if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
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
