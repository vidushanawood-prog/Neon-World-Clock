import type { Country } from '../data/countries';

export interface CountryLeaderInfo {
  name: string;
  title: string;
  wikiSlug?: string;
  portraitUrl?: string;
  summary?: string;
}

export interface CountryMediaItem {
  label: string;
  caption: string;
  imageUrl?: string;
  sourceTitle: string;
}

export interface EnrichedCountryProfile {
  subregion: string;
  areaKm2: number | null;
  drivingSide: 'Left' | 'Right';
  languages: string[];
  coatOfArmsUrl?: string;
  countryExtract?: string;
  leader: CountryLeaderInfo;
  gallery: CountryMediaItem[];
  isLoaded: boolean;
}

/**
 * Accurate ISO set of left-hand traffic (LHT) countries & territories worldwide.
 */
const LEFT_HAND_TRAFFIC_ISOS = new Set([
  'lk', 'in', 'pk', 'bd', 'np', 'bt', 'mv',
  'gb', 'gb-eng', 'gb-sct', 'gb-wls', 'gb-nir', 'ie', 'cy', 'mt',
  'jp', 'sg', 'my', 'id', 'th', 'bn', 'hk', 'mo', 'tl',
  'au', 'nz', 'fj', 'pg', 'sb', 'ws', 'to', 'ki', 'tv', 'nr',
  'za', 'ke', 'tz', 'ug', 'zm', 'zw', 'bw', 'na', 'mz', 'mw', 'ls', 'sz', 'mu', 'sc',
  'jm', 'tt', 'bb', 'bs', 'gd', 'lc', 'vc', 'ag', 'kn', 'dm', 'gy', 'sr', 'bm', 'ky',
]);

/**
 * Curated fallback subregions & approximate land areas (km²) for instant frame-1 rendering
 * and constituent nations not listed individually in REST Countries.
 */
const CONSTITUENT_OVERRIDES: Record<
  string,
  {
    restIso: string;
    subregion: string;
    areaKm2: number;
    countryWiki: string;
    landmarkWiki: string;
    landmarkLabel: string;
  }
> = {
  'gb-eng': {
    restIso: 'gb',
    subregion: 'Northern Europe (UK Constituent)',
    areaKm2: 130279,
    countryWiki: 'England',
    landmarkWiki: 'London',
    landmarkLabel: 'London, England',
  },
  'gb-sct': {
    restIso: 'gb',
    subregion: 'Northern Europe (UK Constituent)',
    areaKm2: 77933,
    countryWiki: 'Scotland',
    landmarkWiki: 'Edinburgh',
    landmarkLabel: 'Edinburgh, Scotland',
  },
  'gb-wls': {
    restIso: 'gb',
    subregion: 'Northern Europe (UK Constituent)',
    areaKm2: 20779,
    countryWiki: 'Wales',
    landmarkWiki: 'Cardiff',
    landmarkLabel: 'Cardiff, Wales',
  },
  'gb-nir': {
    restIso: 'gb',
    subregion: 'Northern Europe (UK Constituent)',
    areaKm2: 14130,
    countryWiki: 'Northern_Ireland',
    landmarkWiki: 'Belfast',
    landmarkLabel: 'Belfast, Northern Ireland',
  },
};

/**
 * Curated Heads of State / Government registry with verified Wikipedia slugs for portrait lookup.
 */
