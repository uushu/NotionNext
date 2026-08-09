import { getCache } from '@vercel/functions'
import BLOG from '@/blog.config'
import {
  isCacheableCacheValue,
  isCriticalNotionCacheKey
} from './cache_validation'

// Runtime Cache is shared across deployments. Namespace normal entries by Git
// commit so a newly deployed config cannot reuse stale metadata from an older
// build. A second stable namespace keeps only validated last-known-good site
// snapshots so an upstream Notion outage cannot blank the site.
const cache = getCache({
  namespace: `notion:${process.env.VERCEL_GIT_COMMIT_SHA || 'local'}`
})
const lastKnownGoodCache = getCache({
  namespace: 'notion:last-known-good'
})

const configuredRevalidateSeconds = Number(BLOG.NEXT_REVALIDATE_SECOND)
const pageRevalidateSeconds =
  Number.isFinite(configuredRevalidateSeconds) &&
  configuredRevalidateSeconds > 0
    ? configuredRevalidateSeconds
    : 60

// Data must expire before the ISR page that consumes it. Otherwise a stale-page
// regeneration can succeed while rebuilding from the previous Notion snapshot.
const defaultCacheTime = Math.max(
  1,
  Math.floor(pageRevalidateSeconds * 0.75)
)

export const LAST_KNOWN_GOOD_TTL_SECONDS = 14 * 24 * 60 * 60

export function resolveCacheTtl(ttl) {
  const seconds = Number(ttl)
  return Number.isFinite(seconds) && seconds > 0
    ? Math.floor(seconds)
    : defaultCacheTime
}

async function readLastKnownGood(key) {
  if (!isCriticalNotionCacheKey(key)) return null

  const fallback = await lastKnownGoodCache.get(key)
  if (isCacheableCacheValue(key, fallback)) {
    console.warn(`[Cache][VERCEL] FALLBACK key:${key} using last-known-good snapshot`)
    return fallback
  }

  if (fallback != null) {
    await lastKnownGoodCache.delete(key)
  }
  return null
}

const VercelCache = {
  async getCache(key) {
    const data = await cache.get(key)
    if (isCacheableCacheValue(key, data)) {
      return data
    }

    if (isCriticalNotionCacheKey(key) && data != null) {
      console.warn(`[Cache][VERCEL] INVALID key:${key} deleting rejected snapshot`)
      await cache.delete(key)
    }

    return null
  },

  async getLastKnownGoodCache(key) {
    return readLastKnownGood(key)
  },

  async setCache(key, data, ttl) {
    if (!isCacheableCacheValue(key, data)) {
      if (isCriticalNotionCacheKey(key)) {
        const error = new Error(
          `[Cache][VERCEL] Refusing invalid Notion snapshot for key:${key}`
        )
        error.code = 'INVALID_NOTION_SNAPSHOT'
        throw error
      }
      return
    }

    await cache.set(key, data, {
      ttl: resolveCacheTtl(ttl),
      tags: ['notion'],
      name: 'notion-site-data'
    })

    if (isCriticalNotionCacheKey(key)) {
      await lastKnownGoodCache.set(key, data, {
        ttl: LAST_KNOWN_GOOD_TTL_SECONDS,
        tags: ['notion-last-known-good'],
        name: 'notion-last-known-good'
      })
    }
  },

  async delCache(key) {
    // Normal invalidation removes the current snapshot only. The validated
    // fallback is intentionally retained until a newer successful refresh
    // replaces it.
    await cache.delete(key)
  }
}

export default VercelCache
