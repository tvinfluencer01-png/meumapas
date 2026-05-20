// Lista curada de cidades brasileiras com coordenadas e fuso horário IANA.
// Inclui todas as capitais + principais metrópoles/cidades por estado.
// São Paulo é mantida no topo intencionalmente (padrão para novos clientes).

export type BRCity = {
  name: string;
  state: string; // UF
  latitude: number;
  longitude: number;
  timezone: string; // IANA tz
};

// timezones por UF
const TZ_SP = "America/Sao_Paulo";
const TZ_BA = "America/Bahia";
const TZ_FOR = "America/Fortaleza";
const TZ_RECIFE = "America/Recife";
const TZ_MACEIO = "America/Maceio";
const TZ_ARAGUAINA = "America/Araguaina";
const TZ_BELEM = "America/Belem";
const TZ_SANTAREM = "America/Santarem";
const TZ_MANAUS = "America/Manaus";
const TZ_BOA_VISTA = "America/Boa_Vista";
const TZ_PORTO_VELHO = "America/Porto_Velho";
const TZ_RIO_BRANCO = "America/Rio_Branco";
const TZ_CUIABA = "America/Cuiaba";
const TZ_CAMPO_GRANDE = "America/Campo_Grande";
const TZ_NORONHA = "America/Noronha";

