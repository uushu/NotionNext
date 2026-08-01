const mockDelCacheData = jest.fn()
const mockGetDataFromCache = jest.fn()
const mockSetDataToCache = jest.fn()
const mockFetchGlobalAllData = jest.fn()
const mockMarkContributionCacheDirty = jest.fn()

jest.mock('@/blog.config', () => ({
  NOTION_PAGE_ID: 'zh:root-page-id',
  LANG: 'zh-CN'
}))

jest.mock('@/lib/cache/cache_manager', () => ({
  delCacheData: (...args) => mockDelCacheData(...args),
  getDataFromCache: (...args) => mockGetDataFromCache(...args),
  setDataToCache: (...args) => mockSetDataToCache(...args)
}))

jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: (...args) => mockFetchGlobalAllData(...args),
  getGlobalDataCacheKey: ({ pageId, locale }) =>
    `global_data_${locale}_${pageId}`,
  getSiteDataCacheKey: pageId => `site_${pageId}`
}))

jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  getPageBlockCacheKey: (id, version) =>
    version
      ? `page_block_${id}_${new Date(version).getTime()}`
      : `page_block_${id}`
}))

jest.mock('@/lib/server/claude/contributionStore', () => ({
  markContributionCacheDirty: () => mockMarkContributionCacheDirty()
}))

jest.mock('@/lib/utils/pageId', () => ({
  extractLangId: value => String(value).split(':').pop(),
  extractLangPrefix: value =>
    String(value).includes(':') ? String(value).split(':')[0] : ''
}))

import {
  markNotionWebhookEventProcessed,
  processNotionWebhookEvent
} from '@/lib/server/notionWebhook'

describe('Notion webhook processing orchestration', () => {
  beforeEach(() => {
    mockDelCacheData.mockResolvedValue(undefined)
    mockGetDataFromCache.mockResolvedValue(null)
    mockSetDataToCache.mockResolvedValue(undefined)
    mockMarkContributionCacheDirty.mockReset()
  })

  it('invalidates old metadata and block keys before loading the new route', async () => {
    const previousPost = {
      id: 'page-1',
      slug: 'article/old',
      category: '学习笔记',
      lastEditedDate: '2026-08-01T10:00:00.000Z'
    }
    const currentPost = {
      ...previousPost,
      slug: 'article/new',
      lastEditedDate: '2026-08-02T10:00:00.000Z'
    }
    mockFetchGlobalAllData
      .mockResolvedValueOnce({ allPages: [previousPost] })
      .mockResolvedValueOnce({ allPages: [currentPost] })

    const result = await processNotionWebhookEvent({
      id: 'event-1',
      type: 'page.properties_updated',
      entity: { id: 'page-1', type: 'page' }
    })

    expect(mockFetchGlobalAllData).toHaveBeenNthCalledWith(1, {
      from: 'notion-webhook-before'
    })
    expect(mockFetchGlobalAllData).toHaveBeenNthCalledWith(2, {
      from: 'notion-webhook-after'
    })
    expect(mockDelCacheData).toHaveBeenCalledWith('site_root-page-id')
    expect(mockDelCacheData).toHaveBeenCalledWith(
      `page_block_page-1_${Date.parse(previousPost.lastEditedDate)}`
    )
    expect(mockDelCacheData.mock.invocationCallOrder[0]).toBeLessThan(
      mockFetchGlobalAllData.mock.invocationCallOrder[1]
    )
    expect(mockMarkContributionCacheDirty).toHaveBeenCalledTimes(1)
    expect(result.paths).toEqual(
      expect.arrayContaining(['/article/old', '/article/new'])
    )
    expect(mockSetDataToCache).not.toHaveBeenCalled()
  })

  it('skips duplicate deliveries before touching Notion or page caches', async () => {
    mockGetDataFromCache.mockResolvedValue({ processedAt: '2026-08-02' })

    const result = await processNotionWebhookEvent({
      id: 'event-duplicate',
      type: 'page.content_updated',
      entity: { id: 'page-1', type: 'page' }
    })

    expect(result).toMatchObject({
      duplicate: true,
      eventId: 'event-duplicate'
    })
    expect(mockFetchGlobalAllData).not.toHaveBeenCalled()
    expect(mockDelCacheData).not.toHaveBeenCalled()
  })

  it('stores a successful event marker with a multi-day TTL', async () => {
    await markNotionWebhookEventProcessed('event-1')

    expect(mockSetDataToCache).toHaveBeenCalledWith(
      'notion_webhook_event_event-1',
      expect.objectContaining({ processedAt: expect.any(String) }),
      expect.any(Number)
    )
    expect(mockSetDataToCache.mock.calls[0][2]).toBeGreaterThanOrEqual(86400)
  })
})
