const API_URL = 'https://events.vercount.one/api/v2/log'
const CACHE_KEY = 'notion-next:public-stats:v1'
const LEGACY_CACHE_KEY = 'visitorCountData'
const REQUEST_TIMEOUT = 5000
const UV_COOKIE_PREFIX = 'vercount_uv_'
const UV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const COUNTER_KEYS = ['site_pv', 'page_pv', 'site_uv']
const MAX_CACHED_PAGES = 100

let activeController = null
let requestSequence = 0

const normalizeCount = value => {
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) return null
  return Math.trunc(count)
}

const extractCounterData = response => {
  const source = response?.data || response
  const data = {}

  for (const key of COUNTER_KEYS) {
    const count = normalizeCount(source?.[key])
    if (count === null) return null
    data[key] = count
  }

  return data
}

const getCurrentUrl = url => {
  if (url) return String(url)
  if (typeof window === 'undefined') return ''
  return window.location.href
}

const getPageKey = url => {
  try {
    const parsed = new URL(getCurrentUrl(url))
    return `${parsed.host}${parsed.pathname}${parsed.search}`
  } catch {
    return getCurrentUrl(url)
  }
}

const readJson = key => {
  if (typeof window === 'undefined') return null

  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const readCache = url => {
  const cached = readJson(CACHE_KEY)
  if (cached) return cached

  const legacy = extractCounterData(readJson(LEGACY_CACHE_KEY))
  if (!legacy) return null

  return {
    site_pv: legacy.site_pv,
    site_uv: legacy.site_uv,
    pages: {
      [getPageKey(url)]: {
        page_pv: legacy.page_pv,
        updated_at: Date.now()
      }
    },
    updated_at: Date.now()
  }
}

const writeCache = (data, url) => {
  if (typeof window === 'undefined') return

  const previous = readCache(url) || {}
  const pageKey = getPageKey(url)
  const pages = {
    ...(previous.pages || {}),
    [pageKey]: {
      page_pv: data.page_pv,
      updated_at: Date.now()
    }
  }

  const recentPages = Object.fromEntries(
    Object.entries(pages)
      .sort(([, a], [, b]) => (b.updated_at || 0) - (a.updated_at || 0))
      .slice(0, MAX_CACHED_PAGES)
  )

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        site_pv: data.site_pv,
        site_uv: data.site_uv,
        pages: recentPages,
        updated_at: Date.now()
      })
    )
  } catch {
    // localStorage may be disabled or full. Fresh data can still be rendered.
  }
}

const setContainerState = state => {
  for (const key of COUNTER_KEYS) {
    const elements = document.getElementsByClassName(
      `busuanzi_container_${key}`
    )
    for (const element of elements) {
      element.style.display = 'inline'
      element.dataset.counterState = state
      element.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false')
    }
  }
}

const renderCounts = (data, state = 'fresh') => {
  if (typeof document === 'undefined') return

  for (const key of COUNTER_KEYS) {
    const count = normalizeCount(data?.[key])
    if (count === null) continue

    const elements = document.getElementsByClassName(`busuanzi_value_${key}`)
    for (const element of elements) {
      element.textContent = String(count)
    }
  }

  setContainerState(state)
}

const getCachedCounts = url => {
  const cached = readCache(url)
  if (!cached) return null

  const page = cached.pages?.[getPageKey(url)]
  const counts = {
    site_pv: normalizeCount(cached.site_pv),
    site_uv: normalizeCount(cached.site_uv),
    page_pv: normalizeCount(page?.page_pv)
  }

  return COUNTER_KEYS.some(key => counts[key] !== null) ? counts : null
}

const renderCached = url => {
  if (typeof document === 'undefined') return false

  const cached = getCachedCounts(url)
  if (cached) {
    renderCounts(cached, 'cached')
    return true
  }

  setContainerState('loading')
  return false
}

const getUvCookieName = () => {
  const host =
    typeof window === 'undefined' ? 'unknown-host' : window.location.host
  return `${UV_COOKIE_PREFIX}${host.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

const hasUvCookie = () => {
  if (typeof document === 'undefined') return true
  const name = getUvCookieName()
  return document.cookie.split('; ').some(entry => entry.startsWith(`${name}=`))
}

const setUvCookie = () => {
  if (typeof document === 'undefined') return
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; secure'
      : ''
  document.cookie = `${getUvCookieName()}=1; path=/; max-age=${UV_COOKIE_MAX_AGE}; samesite=lax${secure}`
}

const fetch = async ({ url, requestTimeout = REQUEST_TIMEOUT } = {}) => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return null
  }

  const currentUrl = getCurrentUrl(url)
  if (!currentUrl.startsWith('http')) {
    renderCached(currentUrl)
    return null
  }

  renderCached(currentUrl)

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  const currentRequest = ++requestSequence
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeout)
  const isNewUv = !hasUvCookie()

  if (isNewUv) {
    setUvCookie()
  }

  try {
    const response = await window.fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: currentUrl,
        isNewUv
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`Vercount request failed with HTTP ${response.status}`)
    }

    const data = extractCounterData(await response.json())
    if (!data) {
      throw new Error('Vercount returned invalid counter data')
    }

    if (currentRequest === requestSequence) {
      writeCache(data, currentUrl)
      renderCounts(data, 'fresh')
    }

    return data
  } catch (error) {
    if (currentRequest === requestSequence) {
      setContainerState(renderCached(currentUrl) ? 'cached' : 'unavailable')
    }
    return null
  } finally {
    window.clearTimeout(timeoutId)
    if (activeController === controller) {
      activeController = null
    }
  }
}

const cancel = () => {
  requestSequence += 1
  activeController?.abort()
  activeController = null
}

module.exports = {
  fetch,
  cancel,
  renderCached,
  extractCounterData,
  CACHE_KEY
}
