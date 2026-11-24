import type { Country } from './countries';

export interface SubmarineCable {
  id: string;
  name: string;
  lengthKm: number;
  capacityTbps: number;
  color: 'cyan' | 'amber';
  regionLabel: string;
  /** Ordered [lat, lng] waypoints along the undersea route */
  waypoints: ReadonlyArray<readonly [number, number]>;
  /** ISO codes of countries with direct landings or primary branches on this cable */
  connectedIsos: readonly string[];
}

export interface CountryConnectivityInfo {
  isps: string[];
  directCables: SubmarineCable[];
  transitCables: SubmarineCable[];
  isLandlockedTransit: boolean;
  gatewaySummary: string;
}

/**
 * Curated global submarine fiber-optic backbone network (major transoceanic & Indian Ocean systems).
 */
export const SUBMARINE_CABLES: readonly SubmarineCable[] = [
  {
    id: 'seamewe6',
    name: 'SEA-ME-WE 6',
    lengthKm: 21700,
    capacityTbps: 126,
    color: 'cyan',
    regionLabel: 'Asia – Indian Ocean – Middle East – Europe',
    waypoints: [
      [1.35, 103.82],   // Singapore
      [5.41, 100.33],   // Penang, Malaysia
      [6.93, 79.86],    // Colombo, Sri Lanka
      [19.07, 72.88],   // Mumbai, India
      [24.86, 67.01],   // Karachi, Pakistan
      [23.59, 58.41],   // Muscat, Oman
      [11.59, 43.15],   // Djibouti
      [21.49, 39.19],   // Jeddah, Saudi Arabia
      [30.04, 31.24],   // Suez / Cairo, Egypt
      [43.30, 5.37],    // Marseille, France
      [50.82, -4.54],   // Bude / UK
    ],
    connectedIsos: ['sg', 'my', 'lk', 'in', 'pk', 'om', 'dj', 'sa', 'eg', 'fr', 'gb', 'gb-eng', 'mv', 'bd'],
  },
  {
    id: 'seamewe5',
    name: 'SEA-ME-WE 5',
    lengthKm: 20000,
    capacityTbps: 36,
    color: 'amber',
    regionLabel: 'Southeast Asia – Sri Lanka – Red Sea – Mediterranean',
    waypoints: [
      [1.35, 103.82],   // Singapore
      [3.59, 98.67],    // Medan, Indonesia
      [5.95, 80.55],    // Matara, Sri Lanka
      [12.79, 45.02],   // Aden / Red Sea
      [11.59, 43.15],   // Djibouti
      [24.09, 38.06],   // Yanbu, Saudi Arabia
      [31.20, 29.92],   // Alexandria, Egypt
      [38.12, 13.36],   // Palermo, Italy
      [43.12, 5.93],    // Toulon, France
    ],
    connectedIsos: ['sg', 'id', 'mm', 'bd', 'lk', 'ae', 'om', 'ye', 'dj', 'sa', 'eg', 'tr', 'it', 'fr'],
  },
  {
    id: 'bharat-lanka-i2i',
    name: 'Bharat-Lanka & i2i',
    lengthKm: 3200,
    capacityTbps: 24,
    color: 'amber',
    regionLabel: 'South Asia – Bay of Bengal',
    waypoints: [
      [6.93, 79.86],    // Colombo, Sri Lanka
      [8.76, 78.13],    // Tuticorin, India
      [13.08, 80.27],   // Chennai, India
      [1.35, 103.82],   // Singapore
    ],
    connectedIsos: ['lk', 'in', 'sg'],
  },
  {
    id: 'flag-fea',
    name: 'FLAG Europe-Asia (FEA)',
    lengthKm: 28000,
    capacityTbps: 48,
    color: 'cyan',
    regionLabel: 'Europe – Gulf – India – East Asia',
    waypoints: [
      [50.07, -5.65],   // Porthcurno, UK
      [36.72, -4.42],   // Estepona, Spain
      [31.20, 29.92],   // Alexandria, Egypt
      [25.20, 55.27],   // Fujairah / Dubai, UAE
      [19.07, 72.88],   // Mumbai, India
      [5.41, 100.33],   // Penang, Malaysia
      [22.32, 114.17],  // Hong Kong
      [31.23, 121.47],  // Shanghai, China
      [35.68, 139.69],  // Tokyo, Japan
    ],
    connectedIsos: ['gb', 'gb-eng', 'gb-wls', 'es', 'it', 'eg', 'jo', 'sa', 'ae', 'qa', 'kw', 'bh', 'in', 'my', 'th', 'hk', 'mo', 'cn', 'kr', 'jp'],
  },
  {
    id: '2africa',
    name: '2Africa',
    lengthKm: 45000,
    capacityTbps: 180,
    color: 'amber',
    regionLabel: 'Circum-African – Europe – Gulf – India',
    waypoints: [
      [50.82, -4.54],   // Bude, UK
      [38.72, -9.14],   // Lisbon, Portugal
      [33.57, -7.59],   // Casablanca, Morocco
      [14.72, -17.47],  // Dakar, Senegal
      [5.60, -0.19],    // Accra, Ghana
      [6.52, 3.38],     // Lagos, Nigeria
      [-33.92, 18.42],  // Cape Town, South Africa
      [-4.04, 39.67],   // Mombasa, Kenya
      [11.59, 43.15],   // Djibouti
      [23.59, 58.41],   // Muscat, Oman
      [24.86, 67.01],   // Karachi, Pakistan
      [19.07, 72.88],   // Mumbai, India
    ],
    connectedIsos: ['gb', 'gb-eng', 'pt', 'es', 'ma', 'sn', 'ci', 'gh', 'ng', 'ao', 'za', 'mz', 'mg', 'tz', 'ke', 'so', 'dj', 'sd', 'eg', 'om', 'ae', 'qa', 'pk', 'in', 're'],
  },
  {
    id: 'marea',
    name: 'MAREA Transatlantic',
    lengthKm: 6600,
    capacityTbps: 200,
    color: 'cyan',
    regionLabel: 'North America – Western Europe',
    waypoints: [
      [36.85, -75.98],  // Virginia Beach, USA
      [40.10, -42.00],  // Mid-Atlantic Ridge
      [43.26, -2.93],   // Bilbao, Spain
      [51.51, -0.13],   // London, UK
    ],
    connectedIsos: ['us', 'es', 'pt', 'fr', 'gb', 'gb-eng', 'gb-wls', 'bm'],
  },
  {
    id: 'grace-hopper',
    name: 'Grace Hopper & North Atlantic',
    lengthKm: 6250,
    capacityTbps: 340,
    color: 'amber',
    regionLabel: 'US East Coast – UK & Ireland – Northern Europe',
    waypoints: [
      [40.71, -74.01],  // New York, USA
      [44.65, -63.57],  // Halifax, Canada
      [53.35, -6.26],   // Dublin, Ireland
      [54.60, -5.93],   // Belfast, Northern Ireland
      [55.95, -3.19],   // Edinburgh, Scotland
      [52.37, 4.90],    // Amsterdam, Netherlands
      [55.68, 12.57],   // Copenhagen, Denmark
      [59.33, 18.07],   // Stockholm, Sweden
    ],
    connectedIsos: ['us', 'ca', 'ie', 'gb', 'gb-eng', 'gb-sct', 'gb-nir', 'gb-wls', 'nl', 'be', 'de', 'dk', 'no', 'se', 'fi', 'is', 'fo', 'gl'],
  },
  {
    id: 'faster-pacific',
    name: 'FASTER Trans-Pacific',
    lengthKm: 9000,
    capacityTbps: 60,
    color: 'cyan',
    regionLabel: 'US West Coast – Japan – Taiwan',
    waypoints: [
      [43.12, -124.41], // Bandon, Oregon, USA
      [44.50, -162.00], // North Pacific
      [35.61, 140.12],  // Chiba, Japan
      [25.03, 121.56],  // Taipei, Taiwan
    ],
    connectedIsos: ['us', 'ca', 'jp', 'tw', 'kr', 'gu'],
  },
  {
    id: 'sjc2',
    name: 'SJC2 Asia-Pacific',
    lengthKm: 10500,
    capacityTbps: 144,
    color: 'amber',
    regionLabel: 'Singapore – East Asia Backbone',
    waypoints: [
      [1.35, 103.82],   // Singapore
      [13.76, 100.50],  // Bangkok, Thailand
      [10.82, 106.63],  // Ho Chi Minh City, Vietnam
      [22.32, 114.17],  // Hong Kong
      [25.03, 121.56],  // Taiwan
      [35.18, 129.08],  // Busan, South Korea
      [35.68, 139.69],  // Tokyo, Japan
    ],
    connectedIsos: ['sg', 'th', 'kh', 'vn', 'ph', 'hk', 'mo', 'cn', 'tw', 'kr', 'jp'],
  },
  {
    id: 'southern-cross-next',
    name: 'Southern Cross NEXT',
    lengthKm: 15840,
    capacityTbps: 72,
    color: 'cyan',
    regionLabel: 'Australia – New Zealand – Pacific – USA',
    waypoints: [
      [-33.87, 151.21], // Sydney, Australia
      [-36.85, 174.76], // Auckland, New Zealand
      [-18.14, 178.44], // Suva, Fiji
      [21.31, -157.86], // Hawaii, USA
      [34.05, -118.24], // Los Angeles, USA
    ],
    connectedIsos: ['au', 'nz', 'fj', 'ws', 'to', 'pf', 'nc', 'us'],
  },
  {
    id: 'indigo',
    name: 'INDIGO West & Central',
    lengthKm: 9200,
    capacityTbps: 36,
    color: 'amber',
    regionLabel: 'Singapore – Indonesia – Australia',
    waypoints: [
      [1.35, 103.82],   // Singapore
      [-6.21, 106.85],  // Jakarta, Indonesia
      [-31.95, 115.86], // Perth, Australia
      [-33.87, 151.21], // Sydney, Australia
    ],
    connectedIsos: ['sg', 'id', 'au', 'pg', 'tl'],
  },
  {
    id: 'curie-ellalink',
    name: 'Curie & EllaLink',
    lengthKm: 16400,
    capacityTbps: 100,
    color: 'cyan',
    regionLabel: 'Americas – South Atlantic – Europe',
    waypoints: [
      [34.05, -118.24], // Los Angeles, USA
      [8.98, -79.52],   // Panama City
      [-33.05, -71.62], // Valparaiso, Chile
      [-34.60, -58.38], // Buenos Aires, Argentina
      [-3.73, -38.52],  // Fortaleza, Brazil
      [38.72, -9.14],   // Sines / Lisbon, Portugal
    ],
    connectedIsos: ['us', 'mx', 'pa', 'ec', 'pe', 'cl', 'ar', 'uy', 'br', 'pt', 'es', 'cv'],
  },
  {
    id: 'amx1',
    name: 'AMX-1 Caribbean & LatAm',
    lengthKm: 17800,
    capacityTbps: 64,
    color: 'amber',
    regionLabel: 'US – Caribbean – South America',
    waypoints: [
      [25.76, -80.19],  // Miami, USA
      [21.16, -86.85],  // Cancun, Mexico
      [18.47, -66.11],  // San Juan, Puerto Rico
      [10.39, -75.48],  // Cartagena, Colombia
      [-3.73, -38.52],  // Fortaleza, Brazil
      [-22.91, -43.17], // Rio de Janeiro, Brazil
    ],
    connectedIsos: ['us', 'mx', 'pr', 'do', 'jm', 'cu', 'ky', 'aw', 'cw', 'co', 've', 'tt', 'br', 'ar'],
  },
];

