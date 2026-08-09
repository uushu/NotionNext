const mockVercelCache = {
  getCache: jest.fn(),
  getLastKnownGoodCache: jest.fn(),
  setCache: jest.fn(),
  delCache: jest.fn()
}

const mockMemoryCache = {
  getCache: jest.fn(),
  setCache: jest.fn(),
  delCache: jest.fn()
}

jest.mock('@/blog.config', () => ({
  ENABLE_CACHE: true,
  REDIS_URL: '',
  NEXT_REVALIDATE_SECOND: 60
}))

jest.mock('@/lib/cache/vercel_cache', () => ({
  __esModule: true,
  default: mockVercelCache
}))

jest.mock('@/lib/cache/memory_cache', () => ({
  __esModule: true,
  default: mockMemoryCache
}))

jest.mock('@/lib/cache/local_file_cache', () => ({
  __esModule: true,
  default: mockMemoryCache
}))

jest.mock('@/lib/cache/redis_cache', () => ({
  __esModule: true,
  default: mockMemoryCache
}))

process.env.VERCEL_ENV = 'production'

const { getOrSetDataWithCache } = require('@/lib/cache/cache_manager')

function createSnapshot(title) {
  return {
    siteInfo: { title: 'Utto Blog' },
    allPages: [
      {
        id: 'post-1',
        title,
        slug: 'article/test',
        type: 'Post',
        status: 'Published'
      }
    ]
  }
}

describe('last-known-good source recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVercelCache.getCache.mockResolvedValue(null)
    mockMemoryCache.getCache.mockResolvedValue(null)
  })

  test('fetches Notion after a normal runtime cache miss', async () => {
    const fresh = createSnapshot('Fresh')
    const source = jest.fn().mockResolvedValue(fresh)
    mockVercelCache.getLastKnownGoodCache.mockResolvedValue(
      createSnapshot('Old')
    )

    await expect(
      getOrSetDataWithCache('global_data_zh-CN_root', source)
    ).resolves.toEqual(fresh)

    expect(source).toHaveBeenCalledTimes(1)
    expect(mockVercelCache.getLastKnownGoodCache).not.toHaveBeenCalled()
    expect(mockVercelCache.setCache).toHaveBeenCalledWith(
      'global_data_zh-CN_root',
      fresh,
      null
    )
  })

  test('falls back only after the Notion source request fails', async () => {
    const fallback = createSnapshot('Last known good')
    const sourceError = new Error('Notion 503')
    mockVercelCache.getLastKnownGoodCache.mockResolvedValue(fallback)

    await expect(
      getOrSetDataWithCache(
        'global_data_zh-CN_source-error',
        jest.fn().mockRejectedValue(sourceError)
      )
    ).resolves.toEqual(fallback)

    expect(mockVercelCache.getLastKnownGoodCache).toHaveBeenCalledWith(
      'global_data_zh-CN_source-error'
    )
    expect(mockVercelCache.setCache).not.toHaveBeenCalled()
  })

  test('falls back when Notion returns an invalid critical snapshot', async () => {
    const fallback = createSnapshot('Last known good')
    mockVercelCache.getLastKnownGoodCache.mockResolvedValue(fallback)

    await expect(
      getOrSetDataWithCache(
        'global_data_zh-CN_invalid-source',
        jest.fn().mockResolvedValue({})
      )
    ).resolves.toEqual(fallback)

    expect(mockVercelCache.getLastKnownGoodCache).toHaveBeenCalledTimes(1)
    expect(mockVercelCache.setCache).not.toHaveBeenCalled()
  })
})
