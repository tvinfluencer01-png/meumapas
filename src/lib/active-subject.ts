export type ActiveSubjectRecord = {
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

export async function resolveActiveSubject(
  supabase: any,
  userId: string,
): Promise<ActiveSubjectRecord | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_client_profile_id")
    .eq("id", userId)
    .maybeSingle();

  const activeId = profile?.active_client_profile_id ?? null;
  if (activeId) {
    const { data: client } = await supabase
      .from("client_profiles")
      .select("*")
      .eq("id", activeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (client) {
      return {
        kind: "client",
        client_profile_id: client.id,
        birth_data_id: null,
        full_name: client.full_name,
        birth_date: client.birth_date,
        birth_time: client.birth_time,
        time_unknown: client.time_unknown,
        city: client.city,
        country: client.country,
        latitude: client.latitude != null ? Number(client.latitude) : null,
        longitude: client.longitude != null ? Number(client.longitude) : null,
        timezone: client.timezone,
      };
    }
  }

  const { data: birth } = await supabase
    .from("birth_data")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (!birth) return null;
  return {
    kind: "self",
    client_profile_id: null,
    birth_data_id: birth.id,
    full_name: birth.full_name,
    birth_date: birth.birth_date,
    birth_time: birth.birth_time,
    time_unknown: birth.time_unknown,
    city: birth.city,
    country: birth.country,
    latitude: birth.latitude != null ? Number(birth.latitude) : null,
    longitude: birth.longitude != null ? Number(birth.longitude) : null,
    timezone: birth.timezone,
  };
}

export function applyActiveChartFilter(query: any, clientProfileId: string | null) {
  return clientProfileId
    ? query.eq("client_profile_id", clientProfileId)
    : query.is("client_profile_id", null);
}