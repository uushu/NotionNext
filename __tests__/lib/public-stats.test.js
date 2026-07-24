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
})
