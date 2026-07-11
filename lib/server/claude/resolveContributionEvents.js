import { buildContributionEvents } from '@/lib/contribution/buildContributionEvents'
import {
  buildContributionPostSnapshot,
  isContributionStoreEnabled,
  listContributionEvents,
  syncContributionSnapshots,
  upsertContributionEvents
} from '@/lib/server/claude/contributionStore'

const BASELINE_EVENT_ID = 'claude-contribution-snapshot-baseline-v1'
const BASELINE_REPOSITORY_ID = 'claudecontributionsnapshotbaseline'
const BASELINE_EVENT = {
  eventId: BASELINE_EVENT_ID,
  type: 'update',
  repositoryId: BASELINE_REPOSITORY_ID,
  title: 'Contribution snapshot baseline',
  slug: '',
  timestamp: '2000-01-01T00:00:00.000Z',
  source: 'system-baseline'
}

const isBaselineEvent = event => {
  return (
    event?.eventId === BASELINE_EVENT_ID ||
    event?.repositoryId === BASELINE_REPOSITORY_ID ||
    event?.identifier === BASELINE_REPOSITORY_ID
  )
}

const buildSafeBaselineSnapshots = snapshots => {
  return snapshots
    .map(snapshot => {
      const baselineTimestamp = snapshot?.updatedAtMs || snapshot?.createdAtMs || 0
      if (!baselineTimestamp) return null

      // 首次启用持久化时只保存当前基线，不把现有 lastEditedDate
      // 误当成一批“今天发生”的历史修改。
      return {
        ...snapshot,
        createdAtMs: baselineTimestamp,
        updatedAtMs: baselineTimestamp
      }
    })
    .filter(Boolean)
}

const isPreviewDeployment = () => process.env.VERCEL_ENV === 'preview'

/**
 * Resolve contribution events with an append-only Supabase history when the
 * store is configured. The repository JSON ledger remains the deterministic
 * fallback and also supplies manually verified historical backfills.
 */
export async function resolveContributionEvents({ posts = [], ledgerEvents = [] } = {}) {
  const fallbackEvents = buildContributionEvents({ posts, ledgerEvents })

  if (!isContributionStoreEnabled()) {
    console.info('[Contrib] Persistent store disabled; using repository ledger.')
    return fallbackEvents
  }

  try {
    const snapshots = (Array.isArray(posts) ? posts : [])
      .map(buildContributionPostSnapshot)
      .filter(snapshot => snapshot && (snapshot.createdAtMs || snapshot.updatedAtMs))

    let persistedEvents = await listContributionEvents()

    // Preview 部署只读，避免测试分支改写正式贡献历史。
    if (!isPreviewDeployment()) {
      const hasBaseline = persistedEvents.some(isBaselineEvent)

      if (!hasBaseline) {
        const baselineResult = await syncContributionSnapshots(
          buildSafeBaselineSnapshots(snapshots)
        )

        if (baselineResult.enabled) {
          await upsertContributionEvents([BASELINE_EVENT])
        }
      } else {
        await syncContributionSnapshots(snapshots)
      }

      // 已确认的手动回填也写入持久层；重复执行由确定性事件 ID 去重。
      await upsertContributionEvents(ledgerEvents)
      persistedEvents = await listContributionEvents()
    }

    const persistedUpdates = persistedEvents.filter(
      event => event?.type === 'update' && !isBaselineEvent(event)
    )

    const resolvedEvents = buildContributionEvents({
      posts,
      // 手动账本放在前面，使其保留人工校准过的标题和链接。
      ledgerEvents: [...ledgerEvents, ...persistedUpdates]
    })

    console.info(
      `[Contrib] Resolved ${resolvedEvents.length} events ` +
        `(persisted updates: ${persistedUpdates.length}, preview: ${isPreviewDeployment()}).`
    )

    return resolvedEvents
  } catch (error) {
    console.warn(
      `[Contrib] Persistent history unavailable; using repository ledger: ${
        error?.message || error
      }`
    )
    return fallbackEvents
  }
}
