import counter from '@/lib/plugins/busuanzi'

const renderCounterDom = () => {
  document.body.innerHTML = `
    <span class="busuanzi_container_site_pv" style="display:none">
      <span class="busuanzi_value_site_pv">--</span>
    </span>
    <span class="busuanzi_container_site_uv" style="display:none">
      <span class="busuanzi_value_site_uv">--</span>
    </span>
    <span class="busuanzi_container_page_pv" style="display:none">
      <span class="busuanzi_value_page_pv">--</span>
    </span>
  `
}

describe('public visitor statistics', () => {
  const pageUrl = 'https://www.yyshow.xyz/article/test'

  beforeEach(() => {
    counter.cancel()
    window.localStorage.clear()
    document.cookie = 'vercount_uv_localhost=; path=/; max-age=0'
    renderCounterDom()
  })

  afterEach(() => {
    counter.cancel()
  })

  test('validates counter responses', () => {
    expect(
      counter.extractCounterData({
        status: 'success',
        data: { site_pv: '120', page_pv: 8, site_uv: 42 }
      })
    ).toEqual({ site_pv: 120, page_pv: 8, site_uv: 42 })

    expect(
      counter.extractCounterData({
        status: 'success',
        data: { site_pv: 120, page_pv: 'invalid', site_uv: 42 }
      })
    ).toBeNull()

    expect(
      counter.extractCounterData({
        status: 'success',
        data: { site_pv: 120, page_pv: null, site_uv: 42 }
      })
    ).toBeNull()
  })

  test('renders fresh data and stores it by page', async () => {
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        data: { site_pv: 321, page_pv: 12, site_uv: 123 }
      })
    })

    await counter.fetch({ url: pageUrl })

    expect(document.querySelector('.busuanzi_value_site_pv')).toHaveTextContent(
      '321'
    )
    expect(document.querySelector('.busuanzi_value_site_uv')).toHaveTextContent(
      '123'
    )
    expect(document.querySelector('.busuanzi_value_page_pv')).toHaveTextContent(
      '12'
    )
    expect(document.querySelector('.busuanzi_container_site_pv')).toHaveStyle(
      'display: inline'
    )

    const cached = JSON.parse(window.localStorage.getItem(counter.CACHE_KEY))
    expect(cached.pages['www.yyshow.xyz/article/test'].page_pv).toBe(12)
  })

  test('uses one canonical counter for tracking parameters and fragments', async () => {
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        data: { site_pv: 322, page_pv: 13, site_uv: 124 }
      })
    })

    await counter.fetch({ url: `${pageUrl}?utm_source=juejin#comments` })

    const request = window.fetch.mock.calls[0][1]
    expect(JSON.parse(request.body).url).toBe(pageUrl)

    const cached = JSON.parse(window.localStorage.getItem(counter.CACHE_KEY))
    expect(Object.keys(cached.pages)).toEqual([
      'www.yyshow.xyz/article/test'
    ])
  })

  test('sets the UV cookie only after the counter accepts the visit', async () => {
    window.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          data: { site_pv: 323, page_pv: 14, site_uv: 125 }
        })
      })

    await counter.fetch({ url: pageUrl })
    expect(document.cookie).not.toContain('vercount_uv_localhost=1')

    await counter.fetch({ url: pageUrl })
    expect(document.cookie).toContain('vercount_uv_localhost=1')
  })

  test('keeps the last successful values visible when the service fails', async () => {
    window.localStorage.setItem(
      counter.CACHE_KEY,
      JSON.stringify({
        site_pv: 300,
        site_uv: 100,
        pages: {
          'www.yyshow.xyz/article/test': {
            page_pv: 10,
            updated_at: Date.now()
          }
        }
      })
    )
    window.fetch = jest.fn().mockRejectedValue(new Error('network error'))

    await counter.fetch({ url: pageUrl })

    expect(document.querySelector('.busuanzi_value_site_pv')).toHaveTextContent(
      '300'
    )
    expect(document.querySelector('.busuanzi_value_site_uv')).toHaveTextContent(
      '100'
    )
    expect(document.querySelector('.busuanzi_value_page_pv')).toHaveTextContent(
      '10'
    )
    expect(
      document.querySelector('.busuanzi_container_site_pv')
    ).toHaveAttribute('data-counter-state', 'cached')
  })

  test('keeps icons and placeholders visible without cached data', async () => {
    window.fetch = jest.fn().mockRejectedValue(new Error('network error'))

    await counter.fetch({ url: pageUrl })

    expect(document.querySelector('.busuanzi_container_site_pv')).toHaveStyle(
      'display: inline'
    )
    expect(document.querySelector('.busuanzi_value_site_pv')).toHaveTextContent(
      '--'
    )
    expect(
      document.querySelector('.busuanzi_container_site_pv')
    ).toHaveAttribute('data-counter-state', 'unavailable')
  })

  test('reads article popularity without recording another page view', async () => {
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        data: { site_pv: 400, page_pv: 28, site_uv: 160 }
      })
    })

    const counts = await counter.read({ url: pageUrl })

    expect(counts).toEqual({ site_pv: 400, page_pv: 28, site_uv: 160 })
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`?url=${encodeURIComponent(pageUrl)}`),
      expect.objectContaining({ method: 'GET' })
    )
    expect(document.querySelector('.busuanzi_value_page_pv')).toHaveTextContent(
      '--'
    )
  })

  test('reuses cached popularity instead of querying the service again', async () => {
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        data: { site_pv: 500, page_pv: 35, site_uv: 200 }
      })
    })

    await counter.read({ url: pageUrl })
    const cachedCounts = await counter.read({ url: pageUrl })

    expect(cachedCounts.page_pv).toBe(35)
    expect(window.fetch).toHaveBeenCalledTimes(1)
  })

  test('does not treat site totals as an article popularity value', async () => {
    window.localStorage.setItem(
      counter.CACHE_KEY,
      JSON.stringify({
        site_pv: 500,
        site_uv: 200,
        pages: {}
      })
    )
    window.fetch = jest.fn().mockRejectedValue(new Error('network error'))

    await expect(counter.read({ url: pageUrl })).resolves.toBeNull()
  })
})
