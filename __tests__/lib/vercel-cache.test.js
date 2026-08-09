jest.mock('@vercel/functions', () => {
  const runtimeCache = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }
  const lastKnownGoodCache = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }

  global.__mockVercelRuntimeCache = runtimeCache
  global.__mockVercelLastKnownGoodCache = lastKnownGoodCache

  return {
    getCache: jest.fn(({ namespace }) =>
      namespace === 'notion:last-known-good'
        ? lastKnownGoodCache
        : runtimeCache
    )
  }
})

import VercelCache, {
  LAST_KNOWN_GOOD_TTL_SECONDS,
  resolveCacheTtl
} from '@/lib/cache/vercel_cache'

const mockRuntimeCache = global.__mockVercelRuntimeCache
const mockLastKnownGoodCache = global.__mockVercelLastKnownGoodCache

function createValidSnapshot() {
  return {
    siteInfo: { title: 'Utto Blog' },
    allPages: [
      {
        id: 'post-1',
        slug: 'article/test',
        title: 'Test',
        type: 'Post',
        status: 'Published'
      }
    ]
  }
}

describe('Vercel Notion runtime cache', () => {
  beforeEach(() => {
    for (const cache of [mockRuntimeCache, mockLastKnownGoodCache]) {
      cache.get.mockReset()
      cache.set.mockReset()
      cache.delete.mockReset()
    }
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
    const snapshot = createValidSnapshot()

    await VercelCache.setCache('global_data_zh-CN_test', snapshot, null)

    expect(mockRuntimeCache.set).toHaveBeenCalledWith(
      'global_data_zh-CN_test',
      snapshot,
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

  test('stores validated site data in the deployment and stable caches', async () => {
    const snapshot = createValidSnapshot()

    await VercelCache.setCache('global_data_zh-CN_test', snapshot, 30)

    expect(mockRuntimeCache.set).toHaveBeenCalledTimes(1)
    expect(mockLastKnownGoodCache.set).toHaveBeenCalledWith(
      'global_data_zh-CN_test',
      snapshot,
      expect.objectContaining({
        ttl: LAST_KNOWN_GOOD_TTL_SECONDS,
        tags: ['notion-last-known-good']
      })
    )
  })

  test('does not treat the last-known-good snapshot as a normal cache hit', async () => {
    const snapshot = createValidSnapshot()
    mockRuntimeCache.get.mockResolvedValue(null)
    mockLastKnownGoodCache.get.mockResolvedValue(snapshot)

    await expect(
      VercelCache.getCache('global_data_zh-CN_test')
    ).resolves.toBeNull()
    expect(mockLastKnownGoodCache.get).not.toHaveBeenCalled()
  })

  test('reads the last-known-good snapshot only when explicitly requested', async () => {
    const snapshot = createValidSnapshot()
    mockLastKnownGoodCache.get.mockResolvedValue(snapshot)

    await expect(
      VercelCache.getLastKnownGoodCache('global_data_zh-CN_test')
    ).resolves.toEqual(snapshot)
  })

  test('deletes an invalid deployment snapshot before using the fallback', async () => {
    const snapshot = createValidSnapshot()
    mockRuntimeCache.get.mockResolvedValue({})
    mockLastKnownGoodCache.get.mockResolvedValue(snapshot)

    await expect(
      VercelCache.getCache('global_data_zh-CN_test')
    ).resolves.toBeNull()
    expect(mockRuntimeCache.delete).toHaveBeenCalledWith(
      'global_data_zh-CN_test'
    )
    expect(mockLastKnownGoodCache.get).not.toHaveBeenCalled()
  })

  test('refuses to store invalid critical Notion snapshots', async () => {
    await expect(
      VercelCache.setCache('global_data_zh-CN_test', {}, 30)
    ).rejects.toMatchObject({ code: 'INVALID_NOTION_SNAPSHOT' })

    expect(mockRuntimeCache.set).not.toHaveBeenCalled()
    expect(mockLastKnownGoodCache.set).not.toHaveBeenCalled()
  })

  test('does not copy ordinary page-block entries into the stable cache', async () => {
    const blockMap = { block: { page: { value: { id: 'page' } } } }

    await VercelCache.setCache('page_block_page', blockMap, 30)

    expect(mockRuntimeCache.set).toHaveBeenCalledTimes(1)
    expect(mockLastKnownGoodCache.set).not.toHaveBeenCalled()
  })
})
