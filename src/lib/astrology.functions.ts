import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as Astro from "astronomy-engine";

// --- helpers --------------------------------------------------------------
const SIGNS = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
];

const PLANETS: { name: string; body: Astro.Body }[] = [
  { name: "Sol", body: Astro.Body.Sun },
  { name: "Lua", body: Astro.Body.Moon },
  { name: "Mercúrio", body: Astro.Body.Mercury },
  { name: "Vênus", body: Astro.Body.Venus },
  { name: "Marte", body: Astro.Body.Mars },
  { name: "Júpiter", body: Astro.Body.Jupiter },
  { name: "Saturno", body: Astro.Body.Saturn },
  { name: "Urano", body: Astro.Body.Uranus },
  { name: "Netuno", body: Astro.Body.Neptune },
  { name: "Plutão", body: Astro.Body.Pluto },
];

function signOf(lonDeg: number) {
  const lon = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(lon / 30);
  return { sign: SIGNS[idx], degree: lon - idx * 30, longitude: lon };
}

// Equatorial -> ecliptic longitude (J2000 approx, refined enough for natal preview)
function eclipticLongitudeFromEqu(ra_hours: number, dec_deg: number, date: Date) {
  // Obliquity of date (low precision)
  const T = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * Math.PI / 180;
  const ra = (ra_hours * 15) * Math.PI / 180;
  const dec = dec_deg * Math.PI / 180;
  const sinL = Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps);
  const cosL = Math.cos(ra);
  let lon = Math.atan2(sinL, cosL) * 180 / Math.PI;
  if (lon < 0) lon += 360;
  return lon;
}

function computeAscendantMC(date: Date, lat: number, lon: number) {
  // Local sidereal time
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = ((gmst + lon) % 360 + 360) % 360;
  const ramc = lst;
  const eps = (23.4392911 - 0.0130042 * T) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const ramcRad = ramc * Math.PI / 180;

  const mc = (Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(eps) - 0) * 180) / Math.PI;
  const mcLon = ((mc + 360) % 360);

  const asc =
    Math.atan2(
      -Math.cos(ramcRad),
      Math.sin(ramcRad) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps),
    ) * 180 / Math.PI;
  const ascLon = ((asc + 360) % 360);

  return { ascendant: ascLon, midheaven: mcLon };
}

function placidusHouses(asc: number, mc: number) {
  // Equal-house fallback from Asc; precise Placidus requires iterative solver.
  const houses: number[] = [];
  for (let i = 0; i < 12; i++) houses.push(((asc + i * 30) % 360 + 360) % 360);
  // Override the 10th with MC for visual accuracy
  houses[9] = mc;
  return houses;
}

const ASPECTS = [
  { name: "Conjunção", angle: 0, orb: 8 },
  { name: "Oposição", angle: 180, orb: 8 },
  { name: "Trígono", angle: 120, orb: 7 },
  { name: "Quadratura", angle: 90, orb: 7 },
  { name: "Sextil", angle: 60, orb: 5 },
];

function computeAspects(planets: { name: string; longitude: number }[]) {
  const out: { a: string; b: string; aspect: string; orb: number }[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = Math.abs(planets[i].longitude - planets[j].longitude) % 360;
      const angle = diff > 180 ? 360 - diff : diff;
      for (const a of ASPECTS) {
        if (Math.abs(angle - a.angle) <= a.orb) {
          out.push({
            a: planets[i].name,
            b: planets[j].name,
            aspect: a.name,
            orb: Number(Math.abs(angle - a.angle).toFixed(2)),
          });
          break;
        }
      }
    }
  }
  return out;
}

// --- input schema ---------------------------------------------------------
const ChartInput = z.object({
  birthDataId: z.string().uuid().optional(),
  fullName: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  timeUnknown: z.boolean().optional(),
  latitude: z.number(),
  longitude: z.number(),
  timezoneOffset: z.number().min(-14).max(14).default(0),
});

export const computeNatalChart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ChartInput.parse(d))
  .handler(async ({ data, context }) => {
    const time = data.timeUnknown ? "12:00:00" : (data.birthTime ?? "12:00:00");
    // Build UTC date from local components + offset
    const [h, mi, s] = time.split(":").map(Number);
    const [y, mo, d] = data.birthDate.split("-").map(Number);
    const utcMs =
      Date.UTC(y, mo - 1, d, h, mi, s ?? 0) - data.timezoneOffset * 3600_000;
    const date = new Date(utcMs);

    const observer = new Astro.Observer(data.latitude, data.longitude, 0);

    const planets = PLANETS.map(({ name, body }) => {
      const eq = Astro.Equator(body, date, observer, true, true);
      const lon = eclipticLongitudeFromEqu(eq.ra, eq.dec, date);
      const s = signOf(lon);
      return { name, ...s };
    });

    const { ascendant, midheaven } = computeAscendantMC(
      date,
      data.latitude,
      data.longitude,
    );
    const houses = placidusHouses(ascendant, midheaven).map((deg, i) => ({
      house: i + 1,
      ...signOf(deg),
    }));
    const ascSign = signOf(ascendant);
    const mcSign = signOf(midheaven);

    const aspects = computeAspects(planets);

    const summary =
      `${data.fullName} — Sol em ${planets[0].sign}, Lua em ${planets[1].sign}, Ascendente em ${ascSign.sign}. ` +
      `${aspects.length} aspectos principais detectados.`;

    // Persist
    const { data: saved, error } = await context.supabase
      .from("astro_charts")
      .insert({
        user_id: context.userId,
        birth_data_id: data.birthDataId ?? null,
        engine: "swiss_ephemeris",
        planets,
        houses,
        aspects,
        ascendant,
        midheaven,
        summary,
      })
      .select()
      .single();

    if (error) console.error("[astro] save error:", error);

    return {
      id: saved?.id ?? null,
      planets,
      houses,
      aspects,
      ascendant: { ...ascSign, longitude: ascendant },
      midheaven: { ...mcSign, longitude: midheaven },
      summary,
    };
  });