/**
 * Curated major Internet Service Providers (ISPs) per country ISO code.
 */
const COUNTRY_ISPS: Record<string, readonly string[]> = {
  lk: ['SLT-Mobitel', 'Dialog Axiata', 'Hutch', 'Airtel Lanka', 'Lanka Bell'],
  in: ['JioFiber', 'Airtel Xstream', 'BSNL Bharat Fiber', 'ACT Fibernet', 'Vi'],
  gb: ['BT Broadband', 'Virgin Media O2', 'Sky Broadband', 'Vodafone UK', 'TalkTalk'],
  'gb-eng': ['BT Broadband', 'Virgin Media O2', 'Sky Broadband', 'Hyperoptic', 'Vodafone UK'],
  'gb-sct': ['BT Scotland', 'Virgin Media', 'Sky Broadband', 'Vodafone UK', 'Plusnet'],
  'gb-wls': ['BT Broadband', 'Sky Broadband', 'Virgin Media', 'Ogi Cymru', 'Vodafone UK'],
  'gb-nir': ['BT Broadband', 'Virgin Media', 'Fibrus', 'Sky Broadband', 'Vodafone UK'],
  us: ['AT&T Fiber', 'Xfinity (Comcast)', 'Verizon Fios', 'Spectrum', 'Starlink'],
  ca: ['Bell Canada', 'Rogers', 'Telus PureFibre', 'Shaw', 'Videotron'],
  sg: ['Singtel', 'StarHub', 'M1', 'MyRepublic', 'ViewQwest'],
  jp: ['NTT FLET\'S Hikari', 'KDDI au Hikari', 'SoftBank Hikari', 'NURO Hikari'],
  kr: ['KT Giga Internet', 'SK Broadband', 'LG U+'],
  cn: ['China Telecom', 'China Unicom', 'China Mobile'],
  hk: ['HKT (PCCW)', 'HKBN', 'SmarTone', '3 Hong Kong'],
  mo: ['CTM (Companhia de Telecomunicações de Macau)', 'China Telecom Macau'],
  tw: ['Chunghwa Telecom (HiNet)', 'Taiwan Mobile', 'FarEasTone'],
  au: ['Telstra', 'Optus', 'TPG Telecom', 'Aussie Broadband', 'Superloop'],
  nz: ['Spark NZ', 'One NZ', '2degrees', 'Chorus Fibre'],
  ae: ['e& (Etisalat)', 'du (EITC)'],
  sa: ['stc (Saudi Telecom)', 'Mobily', 'Zain KSA'],
  qa: ['Ooredoo Qatar', 'Vodafone Qatar'],
  om: ['Omantel', 'Ooredoo Oman', 'Awasr'],
  kw: ['Zain Kuwait', 'Ooredoo Kuwait', 'stc Kuwait'],
  de: ['Deutsche Telekom', 'Vodafone Germany', '1&1 Versatel', 'O2 Telefónica'],
  fr: ['Orange', 'Free (Iliad)', 'SFR', 'Bouygues Telecom'],
  it: ['TIM (Telecom Italia)', 'Fastweb', 'Vodafone Italia', 'WindTre'],
  es: ['Movistar (Telefónica)', 'MasOrange', 'Digi Spain', 'Vodafone España'],
  pt: ['MEO (Altice)', 'NOS', 'Vodafone Portugal'],
  nl: ['KPN', 'Ziggo (VodafoneZiggo)', 'Odido'],
  ch: ['Swisscom', 'Sunrise', 'Salt Fiber'],
  se: ['Telia', 'Tele2', 'Bahnhof', 'Telenor'],
  no: ['Telenor', 'Telia Norway', 'Altibox'],
  dk: ['TDC / YouSee', 'Telenor DK', 'Telia', 'Norlys'],
  fi: ['Elisa', 'DNA', 'Telia Finland'],
  ie: ['Eir', 'Virgin Media Ireland', 'Sky Ireland', 'SIRO / Vodafone'],
  be: ['Proximus', 'Telenet', 'Orange Belgium'],
  at: ['A1 Telekom Austria', 'Magenta Telekom', 'Drei'],
  pl: ['Orange Polska', 'Play (UPC)', 'Vectra', 'Netia'],
  tr: ['Türk Telekom', 'Turkcell Superonline', 'Vodafone Turkey'],
  ru: ['Rostelecom', 'MTS', 'Beeline', 'MegaFon'],
  ua: ['Kyivstar', 'Ukrtelecom', 'Vodafone Ukraine', 'Datagroup'],
  eg: ['WE (Telecom Egypt)', 'Vodafone Egypt', 'Orange Egypt', 'e& Egypt'],
  za: ['Openserve / Telkom', 'Vodacom', 'MTN', 'Vumatel', 'Afrihost'],
  ng: ['MTN Nigeria', 'Airtel Nigeria', 'Globacom', 'Spectranet'],
  ke: ['Safaricom Home Fibre', 'Zuku', 'Faiba (Jamii)', 'Airtel Kenya'],
  gh: ['MTN Ghana', 'Telecel Ghana', 'AirtelTigo'],
  ma: ['Maroc Telecom', 'Orange Maroc', 'Inwi'],
  pk: ['PTCL Flash Fiber', 'Nayatel', 'StormFiber', 'Jazz', 'Zong'],
  bd: ['Link3', 'Amber IT', 'Grameenphone', 'BTCL', 'Robi'],
  np: ['WorldLink', 'Vianet', 'Subisu', 'Nepal Telecom'],
  mv: ['Dhiraagu', 'Ooredoo Maldives'],
  my: ['TM Unifi', 'TIME Fibre', 'Maxis', 'CelcomDigi'],
  id: ['Telkom IndiHome', 'Biznet', 'MyRepublic', 'First Media'],
  th: ['AIS Fibre', 'TrueOnline', '3BB', 'NT Broadband'],
  vn: ['VNPT', 'Viettel', 'FPT Telecom'],
  ph: ['PLDT Home Fiber', 'Globe At Home', 'Converge ICT'],
  br: ['Vivo Fibra', 'Claro Brasil', 'TIM Ultrafibra', 'Oi Fibra'],
  mx: ['Telmex Infinitum', 'Totalplay', 'Izzi', 'Megacable'],
  ar: ['Personal Fibra (Telecom)', 'Movistar Fibra', 'Claro Argentina'],
  cl: ['Movistar Chile', 'Entel', 'Mundo', 'VTR'],
  co: ['Claro Colombia', 'Movistar', 'ETB', 'Tigo'],
  pe: ['Movistar Perú', 'Claro Perú', 'WIN Fibra', 'Entel'],
  il: ['Bezeq', 'Partner Fiber', 'Cellcom', 'HOT'],
  gr: ['Cosmote', 'Nova', 'Vodafone Greece'],
  cz: ['O2 Czech Republic', 'Vodafone CZ', 'T-Mobile CZ'],
  ro: ['Digi (RCS & RDS)', 'Orange Romania', 'Vodafone Romania'],
  hu: ['Magyar Telekom', 'One (Vodafone HU)', 'Yettel'],
  pr: ['Liberty Puerto Rico', 'Claro Puerto Rico', 'AeroNet'],
  gl: ['Tusass Greenland'],
  fj: ['Vodafone Fiji', 'Digicel Fiji', 'Telecom Fiji'],
};