// "_first" garantirá que São Paulo apareça primeiro na lista.
export const BR_CITIES: BRCity[] = [
  // ===== São Paulo no topo =====
  { name: "São Paulo", state: "SP", latitude: -23.5505, longitude: -46.6333, timezone: TZ_SP },

  // ===== SP =====
  { name: "Campinas", state: "SP", latitude: -22.9099, longitude: -47.0626, timezone: TZ_SP },
  { name: "Guarulhos", state: "SP", latitude: -23.4543, longitude: -46.5337, timezone: TZ_SP },
  { name: "São Bernardo do Campo", state: "SP", latitude: -23.6914, longitude: -46.5646, timezone: TZ_SP },
  { name: "Santo André", state: "SP", latitude: -23.6633, longitude: -46.5383, timezone: TZ_SP },
  { name: "Osasco", state: "SP", latitude: -23.5325, longitude: -46.7919, timezone: TZ_SP },
  { name: "São José dos Campos", state: "SP", latitude: -23.2237, longitude: -45.9009, timezone: TZ_SP },
  { name: "Ribeirão Preto", state: "SP", latitude: -21.1775, longitude: -47.8103, timezone: TZ_SP },
  { name: "Sorocaba", state: "SP", latitude: -23.5015, longitude: -47.4526, timezone: TZ_SP },
  { name: "Santos", state: "SP", latitude: -23.9608, longitude: -46.3336, timezone: TZ_SP },
  { name: "São José do Rio Preto", state: "SP", latitude: -20.8113, longitude: -49.3758, timezone: TZ_SP },
  { name: "Bauru", state: "SP", latitude: -22.3147, longitude: -49.0606, timezone: TZ_SP },
  { name: "Piracicaba", state: "SP", latitude: -22.7253, longitude: -47.6492, timezone: TZ_SP },
  { name: "Jundiaí", state: "SP", latitude: -23.1857, longitude: -46.8978, timezone: TZ_SP },
  { name: "Mauá", state: "SP", latitude: -23.6679, longitude: -46.4613, timezone: TZ_SP },
  { name: "Mogi das Cruzes", state: "SP", latitude: -23.5226, longitude: -46.1885, timezone: TZ_SP },
  { name: "Diadema", state: "SP", latitude: -23.6862, longitude: -46.6228, timezone: TZ_SP },

  // ===== RJ =====
  { name: "Rio de Janeiro", state: "RJ", latitude: -22.9068, longitude: -43.1729, timezone: TZ_SP },
  { name: "São Gonçalo", state: "RJ", latitude: -22.8268, longitude: -43.0539, timezone: TZ_SP },
  { name: "Duque de Caxias", state: "RJ", latitude: -22.7858, longitude: -43.3055, timezone: TZ_SP },
  { name: "Nova Iguaçu", state: "RJ", latitude: -22.7556, longitude: -43.4603, timezone: TZ_SP },
  { name: "Niterói", state: "RJ", latitude: -22.8833, longitude: -43.1036, timezone: TZ_SP },
  { name: "Belford Roxo", state: "RJ", latitude: -22.7642, longitude: -43.3992, timezone: TZ_SP },
  { name: "Campos dos Goytacazes", state: "RJ", latitude: -21.7642, longitude: -41.3294, timezone: TZ_SP },
  { name: "Petrópolis", state: "RJ", latitude: -22.5050, longitude: -43.1789, timezone: TZ_SP },
  { name: "Volta Redonda", state: "RJ", latitude: -22.5230, longitude: -44.1042, timezone: TZ_SP },

  // ===== MG =====
  { name: "Belo Horizonte", state: "MG", latitude: -19.9167, longitude: -43.9345, timezone: TZ_SP },
  { name: "Uberlândia", state: "MG", latitude: -18.9128, longitude: -48.2755, timezone: TZ_SP },
  { name: "Contagem", state: "MG", latitude: -19.9317, longitude: -44.0536, timezone: TZ_SP },
  { name: "Juiz de Fora", state: "MG", latitude: -21.7642, longitude: -43.3494, timezone: TZ_SP },
  { name: "Betim", state: "MG", latitude: -19.9678, longitude: -44.1981, timezone: TZ_SP },
  { name: "Montes Claros", state: "MG", latitude: -16.7286, longitude: -43.8582, timezone: TZ_SP },
  { name: "Ribeirão das Neves", state: "MG", latitude: -19.7672, longitude: -44.0867, timezone: TZ_SP },
  { name: "Uberaba", state: "MG", latitude: -19.7475, longitude: -47.9319, timezone: TZ_SP },
  { name: "Governador Valadares", state: "MG", latitude: -18.8511, longitude: -41.9494, timezone: TZ_SP },
  { name: "Ipatinga", state: "MG", latitude: -19.4683, longitude: -42.5369, timezone: TZ_SP },

  // ===== ES =====
  { name: "Vitória", state: "ES", latitude: -20.3155, longitude: -40.3128, timezone: TZ_SP },
  { name: "Vila Velha", state: "ES", latitude: -20.3297, longitude: -40.2925, timezone: TZ_SP },
  { name: "Serra", state: "ES", latitude: -20.1289, longitude: -40.3078, timezone: TZ_SP },
  { name: "Cariacica", state: "ES", latitude: -20.2632, longitude: -40.4172, timezone: TZ_SP },

  // ===== PR =====
  { name: "Curitiba", state: "PR", latitude: -25.4284, longitude: -49.2733, timezone: TZ_SP },
  { name: "Londrina", state: "PR", latitude: -23.3045, longitude: -51.1696, timezone: TZ_SP },
  { name: "Maringá", state: "PR", latitude: -23.4205, longitude: -51.9331, timezone: TZ_SP },
  { name: "Ponta Grossa", state: "PR", latitude: -25.0950, longitude: -50.1619, timezone: TZ_SP },
  { name: "Cascavel", state: "PR", latitude: -24.9555, longitude: -53.4552, timezone: TZ_SP },
  { name: "São José dos Pinhais", state: "PR", latitude: -25.5316, longitude: -49.2061, timezone: TZ_SP },
  { name: "Foz do Iguaçu", state: "PR", latitude: -25.5478, longitude: -54.5882, timezone: TZ_SP },

  // ===== SC =====
  { name: "Florianópolis", state: "SC", latitude: -27.5949, longitude: -48.5482, timezone: TZ_SP },
  { name: "Joinville", state: "SC", latitude: -26.3045, longitude: -48.8487, timezone: TZ_SP },
  { name: "Blumenau", state: "SC", latitude: -26.9194, longitude: -49.0661, timezone: TZ_SP },
  { name: "São José", state: "SC", latitude: -27.6136, longitude: -48.6366, timezone: TZ_SP },
  { name: "Chapecó", state: "SC", latitude: -27.0967, longitude: -52.6181, timezone: TZ_SP },
  { name: "Criciúma", state: "SC", latitude: -28.6775, longitude: -49.3697, timezone: TZ_SP },

  // ===== RS =====
  { name: "Porto Alegre", state: "RS", latitude: -30.0346, longitude: -51.2177, timezone: TZ_SP },
  { name: "Caxias do Sul", state: "RS", latitude: -29.1678, longitude: -51.1794, timezone: TZ_SP },
  { name: "Pelotas", state: "RS", latitude: -31.7654, longitude: -52.3376, timezone: TZ_SP },
  { name: "Canoas", state: "RS", latitude: -29.9211, longitude: -51.1844, timezone: TZ_SP },
  { name: "Santa Maria", state: "RS", latitude: -29.6842, longitude: -53.8069, timezone: TZ_SP },
  { name: "Gravataí", state: "RS", latitude: -29.9442, longitude: -50.9919, timezone: TZ_SP },
  { name: "Novo Hamburgo", state: "RS", latitude: -29.6783, longitude: -51.1306, timezone: TZ_SP },
  { name: "Viamão", state: "RS", latitude: -30.0808, longitude: -51.0233, timezone: TZ_SP },

  // ===== GO + DF =====
  { name: "Brasília", state: "DF", latitude: -15.7939, longitude: -47.8828, timezone: TZ_SP },
  { name: "Goiânia", state: "GO", latitude: -16.6869, longitude: -49.2648, timezone: TZ_SP },
  { name: "Aparecida de Goiânia", state: "GO", latitude: -16.8198, longitude: -49.2467, timezone: TZ_SP },
  { name: "Anápolis", state: "GO", latitude: -16.3267, longitude: -48.9528, timezone: TZ_SP },
  { name: "Rio Verde", state: "GO", latitude: -17.7975, longitude: -50.9264, timezone: TZ_SP },

  // ===== MT =====
  { name: "Cuiabá", state: "MT", latitude: -15.6014, longitude: -56.0979, timezone: TZ_CUIABA },
  { name: "Várzea Grande", state: "MT", latitude: -15.6467, longitude: -56.1325, timezone: TZ_CUIABA },
  { name: "Rondonópolis", state: "MT", latitude: -16.4706, longitude: -54.6356, timezone: TZ_CUIABA },
  { name: "Sinop", state: "MT", latitude: -11.8642, longitude: -55.5025, timezone: TZ_CUIABA },

  // ===== MS =====
  { name: "Campo Grande", state: "MS", latitude: -20.4486, longitude: -54.6295, timezone: TZ_CAMPO_GRANDE },
  { name: "Dourados", state: "MS", latitude: -22.2231, longitude: -54.8120, timezone: TZ_CAMPO_GRANDE },
  { name: "Três Lagoas", state: "MS", latitude: -20.7849, longitude: -51.7007, timezone: TZ_CAMPO_GRANDE },

  // ===== BA =====
  { name: "Salvador", state: "BA", latitude: -12.9714, longitude: -38.5014, timezone: TZ_BA },
  { name: "Feira de Santana", state: "BA", latitude: -12.2664, longitude: -38.9663, timezone: TZ_BA },
  { name: "Vitória da Conquista", state: "BA", latitude: -14.8619, longitude: -40.8447, timezone: TZ_BA },
  { name: "Camaçari", state: "BA", latitude: -12.6975, longitude: -38.3242, timezone: TZ_BA },
  { name: "Itabuna", state: "BA", latitude: -14.7858, longitude: -39.2803, timezone: TZ_BA },
  { name: "Juazeiro", state: "BA", latitude: -9.4111, longitude: -40.4986, timezone: TZ_BA },
  { name: "Ilhéus", state: "BA", latitude: -14.7889, longitude: -39.0492, timezone: TZ_BA },

  // ===== SE =====
  { name: "Aracaju", state: "SE", latitude: -10.9472, longitude: -37.0731, timezone: TZ_MACEIO },

  // ===== AL =====
  { name: "Maceió", state: "AL", latitude: -9.6658, longitude: -35.7350, timezone: TZ_MACEIO },
  { name: "Arapiraca", state: "AL", latitude: -9.7522, longitude: -36.6611, timezone: TZ_MACEIO },

  // ===== PE =====
  { name: "Recife", state: "PE", latitude: -8.0476, longitude: -34.8770, timezone: TZ_RECIFE },
  { name: "Jaboatão dos Guararapes", state: "PE", latitude: -8.1128, longitude: -35.0150, timezone: TZ_RECIFE },
  { name: "Olinda", state: "PE", latitude: -8.0089, longitude: -34.8553, timezone: TZ_RECIFE },
  { name: "Caruaru", state: "PE", latitude: -8.2839, longitude: -35.9758, timezone: TZ_RECIFE },
  { name: "Petrolina", state: "PE", latitude: -9.3892, longitude: -40.5031, timezone: TZ_RECIFE },

  // ===== PB =====
  { name: "João Pessoa", state: "PB", latitude: -7.1195, longitude: -34.8450, timezone: TZ_FOR },
  { name: "Campina Grande", state: "PB", latitude: -7.2306, longitude: -35.8811, timezone: TZ_FOR },

  // ===== RN =====
  { name: "Natal", state: "RN", latitude: -5.7945, longitude: -35.2110, timezone: TZ_FOR },
  { name: "Mossoró", state: "RN", latitude: -5.1875, longitude: -37.3444, timezone: TZ_FOR },

  // ===== CE =====
  { name: "Fortaleza", state: "CE", latitude: -3.7319, longitude: -38.5267, timezone: TZ_FOR },
  { name: "Caucaia", state: "CE", latitude: -3.7361, longitude: -38.6531, timezone: TZ_FOR },
  { name: "Juazeiro do Norte", state: "CE", latitude: -7.2128, longitude: -39.3158, timezone: TZ_FOR },
  { name: "Sobral", state: "CE", latitude: -3.6889, longitude: -40.3492, timezone: TZ_FOR },

  // ===== PI =====
  { name: "Teresina", state: "PI", latitude: -5.0892, longitude: -42.8019, timezone: TZ_FOR },
  { name: "Parnaíba", state: "PI", latitude: -2.9056, longitude: -41.7767, timezone: TZ_FOR },

  // ===== MA =====
  { name: "São Luís", state: "MA", latitude: -2.5297, longitude: -44.3028, timezone: TZ_FOR },
  { name: "Imperatriz", state: "MA", latitude: -5.5266, longitude: -47.4769, timezone: TZ_FOR },

  // ===== TO =====
  { name: "Palmas", state: "TO", latitude: -10.1689, longitude: -48.3317, timezone: TZ_ARAGUAINA },
  { name: "Araguaína", state: "TO", latitude: -7.1908, longitude: -48.2076, timezone: TZ_ARAGUAINA },

  // ===== PA =====
  { name: "Belém", state: "PA", latitude: -1.4558, longitude: -48.5039, timezone: TZ_BELEM },
  { name: "Ananindeua", state: "PA", latitude: -1.3656, longitude: -48.3722, timezone: TZ_BELEM },
  { name: "Santarém", state: "PA", latitude: -2.4406, longitude: -54.7000, timezone: TZ_SANTAREM },
  { name: "Marabá", state: "PA", latitude: -5.3811, longitude: -49.1325, timezone: TZ_BELEM },
  { name: "Castanhal", state: "PA", latitude: -1.2939, longitude: -47.9261, timezone: TZ_BELEM },

  // ===== AP =====
  { name: "Macapá", state: "AP", latitude: 0.0349, longitude: -51.0694, timezone: TZ_BELEM },

  // ===== AM =====
  { name: "Manaus", state: "AM", latitude: -3.1190, longitude: -60.0217, timezone: TZ_MANAUS },
  { name: "Parintins", state: "AM", latitude: -2.6283, longitude: -56.7350, timezone: TZ_MANAUS },

  // ===== RR =====
  { name: "Boa Vista", state: "RR", latitude: 2.8197, longitude: -60.6733, timezone: TZ_BOA_VISTA },

  // ===== RO =====
  { name: "Porto Velho", state: "RO", latitude: -8.7619, longitude: -63.9039, timezone: TZ_PORTO_VELHO },
  { name: "Ji-Paraná", state: "RO", latitude: -10.8853, longitude: -61.9514, timezone: TZ_PORTO_VELHO },

  // ===== AC =====
  { name: "Rio Branco", state: "AC", latitude: -9.9747, longitude: -67.8243, timezone: TZ_RIO_BRANCO },
  { name: "Cruzeiro do Sul", state: "AC", latitude: -7.6306, longitude: -72.6753, timezone: TZ_RIO_BRANCO },

  // ===== Fernando de Noronha =====
  { name: "Fernando de Noronha", state: "PE", latitude: -3.8536, longitude: -32.4297, timezone: TZ_NORONHA },
];

