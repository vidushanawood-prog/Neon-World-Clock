import type { Country } from './countries';

export type HeadgearStyle =
  | 'none'
  | 'turban'
  | 'ghutra'
  | 'beret'
  | 'sombrero'
  | 'kufi'
  | 'songkok'
  | 'gat'
  | 'crown-band'
  | 'highland-cap'
  | 'bowler'
  | 'andean-cap';

export type GarmentStyleA =
  | 'nilame-national'
  | 'sherwani'
  | 'haori-hakama'
  | 'hanbok-men'
  | 'tangzhuang'
  | 'thobe'
  | 'kilt-jacket'
  | 'tailored-coat'
  | 'agbada'
  | 'charro-jacket'
  | 'poncho'
  | 'pacific-tunic';

export type GarmentStyleB =
  | 'osariya-sari'
  | 'sari-drape'
  | 'kimono-obi'
  | 'hanbok-chima'
  | 'qipao'
  | 'abaya-kaftan'
  | 'tartan-shawl'
  | 'continental-dress'
  | 'ankara-gele'
  | 'folk-skirt'
  | 'kebaya-sash'
  | 'pacific-dress';

export interface CulturalCharacterProfile {
  regionTitle: string;
  attireSummary: string;
  skinToneA: string;
  skinToneB: string;
  hairColorA: string;
  hairColorB: string;
  primaryA: string;
  secondaryA: string;
  accentA: string;
  primaryB: string;
  secondaryB: string;
  accentB: string;
  garmentA: GarmentStyleA;
  garmentB: GarmentStyleB;
  headgearA: HeadgearStyle;
  headgearB: HeadgearStyle;
  neonPedestalHex: string;
}

const SRI_LANKA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'Sri Lankan Heritage',
  attireSummary: 'Traditional National / Nilame Jacket & Kandyan Osariya Silk',
  skinToneA: '#a56e48',
  skinToneB: '#ad7650',
  hairColorA: '#171413',
  hairColorB: '#151211',
  primaryA: '#f8fafc',      // Ivory national tunic
  secondaryA: '#9f1239',    // Crimson Kandyan wrap/trim
  accentA: '#f59e0b',       // Gold kasthana & embroidery
  primaryB: '#be123c',      // Deep Kandyan crimson silk Osariya
  secondaryB: '#f59e0b',    // Gold woven border & belt
  accentB: '#fde047',       // Gold Nalalpatiya forehead ornament
  garmentA: 'nilame-national',
  garmentB: 'osariya-sari',
  headgearA: 'none',
  headgearB: 'crown-band',
  neonPedestalHex: '#fbbf24',
};

const SOUTH_ASIA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'South Asian Heritage',
  attireSummary: 'Embroidered Sherwani with Pagri & Woven Silk Sari',
  skinToneA: '#b57b52',
  skinToneB: '#bd845c',
  hairColorA: '#191514',
  hairColorB: '#161211',
  primaryA: '#fef3c7',
  secondaryA: '#b45309',
  accentA: '#f59e0b',
  primaryB: '#0f766e',
  secondaryB: '#f59e0b',
  accentB: '#fde68a',
  garmentA: 'sherwani',
  garmentB: 'sari-drape',
  headgearA: 'turban',
  headgearB: 'crown-band',
  neonPedestalHex: '#f59e0b',
};

const JAPAN_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'Japanese Heritage',
  attireSummary: 'Indigo Haori & Hakama paired with Sakura Kimono & Obi',
  skinToneA: '#e8c4a6',
  skinToneB: '#edd0b6',
  hairColorA: '#14151a',
  hairColorB: '#16171d',
  primaryA: '#1e3a5f',
  secondaryA: '#0f172a',
  accentA: '#38bdf8',
  primaryB: '#e11d48',
  secondaryB: '#fbbf24',
  accentB: '#fda4af',
  garmentA: 'haori-hakama',
  garmentB: 'kimono-obi',
  headgearA: 'none',
  headgearB: 'crown-band',
  neonPedestalHex: '#38bdf8',
};

const KOREA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'Korean Heritage',
  attireSummary: 'Traditional Jeogori & Gat Hat paired with Pastel Chima Hanbok',
  skinToneA: '#ebd0b8',
  skinToneB: '#f0d6bf',
  hairColorA: '#17171c',
  hairColorB: '#17171c',
  primaryA: '#1d4ed8',
  secondaryA: '#e2e8f0',
  accentA: '#38bdf8',
  primaryB: '#ec4899',
  secondaryB: '#fef9c3',
  accentB: '#34d399',
  garmentA: 'hanbok-men',
  garmentB: 'hanbok-chima',
  headgearA: 'gat',
  headgearB: 'crown-band',
  neonPedestalHex: '#38bdf8',
};

const CHINA_EAST_ASIA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'East Asian Heritage',
  attireSummary: 'Crimson Tangzhuang Mandarin Tunic & Emerald Silk Qipao',
  skinToneA: '#e6c2a2',
  skinToneB: '#eccab0',
  hairColorA: '#151518',
  hairColorB: '#141417',
  primaryA: '#991b1b',
  secondaryA: '#1e293b',
  accentA: '#fbbf24',
  primaryB: '#047857',
  secondaryB: '#f59e0b',
  accentB: '#fde047',
  garmentA: 'tangzhuang',
  garmentB: 'qipao',
  headgearA: 'none',
  headgearB: 'crown-band',
  neonPedestalHex: '#f59e0b',
};

