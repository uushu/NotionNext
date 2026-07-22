import { getCache } from '@vercel/functions'
import BLOG from '@/blog.config'

// Runtime Cache is shared across deployments. Namespace entries by Git commit so
// a newly deployed config cannot reuse stale site metadata from an older build.
// main and v1 still share entries when they point at the same commit.
const cache = getCache({
  namespace: `notion:${process.env.VERCEL_GIT_COMMIT_SHA || 'local'}`
})
const defaultCacheTime = Math.max(
  60,
  Number(BLOG.NEXT_REVALIDATE_SECOND) || 60
)

const VercelCache = {
  async getCache(key) {
    const data = await cache.get(key)
    return data || null
  },

  async setCache(key, data, ttl = defaultCacheTime) {
    await cache.set(key, data, {
      ttl,
      tags: ['notion'],
      name: 'notion-site-data'
    })
  },

  async delCache(key) {
    await cache.delete(key)
  }
}

export default VercelCache