const CURATED_LEADERS: Record<string, { name: string; title: string; wikiSlug: string }> = {
  lk: { name: 'Anura Kumara Dissanayake', title: 'President of Sri Lanka', wikiSlug: 'Anura_Kumara_Dissanayake' },
  in: { name: 'Droupadi Murmu', title: 'President of India', wikiSlug: 'Droupadi_Murmu' },
  gb: { name: 'King Charles III', title: 'Monarch of the United Kingdom', wikiSlug: 'Charles_III' },
  'gb-eng': { name: 'Keir Starmer', title: 'Prime Minister of the United Kingdom', wikiSlug: 'Keir_Starmer' },
  'gb-sct': { name: 'John Swinney', title: 'First Minister of Scotland', wikiSlug: 'John_Swinney' },
  'gb-wls': { name: 'Eluned Morgan', title: 'First Minister of Wales', wikiSlug: 'Eluned_Morgan,_Baroness_Morgan_of_Ely' },
  'gb-nir': { name: "Michelle O'Neill", title: 'First Minister of Northern Ireland', wikiSlug: "Michelle_O'Neill" },
  us: { name: 'Donald Trump', title: 'President of the United States', wikiSlug: 'Donald_Trump' },
  jp: { name: 'Emperor Naruhito', title: 'Emperor of Japan', wikiSlug: 'Naruhito' },
  sg: { name: 'Tharman Shanmugaratnam', title: 'President of Singapore', wikiSlug: 'Tharman_Shanmugaratnam' },
  au: { name: 'Anthony Albanese', title: 'Prime Minister of Australia', wikiSlug: 'Anthony_Albanese' },
  nz: { name: 'Christopher Luxon', title: 'Prime Minister of New Zealand', wikiSlug: 'Christopher_Luxon' },
  ca: { name: 'Mark Carney', title: 'Prime Minister of Canada', wikiSlug: 'Mark_Carney' },
  fr: { name: 'Emmanuel Macron', title: 'President of France', wikiSlug: 'Emmanuel_Macron' },
  de: { name: 'Frank-Walter Steinmeier', title: 'President of Germany', wikiSlug: 'Frank-Walter_Steinmeier' },
  it: { name: 'Sergio Mattarella', title: 'President of Italy', wikiSlug: 'Sergio_Mattarella' },
  es: { name: 'King Felipe VI', title: 'King of Spain', wikiSlug: 'Felipe_VI' },
  nl: { name: 'King Willem-Alexander', title: 'King of the Netherlands', wikiSlug: 'Willem-Alexander_of_the_Netherlands' },
  se: { name: 'King Carl XVI Gustaf', title: 'King of Sweden', wikiSlug: 'Carl_XVI_Gustaf' },
  no: { name: 'King Harald V', title: 'King of Norway', wikiSlug: 'Harald_V' },
  dk: { name: 'King Frederik X', title: 'King of Denmark', wikiSlug: 'Frederik_X' },
  ch: { name: 'Karin Keller-Sutter', title: 'Federal Councillor of Switzerland', wikiSlug: 'Karin_Keller-Sutter' },
  cn: { name: 'Xi Jinping', title: 'President of China', wikiSlug: 'Xi_Jinping' },
  hk: { name: 'John Lee Ka-chiu', title: 'Chief Executive of Hong Kong', wikiSlug: 'John_Lee_(politician)' },
  kr: { name: 'President of South Korea', title: 'Head of State of South Korea', wikiSlug: 'President_of_South_Korea' },
  tw: { name: 'Lai Ching-te', title: 'President of Taiwan', wikiSlug: 'Lai_Ching-te' },
  ae: { name: 'Mohamed bin Zayed Al Nahyan', title: 'President of the UAE', wikiSlug: 'Mohamed_bin_Zayed_Al_Nahyan' },
  sa: { name: 'King Salman bin Abdulaziz', title: 'King of Saudi Arabia', wikiSlug: 'Salman_of_Saudi_Arabia' },
  qa: { name: 'Tamim bin Hamad Al Thani', title: 'Emir of Qatar', wikiSlug: 'Tamim_bin_Hamad_Al_Thani' },
  om: { name: 'Haitham bin Tariq', title: 'Sultan of Oman', wikiSlug: 'Haitham_bin_Tariq' },
  pk: { name: 'Asif Ali Zardari', title: 'President of Pakistan', wikiSlug: 'Asif_Ali_Zardari' },
  bd: { name: 'Mohammed Shahabuddin', title: 'President of Bangladesh', wikiSlug: 'Mohammed_Shahabuddin' },
  np: { name: 'Ram Chandra Poudel', title: 'President of Nepal', wikiSlug: 'Ram_Chandra_Poudel' },
  mv: { name: 'Mohamed Muizzu', title: 'President of the Maldives', wikiSlug: 'Mohamed_Muizzu' },
  my: { name: 'Anwar Ibrahim', title: 'Prime Minister of Malaysia', wikiSlug: 'Anwar_Ibrahim' },
  id: { name: 'Prabowo Subianto', title: 'President of Indonesia', wikiSlug: 'Prabowo_Subianto' },
  th: { name: 'King Maha Vajiralongkorn', title: 'King of Thailand', wikiSlug: 'Vajiralongkorn' },
  vn: { name: 'Lương Cường', title: 'President of Vietnam', wikiSlug: 'Lương_Cường' },
  ph: { name: 'Bongbong Marcos', title: 'President of the Philippines', wikiSlug: 'Bongbong_Marcos' },
  br: { name: 'Luiz Inácio Lula da Silva', title: 'President of Brazil', wikiSlug: 'Luiz_Inácio_Lula_da_Silva' },
  mx: { name: 'Claudia Sheinbaum', title: 'President of Mexico', wikiSlug: 'Claudia_Sheinbaum' },
  ar: { name: 'Javier Milei', title: 'President of Argentina', wikiSlug: 'Javier_Milei' },
  cl: { name: 'Gabriel Boric', title: 'President of Chile', wikiSlug: 'Gabriel_Boric' },
  co: { name: 'Gustavo Petro', title: 'President of Colombia', wikiSlug: 'Gustavo_Petro' },
  za: { name: 'Cyril Ramaphosa', title: 'President of South Africa', wikiSlug: 'Cyril_Ramaphosa' },
  ng: { name: 'Bola Tinubu', title: 'President of Nigeria', wikiSlug: 'Bola_Tinubu' },
  ke: { name: 'William Ruto', title: 'President of Kenya', wikiSlug: 'William_Ruto' },
  eg: { name: 'Abdel Fattah el-Sisi', title: 'President of Egypt', wikiSlug: 'Abdel_Fattah_el-Sisi' },
  ma: { name: 'King Mohammed VI', title: 'King of Morocco', wikiSlug: 'Mohammed_VI_of_Morocco' },
  tr: { name: 'Recep Tayyip Erdoğan', title: 'President of Turkey', wikiSlug: 'Recep_Tayyip_Erdoğan' },
  ru: { name: 'Vladimir Putin', title: 'President of Russia', wikiSlug: 'Vladimir_Putin' },
  ua: { name: 'Volodymyr Zelenskyy', title: 'President of Ukraine', wikiSlug: 'Volodymyr_Zelenskyy' },
  pl: { name: 'Donald Tusk', title: 'Prime Minister of Poland', wikiSlug: 'Donald_Tusk' },
  ie: { name: 'Micheál Martin', title: 'Taoiseach of Ireland', wikiSlug: 'Micheál_Martin' },
  pt: { name: 'Marcelo Rebelo de Sousa', title: 'President of Portugal', wikiSlug: 'Marcelo_Rebelo_de_Sousa' },
  gr: { name: 'Kyriakos Mitsotakis', title: 'Prime Minister of Greece', wikiSlug: 'Kyriakos_Mitsotakis' },
  il: { name: 'Isaac Herzog', title: 'President of Israel', wikiSlug: 'Isaac_Herzog' },
  fi: { name: 'Alexander Stubb', title: 'President of Finland', wikiSlug: 'Alexander_Stubb' },
  be: { name: 'King Philippe', title: 'King of the Belgians', wikiSlug: 'Philippe_of_Belgium' },
  at: { name: 'Alexander Van der Bellen', title: 'President of Austria', wikiSlug: 'Alexander_Van_der_Bellen' },
  gh: { name: 'John Mahama', title: 'President of Ghana', wikiSlug: 'John_Mahama' },
  et: { name: 'Abiy Ahmed', title: 'Prime Minister of Ethiopia', wikiSlug: 'Abiy_Ahmed' },
  pe: { name: 'Dina Boluarte', title: 'President of Peru', wikiSlug: 'Dina_Boluarte' },
};

