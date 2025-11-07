import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Health check endpoint
 * GET /api/health
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Leyla Parser',
    version: '1.0.0',
    env: {
      supabase_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      leyla_user_configured: !!process.env.LEYLA_USER_ID,
      parser_secret_configured: !!process.env.PARSER_SECRET
    }
  }

  return res.status(200).json(health)
}
