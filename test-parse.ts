import { scrapeBossAz } from './lib/scrapers/boss-scraper'

async function test() {
  try {
    console.log('Testing boss.az scraper...')
    const jobs = await scrapeBossAz()
    console.log(`Found ${jobs.length} jobs`)
    console.log('First job:', jobs[0])
  } catch (error: any) {
    console.error('Error:', error.message)
    console.error(error.stack)
  }
}

test()