const LANDMARK_SLUGS: Record<string, { slug: string; label: string }> = {
  lk: { slug: 'Sigiriya', label: 'Sigiriya & Colombo' },
  jp: { slug: 'Mount_Fuji', label: 'Mount Fuji & Tokyo' },
  gb: { slug: 'Palace_of_Westminster', label: 'Westminster, London' },
  'gb-eng': { slug: 'Tower_Bridge', label: 'Tower Bridge, London' },
  'gb-sct': { slug: 'Edinburgh_Castle', label: 'Edinburgh Castle' },
  'gb-wls': { slug: 'Cardiff_Castle', label: 'Cardiff Castle' },
  'gb-nir': { slug: "Giant's_Causeway", label: "Giant's Causeway" },
  in: { slug: 'Taj_Mahal', label: 'Taj Mahal, India' },
  us: { slug: 'Statue_of_Liberty', label: 'New York & Washington' },
  fr: { slug: 'Eiffel_Tower', label: 'Eiffel Tower, Paris' },
  it: { slug: 'Colosseum', label: 'Colosseum, Rome' },
  au: { slug: 'Sydney_Opera_House', label: 'Sydney Opera House' },
  ae: { slug: 'Burj_Khalifa', label: 'Burj Khalifa, Dubai' },
  sg: { slug: 'Marina_Bay_Sands', label: 'Marina Bay, Singapore' },
  eg: { slug: 'Great_Pyramid_of_Giza', label: 'Pyramids of Giza' },
  br: { slug: 'Christ_the_Redeemer_(statue)', label: 'Rio de Janeiro' },
  cn: { slug: 'Great_Wall_of_China', label: 'Great Wall of China' },
  kr: { slug: 'Gyeongbokgung', label: 'Gyeongbokgung, Seoul' },
  de: { slug: 'Brandenburg_Gate', label: 'Brandenburg Gate, Berlin' },
  ca: { slug: 'CN_Tower', label: 'Toronto & Ottawa' },
  ch: { slug: 'Matterhorn', label: 'Swiss Alps' },
};

