// ============================================
// CATEGORY MAPPING
// boss.az / ejob.az → Vakansiya.az categories
// ============================================

/**
 * Vakansiya.az categories (from Supabase migration 001)
 */
export const VAKANSIYA_CATEGORIES = {
  IT: 'İnformasiya texnologiyaları, telekom',
  SALES: 'Satış',
  MARKETING: 'Marketinq, reklam, PR',
  HEALTHCARE: 'Tibb və əczaçılıq',
  EDUCATION: 'Təhsil və elm',
  FINANCE: 'Maliyyə',
  CONSTRUCTION: 'Tikinti və təmir (usta, rəngsaz, santexnik, elektrik, fəhlələr)',
  RESTAURANT: 'Restoran işi və turizm',
  TRANSPORT: 'Nəqliyyat, logistika, anbar',
  ADMINISTRATION: 'İnzibati heyət',
  HR: 'HR, kadrlar',
  LEGAL: 'Hüquqşünaslıq',
  AUTO: 'Avtobiznes və servis',
  DESIGN: 'Dizayn',
  HOME: 'Ev personalı və təmizlik',
  BEAUTY: 'Gözəllik, Fitnes, İdman',
  INDUSTRY: 'Sənaye və istehsalat',
  SECURITY: 'Təhlükəsizlik',
  OTHER: 'Digər'
} as const

/**
 * Map boss.az category to Vakansiya category
 */
export function mapBossCategory(bossCategory: string): string {
  const normalized = bossCategory.toLowerCase().trim()

  // IT
  if (
    normalized.includes('informasiya texnologiyaları') ||
    normalized.includes('it') ||
    normalized.includes('proqramlaşdırma')
  ) {
    return VAKANSIYA_CATEGORIES.IT
  }

  // Sales
  if (normalized.includes('satış')) {
    return VAKANSIYA_CATEGORIES.SALES
  }

  // Marketing
  if (normalized.includes('marketinq') || normalized.includes('reklam')) {
    return VAKANSIYA_CATEGORIES.MARKETING
  }

  // Medical
  if (normalized.includes('tibb') || normalized.includes('əczaçılıq')) {
    return VAKANSIYA_CATEGORIES.HEALTHCARE
  }

  // Education
  if (normalized.includes('təhsil') || normalized.includes('elm')) {
    return VAKANSIYA_CATEGORIES.EDUCATION
  }

  // Finance
  if (normalized.includes('maliyyə') || normalized.includes('mühasibat')) {
    return VAKANSIYA_CATEGORIES.FINANCE
  }

  // Construction
  if (normalized.includes('tikinti') || normalized.includes('sənaye')) {
    return VAKANSIYA_CATEGORIES.CONSTRUCTION
  }

  // Restaurant / Tourism
  if (
    normalized.includes('restoran') ||
    normalized.includes('turizm') ||
    normalized.includes('otel')
  ) {
    return VAKANSIYA_CATEGORIES.RESTAURANT
  }

  // Transport
  if (normalized.includes('nəqliyyat') || normalized.includes('logistika')) {
    return VAKANSIYA_CATEGORIES.TRANSPORT
  }

  // Administration
  if (normalized.includes('inzibati') || normalized.includes('idarəetmə')) {
    return VAKANSIYA_CATEGORIES.ADMINISTRATION
  }

  // HR
  if (normalized.includes('hr') || normalized.includes('kadr')) {
    return VAKANSIYA_CATEGORIES.HR
  }

  // Legal
  if (normalized.includes('hüquq')) {
    return VAKANSIYA_CATEGORIES.LEGAL
  }

  // Design
  if (normalized.includes('dizayn')) {
    return VAKANSIYA_CATEGORIES.DESIGN
  }

  // Home staff
  if (normalized.includes('xidmət') || normalized.includes('təmizlik')) {
    return VAKANSIYA_CATEGORIES.HOME
  }

  // Beauty / Fitness
  if (
    normalized.includes('gözəllik') ||
    normalized.includes('fitnes') ||
    normalized.includes('idman')
  ) {
    return VAKANSIYA_CATEGORIES.BEAUTY
  }

  // Security
  if (normalized.includes('təhlükəsizlik') || normalized.includes('mühafizə')) {
    return VAKANSIYA_CATEGORIES.SECURITY
  }

  // Default
  console.log(`[CategoryMapping] Unmapped boss.az category: "${bossCategory}" → using "Digər"`)
  return VAKANSIYA_CATEGORIES.OTHER
}

