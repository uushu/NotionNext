const CRITICAL_NOTION_CACHE_PREFIXES = ['site_', 'global_data_']

export function isCriticalNotionCacheKey(key) {
  const normalizedKey = String(key || '')
  return CRITICAL_NOTION_CACHE_PREFIXES.some(prefix =>
    normalizedKey.startsWith(prefix)
  )
}

function isFailurePlaceholderPage(page) {
  if (!page || typeof page !== 'object') return false

  return (
    page.slug === 'oops' ||
    (typeof page.title === 'string' &&
      page.title.includes('无法获取Notion数据'))
  )
}

export function isValidCriticalNotionSnapshot(key, data) {
  if (!isCriticalNotionCacheKey(key)) return true
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  if (!Array.isArray(data.allPages)) return false
  if (data.allPages.some(isFailurePlaceholderPage)) return false

  const title = data.siteInfo?.title
  if (typeof title !== 'string' || !title.trim()) return false

  if (String(key).startsWith('site_')) {
    const hasCollectionIdentity =
      typeof data.collectionId === 'string' && data.collectionId.trim().length > 0
    const hasContent = data.allPages.length > 0
    if (!hasCollectionIdentity && !hasContent) return false
  }

  return true
}

export function isCacheableCacheValue(key, data) {
  if (data == null) return false
  if (Array.isArray(data)) return data.length > 0
  return isValidCriticalNotionSnapshot(key, data)
}

export function assertCacheableSourceValue(key, data) {
  if (
    isCriticalNotionCacheKey(key) &&
    !isCacheableCacheValue(key, data)
  ) {
    const error = new Error(
      `[Cache] Refusing invalid Notion snapshot for key:${key}`
    )
    error.code = 'INVALID_NOTION_SNAPSHOT'
    throw error
  }

  return data
}