const profileCache = new Map<string, EnrichedCountryProfile>();

function isSafeHttpsUrl(url?: string): url is string {
  return typeof url === 'string' && url.startsWith('https://');
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  if (!isSafeHttpsUrl(url)) return null;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface WikiSummaryResp {
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
}

interface RestCountryResp {
  subregion?: string;
  area?: number;
  car?: { side?: string };
  languages?: Record<string, string>;
  coatOfArms?: { svg?: string; png?: string };
}

async function fetchWikiSummary(slug: string): Promise<WikiSummaryResp | null> {
  const encoded = encodeURIComponent(slug.replace(/ /g, '_'));
  return fetchJsonWithTimeout<WikiSummaryResp>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
  );
}

const playerPortraitCache = new Map<string, string | null>();

/**
 * Resolves verified HTTPS Wikimedia/Wikipedia portrait thumbnails for national football players.
 * Cached in-memory by wikiSlug to avoid redundant requests.
 */
export async function fetchFootballPlayerPortraits(
  slugs: readonly string[]
): Promise<Record<string, string>> {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  const result: Record<string, string> = {};
  const toFetch: string[] = [];

  for (const slug of uniqueSlugs) {
    if (playerPortraitCache.has(slug)) {
      const cached = playerPortraitCache.get(slug);
      if (cached) result[slug] = cached;
    } else {
      toFetch.push(slug);
    }
  }

  if (toFetch.length > 0) {
    const responses = await Promise.all(toFetch.map((slug) => fetchWikiSummary(slug)));
    responses.forEach((resp, idx) => {
      const slug = toFetch[idx];
      const thumb = resp?.thumbnail?.source || resp?.originalimage?.source;
      if (isSafeHttpsUrl(thumb)) {
        playerPortraitCache.set(slug, thumb);
        result[slug] = thumb;
      } else {
        playerPortraitCache.set(slug, null);
      }
    });
  }

  return result;
}

/**
 * Returns instant baseline metadata immediately before async enrichment finishes.
 */
export function getBaselineCountryProfile(country: Country): EnrichedCountryProfile {
  const cached = profileCache.get(country.iso);
  if (cached) return cached;

  const constituent = CONSTITUENT_OVERRIDES[country.iso];
  const curatedLeader = CURATED_LEADERS[country.iso];
  const drivingSide: 'Left' | 'Right' = LEFT_HAND_TRAFFIC_ISOS.has(country.iso) ? 'Left' : 'Right';

  return {
    subregion: constituent ? constituent.subregion : country.continent,
    areaKm2: constituent ? constituent.areaKm2 : null,
    drivingSide,
    languages: country.language.split(/[/,]/).map((s) => s.trim()).filter(Boolean),
    leader: curatedLeader
      ? {
          name: curatedLeader.name,
          title: curatedLeader.title,
          wikiSlug: curatedLeader.wikiSlug,
        }
      : {
          name: `Head of State`,
          title: `Government of ${country.name}`,
          wikiSlug: `President_of_${country.name.replace(/ /g, '_')}`,
        },
    gallery: [
      {
        label: 'Capital City',
        caption: `${country.capital}, ${country.name}`,
        sourceTitle: country.capital,
      },
      {
        label: LANDMARK_SLUGS[country.iso] ? 'National Landmark' : 'Country Overview',
        caption: LANDMARK_SLUGS[country.iso]?.label || `${country.name} · ${country.continent}`,
        sourceTitle: LANDMARK_SLUGS[country.iso]?.slug || country.name,
      },
    ],
    isLoaded: false,
  };
}

