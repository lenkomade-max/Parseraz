import type { ParsedJob, ParseResult, Job } from '../types'
import { scrapeBossAz } from './scrapers/boss-scraper'
import { scrapeEjobVacancies, scrapeEjobMuzdlu } from './scrapers/ejob-scraper'
import { insertJob, findExistingJob, updateJobExpiration } from './supabase/client'
import { logParseActivity } from './utils/rate-limiter'

/**
 * Transform ParsedJob to Supabase Job format
 */
function transformToJob(parsed: ParsedJob): Job {
  const isGundelik = parsed.raw_data?.type === 'muzdlu' || !!parsed.start_date

  const job: Job = {
    user_id: '', // Will be set by Supabase client
    job_type: isGundelik ? 'gundelik' : 'vakansiya',
    title: parsed.title,
    category: parsed.category,
    location: parsed.location,
    salary: parsed.salary || 'Razılaşma yolu ilə',
    description: parsed.description || `${parsed.title} - ${parsed.company || ''}`,
    contact_phone: parsed.contact_phone || '+994 50 000 00 00', // Fallback if missing
    company: parsed.company,
    status: 'active' // Parsed jobs go directly to active
  }

  // Add gündəlik specific fields
  if (isGundelik) {
    job.start_date = parsed.start_date
    job.duration = parsed.duration
  }

  return job
}

/**
 * Parse and save jobs from a source
 */
async function parseAndSaveSource(
  sourceName: string,
  scraper: () => Promise<ParsedJob[]>
): Promise<ParseResult> {
  const result: ParseResult = {
    success: false,
    source: sourceName,
    jobs: [],
    errors: [],
    stats: {
      total: 0,
      new: 0,
      duplicates: 0,
      failed: 0
    }
  }

  try {
    logParseActivity(sourceName, 'Starting parse')

    // Scrape jobs
    const parsedJobs = await scraper()
    result.jobs = parsedJobs
    result.stats.total = parsedJobs.length

    logParseActivity(sourceName, 'Scraped jobs', { count: parsedJobs.length })

    // Save to Supabase
    for (const parsed of parsedJobs) {
      try {
        // Check for duplicate
        const existing = await findExistingJob(
          parsed.title,
          parsed.company,
          parsed.location
        )

        if (existing) {
          // Update expiration date
          await updateJobExpiration(existing.id!)
          result.stats.duplicates++
          logParseActivity(sourceName, 'Duplicate found - updated expiration', {
            title: parsed.title
          })
          continue
        }

        // Transform and insert
        const job = transformToJob(parsed)
        const insertResult = await insertJob(job)

        if (insertResult.success) {
          result.stats.new++
          logParseActivity(sourceName, 'New job inserted', {
            id: insertResult.id,
            title: parsed.title
          })
        } else {
          result.stats.failed++
          result.errors.push(`Failed to insert: ${parsed.title} - ${insertResult.error}`)
        }
      } catch (error: any) {
        result.stats.failed++
        result.errors.push(`Error processing ${parsed.title}: ${error.message}`)
        logParseActivity(sourceName, 'Error saving job', {
          title: parsed.title,
          error: error.message
        })
      }
    }

    result.success = true
    logParseActivity(sourceName, 'Parse completed', result.stats)

    return result

  } catch (error: any) {
    result.errors.push(`Scraper error: ${error.message}`)
    logParseActivity(sourceName, 'Parse failed', { error: error.message })
    return result
  }
}

/**
 * Parse all sources (boss.az + ejob.az)
 */
export async function parseAllSources(): Promise<ParseResult[]> {
  logParseActivity('LEYLA', '=== Starting full parse cycle ===')

  const results: ParseResult[] = []

  // Parse boss.az
  const bossResult = await parseAndSaveSource('boss.az', scrapeBossAz)
  results.push(bossResult)

  // Parse ejob.az vacancies
  const ejobVacResult = await parseAndSaveSource('ejob.az/vacancies', scrapeEjobVacancies)
  results.push(ejobVacResult)

  // Parse ejob.az muzdlu
  const ejobMuzdluResult = await parseAndSaveSource('ejob.az/muzdlu', scrapeEjobMuzdlu)
  results.push(ejobMuzdluResult)

  // Summary
  const totalStats = results.reduce((acc, r) => ({
    total: acc.total + r.stats.total,
    new: acc.new + r.stats.new,
    duplicates: acc.duplicates + r.stats.duplicates,
    failed: acc.failed + r.stats.failed
  }), { total: 0, new: 0, duplicates: 0, failed: 0 })

  logParseActivity('LEYLA', '=== Parse cycle completed ===', totalStats)

  return results
}

/**
 * Parse single source by name
 */
export async function parseSingleSource(source: 'boss' | 'ejob-vac' | 'ejob-muzdlu'): Promise<ParseResult> {
  switch (source) {
    case 'boss':
      return parseAndSaveSource('boss.az', scrapeBossAz)
    case 'ejob-vac':
      return parseAndSaveSource('ejob.az/vacancies', scrapeEjobVacancies)
    case 'ejob-muzdlu':
      return parseAndSaveSource('ejob.az/muzdlu', scrapeEjobMuzdlu)
  }
}
