import type { Country } from '../data/countries';

export interface NationalAnthemInfo {
  iso: string;
  countryName: string;
  title: string;
  wikiSlug: string;
  audioUrl?: string;
  sourceLabel?: string;
  resolved: boolean;
}

interface CuratedAnthemEntry {
  title: string;
  wikiSlug: string;
  commonsFile?: string;
}

/**
 * Curated official national anthem registry with verified Wikimedia Commons audio files
 * and Wikipedia article slugs for dynamic HTTPS resolution.
 */
const CURATED_ANTHEMS: Record<string, CuratedAnthemEntry> = {
  lk: {
    title: 'Sri Lanka Matha',
    wikiSlug: 'Sri_Lanka_Matha',
    commonsFile: 'Sri_Lanka_Matha_instrumental.ogg',
  },
  jp: {
    title: 'Kimigayo',
    wikiSlug: 'Kimigayo',
    commonsFile: 'Kimi_ga_Yo_instrumental.ogg',
  },
  gb: {
    title: 'God Save the King',
    wikiSlug: 'God_Save_the_King',
    commonsFile: 'United_States_Navy_Band_-_God_Save_the_Queen.ogg',
  },
  'gb-eng': {
    title: 'Jerusalem / God Save the King',
    wikiSlug: 'God_Save_the_King',
    commonsFile: 'United_States_Navy_Band_-_God_Save_the_Queen.ogg',
  },
  'gb-sct': {
    title: 'Flower of Scotland',
    wikiSlug: 'Flower_of_Scotland',
  },
  'gb-wls': {
    title: 'Hen Wlad Fy Nhadau',
    wikiSlug: 'Hen_Wlad_Fy_Nhadau',
  },
  'gb-nir': {
    title: 'Londonderry Air / God Save the King',
    wikiSlug: 'God_Save_the_King',
    commonsFile: 'United_States_Navy_Band_-_God_Save_the_Queen.ogg',
  },
  us: {
    title: 'The Star-Spangled Banner',
    wikiSlug: 'The_Star-Spangled_Banner',
    commonsFile: 'Star_Spangled_Banner_instrumental.ogg',
  },
  in: {
    title: 'Jana Gana Mana',
    wikiSlug: 'Jana_Gana_Mana',
    commonsFile: 'Jana_Gana_Mana_instrumental.ogg',
  },
  au: {
    title: 'Advance Australia Fair',
    wikiSlug: 'Advance_Australia_Fair',
    commonsFile: 'U.S._Navy_Band,_Advance_Australia_Fair_(instrumental).ogg',
  },
  ca: {
    title: 'O Canada',
    wikiSlug: 'O_Canada',
    commonsFile: 'O_Canada.ogg',
  },
  fr: {
    title: 'La Marseillaise',
    wikiSlug: 'La_Marseillaise',
    commonsFile: 'La_Marseillaise.ogg',
  },
  de: {
    title: 'Deutschlandlied',
    wikiSlug: 'Deutschlandlied',
    commonsFile: 'German_national_anthem_performed_by_the_US_Navy_Band.ogg',
  },
  it: {
    title: 'Il Canto degli Italiani',
    wikiSlug: 'Il_Canto_degli_Italiani',
    commonsFile: 'Inno_di_Mameli_instrumental.ogg',
  },
  es: {
    title: 'Marcha Real',
    wikiSlug: 'Marcha_Real',
    commonsFile: 'Marcha_Real-Royal_March_by_US_Navy_Band.ogg',
  },
  br: {
    title: 'Hino Nacional Brasileiro',
    wikiSlug: 'Brazilian_National_Anthem',
    commonsFile: 'Hino_Nacional_Brasileiro_instrumental.ogg',
  },
  cn: {
    title: 'March of the Volunteers',
    wikiSlug: 'March_of_the_Volunteers',
    commonsFile: 'March_of_the_Volunteers_instrumental.ogg',
  },
  kr: {
    title: 'Aegukga',
    wikiSlug: 'Aegukga',
    commonsFile: 'Aegukga_(instrumental).ogg',
  },
  sg: {
    title: 'Majulah Singapura',
    wikiSlug: 'Majulah_Singapura',
    commonsFile: 'Majulah_Singapura_instrumental.ogg',
  },
  ae: {
    title: 'Ishy Bilady',
    wikiSlug: 'Ishy_Bilady',
    commonsFile: 'United_Arab_Emirates_national_anthem.ogg',
  },
  sa: {
    title: 'Aash Al-Malik',
    wikiSlug: 'Chant_of_the_Saudi_Nation',
    commonsFile: 'Aash_Al_Maleek_-_US_Navy_Band.ogg',
  },
  nz: {
    title: 'God Defend New Zealand',
    wikiSlug: 'God_Defend_New_Zealand',
    commonsFile: 'God_Defend_New_Zealand_instrumental.ogg',
  },
  za: {
    title: 'National Anthem of South Africa',
    wikiSlug: 'National_anthem_of_South_Africa',
    commonsFile: 'National_Anthem_of_South_Africa.ogg',
  },
  eg: {
    title: 'Bilady, Bilady, Bilady',
    wikiSlug: 'Bilady,_Bilady,_Bilady',
    commonsFile: 'Bilady,_Bilady,_Bilady.ogg',
  },
  pk: {
    title: 'Qaumi Taranah',
    wikiSlug: 'Qaumi_Taranah',
    commonsFile: 'National_anthem_of_Pakistan.ogg',
  },
  bd: {
    title: 'Amar Sonar Bangla',
    wikiSlug: 'Amar_Sonar_Bangla',
    commonsFile: 'Amar_Sonar_Bangla_-_official_vocal_music_of_the_National_anthem_of_Bangladesh.ogg',
  },
  np: {
    title: 'Sayaun Thunga Phulka',
    wikiSlug: 'Sayaun_Thunga_Phulka',
    commonsFile: 'National_Anthem_of_Nepal.ogg',
  },
  mv: {
    title: 'Gaumii Salaam',
    wikiSlug: 'Gaumii_Salaam',
    commonsFile: 'Maldives_National_Anthem.ogg',
  },
  my: {
    title: 'Negaraku',
    wikiSlug: 'Negaraku',
    commonsFile: 'Negaraku_instrumental.ogg',
  },
  id: {
    title: 'Indonesia Raya',
    wikiSlug: 'Indonesia_Raya',
    commonsFile: 'Indonesia_Raya_instrumental.ogg',
  },
  th: {
    title: 'Phleng Chat Thai',
    wikiSlug: 'Thai_National_Anthem',
    commonsFile: 'Thai_National_Anthem_-_US_Navy_Band.ogg',
  },
  vn: {
    title: 'Tiến Quân Ca',
    wikiSlug: 'Tiến_Quân_Ca',
    commonsFile: 'Tien_Quan_Ca.ogg',
  },
  ph: {
    title: 'Lupang Hinirang',
    wikiSlug: 'Lupang_Hinirang',
    commonsFile: 'Lupang_Hinirang_instrumental.ogg',
  },
  nl: {
    title: 'Wilhelmus',
    wikiSlug: 'Wilhelmus',
    commonsFile: 'United_States_Navy_Band_-_Het_Wilhelmus.ogg',
  },
  ch: {
    title: 'Swiss Psalm',
    wikiSlug: 'Swiss_Psalm',
    commonsFile: 'Swiss_Psalm.ogg',
  },
  se: {
    title: 'Du gamla, Du fria',
    wikiSlug: 'Du_gamla,_du_fria',
    commonsFile: 'United_States_Navy_Band_-_Du_gamla,_Du_fria.ogg',
  },
  no: {
    title: 'Ja, vi elsker dette landet',
    wikiSlug: 'Ja,_vi_elsker_dette_landet',
    commonsFile: 'Ja,_vi_elsker_dette_landet_instrumental.ogg',
  },
  dk: {
    title: 'Der er et yndigt land',
    wikiSlug: 'Der_er_et_yndigt_land',
    commonsFile: 'Der_er_et_yndigt_land.ogg',
  },
  fi: {
    title: 'Maamme',
    wikiSlug: 'Maamme',
    commonsFile: 'Maamme.ogg',
  },
  pt: {
    title: 'A Portuguesa',
    wikiSlug: 'A_Portuguesa',
    commonsFile: 'A_Portuguesa.ogg',
  },
  gr: {
    title: 'Hymn to Liberty',
    wikiSlug: 'Hymn_to_Liberty',
    commonsFile: 'Hymn_to_Liberty_instrumental.ogg',
  },
  tr: {
    title: 'İstiklal Marşı',
    wikiSlug: 'İstiklal_Marşı',
    commonsFile: 'IstiklalMarsi-2013.ogg',
  },
  ru: {
    title: 'State Anthem of the Russian Federation',
    wikiSlug: 'National_anthem_of_Russia',
    commonsFile: 'National_Anthem_of_Russia_(2000),_instrumental,_one_verse.ogg',
  },
  ua: {
    title: 'Shche ne vmerla Ukrainy',
    wikiSlug: 'Shche_ne_vmerla_Ukrainy_i_slava,_i_volia',
    commonsFile: 'National_anthem_of_Ukraine,_instrumental.oga',
  },
  pl: {
    title: 'Mazurek Dąbrowskiego',
    wikiSlug: 'Poland_Is_Not_Yet_Lost',
    commonsFile: 'Mazurek_Dabrowskiego.ogg',
  },
  ie: {
    title: 'Amhrán na bhFiann',
    wikiSlug: 'Amhrán_na_bhFiann',
    commonsFile: 'Amhran_na_bhFiann.ogg',
  },
  ar: {
    title: 'Himno Nacional Argentino',
    wikiSlug: 'Argentine_National_Anthem',
    commonsFile: 'Himno_Nacional_Argentino_instrumental.ogg',
  },
  mx: {
    title: 'Himno Nacional Mexicano',
    wikiSlug: 'Himno_Nacional_Mexicano',
    commonsFile: 'Himno_Nacional_Mexicano_instrumental.ogg',
  },
  ng: {
    title: 'Nigeria, We Hail Thee',
    wikiSlug: 'Nigeria,_We_Hail_Thee',
  },
  ke: {
    title: 'Ee Mungu Nguvu Yetu',
    wikiSlug: 'Ee_Mungu_Nguvu_Yetu',
    commonsFile: 'Ee_Mungu_Nguvu_Yetu.ogg',
  },
  ma: {
    title: 'Cherifian Anthem',
    wikiSlug: 'Cherifian_Anthem',
    commonsFile: 'Hymne_Cherifien.ogg',
  },
  qa: {
    title: 'As Salam Al Amiri',
    wikiSlug: 'As_Salam_Al_Amiri',
    commonsFile: 'As_Salam_al_Amiri.ogg',
  },
  il: {
    title: 'Hatikvah',
    wikiSlug: 'Hatikvah',
    commonsFile: 'Hatikvah_instrumental.ogg',
  },
  be: {
    title: 'La Brabançonne',
    wikiSlug: 'La_Brabançonne',
    commonsFile: 'Brabanconne.ogg',
  },
  at: {
    title: 'Land der Berge, Land am Strome',
    wikiSlug: 'Land_der_Berge,_Land_am_Strome',
    commonsFile: 'Land_der_Berge_Land_am_Strome_instrumental.ogg',
  },
};

