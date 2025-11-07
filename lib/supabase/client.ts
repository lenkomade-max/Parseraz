import { createClient } from '@supabase/supabase-js'
import type { Job } from '../../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side

console.log('[Supabase Client] Checking environment variables:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  urlLength: supabaseUrl?.length || 0,
  keyLength: supabaseKey?.length || 0
})

if (!supabaseUrl || !supabaseKey) {
  const error = `Missing Supabase environment variables - URL: ${!!supabaseUrl}, Key: ${!!supabaseKey}`
  console.error('[Supabase Client]', error)
  throw new Error(error)
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Leyla user ID (will be set after user creation)
export const LEYLA_USER_ID = process.env.LEYLA_USER_ID || ''

if (!LEYLA_USER_ID) {
  console.warn('⚠️  LEYLA_USER_ID not set in environment variables')
}

/**
 * Insert a new job into Supabase
 */
export async function insertJob(job: Job): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...job,
        user_id: LEYLA_USER_ID,
        status: 'active', // Parsed jobs are automatically active
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Supabase] Insert error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error: any) {
    console.error('[Supabase] Insert exception:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if job already exists (deduplication)
 * Matches by title + company + location
 */
export async function findExistingJob(
  title: string,
  company: string | undefined,
  location: string
): Promise<Job | null> {
  try {
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('title', title)
      .eq('location', location)
      .eq('user_id', LEYLA_USER_ID)

    if (company) {
      query = query.eq('company', company)
    }

    const { data, error } = await query.limit(1).single()

    if (error) {
      // Not found is ok
      if (error.code === 'PGRST116') return null
      console.error('[Supabase] Find error:', error)
      return null
    }

    return data as Job
  } catch (error) {
    console.error('[Supabase] Find exception:', error)
    return null
  }
}

/**
 * Update job expires_at to keep it active
 */
export async function updateJobExpiration(id: string): Promise<boolean> {
  try {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // +30 days

    const { error } = await supabase
      .from('jobs')
      .update({
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('[Supabase] Update error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Supabase] Update exception:', error)
    return false
  }
}
