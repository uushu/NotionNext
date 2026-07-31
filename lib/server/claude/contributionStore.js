import md5 from 'js-md5'
import { createClient } from '@supabase/supabase-js'

const EVENTS_TABLE = 'claude_contribution_events_v1'
const SNAPSHOTS_TABLE = 'claude_contribution_snapshots_v1'
const LOCAL_CACHE_KEY = '__claude_contribution_daily_cache_v1'
const CONTRIBUTION_TIME_ZONE = 'Asia/Shanghai'
const CONTRIBUTION_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: CONTRIBUTION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

let supabaseClient = null
let legacyCleanupPromise = null

const getSupabaseUrl = () => {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

const getSupabaseKey = () => {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  )
}

const toTimestampMs = value => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return 0
    return Math.trunc(value)
  }
  const parsed = Date.parse(String(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

const normalizeRepositoryId = value => {
  if (!value) return ''
  return String(value).replace(/-/g, '').trim().toLowerCase()
}

const normalizeText = value => {
  return typeof value === 'string' ? value : ''
}

const buildHrefFromSlug = slug => {
  const normalizedSlug = normalizeText(slug).trim()
  if (!normalizedSlug) return ''
  if (/^https?:\/\//i.test(normalizedSlug)) return normalizedSlug
  return normalizedSlug.startsWith('/') ? normalizedSlug : `/${normalizedSlug}`
}

const buildEventId = (type, repositoryId, timestampMs) => {
  return `e_${md5(`${type}|${repositoryId}|${timestampMs}`)}`
}

const chunkArray = (arr, size = 200) => {
  const list = Array.isArray(arr) ? arr : []
  const safeSize = Math.max(1, Math.min(1000, Number(size) || 200))
  const chunks = []
  for (let i = 0; i < list.length; i += safeSize) {
    chunks.push(list.slice(i, i + safeSize))
  }
  return chunks
}

const formatDayKey = date => {
  const parts = CONTRIBUTION_DAY_FORMATTER.formatToParts(date)
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const day = parts.find(part => part.type === 'day')?.value
  return year && month && day ? `${year}-${month}-${day}` : ''
}

const getTodayKey = (nowMs = Date.now()) => {
  return formatDayKey(new Date(nowMs))
}

const getYesterdayEndMs = (nowMs = Date.now()) => {
  const date = new Date(nowMs)
  date.setHours(0, 0, 0, 0)
  date.setMilliseconds(-1)
  return date.getTime()
}

const getLocalDailyCache = () => {
  if (typeof globalThis === 'undefined') {
    return { dayKey: '', events: [], updatedAtMs: 0, dirty: true }
  }

  if (!globalThis[LOCAL_CACHE_KEY]) {
    globalThis[LOCAL_CACHE_KEY] = {
      dayKey: '',
      events: [],
      updatedAtMs: 0,
      dirty: true
    }
  }
  return globalThis[LOCAL_CACHE_KEY]
}

export const markContributionCacheDirty = () => {
  const cache = getLocalDailyCache()
  cache.dirty = true
  cache.updatedAtMs = Date.now()
}

export const shouldRefreshContributionDailyCache = ({
  forceRefresh = false,
  isBuild = false,
  nowMs = Date.now()
} = {}) => {
  if (forceRefresh || isBuild) return true
  const cache = getLocalDailyCache()
  if (cache.dirty) return true
  if (!Array.isArray(cache.events)) return true
  return cache.dayKey !== getTodayKey(nowMs)
}

export const setContributionEventsToLocalCache = (
  events,
  nowMs = Date.now()
) => {
  const cache = getLocalDailyCache()
  cache.dayKey = getTodayKey(nowMs)
  cache.events = Array.isArray(events) ? events : []
  cache.updatedAtMs = nowMs
  cache.dirty = false
  return cache
}

export const getContributionEventsFromLocalCache = ({
  limit = 50000,
  allowStale = false,
  nowMs = Date.now()
} = {}) => {
  const cache = getLocalDailyCache()
  if (!Array.isArray(cache.events)) return null
  if (!allowStale) {
    if (cache.dirty) return null
    if (cache.dayKey !== getTodayKey(nowMs)) return null
  }
  const safeLimit = Math.max(1, Math.min(100000, Number(limit) || 50000))
  const events = cache.events
  if (events.length <= safeLimit) return events
  return events.slice(events.length - safeLimit)
}

export const filterContributionEventsUntilYesterday = (
  events,
  nowMs = Date.now()
) => {
  const cutoffMs = getYesterdayEndMs(nowMs)
  return (Array.isArray(events) ? events : []).filter(event => {
    const timestampMs = toTimestampMs(event?.timestampMs || event?.timestamp)
    return timestampMs > 0 && timestampMs <= cutoffMs
  })
}

const getSupabaseClient = () => {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  if (!url || !key) return null

  if (supabaseClient) return supabaseClient
  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
  return supabaseClient
}

const ensureLegacyHrefCleanup = async client => {
  if (!client) return false
  if (legacyCleanupPromise) return legacyCleanupPromise

  legacyCleanupPromise = (async () => {
    const ignoreMissingColumn = error => {
      if (!error) return false
      const code = String(error.code || '')
      const message = String(error.message || '').toLowerCase()
      return (
        code === '42703' ||
        code === 'PGRST204' ||
        (message.includes('column') && message.includes('href'))
      )
    }

    const { error: eventCleanupError } = await client
      .from(EVENTS_TABLE)
      .update({ href: '' })
      .neq('href', '')
    if (eventCleanupError && !ignoreMissingColumn(eventCleanupError)) {
      console.warn(
        `[Contrib] Supabase 清理旧 href 失败(${EVENTS_TABLE}): ${
          eventCleanupError.message ||
          eventCleanupError.code ||
          eventCleanupError
        }`
      )
    }

    const { error: snapshotCleanupError } = await client
      .from(SNAPSHOTS_TABLE)
      .update({ href: '' })
      .neq('href', '')
    if (snapshotCleanupError && !ignoreMissingColumn(snapshotCleanupError)) {
      console.warn(
        `[Contrib] Supabase 清理旧 href 失败(${SNAPSHOTS_TABLE}): ${
          snapshotCleanupError.message ||
          snapshotCleanupError.code ||
          snapshotCleanupError
        }`
      )
    }

    return true
  })()

  return legacyCleanupPromise
}

const getReadyClient = async () => {
  const client = getSupabaseClient()
  if (!client) return null
  await ensureLegacyHrefCleanup(client)
  return client
}

export const isContributionStoreEnabled = () => {
  return Boolean(getSupabaseUrl() && getSupabaseKey())
}

export const buildContributionPostSnapshot = post => {
  const repositoryId = normalizeRepositoryId(post?.id)
  if (!repositoryId) return null

  const createdAtMs = toTimestampMs(
    post?.date?.start_date ||
      post?.publishDay ||
      post?.publishDate ||
      post?.createdTime
  )
  const notionCreatedAtMs = toTimestampMs(
    post?.notionCreatedDate || post?.createdTime
  )
  const updatedAtMs =
    toTimestampMs(post?.lastEditedDate) || notionCreatedAtMs || createdAtMs

  return {
    repositoryId,
    title: normalizeText(post?.title),
    slug: normalizeText(post?.slug),
    createdAtMs,
    notionCreatedAtMs,
    updatedAtMs
  }
}

export const buildUpdateEventsFromSnapshots = (
  snapshots,
  previousSnapshots = new Map()
) => {
  const events = []

  snapshots.forEach(snapshot => {
    const prev = previousSnapshots.get(snapshot.repositoryId)

    // 首次见到当天新建的文章时只建立基线，不能把初始写入算作修改。
    // 对较早创建的存量文章，可保留其最新一次跨日修改，作为历史迁移基线。
    if (!prev) {
      const notionCreatedDay = snapshot.notionCreatedAtMs
        ? formatDayKey(new Date(snapshot.notionCreatedAtMs))
        : ''
      const updatedDay = snapshot.updatedAtMs
        ? formatDayKey(new Date(snapshot.updatedAtMs))
        : ''
      if (!notionCreatedDay || !updatedDay || updatedDay <= notionCreatedDay) {
        return
      }
    }

    const previousUpdatedAtMs = toTimestampMs(prev?.updatedAtMs)
    if (!snapshot.updatedAtMs || snapshot.updatedAtMs <= previousUpdatedAtMs) {
      return
    }

    events.push({
      event_id: buildEventId(
        'update',
        snapshot.repositoryId,
        snapshot.updatedAtMs
      ),
      event_type: 'update',
      repository_id: snapshot.repositoryId,
      timestamp_ms: snapshot.updatedAtMs,
      title: snapshot.title,
      slug: snapshot.slug
    })
  })

  return events
}

const normalizeEventType = value => (value === 'create' ? 'create' : 'update')

const normalizeRawEvent = raw => {
  if (!raw || typeof raw !== 'object') return null
  const type = normalizeEventType(raw.type)
  const repositoryId = normalizeRepositoryId(
    raw.repositoryId || raw.identifier || raw.postId
  )
  const timestampMs = toTimestampMs(
    raw.timestampMs || raw.timestamp || raw.date || raw.time
  )
  if (!repositoryId || !timestampMs) return null

  const candidateEventId = normalizeText(raw.eventId)
  const eventId =
    candidateEventId || buildEventId(type, repositoryId, timestampMs)

  return {
    event_id: eventId,
    event_type: type,
    repository_id: repositoryId,
    timestamp_ms: timestampMs,
    title: normalizeText(raw.title),
    slug: normalizeText(raw.slug)
  }
}

const loadSnapshotMap = async (client, repositoryIds) => {
  const map = new Map()
  const uniqueIds = Array.from(new Set((repositoryIds || []).filter(Boolean)))
  if (!uniqueIds.length) return map

  for (const chunk of chunkArray(uniqueIds, 200)) {
    const { data, error } = await client
      .from(SNAPSHOTS_TABLE)
      .select(
        'repository_id, title, slug, created_at_ms, updated_at_ms, synced_at_ms'
      )
      .in('repository_id', chunk)

    if (error) throw error
    ;(data || []).forEach(row => {
      const repositoryId = normalizeRepositoryId(row.repository_id)
      if (!repositoryId) return
      map.set(repositoryId, {
        repositoryId,
        title: normalizeText(row.title),
        slug: normalizeText(row.slug),
        createdAtMs: toTimestampMs(row.created_at_ms),
        updatedAtMs: toTimestampMs(row.updated_at_ms),
        syncedAtMs: toTimestampMs(row.synced_at_ms)
      })
    })
  }

  return map
}

const loadExistingEventIds = async (client, eventIds) => {
  const set = new Set()
  const uniqueIds = Array.from(new Set((eventIds || []).filter(Boolean)))
  if (!uniqueIds.length) return set

  for (const chunk of chunkArray(uniqueIds, 300)) {
    const { data, error } = await client
      .from(EVENTS_TABLE)
      .select('event_id')
      .in('event_id', chunk)

    if (error) throw error
    ;(data || []).forEach(row => {
      if (row?.event_id) set.add(normalizeText(row.event_id))
    })
  }
  return set
}

const upsertSnapshots = async (client, snapshots) => {
  if (!snapshots.length) return

  for (const chunk of chunkArray(snapshots, 200)) {
    const { error } = await client
      .from(SNAPSHOTS_TABLE)
      .upsert(chunk, { onConflict: 'repository_id' })
    if (error) throw error
  }
}

const upsertEvents = async (client, events) => {
  if (!events.length) return

  for (const chunk of chunkArray(events, 200)) {
    const { error } = await client
      .from(EVENTS_TABLE)
      .upsert(chunk, { onConflict: 'event_id', ignoreDuplicates: true })
    if (error) throw error
  }
}

export const upsertContributionEvents = async rawEvents => {
  const client = await getReadyClient()
  if (!client) {
    return { enabled: false, attempted: 0, inserted: 0 }
  }

  const events = Array.isArray(rawEvents)
    ? rawEvents.map(normalizeRawEvent).filter(Boolean)
    : []
  if (!events.length) {
    return { enabled: true, attempted: 0, inserted: 0 }
  }

  const existingIds = await loadExistingEventIds(
    client,
    events.map(event => event.event_id)
  )
  const pendingEvents = events.filter(event => !existingIds.has(event.event_id))
  await upsertEvents(client, pendingEvents)

  return {
    enabled: true,
    attempted: events.length,
    inserted: pendingEvents.length
  }
}

export const syncContributionSnapshots = async postSnapshots => {
  const client = await getReadyClient()
  if (!client) {
    return { enabled: false, scanned: 0, addedEvents: 0, attemptedEvents: 0 }
  }

  const snapshots = Array.isArray(postSnapshots) ? postSnapshots : []
  if (!snapshots.length) {
    return { enabled: true, scanned: 0, addedEvents: 0, attemptedEvents: 0 }
  }

  const normalizedSnapshots = snapshots
    .map(snapshot => {
      const repositoryId = normalizeRepositoryId(snapshot?.repositoryId)
      if (!repositoryId) return null

      const createdAtMs = toTimestampMs(snapshot.createdAtMs)
      const notionCreatedAtMs = toTimestampMs(snapshot.notionCreatedAtMs)
      const updatedAtMs =
        toTimestampMs(snapshot.updatedAtMs) || notionCreatedAtMs || createdAtMs

      return {
        repositoryId,
        title: normalizeText(snapshot.title),
        slug: normalizeText(snapshot.slug),
        createdAtMs: createdAtMs || updatedAtMs,
        notionCreatedAtMs,
        updatedAtMs
      }
    })
    .filter(Boolean)

  if (!normalizedSnapshots.length) {
    return { enabled: true, scanned: 0, addedEvents: 0, attemptedEvents: 0 }
  }

  const prevMap = await loadSnapshotMap(
    client,
    normalizedSnapshots.map(snapshot => snapshot.repositoryId)
  )

  const nowMs = Date.now()
  const snapshotsToUpsert = normalizedSnapshots.map(snapshot => ({
    repository_id: snapshot.repositoryId,
    title: snapshot.title,
    slug: snapshot.slug,
    created_at_ms: snapshot.createdAtMs,
    updated_at_ms: snapshot.updatedAtMs,
    synced_at_ms: nowMs
  }))

  const eventsToInsert = buildUpdateEventsFromSnapshots(
    normalizedSnapshots,
    prevMap
  )

  const existingIds = await loadExistingEventIds(
    client,
    eventsToInsert.map(event => event.event_id)
  )
  const pendingEvents = eventsToInsert.filter(
    event => !existingIds.has(event.event_id)
  )

  await upsertEvents(client, pendingEvents)
  await upsertSnapshots(client, snapshotsToUpsert)

  return {
    enabled: true,
    scanned: normalizedSnapshots.length,
    attemptedEvents: eventsToInsert.length,
    addedEvents: pendingEvents.length
  }
}

export const listContributionEvents = async ({ limit = 50000 } = {}) => {
  const client = await getReadyClient()
  if (!client) return []

  const safeLimit = Math.max(1, Math.min(100000, Number(limit) || 50000))
  const { data, error } = await client
    .from(EVENTS_TABLE)
    .select('event_id, event_type, repository_id, timestamp_ms, title, slug')
    .order('timestamp_ms', { ascending: false })
    .limit(safeLimit)

  if (error) throw error

  return (data || [])
    .slice()
    .sort(
      (a, b) => toTimestampMs(a?.timestamp_ms) - toTimestampMs(b?.timestamp_ms)
    )
    .map(row => {
      const repositoryId = normalizeRepositoryId(row.repository_id)
      const timestampMs = toTimestampMs(row.timestamp_ms)
      const type = row.event_type === 'create' ? 'create' : 'update'
      if (!repositoryId || !timestampMs) return null
      return {
        eventId: normalizeText(row.event_id),
        type,
        repositoryId,
        identifier: repositoryId,
        timestampMs,
        title: normalizeText(row.title),
        slug: normalizeText(row.slug),
        href: buildHrefFromSlug(row.slug)
      }
    })
    .filter(Boolean)
}
