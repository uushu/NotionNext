const mockFetchNotionPageBlocks = jest.fn()

jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  fetchNotionPageBlocks: (...args) => mockFetchNotionPageBlocks(...args)
}))

import {
  fetchConfigPageData,
  getConfigMapFromConfigPage
} from '@/lib/db/notion/getNotionConfig'

describe('Notion config fallback', () => {
  beforeEach(() => {
    mockFetchNotionPageBlocks.mockReset()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns null instead of throwing when Notion returns empty block maps', async () => {
    mockFetchNotionPageBlocks.mockResolvedValue(null)

    await expect(fetchConfigPageData('config-page')).resolves.toBeNull()
    expect(mockFetchNotionPageBlocks).toHaveBeenCalledTimes(3)
  })

  it('matches the config page block even when Notion changes UUID formatting', async () => {
    const configPageId = '21c560c4-88bc-83fa-a781-0121c9e52e28'
    const normalizedId = configPageId.replace(/-/g, '')
    const pageRecordMap = {
      block: {
        [normalizedId]: {
          value: {
            id: configPageId,
            type: 'page',
            content: ['config-table-id']
          }
        }
      }
    }
    mockFetchNotionPageBlocks.mockResolvedValue(pageRecordMap)

    await expect(fetchConfigPageData(configPageId)).resolves.toEqual({
      pageRecordMap,
      content: ['config-table-id']
    })
    expect(mockFetchNotionPageBlocks).toHaveBeenCalledTimes(1)
  })

  it('falls back to repository defaults when the config page request fails', async () => {
    mockFetchNotionPageBlocks.mockRejectedValue(new Error('Notion unavailable'))

    await expect(
      getConfigMapFromConfigPage([
        { id: 'config-page', type: 'Config', title: '配置中心' }
      ])
    ).resolves.toBeNull()
  })
})
