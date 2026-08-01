const mockRuntimeCache = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
}

jest.mock('@vercel/functions', () => ({
  getCache: jest.fn(() => mockRuntimeCache)
}))

import VercelCache, { resolveCacheTtl } from '@/lib/cache/vercel_cache'

describe('Vercel Notion runtime cache', () => {
  beforeEach(() => {
    mockRuntimeCache.get.mockReset()
    mockRuntimeCache.set.mockReset()
    mockRuntimeCache.delete.mockReset()
  })

  test.each([undefined, null, '', 0, 'invalid'])(
    'uses a finite default TTL for %p',
    value => {
      const ttl = resolveCacheTtl(value)
      const revalidateSeconds = Number(
        require('@/blog.config').NEXT_REVALIDATE_SECOND
      )
      expect(Number.isFinite(ttl)).toBe(true)
      expect(ttl).toBeGreaterThan(0)
      if (revalidateSeconds > 1) {
        expect(ttl).toBeLessThan(revalidateSeconds)
      } else {
        expect(ttl).toBe(1)
      }
    }
  )

  test('does not forward a null TTL to Vercel Runtime Cache', async () => {
    await VercelCache.setCache('global_data_zh-CN_test', { posts: [] }, null)

    expect(mockRuntimeCache.set).toHaveBeenCalledWith(
      'global_data_zh-CN_test',
      { posts: [] },
      expect.objectContaining({
        ttl: expect.any(Number),
        tags: ['notion']
      })
    )
    expect(mockRuntimeCache.set.mock.calls[0][2].ttl).toBeGreaterThan(0)
  })

  test('preserves an explicit positive TTL', () => {
    expect(resolveCacheTtl(30)).toBe(30)
    expect(resolveCacheTtl('15')).toBe(15)
  })
})