const anthemCache = new Map<string, NationalAnthemInfo>();

function isSafeHttpsAudioUrl(url?: string): url is string {
  return typeof url === 'string' && url.startsWith('https://');
}

async function fetchJsonSafe<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  if (!url.startsWith('https://')) return null;
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

interface CommonsImageInfoResp {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: Array<{
          url?: string;
          mime?: string;
        }>;
      }
    >;
  };
}

interface WikiImagesResp {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        images?: Array<{ title?: string }>;
      }
    >;
  };
}

async function resolveCommonsFileUrl(fileTitle: string): Promise<string | undefined> {
  const normalized = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    normalized
  )}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;

  const data = await fetchJsonSafe<CommonsImageInfoResp>(url);
  const pages = data?.query?.pages;
  if (!pages) return undefined;

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (info?.url && isSafeHttpsAudioUrl(info.url)) {
      return info.url;
    }
  }
  return undefined;
}

async function findAudioFileOnWikiPage(slug: string): Promise<string | undefined> {
  const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    slug
  )}&redirects=1&prop=images&imlimit=30&format=json&origin=*`;

  const data = await fetchJsonSafe<WikiImagesResp>(pageUrl);
  const pages = data?.query?.pages;
  if (!pages) return undefined;

  const candidates: string[] = [];
  for (const page of Object.values(pages)) {
    for (const img of page.images ?? []) {
      const title = img.title;
      if (!title) continue;
      if (/\.(mp3|wav|ogg|oga)$/i.test(title)) {
        candidates.push(title);
      }
    }
  }

  if (candidates.length === 0) return undefined;

  // Prefer instrumental / mp3 / wav first, then ogg/oga
  candidates.sort((a, b) => {
    const score = (name: string) => {
      let s = 0;
      if (/\.mp3$/i.test(name)) s += 4;
      else if (/\.wav$/i.test(name)) s += 3;
      if (/instrumental|band|anthem/i.test(name)) s += 2;
      if (/vocal/i.test(name)) s -= 1;
      return s;
    };
    return score(b) - score(a);
  });

  for (const fileTitle of candidates.slice(0, 3)) {
    const resolved = await resolveCommonsFileUrl(fileTitle);
    if (resolved) return resolved;
  }
  return undefined;
}

export function getBaselineAnthemInfo(country: Country): NationalAnthemInfo {
  const cached = anthemCache.get(country.iso);
  if (cached) return cached;

  const curated = CURATED_ANTHEMS[country.iso];
  return {
    iso: country.iso,
    countryName: country.name,
    title: curated?.title || `National Anthem of ${country.name}`,
    wikiSlug: curated?.wikiSlug || `National_anthem_of_${country.name.replace(/ /g, '_')}`,
    resolved: false,
  };
}

/**
 * Resolves a country's National Anthem audio URL using public HTTPS Wikimedia Commons / Wikipedia APIs.
 * Results are cached per country ISO and never throw.
 */
export async function resolveNationalAnthem(country: Country): Promise<NationalAnthemInfo> {
  const cached = anthemCache.get(country.iso);
  if (cached && cached.resolved) return cached;

  const baseline = getBaselineAnthemInfo(country);
  const curated = CURATED_ANTHEMS[country.iso];

  let audioUrl: string | undefined;

  // 1. Try direct curated Wikimedia Commons file first (fastest & most reliable)
  if (curated?.commonsFile) {
    audioUrl = await resolveCommonsFileUrl(curated.commonsFile);
  }

  // 2. Fallback: look up audio file attached to the anthem's Wikipedia page
  if (!audioUrl) {
    audioUrl = await findAudioFileOnWikiPage(baseline.wikiSlug);
  }

  // 3. Secondary fallback: check the main country Wikipedia page for embedded anthem audio
  if (!audioUrl) {
    const countrySlug = country.name.replace(/ /g, '_');
    const fallbackUrl = await findAudioFileOnWikiPage(countrySlug);
    if (fallbackUrl && /anthem|band|hymn|march|hino|himno|matha|kimigayo/i.test(fallbackUrl)) {
      audioUrl = fallbackUrl;
    }
  }

  const resolvedInfo: NationalAnthemInfo = {
    ...baseline,
    audioUrl,
    sourceLabel: audioUrl ? 'Wikimedia Commons Audio' : undefined,
    resolved: true,
  };

  anthemCache.set(country.iso, resolvedInfo);
  return resolvedInfo;
}