const SOUTHEAST_ASIA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'Southeast Asian Heritage',
  attireSummary: 'Batik Songket Tunic & Songkok paired with Kebaya Silk Sash',
  skinToneA: '#b8825a',
  skinToneB: '#c28c64',
  hairColorA: '#181514',
  hairColorB: '#171413',
  primaryA: '#0369a1',
  secondaryA: '#f59e0b',
  accentA: '#38bdf8',
  primaryB: '#7c3aed',
  secondaryB: '#fbbf24',
  accentB: '#22d3ee',
  garmentA: 'nilame-national',
  garmentB: 'kebaya-sash',
  headgearA: 'songkok',
  headgearB: 'crown-band',
  neonPedestalHex: '#22d3ee',
};

const MIDDLE_EAST_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'Arabian & MENA Heritage',
  attireSummary: 'Crisp White Thobe with Ghutra & Embroidered Midnight Kaftan',
  skinToneA: '#c6936c',
  skinToneB: '#cfa07a',
  hairColorA: '#1b1614',
  hairColorB: '#191412',
  primaryA: '#f8fafc',
  secondaryA: '#1e293b',
  accentA: '#f59e0b',
  primaryB: '#1e1b4b',
  secondaryB: '#f59e0b',
  accentB: '#38bdf8',
  garmentA: 'thobe',
  garmentB: 'abaya-kaftan',
  headgearA: 'ghutra',
  headgearB: 'crown-band',
  neonPedestalHex: '#fbbf24',
};

const SCOTLAND_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'Scottish Highland Heritage',
  attireSummary: 'Highland Tartan Kilt & Prince Charlie Jacket with Tartan Sash',
  skinToneA: '#f0cbb1',
  skinToneB: '#f3d3bc',
  hairColorA: '#7c2d12',
  hairColorB: '#9a3412',
  primaryA: '#0f172a',
  secondaryA: '#166534',
  accentA: '#dc2626',
  primaryB: '#1e3a8a',
  secondaryB: '#15803d',
  accentB: '#fbbf24',
  garmentA: 'kilt-jacket',
  garmentB: 'tartan-shawl',
  headgearA: 'highland-cap',
  headgearB: 'none',
  neonPedestalHex: '#38bdf8',
};

const UK_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'British Heritage',
  attireSummary: 'Savile Row Navy Coat & Bowler Accent paired with Royal Heritage Dress',
  skinToneA: '#ecc4a8',
  skinToneB: '#f0ccb2',
  hairColorA: '#422006',
  hairColorB: '#713f12',
  primaryA: '#1e3a8a',
  secondaryA: '#0f172a',
  accentA: '#e11d48',
  primaryB: '#9f1239',
  secondaryB: '#f8fafc',
  accentB: '#38bdf8',
  garmentA: 'tailored-coat',
  garmentB: 'continental-dress',
  headgearA: 'bowler',
  headgearB: 'beret',
  neonPedestalHex: '#38bdf8',
};

const EUROPE_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'European Heritage',
  attireSummary: 'Continental Tailored Overcoat & Beret paired with Embroidered Folk Dress',
  skinToneA: '#edc6aa',
  skinToneB: '#f1cfb6',
  hairColorA: '#3f2a1d',
  hairColorB: '#6b4423',
  primaryA: '#1e293b',
  secondaryA: '#0284c7',
  accentA: '#f59e0b',
  primaryB: '#0f766e',
  secondaryB: '#e2e8f0',
  accentB: '#fb7185',
  garmentA: 'tailored-coat',
  garmentB: 'continental-dress',
  headgearA: 'beret',
  headgearB: 'none',
  neonPedestalHex: '#38bdf8',
};

const SUB_SAHARAN_AFRICA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'African Royal Heritage',
  attireSummary: 'Woven Kente Agbada & Kufi Cap paired with Regal Ankara & Gele Wrap',
  skinToneA: '#5c3824',
  skinToneB: '#684029',
  hairColorA: '#121010',
  hairColorB: '#121010',
  primaryA: '#065f46',
  secondaryA: '#f59e0b',
  accentA: '#dc2626',
  primaryB: '#b45309',
  secondaryB: '#047857',
  accentB: '#fde047',
  garmentA: 'agbada',
  garmentB: 'ankara-gele',
  headgearA: 'kufi',
  headgearB: 'turban',
  neonPedestalHex: '#fbbf24',
};

const MEXICO_CENTRAL_AMERICA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'Mesoamerican & Mexican Heritage',
  attireSummary: 'Embroidered Charro Jacket & Sombrero paired with Folk Floral Dress',
  skinToneA: '#c68e66',
  skinToneB: '#cf9972',
  hairColorA: '#191412',
  hairColorB: '#191412',
  primaryA: '#111827',
  secondaryA: '#dc2626',
  accentA: '#fbbf24',
  primaryB: '#be185d',
  secondaryB: '#0ea5e9',
  accentB: '#fde047',
  garmentA: 'charro-jacket',
  garmentB: 'folk-skirt',
  headgearA: 'sombrero',
  headgearB: 'crown-band',
  neonPedestalHex: '#f59e0b',
};