const CONTINENT_FALLBACK_ISPS: Record<Country['continent'], readonly string[]> = {
  Asia: ['National Fiber Telecom', 'Regional 5G Carrier', 'Asia-Pacific IX Transit'],
  Europe: ['National Fiber Carrier', 'Vodafone / Orange Partner', 'DE-CIX / LINX Transit'],
  'North America': ['Regional Fiber Broadband', 'National 5G Wireless', 'Starlink LEO'],
  'South America': ['Claro / Movistar Regional', 'National Fiber Backbone', 'Starlink LEO'],
  Africa: ['MTN / Orange / Vodacom', 'National Fiber Gateway', 'Liquid Intelligent Tech'],
  Oceania: ['Digicel / Vodafone Pacific', 'National Telecom Gateway', 'Starlink LEO'],
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minDistanceToCableKm(lat: number, lng: number, cable: SubmarineCable): number {
  let best = Infinity;
  for (const [wLat, wLng] of cable.waypoints) {
    const d = haversineKm(lat, lng, wLat, wLng);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Returns curated ISP carriers and direct / regional submarine fiber-optic cables for any country.
 */
export function getCountryConnectivity(country: Country): CountryConnectivityInfo {
  const directCables = SUBMARINE_CABLES.filter((c) => c.connectedIsos.includes(country.iso));

  let transitCables: SubmarineCable[] = [];
  if (directCables.length === 0) {
    transitCables = [...SUBMARINE_CABLES]
      .sort(
        (a, b) =>
          minDistanceToCableKm(country.lat, country.lng, a) -
          minDistanceToCableKm(country.lat, country.lng, b)
      )
      .slice(0, 2);
  }

  const isps = COUNTRY_ISPS[country.iso]
    ? [...COUNTRY_ISPS[country.iso]]
    : [
        `${country.name} Telecom`,
        ...CONTINENT_FALLBACK_ISPS[country.continent].slice(0, 2),
      ];

  const isLandlockedTransit = directCables.length === 0;
  const activeList = directCables.length > 0 ? directCables : transitCables;
  const gatewaySummary = isLandlockedTransit
    ? `Terrestrial fiber transit via ${activeList.map((c) => c.name).join(' & ')}`
    : `${directCables.length} direct undersea fiber ${directCables.length === 1 ? 'system' : 'systems'} connected`;

  return {
    isps,
    directCables,
    transitCables,
    isLandlockedTransit,
    gatewaySummary,
  };
}
