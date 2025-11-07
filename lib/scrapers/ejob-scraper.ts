import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ParsedJob, ScraperOptions } from '../../types'
import { getRandomUserAgent, randomDelay, RATE_LIMIT, shouldStopParsing, logParseActivity } from '../utils/rate-limiter'
import { mapEjobCategory, mapLocation } from '../mapping/categories'

const BASE_URL = 'https://ejob.az'
const VACANCIES_URL = `${BASE_URL}/vacancies`
const MUZDLU_URL = `${BASE_URL}/muzdlu-is` // Gündəlik işlər

/**
 * Scrape regular vacancies from ejob.az
 */
export async function scrapeEjobVacancies(options: ScraperOptions = {}): Promise<ParsedJob[]> {
  const {
    maxJobs = RATE_LIMIT.MAX_JOBS_PER_RUN,
    userAgent = getRandomUserAgent(),
    proxy
  } = options

  const jobs: ParsedJob[] = []
  logParseActivity('ejob.az', 'Starting vacancies scrape', { maxJobs })

  try {
    const response = await axios.get(VACANCIES_URL, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'az-AZ,az;q=0.9,en;q=0.8',
      },
      timeout: RATE_LIMIT.TIMEOUT,
      ...(proxy && { proxy: { host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]) } })
    })

    if (shouldStopParsing(response.status)) {
      logParseActivity('ejob.az', 'Stopped - blocked status', { status: response.status })
      return jobs
    }

    const $ = cheerio.load(response.data)

    // Find vacancy cards (adjust selectors based on actual site structure)
    const vacancyCards = $('.vacancy-card, .job-item, .listing-item').slice(0, maxJobs)

    logParseActivity('ejob.az', 'Found vacancy cards', { count: vacancyCards.length })

    for (let i = 0; i < vacancyCards.length; i++) {
      const card = vacancyCards.eq(i)

      try {
        // Extract data (adjust selectors)
        const titleLink = card.find('.vacancy-title a, .job-title a, h3 a')
        const title = titleLink.text().trim()
        const relativeUrl = titleLink.attr('href')
        const sourceUrl = relativeUrl ? (relativeUrl.startsWith('http') ? relativeUrl : `${BASE_URL}${relativeUrl}`) : ''

        const company = card.find('.company-name, .vacancy-company').text().trim()
        const rawCategory = card.find('.vacancy-category, .job-category').text().trim()
        const category = mapEjobCategory(rawCategory)

        const rawLocation = card.find('.vacancy-location, .job-location').text().trim()
        const location = mapLocation(rawLocation)

        const salary = card.find('.vacancy-salary, .job-salary').text().trim() || 'Razılaşma yolu ilə'

        if (!title || !sourceUrl) {
          logParseActivity('ejob.az', 'Skipping - missing title/url', { index: i })
          continue
        }

        const job: ParsedJob = {
          source: 'ejob.az',
          source_url: sourceUrl,
          source_id: relativeUrl?.split('/').pop() || '',
          title,
          company: company || undefined,
          category,
          location,
          salary,
          raw_data: {
            raw_category: rawCategory,
            raw_location: rawLocation
          }
        }

        jobs.push(job)
        logParseActivity('ejob.az', 'Parsed vacancy', { title, company })

        if (i < vacancyCards.length - 1) {
          await randomDelay(RATE_LIMIT.MIN_DELAY, RATE_LIMIT.MAX_DELAY)
        }
      } catch (error: any) {
        logParseActivity('ejob.az', 'Error parsing card', { error: error.message, index: i })
        continue
      }
    }

    logParseActivity('ejob.az', 'Vacancies scrape completed', { total: jobs.length })
    return jobs

  } catch (error: any) {
    if (error.response) {
      logParseActivity('ejob.az', 'HTTP Error', {
        status: error.response.status,
        message: error.message
      })
    } else {
      logParseActivity('ejob.az', 'Network Error', { message: error.message })
    }
    return jobs
  }
}

/**
 * Scrape "Muzdlu iş" (gündəlik işlər) from ejob.az
 */
export async function scrapeEjobMuzdlu(options: ScraperOptions = {}): Promise<ParsedJob[]> {
  const {
    maxJobs = RATE_LIMIT.MAX_JOBS_PER_RUN,
    userAgent = getRandomUserAgent(),
    proxy
  } = options

  const jobs: ParsedJob[] = []
  logParseActivity('ejob.az/muzdlu', 'Starting muzdlu scrape', { maxJobs })

  try {
    const response = await axios.get(MUZDLU_URL, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'az-AZ,az;q=0.9,en;q=0.8',
      },
      timeout: RATE_LIMIT.TIMEOUT,
      ...(proxy && { proxy: { host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]) } })
    })

    if (shouldStopParsing(response.status)) {
      logParseActivity('ejob.az/muzdlu', 'Stopped - blocked status', { status: response.status })
      return jobs
    }

    const $ = cheerio.load(response.data)

    // Find muzdlu job cards
    const jobCards = $('.muzdlu-card, .short-job-card, .gig-item').slice(0, maxJobs)

    logParseActivity('ejob.az/muzdlu', 'Found job cards', { count: jobCards.length })

    for (let i = 0; i < jobCards.length; i++) {
      const card = jobCards.eq(i)

      try {
        const titleLink = card.find('.job-title a, h3 a')
        const title = titleLink.text().trim()
        const relativeUrl = titleLink.attr('href')
        const sourceUrl = relativeUrl ? (relativeUrl.startsWith('http') ? relativeUrl : `${BASE_URL}${relativeUrl}`) : ''

        const rawCategory = card.find('.job-category').text().trim()
        const category = mapEjobCategory(rawCategory)

        const rawLocation = card.find('.job-location').text().trim()
        const location = mapLocation(rawLocation)

        const salary = card.find('.job-payment').text().trim()

        // Gündəlik specific fields
        const startDate = card.find('.start-date').text().trim()
        const duration = card.find('.duration').text().trim()

        if (!title || !sourceUrl) {
          logParseActivity('ejob.az/muzdlu', 'Skipping - missing title/url', { index: i })
          continue
        }

        const job: ParsedJob = {
          source: 'ejob.az',
          source_url: sourceUrl,
          source_id: relativeUrl?.split('/').pop() || '',
          title,
          category,
          location,
          salary,
          start_date: startDate || undefined,
          duration: duration || undefined,
          raw_data: {
            raw_category: rawCategory,
            raw_location: rawLocation,
            type: 'muzdlu'
          }
        }

        jobs.push(job)
        logParseActivity('ejob.az/muzdlu', 'Parsed gündəlik job', { title })

        if (i < jobCards.length - 1) {
          await randomDelay(RATE_LIMIT.MIN_DELAY, RATE_LIMIT.MAX_DELAY)
        }
      } catch (error: any) {
        logParseActivity('ejob.az/muzdlu', 'Error parsing card', { error: error.message, index: i })
        continue
      }
    }

    logParseActivity('ejob.az/muzdlu', 'Muzdlu scrape completed', { total: jobs.length })
    return jobs

  } catch (error: any) {
    if (error.response) {
      logParseActivity('ejob.az/muzdlu', 'HTTP Error', {
        status: error.response.status,
        message: error.message
      })
    } else {
      logParseActivity('ejob.az/muzdlu', 'Network Error', { message: error.message })
    }
    return jobs
  }
}
