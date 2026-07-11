const normalizeRepositoryId = value => {
  if (!value) return ''
  return String(value).replace(/-/g, '').trim().toLowerCase()
}

const toTimestampMs = value => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : 0
  }

  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : 0
}

const getCreatedTimestamp = post => {
  return (
    toTimestampMs(post?.createdTime) ||
    toTimestampMs(post?.publishDate) ||
    toTimestampMs(post?.date?.start_date)
  )
}

const normalizeLedgerEvent = event => {
  const repositoryId = normalizeRepositoryId(
    event?.repositoryId || event?.identifier || event?.postId
  )
  const timestampMs = toTimestampMs(
    event?.timestampMs || event?.timestamp || event?.date || event?.time
  )

  if (!repositoryId || !timestampMs) return null

  return {
    id:
      event?.id ||
      `${event?.type === 'create' ? 'create' : 'update'}:${repositoryId}:${timestampMs}`,
    type: event?.type === 'create' ? 'create' : 'update',
    repositoryId,
    title: event?.title || 'Untitled',
    href: event?.href || '#',
    timestampMs,
    source: event?.source || 'ledger'
  }
}

const buildCreateEvent = (post, index) => {
  const timestampMs = getCreatedTimestamp(post)
  if (!timestampMs) return null

  const rawId =
    post?.id || post?.href || post?.slug || `${post?.title || 'untitled'}-${index}`
  const repositoryId = normalizeRepositoryId(rawId)
  if (!repositoryId) return null

  return {
    id: `notion-create:${repositoryId}`,
    type: 'create',
    repositoryId,
    title: post?.title || 'Untitled',
    href: post?.href || '#',
    timestampMs,
    source: 'notion-created-time'
  }
}

/**
 * Build immutable contribution events for the Claude homepage.
 *
 * Historical updates only come from the append-only ledger. Notion's
 * lastEditedDate is intentionally excluded because it is a mutable snapshot:
 * editing a page again would otherwise move an old heatmap contribution to
 * the newest edit date.
 */
export function buildContributionEvents({ posts = [], ledgerEvents = [] } = {}) {
  const candidates = [
    ...(Array.isArray(ledgerEvents)
      ? ledgerEvents.map(normalizeLedgerEvent).filter(Boolean)
      : []),
    ...(Array.isArray(posts)
      ? posts.map(buildCreateEvent).filter(Boolean)
      : [])
  ]

  const deduplicated = new Map()
  candidates.forEach(event => {
    if (!deduplicated.has(event.id)) {
      deduplicated.set(event.id, event)
    }
  })

  return Array.from(deduplicated.values()).sort(
    (left, right) => left.timestampMs - right.timestampMs
  )
}