// Mapeamento UF → timezone IANA (fallback para cidades fora do catálogo curado).
export const UF_TIMEZONE: Record<string, string> = {
  AC: TZ_RIO_BRANCO,
  AL: TZ_MACEIO,
  AP: TZ_BELEM,
  AM: TZ_MANAUS,
  BA: TZ_BA,
  CE: TZ_FOR,
  DF: TZ_SP,
  ES: TZ_SP,
  GO: TZ_SP,
  MA: TZ_FOR,
  MT: TZ_CUIABA,
  MS: TZ_CAMPO_GRANDE,
  MG: TZ_SP,
  PA: TZ_BELEM,
  PB: TZ_FOR,
  PR: TZ_SP,
  PE: TZ_RECIFE,
  PI: TZ_FOR,
  RJ: TZ_SP,
  RN: TZ_FOR,
  RS: TZ_SP,
  RO: TZ_PORTO_VELHO,
  RR: TZ_BOA_VISTA,
  SC: TZ_SP,
  SP: TZ_SP,
  SE: TZ_MACEIO,
  TO: TZ_ARAGUAINA,
};
// alias para manter consistência
const TZ_BAHIA = TZ_BA;

export function timezoneForUF(uf: string): string {
  return UF_TIMEZONE[uf.toUpperCase()] ?? TZ_SP;
}

export function findCity(cityLabel: string): BRCity | undefined {
  // cityLabel pode vir como "São Paulo - SP" ou só "São Paulo"
  const norm = cityLabel.trim().toLowerCase();
  return BR_CITIES.find(
    (c) =>
      `${c.name} - ${c.state}`.toLowerCase() === norm ||
      c.name.toLowerCase() === norm,
  );
}
