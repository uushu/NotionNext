import {
  assertCacheableSourceValue,
  isCacheableCacheValue,
  isCriticalNotionCacheKey,
  isValidCriticalNotionSnapshot
} from '@/lib/cache/cache_validation'

function createValidGlobalSnapshot(overrides = {}) {
  return {
    siteInfo: { title: 'Utto Blog' },
    allPages: [
      {
        id: 'post-1',
        title: 'Test',
        slug: 'article/test',
        type: 'Post',
        status: 'Published'
      }
    ],
    ...overrides
  }
}

describe('critical Notion cache validation', () => {
  test.each([
    'site_root-page',
    'global_data_zh-CN_root-page',
    'global_data_default_root-page'
  ])('recognizes %s as a critical cache key', key => {
    expect(isCriticalNotionCacheKey(key)).toBe(true)
  })

  test('does not apply site validation to ordinary page-block caches', () => {
    expect(isCriticalNotionCacheKey('page_block_post-1')).toBe(false)
    expect(
      isCacheableCacheValue('page_block_post-1', {
        block: { 'post-1': { value: { id: 'post-1' } } }
      })
    ).toBe(true)
  })

  test.each([
    null,
    undefined,
    {},
    { siteInfo: { title: 'Utto Blog' } },
    { siteInfo: {}, allPages: [] }
  ])('rejects incomplete global snapshots: %p', value => {
    expect(
      isValidCriticalNotionSnapshot('global_data_zh-CN_root', value)
    ).toBe(false)
  })

  test('rejects the built-in Notion failure placeholder', () => {
    const snapshot = createValidGlobalSnapshot({
      allPages: [
        {
          id: 1,
          title: '无法获取Notion数据，请检查Notion_ID',
          slug: 'oops',
          type: 'Post',
          status: 'Published'
        }
      ]
    })

    expect(
      isValidCriticalNotionSnapshot('global_data_zh-CN_root', snapshot)
    ).toBe(false)
  })

  test('accepts a valid global snapshot', () => {
    expect(
      isValidCriticalNotionSnapshot(
        'global_data_zh-CN_root',
        createValidGlobalSnapshot()
      )
    ).toBe(true)
  })

  test('accepts an empty but structurally valid global blog', () => {
    expect(
      isValidCriticalNotionSnapshot(
        'global_data_zh-CN_root',
        createValidGlobalSnapshot({ allPages: [] })
      )
    ).toBe(true)
  })

  test('requires collection identity or content for untrimmed site data', () => {
    expect(
      isValidCriticalNotionSnapshot('site_root', {
        siteInfo: { title: 'Utto Blog' },
        allPages: []
      })
    ).toBe(false)

    expect(
      isValidCriticalNotionSnapshot('site_root', {
        siteInfo: { title: 'Utto Blog' },
        allPages: [],
        collectionId: 'collection-1'
      })
    ).toBe(true)
  })

  test('throws before an invalid critical source result can be cached', () => {
    expect(() =>
      assertCacheableSourceValue('global_data_zh-CN_root', {})
    ).toThrow(
      expect.objectContaining({ code: 'INVALID_NOTION_SNAPSHOT' })
    )
  })

  test('passes valid critical source data through unchanged', () => {
    const snapshot = createValidGlobalSnapshot()
    expect(
      assertCacheableSourceValue('global_data_zh-CN_root', snapshot)
    ).toBe(snapshot)
  })
})
