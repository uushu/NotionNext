import { getCache } from '@vercel/functions'
import BLOG from '@/blog.config'

// Runtime Cache is shared across deployments. Namespace entries by Git commit so
// a newly deployed config cannot reuse stale site metadata from an older build.
// main and v1 still share entries when they point at the same commit.
const cache = getCache({
  namespace: `notion:${process.env.VERCEL_GIT_COMMIT_SHA || 'local'}`
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

export function resolveCacheTtl(ttl) {
  const seconds = Number(ttl)
  return Number.isFinite(seconds) && seconds > 0
    ? Math.floor(seconds)
    : defaultCacheTime
}

const VercelCache = {
  async getCache(key) {
    const data = await cache.get(key)
    return data || null
  },

  async setCache(key, data, ttl) {
    await cache.set(key, data, {
      ttl: resolveCacheTtl(ttl),
      tags: ['notion'],
      name: 'notion-site-data'
    })
  },

  async delCache(key) {
    await cache.delete(key)
  }
}

export default VercelCache
