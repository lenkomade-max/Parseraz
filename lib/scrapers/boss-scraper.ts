import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ParsedJob, ScraperOptions } from '../../types'
import { getRandomUserAgent, randomDelay, RATE_LIMIT, shouldStopParsing, logParseActivity } from '../utils/rate-limiter'
import { mapBossCategory, mapLocation } from '../mapping/categories'

const BASE_URL = 'https://boss.az'
const VACANCIES_URL = `${BASE_URL}/vacancies`

/**
 * Scrape vacancies from boss.az
 */
export async function scrapeBossAz(options: ScraperOptions = {}): Promise<ParsedJob[]> {
  const {
    maxJobs = RATE_LIMIT.MAX_JOBS_PER_RUN,
    delayMs = RATE_LIMIT.MIN_DELAY,
    userAgent = getRandomUserAgent(),
    proxy
  } = options

  const jobs: ParsedJob[] = []
  logParseActivity('boss.az', 'Starting scrape', { maxJobs })

  try {
    // Fetch main page
    const response = await axios.get(VACANCIES_URL, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'az-AZ,az;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: RATE_LIMIT.TIMEOUT,
      ...(proxy && { proxy: { host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]) } })
    })

    if (shouldStopParsing(response.status)) {
      logParseActivity('boss.az', 'Stopped - blocked status', { status: response.status })
      return jobs
    }

    const $ = cheerio.load(response.data)

    // Find vacancy cards
    const vacancyCards = $('.results-i').slice(0, maxJobs)

    logParseActivity('boss.az', 'Found vacancy cards', { count: vacancyCards.length })

    for (let i = 0; i < vacancyCards.length; i++) {
      const card = vacancyCards.eq(i)

      try {
        // Extract data from card
        const titleLink = card.find('.results-i-title a')
        const title = titleLink.text().trim()
        const relativeUrl = titleLink.attr('href')
        const sourceUrl = relativeUrl ? `${BASE_URL}${relativeUrl}` : ''

        const company = card.find('.results-i-company').text().trim()
        const rawCategory = card.find('.results-i-category').text().trim()
        const category = mapBossCategory(rawCategory)

        const rawLocation = card.find('.results-i-loc').text().trim()
        const location = mapLocation(rawLocation)

        const salary = card.find('.results-i-salary').text().trim() || 'Razılaşma yolu ilə'

        // Phone might be visible without click
        const phone = card.find('.results-i-contact').text().trim()

        if (!title || !sourceUrl) {
          logParseActivity('boss.az', 'Skipping - missing title/url', { index: i })
          continue
        }

        const job: ParsedJob = {
          source: 'boss.az',
          source_url: sourceUrl,
          source_id: relativeUrl?.split('/').pop() || '',
          title,
          company: company || undefined,
          category,
          location,
          salary,
          contact_phone: phone || undefined,
          raw_data: {
            raw_category: rawCategory,
            raw_location: rawLocation
          }
        }

        jobs.push(job)
        logParseActivity('boss.az', 'Parsed job', { title, company })

        // Delay between requests
        if (i < vacancyCards.length - 1) {
          await randomDelay(RATE_LIMIT.MIN_DELAY, RATE_LIMIT.MAX_DELAY)
        }
      } catch (error: any) {
        logParseActivity('boss.az', 'Error parsing card', { error: error.message, index: i })
        continue
      }
    }

    logParseActivity('boss.az', 'Scrape completed', { total: jobs.length })
    return jobs

  } catch (error: any) {
    if (error.response) {
      logParseActivity('boss.az', 'HTTP Error', {
        status: error.response.status,
        message: error.message
      })
    } else {
      logParseActivity('boss.az', 'Network Error', { message: error.message })
    }
    return jobs
  }
}

/**
 * Fetch detailed job info (if needed)
 * Note: Only use if phone is not visible on listing page
 */
export async function fetchBossJobDetails(jobUrl: string, userAgent?: string): Promise<Partial<ParsedJob>> {
  try {
    const response = await axios.get(jobUrl, {
      headers: {
        'User-Agent': userAgent || getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: RATE_LIMIT.TIMEOUT
    })

    const $ = cheerio.load(response.data)

    // Extract description
    const description = $('.job-info').text().trim()

    // Extract phone if visible
    const phone = $('.phone-number').text().trim()

    // Extract deadline if present
    const deadline = $('.deadline').text().trim()

    return {
      description: description || undefined,
      contact_phone: phone || undefined,
      deadline: deadline || undefined
    }
  } catch (error: any) {
    logParseActivity('boss.az', 'Error fetching details', { url: jobUrl, error: error.message })
    return {}
  }
}
