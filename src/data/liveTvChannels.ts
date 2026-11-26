import type { Country } from './countries';

export interface LiveTvChannel {
  channelName: string;
  network: string;
  category: string;
  language: string;
  /** Primary public HTTPS HLS (.m3u8) live stream */
  hlsUrl: string;
  /** Reliable global public HTTPS HLS fallback stream if primary is geo-restricted or offline */
  fallbackHlsUrl: string;
  /** Official broadcaster live watch page (HTTPS) for external fallback */
  officialUrl: string;
  /** Optional official embeddable live stream URL */
  embedUrl?: string;
  /** Optional secondary official live page embed URL (e.g. https://itn.lk/live/) */
  secondaryEmbedUrl?: string;
  /** Render the official in-app embedded player instead of HLS/foreign fallback */
  preferEmbed?: boolean;
  isRegionalFallback?: boolean;
  description: string;
}

// Highly reliable, globally unblocked public HTTPS HLS (.m3u8) international broadcasts
const RELIABLE_GLOBAL_HLS = {
  DW_ENGLISH: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
  FRANCE24_EN: 'https://live.france24.com/hls/live/2037218-b/F24_EN_HI_HLS/master_5000.m3u8',
  FRANCE24_FR: 'https://live.france24.com/hls/live/2037179-b/F24_FR_HI_HLS/master_5000.m3u8',
  FRANCE24_ES: 'https://live.france24.com/hls/live/2037220-b/F24_ES_HI_HLS/master_5000.m3u8',
  FRANCE24_AR: 'https://live.france24.com/hls/live/2037222-b/F24_AR_HI_HLS/master_5000.m3u8',
  ALJAZEERA_EN: 'https://live-hls-web-aje.getaj.net/AJE/index.m3u8',
  NHK_WORLD: 'https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8',
  CNA_ASIA: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index.m3u8',
  ABC_NEWS_AU: 'https://abc-iview-mediapackagestreams-2.akamaized.net/out/v1/6e1cc6d25ec0480ea099a5399d73bc4b/index.m3u8',
  ARIRANG_KR: 'https://amdlive-ch01-ctnd-com.akamaized.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8',
  TRT_WORLD: 'https://tv-trtworld.medya.trt.com.tr/master.m3u8',
  AFRICANEWS: 'https://cdn-euronews.akamaized.net/live/eds/africanews-en/25050/index.m3u8',
  CBS_NEWS: 'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8',
  SKY_NEWS_UK: 'https://linear901-oo-hls0-prd-gtm.delivery.skycdp.com/17501/sge_bde_skynews/master.m3u8',
  EURONEWS_EN: 'https://rakuten-euronews-1-gb.samsung.wurl.tv/playlist.m3u8',
  CGTN_EN: 'https://news.cgtn.com/resource/live/english/cgtn-news.m3u8',
  WION_IN: 'https://d7x8z4yuq42qn.cloudfront.net/index_7.m3u8',
  DD_INDIA: 'https://d3eyhgoylams0m.cloudfront.net/v1/master/93ce20f0f52760bf38be911ff4c91ed02aa2fd92/ed7bd2c7-8d10-4051-b397-2f6b90f99acb/index.m3u8',
  RTVE_24H: 'https://ztnr.rtve.es/ztnr/1694255.m3u8',
  RAI_NEWS: 'https://rainews1-live.akamaized.net/hls/live/598326/rainews1/rainews1/playlist.m3u8',
  CBC_NEWS: 'https://cbcnewshd-f.akamaihd.net/i/cbcnews_1@8981/master.m3u8',
  NASA_PLUS: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
} as const;

