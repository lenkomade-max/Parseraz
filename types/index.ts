// ============================================
// TYPES FOR LEYLA PARSER
// Based on Supabase jobs table schema
// ============================================

export type JobType = 'vakansiya' | 'gundelik'

export type JobStatus =
  | 'pending_review'
  | 'pending_moderation'
  | 'active'
  | 'inactive'
  | 'expired'
  | 'rejected'

// Supabase jobs table structure
export interface Job {
  id?: string
  user_id: string

  // Type
  job_type: JobType

  // Common fields (required)
  title: string
  category: string
  location: string
  salary: string
  description: string
  contact_phone: string

  // Vakansiya only
  company?: string
  employment_type?: string
  experience?: string
  education?: string
  deadline?: string
  requirements?: string
  benefits?: string

  // Gundelik only
  start_date?: string
  duration?: string

  // Status & metadata
  status?: JobStatus
  is_vip?: boolean
  is_urgent?: boolean
  views_count?: number
  expires_at?: string
  created_at?: string
  updated_at?: string

  // AI moderation (not used for parsed jobs)
  ai_moderation_result?: any
  rules_moderation_result?: any
  ai_checked_at?: string
}

// Raw parsed job before transformation
export interface ParsedJob {
  source: 'boss.az' | 'ejob.az'
  source_url: string
  source_id?: string

  title: string
  company?: string
  category: string
  location: string
  salary?: string
  description?: string
  contact_phone?: string

  // For gundelik jobs
  start_date?: string
  duration?: string

  // Metadata
  posted_date?: string
  deadline?: string

  // Raw for debugging
  raw_data?: any
}

// Parser result
export interface ParseResult {
  success: boolean
  source: string
  jobs: ParsedJob[]
  errors: string[]
  stats: {
    total: number
    new: number
    duplicates: number
    failed: number
  }
}

// Scraper options
export interface ScraperOptions {
  maxJobs?: number           // Max jobs to scrape
  delayMs?: number           // Delay between requests
  userAgent?: string         // Custom user agent
  proxy?: string             // Proxy URL
}
