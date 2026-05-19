import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { resolveActiveSubject, type ActiveSubjectRecord } from "@/lib/active-subject";

/**
 * Unified "subject" para qualquer página de astrologia/numerologia.
 * - Se o usuário tem um cliente ativo, retorna os dados desse cliente.
 * - Caso contrário, retorna o birth_data primário do próprio usuário.
 */
export type ActiveSubject = ActiveSubjectRecord;

export function useActiveSubject() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-subject", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ActiveSubject | null> => {
      return resolveActiveSubject(supabase, user!.id);
    },
    staleTime: 30_000,
  });
}