const NORTH_AMERICA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'North American Style',
  attireSummary: 'Metropolitan Indigo Heritage Coat & Modern Tailored Ensemble',
  skinToneA: '#dfae8c',
  skinToneB: '#c58f69',
  hairColorA: '#291d16',
  hairColorB: '#3b2416',
  primaryA: '#1d4ed8',
  secondaryA: '#0f172a',
  accentA: '#ef4444',
  primaryB: '#0e7490',
  secondaryB: '#f8fafc',
  accentB: '#38bdf8',
  garmentA: 'tailored-coat',
  garmentB: 'continental-dress',
  headgearA: 'none',
  headgearB: 'none',
  neonPedestalHex: '#38bdf8',
};

const SOUTH_AMERICA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'South American & Andean Heritage',
  attireSummary: 'Woven Andean Poncho & Accent Cap paired with Vibrant Festival Dress',
  skinToneA: '#be865e',
  skinToneB: '#c9936c',
  hairColorA: '#181412',
  hairColorB: '#181412',
  primaryA: '#b91c1c',
  secondaryA: '#0284c7',
  accentA: '#fbbf24',
  primaryB: '#0d9488',
  secondaryB: '#f59e0b',
  accentB: '#f43f5e',
  garmentA: 'poncho',
  garmentB: 'folk-skirt',
  headgearA: 'andean-cap',
  headgearB: 'crown-band',
  neonPedestalHex: '#22d3ee',
};

const OCEANIA_PROFILE: CulturalCharacterProfile = {
  regionTitle: 'Oceania & Pacific Heritage',
  attireSummary: 'Tapa-Trimmed Ceremonial Tunic & Oceanic Woven Island Ensemble',
  skinToneA: '#b97e56',
  skinToneB: '#c48a62',
  hairColorA: '#1a1513',
  hairColorB: '#1c1614',
  primaryA: '#0f766e',
  secondaryA: '#78350f',
  accentA: '#22d3ee',
  primaryB: '#0284c7',
  secondaryB: '#f59e0b',
  accentB: '#fde047',
  garmentA: 'pacific-tunic',
  garmentB: 'pacific-dress',
  headgearA: 'none',
  headgearB: 'crown-band',
  neonPedestalHex: '#22d3ee',
};

const SOUTH_ASIA_ISOS = new Set(['in', 'pk', 'bd', 'np', 'bt', 'mv', 'af']);
const EAST_ASIA_CN_ISOS = new Set(['cn', 'tw', 'hk', 'mo', 'mn']);
const SOUTHEAST_ASIA_ISOS = new Set(['sg', 'my', 'id', 'th', 'vn', 'ph', 'kh', 'la', 'mm', 'bn', 'tl']);
const MENA_ISOS = new Set([
  'ae', 'sa', 'qa', 'om', 'kw', 'bh', 'ye', 'iq', 'ir', 'jo', 'lb', 'sy', 'ps', 'il', 'tr',
  'eg', 'ma', 'dz', 'tn', 'ly', 'sd',
]);
const MESO_ISOS = new Set(['mx', 'gt', 'bz', 'hn', 'sv', 'ni', 'cr', 'pa', 'cu', 'do', 'pr', 'jm']);

export function getCulturalProfile(country: Country): CulturalCharacterProfile {
  const iso = country.iso;

  if (iso === 'lk') return SRI_LANKA_PROFILE;
  if (iso === 'jp') return JAPAN_PROFILE;
  if (iso === 'kr' || iso === 'kp') return KOREA_PROFILE;
  if (iso === 'gb-sct') return SCOTLAND_PROFILE;
  if (iso === 'gb' || iso === 'gb-eng' || iso === 'gb-wls' || iso === 'gb-nir') {
    return UK_PROFILE;
  }
  if (SOUTH_ASIA_ISOS.has(iso)) return SOUTH_ASIA_PROFILE;
  if (EAST_ASIA_CN_ISOS.has(iso)) return CHINA_EAST_ASIA_PROFILE;
  if (SOUTHEAST_ASIA_ISOS.has(iso)) return SOUTHEAST_ASIA_PROFILE;
  if (MENA_ISOS.has(iso)) return MIDDLE_EAST_PROFILE;
  if (MESO_ISOS.has(iso)) return MEXICO_CENTRAL_AMERICA_PROFILE;

  switch (country.continent) {
    case 'Africa':
      return SUB_SAHARAN_AFRICA_PROFILE;
    case 'South America':
      return SOUTH_AMERICA_PROFILE;
    case 'North America':
      return NORTH_AMERICA_PROFILE;
    case 'Oceania':
      return OCEANIA_PROFILE;
    case 'Asia':
      return SOUTHEAST_ASIA_PROFILE;
    case 'Europe':
    default:
      return EUROPE_PROFILE;
  }
}
