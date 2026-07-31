import {
  buildContributionPostSnapshot,
  buildUpdateEventsFromSnapshots
} from '@/lib/server/claude/contributionStore'

describe('Claude contribution persistence', () => {
  it('uses the article Date for the creation baseline', () => {
    const snapshot = buildContributionPostSnapshot({
      id: 'post-1',
      date: { start_date: '2026-07-30' },
      notionCreatedDate: '2026-07-31T08:00:00+08:00',
      lastEditedDate: '2026-07-31T10:00:00+08:00'
    })

    expect(snapshot.createdAtMs).toBe(Date.parse('2026-07-30'))
  })

  it('does not count the initial Notion write as an update', () => {
    const snapshots = [
      {
        repositoryId: 'post1',
        title: '文章',
        slug: 'article/post-1',
        createdAtMs: Date.parse('2026-07-30'),
        notionCreatedAtMs: Date.parse('2026-07-31T08:00:00+08:00'),
        updatedAtMs: Date.parse('2026-07-31T10:00:00+08:00')
      }
    ]

    expect(buildUpdateEventsFromSnapshots(snapshots)).toEqual([])
  })

  it('keeps the latest cross-day update when migrating an existing article', () => {
    const snapshots = [
      {
        repositoryId: 'post1',
        title: '文章',
        slug: 'article/post-1',
        createdAtMs: Date.parse('2026-07-20'),
        notionCreatedAtMs: Date.parse('2026-07-20T08:00:00+08:00'),
        updatedAtMs: Date.parse('2026-07-31T10:00:00+08:00')
      }
    ]

    expect(buildUpdateEventsFromSnapshots(snapshots)).toHaveLength(1)
  })

  it('appends an update only after an existing snapshot changes', () => {
    const snapshots = [
      {
        repositoryId: 'post1',
        title: '文章',
        slug: 'article/post-1',
        createdAtMs: Date.parse('2026-07-30'),
        updatedAtMs: Date.parse('2026-07-31T10:00:00+08:00')
      }
    ]
    const previousSnapshots = new Map([
      [
        'post1',
        {
          repositoryId: 'post1',
          updatedAtMs: Date.parse('2026-07-30T10:00:00+08:00')
        }
      ]
    ])

    const events = buildUpdateEventsFromSnapshots(snapshots, previousSnapshots)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      event_type: 'update',
      repository_id: 'post1',
      timestamp_ms: Date.parse('2026-07-31T10:00:00+08:00')
    })
  })

  it('does not append another event when last_edited_time is unchanged', () => {
    const updatedAtMs = Date.parse('2026-07-31T10:00:00+08:00')
    const snapshots = [
      {
        repositoryId: 'post1',
        title: '文章',
        slug: 'article/post-1',
        createdAtMs: Date.parse('2026-07-30'),
        updatedAtMs
      }
    ]

    expect(
      buildUpdateEventsFromSnapshots(
        snapshots,
        new Map([['post1', { updatedAtMs }]])
      )
    ).toEqual([])
  })
})
