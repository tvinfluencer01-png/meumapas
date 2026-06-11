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
    sql += "-- Sistema: Código Cósmico\n\n";
    
    // In code mode, we can't easily extract full DDL without custom SQL queries per table.
    // We'll focus on the data and provide instructions for the structure.
    sql += "-- INSTRUÇÕES: Este arquivo contém os dados atuais.\n";
    sql += "-- A estrutura das tabelas deve ser criada via migrações Supabase antes de importar os dados.\n\n";
    
    for (const table of tables) {
      // Use any to bypass TS error on dynamic table name
      const { data, error } = await (supabaseAdmin.from(table as any) as any).select("*");
      if (error) {
        console.error(`Error exporting ${table}:`, error);
        sql += `-- Erro ao exportar tabela ${table}: ${error.message}\n`;
        continue;
      }

      if (!data || data.length === 0) {
        sql += `-- Tabela ${table} está vazia.\n`;
        continue;
      }

      sql += `\n-- Tabela public.${table} (${data.length} registros)\n`;
      sql += `DELETE FROM public.${table}; -- Limpa dados existentes para evitar conflitos\n`;
      
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const columns = Object.keys(batch[0]).join(", ");
        
        sql += `INSERT INTO public.${table} (${columns}) VALUES\n`;
        
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
    }

    return { sql };

  });
