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
        const title = card.find('.results-i-title').text().trim()
        const relativeUrl = card.find('.results-i-link').attr('href')
        const sourceUrl = relativeUrl ? `${BASE_URL}${relativeUrl}` : ''

        const company = card.find('.results-i-company').text().trim()

        // Extract location and category from .results-i-secondary
        const secondaryText = card.find('.results-i-secondary').text()
        const rawLocation = secondaryText.split(/[\/→]/)[0]?.trim() || ''
        const location = mapLocation(rawLocation)

        // Extract category from link in .results-i-secondary
        const categoryLink = card.find('.results-i-secondary a').last()
        const rawCategory = categoryLink.text().trim()
        const category = mapBossCategory(rawCategory)

        const salary = card.find('.results-i-salary').text().trim() || 'Razılaşma yolu ilə'

        // Description from summary
        const description = card.find('.results-i-summary').text().trim()

        if (!title || !sourceUrl) {
          logParseActivity('boss.az', 'Skipping - missing title/url', { index: i })
          continue
        }

        // Fetch phone from detail page
        await randomDelay(RATE_LIMIT.MIN_DELAY, RATE_LIMIT.MAX_DELAY)
        const details = await fetchBossJobDetails(sourceUrl, userAgent)

        const job: ParsedJob = {
          source: 'boss.az',
          source_url: sourceUrl,
          source_id: relativeUrl?.split('/').pop() || '',
          title,
          company: company || undefined,
          category,
          location,
          salary,
          description: details.description || description || undefined,
          contact_phone: details.contact_phone || undefined,
          raw_data: {
            raw_category: rawCategory,
            raw_location: rawLocation
          }
        }

        jobs.push(job)
        logParseActivity('boss.az', 'Parsed job', { title, company, hasPhone: !!details.contact_phone })

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
 * Fetch detailed job info from detail page
 * Fetches phone number and full description
 */
export async function fetchBossJobDetails(jobUrl: string, userAgent?: string): Promise<Partial<ParsedJob>> {
  try {
    const response = await axios.get(jobUrl, {
      headers: {
        'User-Agent': userAgent || getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'az-AZ,az;q=0.9,en;q=0.8',
      },
      timeout: RATE_LIMIT.TIMEOUT
    })

    const $ = cheerio.load(response.data)

    // Extract phone number
    let phone = $('.phone.params-i-val a').text().trim()
    if (!phone) {
      phone = $('.phone.params-i-val').text().trim()
    }

    // Extract full description
    let description = $('.job_description.params-i-val').text().trim()
    if (!description) {
      description = $('.post-info').text().trim()
    }

    return {
      description: description || undefined,
      contact_phone: phone || undefined
    }
  } catch (error: any) {
    logParseActivity('boss.az', 'Error fetching details', { url: jobUrl, error: error.message })
    return {}
  }
}