const CURATED_CHANNELS: Record<string, Omit<LiveTvChannel, 'fallbackHlsUrl'>> = {
  lk: {
    channelName: 'ITN Sri Lanka',
    network: 'Independent Television Network (ITN)',
    category: 'National Television · Live',
    language: 'Sinhala / English / Tamil',
    hlsUrl: '',
    embedUrl: 'https://cp.comcities.com/embed/k9qpbqnle3q6lhi7',
    secondaryEmbedUrl: 'https://itn.lk/live/',
    preferEmbed: true,
    officialUrl: 'https://itn.lk/live/',
    description:
      'Official live television broadcast from ITN Sri Lanka (Independent Television Network, Colombo) sourced from itn.lk/live.',
  },
  jp: {
    channelName: 'NHK World-Japan',
    network: 'NHK (Japan Broadcasting Corporation)',
    category: 'Public International Broadcast',
    language: 'English / Japanese',
    hlsUrl: RELIABLE_GLOBAL_HLS.NHK_WORLD,
    officialUrl: 'https://www3.nhk.or.jp/nhkworld/en/live/',
    description:
      'Official 24-hour international public broadcast from Tokyo covering Japan news, culture, technology, and Asia.',
  },
  gb: {
    channelName: 'Sky News UK Live',
    network: 'Sky UK Broadcast',
    category: 'Breaking News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.SKY_NEWS_UK,
    officialUrl: 'https://news.sky.com/watch-live',
    description:
      'Live 24/7 UK and international news coverage straight from London studios.',
  },
  'gb-eng': {
    channelName: 'Sky News England & UK',
    network: 'Sky UK Broadcast',
    category: 'Breaking News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.SKY_NEWS_UK,
    officialUrl: 'https://news.sky.com/watch-live',
    description:
      'Live continuous broadcast from London covering England, UK politics, markets, and global affairs.',
  },
  'gb-sct': {
    channelName: 'Sky News & UK Public Broadcast',
    network: 'Sky / BBC Scotland Portal',
    category: 'National News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.SKY_NEWS_UK,
    officialUrl: 'https://www.bbc.co.uk/news/scotland',
    description:
      'Live UK news stream with direct access to Scottish national broadcast updates.',
  },
  'gb-wls': {
    channelName: 'Sky News & Wales Broadcast',
    network: 'Sky / BBC Wales Portal',
    category: 'National News',
    language: 'English / Welsh',
    hlsUrl: RELIABLE_GLOBAL_HLS.SKY_NEWS_UK,
    officialUrl: 'https://www.bbc.co.uk/news/wales',
    description:
      'Live UK news stream with direct access to Wales public broadcasting.',
  },
  'gb-nir': {
    channelName: 'Sky News & Northern Ireland Desk',
    network: 'Sky / BBC NI Portal',
    category: 'National News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.SKY_NEWS_UK,
    officialUrl: 'https://www.bbc.co.uk/news/northern_ireland',
    description:
      'Live UK news broadcast with Northern Ireland regional coverage.',
  },
  us: {
    channelName: 'CBS News 24/7',
    network: 'CBS News Network',
    category: 'Live National News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.CBS_NEWS,
    officialUrl: 'https://www.cbsnews.com/live/',
    description:
      'Official 24/7 United States live breaking news, Wall Street updates, and national reporting from New York.',
  },
  de: {
    channelName: 'DW News (Deutsche Welle)',
    network: 'Deutsche Welle',
    category: 'Public International News',
    language: 'English / German',
    hlsUrl: RELIABLE_GLOBAL_HLS.DW_ENGLISH,
    officialUrl: 'https://www.dw.com/en/live-tv/channel-english',
    description:
      'Germany’s official international public broadcaster delivering European and world news from Berlin & Bonn.',
  },
  fr: {
    channelName: 'France 24 Live',
    network: 'France Médias Monde',
    category: 'International News',
    language: 'English / French',
    hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_EN,
    officialUrl: 'https://www.france24.com/en/live',
    description:
      '24-hour international news television from Paris covering France, Europe, Africa, and global diplomacy.',
  },
  qa: {
    channelName: 'Al Jazeera English Live',
    network: 'Al Jazeera Media Network',
    category: 'Global News',
    language: 'English / Arabic',
    hlsUrl: RELIABLE_GLOBAL_HLS.ALJAZEERA_EN,
    officialUrl: 'https://www.aljazeera.com/live',
    description:
      'Live 24-hour international broadcast from Doha covering the Middle East and global affairs.',
  },
  au: {
    channelName: 'ABC News Australia',
    network: 'Australian Broadcasting Corporation',
    category: 'Public National News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.ABC_NEWS_AU,
    officialUrl: 'https://www.abc.net.au/news/newschannel',
    description:
      'Official Australian public 24-hour television news channel broadcasting live from Sydney & Melbourne.',
  },
  sg: {
    channelName: 'CNA (Channel NewsAsia)',
    network: 'Mediacorp Singapore',
    category: 'Asia-Pacific News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.CNA_ASIA,
    officialUrl: 'https://www.channelnewsasia.com/watch',
    description:
      'Singapore’s flagship pan-Asian live news network covering ASEAN, global finance, and Asia-Pacific.',
  },
  kr: {
    channelName: 'Arirang TV World',
    network: 'Korea International Broadcasting',
    category: 'News & Culture',
    language: 'English / Korean',
    hlsUrl: RELIABLE_GLOBAL_HLS.ARIRANG_KR,
    officialUrl: 'https://www.arirang.com/live',
    description:
      'Official South Korean international broadcast from Seoul featuring live news, K-culture, and tech.',
  },
  tr: {
    channelName: 'TRT World Live',
    network: 'Turkish Radio & Television Corp.',
    category: 'International News',
    language: 'English / Turkish',
    hlsUrl: RELIABLE_GLOBAL_HLS.TRT_WORLD,
    officialUrl: 'https://www.trtworld.com/live',
    description:
      'Official 24-hour international broadcast from Istanbul covering Türkiye, Eurasia, and global news.',
  },
  in: {
    channelName: 'DD India · National Broadcast',
    network: 'Prasar Bharati / Doordarshan',
    category: 'Public News & Affairs',
    language: 'English / Hindi',
    hlsUrl: RELIABLE_GLOBAL_HLS.DD_INDIA,
    officialUrl: 'https://ddnews.gov.in/en/live-tv/',
    description:
      'India’s official public international news television channel broadcasting live from New Delhi.',
  },
  cn: {
    channelName: 'CGTN Live News',
    network: 'China Global Television Network',
    category: 'International News',
    language: 'English / Mandarin',
    hlsUrl: RELIABLE_GLOBAL_HLS.CGTN_EN,
    officialUrl: 'https://www.cgtn.com/tv',
    description:
      '24-hour international television broadcast from Beijing covering China, Asia, and world business.',
  },
  es: {
    channelName: 'RTVE Canal 24 Horas',
    network: 'Radiotelevisión Española',
    category: 'Public 24h News',
    language: 'Spanish',
    hlsUrl: RELIABLE_GLOBAL_HLS.RTVE_24H,
    officialUrl: 'https://www.rtve.es/play/videos/directo/canales-lineales/24h/',
    description:
      'Spain’s official public 24-hour news network broadcasting live from Madrid.',
  },
  it: {
    channelName: 'Rai News 24',
    network: 'RAI Radiotelevisione Italiana',
    category: 'Public 24h News',
    language: 'Italian',
    hlsUrl: RELIABLE_GLOBAL_HLS.RAI_NEWS,
    officialUrl: 'https://www.rainews.it/dirette/rainews24',
    description:
      'Italy’s official public 24-hour breaking news television channel from Rome.',
  },
  ca: {
    channelName: 'CBC News Network',
    network: 'Canadian Broadcasting Corporation',
    category: 'Public National News',
    language: 'English / French',
    hlsUrl: RELIABLE_GLOBAL_HLS.CBC_NEWS,
    officialUrl: 'https://www.cbc.ca/news',
    description:
      'Canadian national breaking news and public affairs coverage across North America.',
  },
  za: {
    channelName: 'Africanews Live',
    network: 'Euronews / Africanews',
    category: 'Pan-African News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.AFRICANEWS,
    officialUrl: 'https://www.africanews.com/live/',
    description:
      '24-hour pan-African live news broadcast covering Southern Africa and continental developments.',
  },
  ng: {
    channelName: 'Africanews West Africa',
    network: 'Africanews Broadcast',
    category: 'Continental News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.AFRICANEWS,
    officialUrl: 'https://www.africanews.com/live/',
    description:
      'Live African current affairs, economy, and West African regional headlines.',
  },
  ke: {
    channelName: 'Africanews East Africa',
    network: 'Africanews Broadcast',
    category: 'Continental News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.AFRICANEWS,
    officialUrl: 'https://www.africanews.com/live/',
    description:
      'Live pan-African television news covering Kenya, East Africa, and global stories.',
  },
  eg: {
    channelName: 'France 24 Arabic · MENA Live',
    network: 'France 24 / Al Jazeera Regional',
    category: 'Middle East & North Africa',
    language: 'Arabic',
    hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_AR,
    officialUrl: 'https://www.france24.com/ar/live',
    description:
      'Live Arabic-language 24-hour international news covering Egypt, North Africa, and the Arab world.',
  },
  sa: {
    channelName: 'Al Jazeera & Gulf Live News',
    network: 'MENA Live News Desk',
    category: 'Regional & Global News',
    language: 'Arabic / English',
    hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_AR,
    officialUrl: 'https://www.aljazeera.com/live',
    description:
      'Live Gulf and Middle Eastern regional breaking news and international economic reporting.',
  },
  ae: {
    channelName: 'Al Jazeera English · Gulf Desk',
    network: 'Middle East Broadcast',
    category: 'Regional & Business News',
    language: 'English / Arabic',
    hlsUrl: RELIABLE_GLOBAL_HLS.ALJAZEERA_EN,
    officialUrl: 'https://www.aljazeera.com/live',
    description:
      'Live Middle East & Gulf business, aviation, and breaking international news.',
  },
  br: {
    channelName: 'DW & France 24 Americas',
    network: 'Latin America International Desk',
    category: 'Americas Live News',
    language: 'Spanish / English',
    hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_ES,
    officialUrl: 'https://www.france24.com/es/en-vivo',
    description:
      'Live South American and global breaking news coverage across Brazil and Latin America.',
  },
  ar: {
    channelName: 'France 24 Español · LatAm',
    network: 'France Médias Monde',
    category: 'Latin America News',
    language: 'Spanish',
    hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_ES,
    officialUrl: 'https://www.france24.com/es/en-vivo',
    description:
      '24-hour Spanish-language international news covering Argentina and South America.',
  },
  mx: {
    channelName: 'France 24 Español · México',
    network: 'France Médias Monde',
    category: 'Americas Live News',
    language: 'Spanish',
    hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_ES,
    officialUrl: 'https://www.france24.com/es/en-vivo',
    description:
      'Continuous Spanish-language live television news covering Mexico and the Americas.',
  },
  nz: {
    channelName: 'ABC News Oceania & Pacific',
    network: 'ABC Australia / Pacific Desk',
    category: 'Oceania Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.ABC_NEWS_AU,
    officialUrl: 'https://www.abc.net.au/news/newschannel',
    description:
      'Live Oceania & Tasman regional news television covering New Zealand, Australia, and the Pacific.',
  },
  pk: {
    channelName: 'CNA & South Asia Live',
    network: 'Asia-Pacific Public Feed',
    category: 'South Asia News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.ALJAZEERA_EN,
    officialUrl: 'https://www.aljazeera.com/live',
    description:
      'Live South Asian and international breaking news coverage.',
  },
  bd: {
    channelName: 'CNA & Bay of Bengal Desk',
    network: 'Asia-Pacific Live Feed',
    category: 'South Asia News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.CNA_ASIA,
    officialUrl: 'https://www.channelnewsasia.com/watch',
    description:
      'Live Asian regional news, trade, and weather updates covering Bangladesh and South Asia.',
  },
  my: {
    channelName: 'CNA Southeast Asia Live',
    network: 'Mediacorp Asia Desk',
    category: 'ASEAN Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.CNA_ASIA,
    officialUrl: 'https://www.channelnewsasia.com/watch',
    description:
      'Live Southeast Asian breaking news and market updates across Malaysia and ASEAN.',
  },
  id: {
    channelName: 'CNA Indonesia & ASEAN Live',
    network: 'Mediacorp Asia Desk',
    category: 'ASEAN Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.CNA_ASIA,
    officialUrl: 'https://www.channelnewsasia.com/watch',
    description:
      'Live Southeast Asian television news covering Indonesia and the Indo-Pacific.',
  },
  th: {
    channelName: 'CNA Bangkok & ASEAN Live',
    network: 'Mediacorp Asia Desk',
    category: 'ASEAN Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.CNA_ASIA,
    officialUrl: 'https://www.channelnewsasia.com/watch',
    description:
      'Live regional broadcast covering Thailand, ASEAN markets, and Asia-Pacific.',
  },
  ph: {
    channelName: 'CNA Manila & Pacific Live',
    network: 'Mediacorp Asia Desk',
    category: 'Asia-Pacific News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.CNA_ASIA,
    officialUrl: 'https://www.channelnewsasia.com/watch',
    description:
      'Live Asia-Pacific breaking news covering the Philippines and Southeast Asia.',
  },
  vn: {
    channelName: 'CNA Indochina & Asia Live',
    network: 'Mediacorp Asia Desk',
    category: 'Asia-Pacific News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.CNA_ASIA,
    officialUrl: 'https://www.channelnewsasia.com/watch',
    description:
      'Live regional television news covering Vietnam and Southeast Asia.',
  },
  ch: {
    channelName: 'Euronews & DW Central Europe',
    network: 'European Public Broadcast',
    category: 'European Live News',
    language: 'English / French / German',
    hlsUrl: RELIABLE_GLOBAL_HLS.DW_ENGLISH,
    officialUrl: 'https://www.euronews.com/live',
    description:
      'Continuous European public news coverage covering Switzerland, finance, and Europe.',
  },
  nl: {
    channelName: 'Euronews Live · Europe',
    network: 'Euronews',
    category: 'European Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.EURONEWS_EN,
    officialUrl: 'https://www.euronews.com/live',
    description:
      'Pan-European 24-hour live news covering the Netherlands, EU affairs, and global headlines.',
  },
  be: {
    channelName: 'France 24 & Euronews Brussels',
    network: 'France 24 / Euronews',
    category: 'European Affairs',
    language: 'French / English',
    hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_FR,
    officialUrl: 'https://www.france24.com/fr/direct',
    description:
      'Live European Union and Belgian broadcast news from Brussels and Paris.',
  },
  se: {
    channelName: 'DW & Nordic European News',
    network: 'Deutsche Welle Europe',
    category: 'European Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.DW_ENGLISH,
    officialUrl: 'https://www.dw.com/en/live-tv/channel-english',
    description:
      'Live European news coverage covering Sweden, the Nordics, and global developments.',
  },
  no: {
    channelName: 'DW & Nordic Live Desk',
    network: 'Deutsche Welle Europe',
    category: 'European Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.DW_ENGLISH,
    officialUrl: 'https://www.dw.com/en/live-tv/channel-english',
    description:
      'Live European television news covering Norway, Arctic energy, and world affairs.',
  },
  pt: {
    channelName: 'Euronews & Iberian Live',
    network: 'Euronews',
    category: 'European Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.EURONEWS_EN,
    officialUrl: 'https://www.euronews.com/live',
    description:
      'Continuous European live news coverage for Portugal and Western Europe.',
  },
  ie: {
    channelName: 'Sky News & Euronews Ireland',
    network: 'Sky / Euronews',
    category: 'European Live News',
    language: 'English',
    hlsUrl: RELIABLE_GLOBAL_HLS.SKY_NEWS_UK,
    officialUrl: 'https://www.euronews.com/live',
    description:
      'Live breaking news covering Ireland, the British Isles, and European markets.',
  },
  ma: {
    channelName: 'France 24 Français · Maghreb',
    network: 'France Médias Monde',
    category: 'North Africa & Europe',
    language: 'French / Arabic',
    hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_FR,
    officialUrl: 'https://www.france24.com/fr/direct',
    description:
      'Live French and North African international news covering Morocco and the Mediterranean.',
  },
};

