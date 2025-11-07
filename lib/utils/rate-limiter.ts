// ============================================
// RATE LIMITER
// Защита от блокировки IP
// ============================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15'
]

/**
 * Get random user agent
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Rate limiter configuration
 */
export const RATE_LIMIT = {
  // Delay between requests (milliseconds)
  MIN_DELAY: 2000,  // 2 seconds
  MAX_DELAY: 4000,  // 4 seconds

  // Max jobs per parsing session (reduced because we fetch detail pages)
  MAX_JOBS_PER_RUN: 5,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,

  // HTTP status codes to stop on
  STOP_ON_STATUS: [403, 429, 503],

  // Request timeout
  TIMEOUT: 30000 // 30 seconds
}

/**
 * Check if should stop parsing based on HTTP status
 */
export function shouldStopParsing(statusCode: number): boolean {
  return RATE_LIMIT.STOP_ON_STATUS.includes(statusCode)
}

/**
 * Log parsing activity
 */
export function logParseActivity(source: string, action: string, details?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${source}] ${action}`, details || '')
}