/**
 * Map ejob.az category to Vakansiya category
 */
export function mapEjobCategory(ejobCategory: string): string {
  const normalized = ejobCategory.toLowerCase().trim()

  // IT
  if (normalized.includes('informasiya texnologiyaları') || normalized.includes('it')) {
    return VAKANSIYA_CATEGORIES.IT
  }

  // Sales
  if (normalized.includes('satış')) {
    return VAKANSIYA_CATEGORIES.SALES
  }

  // Marketing
  if (normalized.includes('marketinq')) {
    return VAKANSIYA_CATEGORIES.MARKETING
  }

  // Medical
  if (normalized.includes('tibb') || normalized.includes('əczaçılıq')) {
    return VAKANSIYA_CATEGORIES.HEALTHCARE
  }

  // Education
  if (normalized.includes('təhsil') || normalized.includes('elm')) {
    return VAKANSIYA_CATEGORIES.EDUCATION
  }

  // Finance
  if (normalized.includes('maliyyə')) {
    return VAKANSIYA_CATEGORIES.FINANCE
  }

  // Construction / Industry
  if (
    normalized.includes('memarlıq') ||
    normalized.includes('tikinti') ||
    normalized.includes('sənaye') ||
    normalized.includes('istehsal')
  ) {
    return VAKANSIYA_CATEGORIES.CONSTRUCTION
  }

  // Services (xidmət) → could be Restaurant or Home
  if (normalized.includes('xidmət')) {
    return VAKANSIYA_CATEGORIES.HOME
  }

  // Administration
  if (normalized.includes('administrasiya') || normalized.includes('idarəetmə')) {
    return VAKANSIYA_CATEGORIES.ADMINISTRATION
  }

  // Design
  if (normalized.includes('dizayn')) {
    return VAKANSIYA_CATEGORIES.DESIGN
  }

  // Legal
  if (normalized.includes('hüquqşünaslıq')) {
    return VAKANSIYA_CATEGORIES.LEGAL
  }

  // Transport
  if (normalized.includes('servis')) {
    return VAKANSIYA_CATEGORIES.TRANSPORT
  }

  // Misc / Other
  if (normalized.includes('müxtəlif')) {
    return VAKANSIYA_CATEGORIES.OTHER
  }

  // Default
  console.log(`[CategoryMapping] Unmapped ejob.az category: "${ejobCategory}" → using "Digər"`)
  return VAKANSIYA_CATEGORIES.OTHER
}

/**
 * Map location to standard format
 * Input: "Baku" or "Баку" or "Bakı, Nəsimi"
 * Output: "Bakı, Nəsimi" (standardized)
 */
export function mapLocation(rawLocation: string): string {
  const normalized = rawLocation.trim()

  // Already in correct format
  if (normalized.match(/^Bakı, /)) {
    return normalized
  }

  // Just "Baku" or "Bakı"
  if (normalized.toLowerCase() === 'baku' || normalized.toLowerCase() === 'bakı') {
    return 'Bakı, Nəsimi' // Default district
  }

  // Other cities
  const cityMap: Record<string, string> = {
    sumqayıt: 'Sumqayıt',
    gəncə: 'Gəncə',
    mingəçevir: 'Mingəçevir',
    şirvan: 'Şirvan',
    naxçıvan: 'Naxçıvan',
    lənkəran: 'Lənkəran',
    şəki: 'Şəki',
    quba: 'Quba'
  }

  const lowerNormalized = normalized.toLowerCase()
  for (const [key, value] of Object.entries(cityMap)) {
    if (lowerNormalized.includes(key)) {
      return value
    }
  }

  // Return as-is if can't map
  return normalized
}