function getRegionalFallbackChannel(country: Country): LiveTvChannel {
  const langLower = country.language.toLowerCase();

  if (langLower.includes('arabic')) {
    return {
      channelName: 'France 24 Arabic · Regional Live',
      network: 'International Public Broadcast',
      category: 'Regional Live News',
      language: 'Arabic',
      hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_AR,
      fallbackHlsUrl: RELIABLE_GLOBAL_HLS.ALJAZEERA_EN,
      officialUrl: 'https://www.france24.com/ar/live',
      isRegionalFallback: true,
      description: `Live Arabic-language regional & international news broadcast serving ${country.name} and surrounding regions.`,
    };
  }

  if (langLower.includes('spanish')) {
    return {
      channelName: 'France 24 Español · Live',
      network: 'International Public Broadcast',
      category: 'Regional Live News',
      language: 'Spanish',
      hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_ES,
      fallbackHlsUrl: RELIABLE_GLOBAL_HLS.DW_ENGLISH,
      officialUrl: 'https://www.france24.com/es/en-vivo',
      isRegionalFallback: true,
      description: `Live 24-hour Spanish-language international news television covering ${country.name} and ${country.continent}.`,
    };
  }

  if (langLower.includes('french')) {
    return {
      channelName: 'France 24 Français · Direct',
      network: 'France Médias Monde',
      category: 'International Live News',
      language: 'French',
      hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_FR,
      fallbackHlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_EN,
      officialUrl: 'https://www.france24.com/fr/direct',
      isRegionalFallback: true,
      description: `Live French-language international news broadcast covering ${country.name} and ${country.continent}.`,
    };
  }

  switch (country.continent) {
    case 'Asia':
      return {
        channelName: 'CNA & NHK Asia Live',
        network: 'Asia-Pacific Public Broadcast',
        category: 'Asia Live News',
        language: 'English',
        hlsUrl: RELIABLE_GLOBAL_HLS.CNA_ASIA,
        fallbackHlsUrl: RELIABLE_GLOBAL_HLS.NHK_WORLD,
        officialUrl: 'https://www.channelnewsasia.com/watch',
        isRegionalFallback: true,
        description: `Live 24-hour pan-Asian television broadcast covering ${country.name} and the Asia-Pacific region.`,
      };
    case 'Europe':
      return {
        channelName: 'DW News · Europe Live',
        network: 'Deutsche Welle Public Broadcast',
        category: 'European Live News',
        language: 'English',
        hlsUrl: RELIABLE_GLOBAL_HLS.DW_ENGLISH,
        fallbackHlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_EN,
        officialUrl: 'https://www.dw.com/en/live-tv/channel-english',
        isRegionalFallback: true,
        description: `Live European international public television covering ${country.name} and continental news.`,
      };
    case 'Africa':
      return {
        channelName: 'Africanews Live',
        network: 'Pan-African Broadcast Network',
        category: 'African Live News',
        language: 'English',
        hlsUrl: RELIABLE_GLOBAL_HLS.AFRICANEWS,
        fallbackHlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_EN,
        officialUrl: 'https://www.africanews.com/live/',
        isRegionalFallback: true,
        description: `Live 24-hour pan-African breaking news covering ${country.name} and the African continent.`,
      };
    case 'Oceania':
      return {
        channelName: 'ABC News Pacific Live',
        network: 'Australian Broadcasting Corporation',
        category: 'Oceania & Pacific News',
        language: 'English',
        hlsUrl: RELIABLE_GLOBAL_HLS.ABC_NEWS_AU,
        fallbackHlsUrl: RELIABLE_GLOBAL_HLS.NHK_WORLD,
        officialUrl: 'https://www.abc.net.au/news/newschannel',
        isRegionalFallback: true,
        description: `Live Oceania & South Pacific television news serving ${country.name} and neighboring islands.`,
      };
    case 'South America':
      return {
        channelName: 'France 24 Americas Live',
        network: 'International News Network',
        category: 'South America Live News',
        language: 'Spanish / English',
        hlsUrl: RELIABLE_GLOBAL_HLS.FRANCE24_ES,
        fallbackHlsUrl: RELIABLE_GLOBAL_HLS.DW_ENGLISH,
        officialUrl: 'https://www.france24.com/es/en-vivo',
        isRegionalFallback: true,
        description: `Live Americas television news broadcast covering ${country.name} and South America.`,
      };
    default:
      return {
        channelName: 'CBS News 24/7 · Americas',
        network: 'CBS News International',
        category: 'Americas Live News',
        language: 'English',
        hlsUrl: RELIABLE_GLOBAL_HLS.CBS_NEWS,
        fallbackHlsUrl: RELIABLE_GLOBAL_HLS.DW_ENGLISH,
        officialUrl: 'https://www.cbsnews.com/live/',
        isRegionalFallback: true,
        description: `Live 24/7 North American and international news broadcast serving ${country.name}.`,
      };
  }
}

export function getLiveTvChannelForCountry(country: Country): LiveTvChannel {
  const curated = CURATED_CHANNELS[country.iso.toLowerCase()];
  if (curated) {
    if (curated.preferEmbed) {
      return {
        ...curated,
        fallbackHlsUrl: '',
      };
    }
    const fallbackHlsUrl =
      curated.hlsUrl === RELIABLE_GLOBAL_HLS.DW_ENGLISH
        ? RELIABLE_GLOBAL_HLS.FRANCE24_EN
        : RELIABLE_GLOBAL_HLS.DW_ENGLISH;
    return {
      ...curated,
      fallbackHlsUrl,
    };
  }
  return getRegionalFallbackChannel(country);
}

export const FEATURED_LIVE_TV_ISOS = [
  'lk',
  'jp',
  'gb',
  'us',
  'de',
  'fr',
  'qa',
  'sg',
  'au',
  'kr',
  'in',
  'tr',
  'es',
  'it',
  'za',
] as const;
