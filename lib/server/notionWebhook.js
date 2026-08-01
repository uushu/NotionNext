import BLOG from '@/blog.config'
import {
  delCacheData,
  getDataFromCache,
  setDataToCache
} from '@/lib/cache/cache_manager'
import {
  fetchGlobalAllData,
  getGlobalDataCacheKey,
  getSiteDataCacheKey
} from '@/lib/db/SiteDataApi'
import { getPageBlockCacheKey } from '@/lib/db/notion/getPostBlocks'
import { markContributionCacheDirty } from '@/lib/server/claude/contributionStore'
import {
  getAffectedRevalidationPaths,
  normalizeNotionId
} from '@/lib/server/notionWebhookUtils'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'

const WEBHOOK_EVENT_CACHE_SECONDS = 7 * 24 * 60 * 60

function getRootSiteIds(pageId = BLOG.NOTION_PAGE_ID) {
  return String(pageId || '')
    .split(',')
    .map(value => extractLangId(value.trim()))
    .filter(Boolean)
}

function getConfiguredLocales(pageId = BLOG.NOTION_PAGE_ID) {
  const locales = new Set(['default', BLOG.LANG])
  String(pageId || '')
    .split(',')
    .map(value => extractLangPrefix(value.trim()))
    .filter(Boolean)
    .forEach(locale => locales.add(locale))
  return Array.from(locales).filter(Boolean)
}

function findPageById(allPages, pageId) {
  const normalizedPageId = normalizeNotionId(pageId)
  return (Array.isArray(allPages) ? allPages : []).find(
    page => normalizeNotionId(page?.id) === normalizedPageId
  )
}

function getEventCacheKey(eventId) {
  return `notion_webhook_event_${String(eventId || '').replace(
    /[^a-z0-9_-]/gi,
    '_'
  )}`
}

export async function markNotionWebhookEventProcessed(eventId) {
  await setDataToCache(
    getEventCacheKey(eventId),
    { processedAt: new Date().toISOString() },
    WEBHOOK_EVENT_CACHE_SECONDS
  )
}

export async function invalidateNotionContentCaches({
  entityId,
  previousPost,
  pageId = BLOG.NOTION_PAGE_ID
} = {}) {
  const keys = new Set()
  const locales = getConfiguredLocales(pageId)
  const rootSiteIds = getRootSiteIds(pageId)

  ;[pageId, ...rootSiteIds].forEach(id => {
    locales.forEach(locale => {
      keys.add(getGlobalDataCacheKey({ pageId: id, locale }))
    })
  })

  rootSiteIds.forEach(id => {
    keys.add(getSiteDataCacheKey(id))
    keys.add(getPageBlockCacheKey(id))
  })

  if (entityId) keys.add(getPageBlockCacheKey(entityId))
  if (previousPost?.id) {
    keys.add(getPageBlockCacheKey(previousPost.id))
    if (previousPost.lastEditedDate) {
      keys.add(
        getPageBlockCacheKey(previousPost.id, previousPost.lastEditedDate)
      )
    }
  }

  await Promise.all(Array.from(keys).map(key => delCacheData(key)))
  return Array.from(keys)
}

export async function processNotionWebhookEvent(event) {
  const eventId = String(event?.id || '').trim()
  const entityId = event?.entity?.id
  if (!eventId || !entityId) {
    throw new Error('Invalid Notion webhook event: missing id or entity.id')
  }

  const eventCacheKey = getEventCacheKey(eventId)
  const processedEvent = await getDataFromCache(eventCacheKey, true)
  if (processedEvent) {
    return { duplicate: true, eventId, paths: [] }
  }

  const previousData = await fetchGlobalAllData({
    from: 'notion-webhook-before'
  })
  const previousPost = findPageById(previousData?.allPages, entityId)

  const invalidatedKeys = await invalidateNotionContentCaches({
    entityId,
    previousPost
  })

  const currentData = await fetchGlobalAllData({
    from: 'notion-webhook-after'
  })
  const currentPost = findPageById(currentData?.allPages, entityId)
  const paths = getAffectedRevalidationPaths({ previousPost, currentPost })

  markContributionCacheDirty()

  return {
    duplicate: false,
    eventId,
    entityId: normalizeNotionId(entityId),
    previousPost,
    currentPost,
    invalidatedKeys,
    paths
  }
}
