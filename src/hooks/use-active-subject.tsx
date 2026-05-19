import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Unified "subject" para qualquer página de astrologia/numerologia.
 * - Se o usuário tem um cliente ativo, retorna os dados desse cliente.
 * - Caso contrário, retorna o birth_data primário do próprio usuário.
 */
export type ActiveSubject = {
  kind: "self" | "client";
  client_profile_id: string | null;
  birth_data_id: string | null;
  full_name: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  city: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

export function useActiveSubject() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-subject", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ActiveSubject | null> => {
      const uid = user!.id;
      const { data: prof } = await supabase
        .from("profiles")
        .select("active_client_profile_id")
        .eq("id", uid)
        .maybeSingle();
      const activeId = prof?.active_client_profile_id ?? null;
      if (activeId) {
        const { data: cp } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("id", activeId)
          .maybeSingle();
        if (cp) {
          return {
            kind: "client",
            client_profile_id: cp.id,
            birth_data_id: null,
            full_name: cp.full_name,
            birth_date: cp.birth_date,
            birth_time: cp.birth_time,
            time_unknown: cp.time_unknown,
            city: cp.city,
            country: cp.country,
            latitude: cp.latitude != null ? Number(cp.latitude) : null,
            longitude: cp.longitude != null ? Number(cp.longitude) : null,
            timezone: cp.timezone,
          };
        }
      }
      const { data: bd } = await supabase
        .from("birth_data")
        .select("*")
        .eq("user_id", uid)
        .eq("is_primary", true)
        .maybeSingle();
      if (!bd) return null;
      return {
        kind: "self",
        client_profile_id: null,
        birth_data_id: bd.id,
        full_name: bd.full_name,
        birth_date: bd.birth_date,
        birth_time: bd.birth_time,
        time_unknown: bd.time_unknown,
        city: bd.city,
        country: bd.country,
        latitude: bd.latitude != null ? Number(bd.latitude) : null,
        longitude: bd.longitude != null ? Number(bd.longitude) : null,
        timezone: bd.timezone,
      };
    },
    staleTime: 30_000,
  });
}
