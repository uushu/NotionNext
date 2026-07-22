import { getCache } from '@vercel/functions'
import BLOG from '@/blog.config'

const cache = getCache()
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
