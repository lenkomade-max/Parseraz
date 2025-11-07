import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseAllSources, parseSingleSource } from '../lib/parser'
import type { ParseResult } from '../types'

/**
 * Main parsing endpoint
 * POST /api/parse
 *
 * Authorization: Bearer <PARSER_SECRET>
 * Body: { source?: 'boss' | 'ejob-vac' | 'ejob-muzdlu' | 'all' }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check authorization
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.PARSER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Parse request
  const { source = 'all' } = req.body || {}

  console.log('[API] Parse request received', { source })

  try {
    let results

    if (source === 'all') {
      // Parse all sources
      results = await parseAllSources()
    } else {
      // Parse single source
      const result = await parseSingleSource(source as any)
      results = [result]
    }

    // Calculate summary
    const summary = {
      success: results.every((r: ParseResult) => r.success),
      sources: results.length,
      stats: results.reduce((acc: { total: number, new: number, duplicates: number, failed: number }, r: ParseResult) => ({
        total: acc.total + r.stats.total,
        new: acc.new + r.stats.new,
        duplicates: acc.duplicates + r.stats.duplicates,
        failed: acc.failed + r.stats.failed
      }), { total: 0, new: 0, duplicates: 0, failed: 0 }),
      results: results.map((r: ParseResult) => ({
        source: r.source,
        success: r.success,
        stats: r.stats,
        errors: r.errors
      }))
    }

    console.log('[API] Parse completed', summary)

    return res.status(200).json(summary)

  } catch (error: any) {
    console.error('[API] Parse error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
