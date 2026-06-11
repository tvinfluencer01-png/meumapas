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

    let sql = "-- Backup gerado em " + new Date().toISOString() + "\n\n";
    sql += "-- CRIAÇÃO DAS TABELAS\n";
    
    for (const table of tables) {
      // Use any to bypass TS error on dynamic table name
      const { data, error } = await (supabaseAdmin.from(table as any) as any).select("*");
      if (error) {
        console.error(`Error exporting ${table}:`, error);
        continue;
      }

      if (!data || data.length === 0) continue;

      sql += `\n-- Dados da tabela ${table}\n`;
      
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const columns = Object.keys(batch[0]).join(", ");
        
        sql += `INSERT INTO public.${table} (${columns}) VALUES\n`;
        
        const rows = batch.map((row: any) => {
          const values = Object.values(row).map(val => {
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
