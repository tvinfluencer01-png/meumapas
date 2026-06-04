import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CronJobStatus = {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_started: string | null;
  last_run_ended: string | null;
  last_status: string | null;
  last_return_message: string | null;
  last_http_status: number | null;
  last_http_error: string | null;
};

export const getCronStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("forbidden");

    const { data, error } = await supabaseAdmin.rpc("admin_cron_status");
    if (error) throw new Error(error.message);
    return (data ?? []) as CronJobStatus[];
  });