/**
 * Fetches rich HTTPS metadata from REST Countries + Wikipedia REST API (photos, leader portrait, area, driving side).
 * Gracefully caches results per ISO code and never throws on network errors.
 */
export async function fetchEnrichedCountryProfile(
  country: Country
): Promise<EnrichedCountryProfile> {
  const existing = profileCache.get(country.iso);
  if (existing && existing.isLoaded) return existing;

  const baseline = getBaselineCountryProfile(country);
  const constituent = CONSTITUENT_OVERRIDES[country.iso];
  const restCode = constituent ? constituent.restIso : country.iso;
  const landmarkMeta = LANDMARK_SLUGS[country.iso];

  const restPromise =
    restCode.length === 2
      ? fetchJsonWithTimeout<RestCountryResp[] | RestCountryResp>(
          `https://restcountries.com/v3.1/alpha/${encodeURIComponent(restCode)}?fields=subregion,area,car,languages,coatOfArms`
        )
      : Promise.resolve(null);

  const capitalWikiPromise = fetchWikiSummary(constituent?.landmarkWiki || country.capital);
  const landmarkWikiPromise = fetchWikiSummary(
    landmarkMeta?.slug || constituent?.countryWiki || country.name
  );
  const leaderWikiPromise = baseline.leader.wikiSlug
    ? fetchWikiSummary(baseline.leader.wikiSlug)
    : Promise.resolve(null);

  const [restRaw, capitalWiki, landmarkWiki, leaderWiki] = await Promise.all([
    restPromise,
    capitalWikiPromise,
    landmarkWikiPromise,
    leaderWikiPromise,
  ]);

  const restObj = Array.isArray(restRaw) ? restRaw[0] : restRaw;

  const subregion = constituent
    ? constituent.subregion
    : restObj?.subregion || baseline.subregion;

  const areaKm2 = constituent
    ? constituent.areaKm2
    : typeof restObj?.area === 'number' && restObj.area > 0
      ? Math.round(restObj.area)
      : baseline.areaKm2;

  const drivingSide: 'Left' | 'Right' =
    restObj?.car?.side?.toLowerCase() === 'left'
      ? 'Left'
      : restObj?.car?.side?.toLowerCase() === 'right'
        ? 'Right'
        : baseline.drivingSide;

  const languages =
    restObj?.languages && Object.values(restObj.languages).length > 0
      ? Object.values(restObj.languages)
      : baseline.languages;

  const coatCandidate = restObj?.coatOfArms?.svg || restObj?.coatOfArms?.png;
  const coatOfArmsUrl = isSafeHttpsUrl(coatCandidate) ? coatCandidate : undefined;

  const capitalImg = capitalWiki?.thumbnail?.source || capitalWiki?.originalimage?.source;
  const landmarkImg = landmarkWiki?.thumbnail?.source || landmarkWiki?.originalimage?.source;
  const leaderImg = leaderWiki?.thumbnail?.source || leaderWiki?.originalimage?.source;

  const enrichedLeader: CountryLeaderInfo = {
    ...baseline.leader,
    portraitUrl: isSafeHttpsUrl(leaderImg) ? leaderImg : undefined,
    summary: leaderWiki?.extract
      ? leaderWiki.extract.split('. ').slice(0, 1).join('. ').slice(0, 150)
      : undefined,
  };

  const enriched: EnrichedCountryProfile = {
    subregion,
    areaKm2,
    drivingSide,
    languages,
    coatOfArmsUrl,
    countryExtract: landmarkWiki?.extract
      ? landmarkWiki.extract.split('. ').slice(0, 2).join('. ')
      : capitalWiki?.extract?.split('. ').slice(0, 2).join('. '),
    leader: enrichedLeader,
    gallery: [
      {
        label: 'Capital City',
        caption: `${country.capital}, ${country.name}`,
        imageUrl: isSafeHttpsUrl(capitalImg) ? capitalImg : undefined,
        sourceTitle: capitalWiki?.title || country.capital,
      },
      {
        label: landmarkMeta ? 'National Landmark' : 'Country Scenic View',
        caption: landmarkMeta?.label || `${country.name} · ${subregion}`,
        imageUrl: isSafeHttpsUrl(landmarkImg) ? landmarkImg : undefined,
        sourceTitle: landmarkWiki?.title || country.name,
      },
    ],
    isLoaded: true,
  };

  profileCache.set(country.iso, enriched);
  return enriched;
}
