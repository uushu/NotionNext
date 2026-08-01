import { render, screen, within } from '@testing-library/react'
import ProfileHome, {
  deduplicateContributionEvents,
  getContributionDayKey
} from '@/themes/claude/components/ProfileHome'

jest.mock('@/components/SmartLink', () => ({
  __esModule: true,
  default: ({ children, className = '', href = '' }) => (
    <a className={className} href={href}>
      {children}
    </a>
  )
}))

const posts = Array.from({ length: 6 }, (_, index) => {
  const articleNumber = index + 1
  return {
    id: `article-${articleNumber}`,
    title: `文章 ${articleNumber}`,
    href: `/article/${articleNumber}`,
    category: '学习笔记',
    date: {
      start_date: `2026-07-${String(22 - index).padStart(2, '0')}`
    }
  }
})

describe('Claude ProfileHome contribution events', () => {
  it('uses the editable article date for the creation contribution day', () => {
    const post = {
      date: { start_date: '2026-07-30' },
      publishDate: new Date('2026-07-31T08:00:00+08:00').getTime(),
      lastEditedDate: '2026-07-31T08:00:00+08:00'
    }

    expect(getContributionDayKey(post)).toBe('2026-07-30')
  })

  it('converts timestamp fallbacks with the fixed Asia/Shanghai timezone', () => {
    expect(
      getContributionDayKey({ publishDate: '2026-07-31T16:30:00.000Z' })
    ).toBe('2026-08-01')
  })

  it('counts same-day creation and update as two different contributions', () => {
    const events = [
      {
        type: 'create',
        postId: 'post-1',
        date: new Date('2026-07-26T09:00:00+08:00')
      },
      {
        type: 'update',
        postId: 'post-1',
        date: new Date('2026-07-26T18:30:00+08:00')
      }
    ]

    const result = deduplicateContributionEvents(events)

    expect(result).toHaveLength(2)
    expect(result.map(event => event.type)).toEqual(['create', 'update'])
  })

  it('counts multiple updates to the same post on one day once', () => {
    const events = [
      {
        type: 'update',
        postId: 'post-1',
        date: new Date('2026-07-26T09:00:00+08:00')
      },
      {
        type: 'update',
        postId: 'post-1',
        date: new Date('2026-07-26T18:30:00+08:00')
      }
    ]

    const result = deduplicateContributionEvents(events)

    expect(result).toHaveLength(1)
    expect(result[0].date.toISOString()).toBe('2026-07-26T10:30:00.000Z')
  })

  it('keeps contributions for the same post on different days', () => {
    const events = [
      {
        type: 'create',
        postId: 'post-1',
        date: new Date('2026-07-25T18:30:00+08:00')
      },
      {
        type: 'update',
        postId: 'post-1',
        date: new Date('2026-07-26T18:30:00+08:00')
      }
    ]

    expect(deduplicateContributionEvents(events)).toHaveLength(2)
  })

  it('counts different posts on the same day separately', () => {
    const events = [
      {
        type: 'update',
        postId: 'post-1',
        date: new Date('2026-07-26T18:30:00+08:00')
      },
      {
        type: 'update',
        postId: 'post-2',
        date: new Date('2026-07-26T18:30:00+08:00')
      }
    ]

    expect(deduplicateContributionEvents(events)).toHaveLength(2)
  })

  it('combines article Date creation with persisted update history', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T12:00:00+08:00'))
    const article = {
      id: 'post-1',
      title: '文章',
      href: '/article/post-1',
      date: { start_date: '2026-07-30' },
      lastEditedDate: '2026-07-31T08:00:00+08:00'
    }
    const contributionEvents = [
      {
        type: 'update',
        repositoryId: 'post-1',
        timestampMs: new Date('2026-07-31T08:00:00+08:00').getTime()
      }
    ]

    const { container } = render(
      <ProfileHome
        posts={[article]}
        homePostCandidates={[article]}
        contributionEvents={contributionEvents}
      />
    )

    expect(
      screen.getByRole('heading', { name: '2 contributions in the last year' })
    ).toBeInTheDocument()
    expect(
      container.querySelectorAll(
        '.claude-contrib-grid > .claude-contrib-cell.level-1'
      )
    ).toHaveLength(2)
    jest.useRealTimers()
  })

  it('keeps a late same-day update in today\'s level-2 cell', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T12:00:00+08:00'))
    const article = {
      id: 'post-1',
      title: '文章',
      href: '/article/post-1',
      date: { start_date: '2026-07-31' }
    }

    const { container } = render(
      <ProfileHome
        posts={[article]}
        homePostCandidates={[article]}
        contributionEvents={[
          {
            type: 'update',
            repositoryId: 'post-1',
            timestampMs: new Date('2026-07-31T23:00:00+08:00').getTime()
          }
        ]}
      />
    )

    expect(
      container.querySelectorAll(
        '.claude-contrib-grid > .claude-contrib-cell.level-2'
      )
    ).toHaveLength(1)
    jest.useRealTimers()
  })
})

describe('Claude ProfileHome latest articles', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-26T12:00:00+08:00'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('shows only the five most recent articles', () => {
    render(<ProfileHome posts={posts} homePostCandidates={posts} />)

    const articleSection = screen
      .getByRole('heading', { name: '最新文章' })
      .closest('section')

    expect(screen.queryByText('热门文章')).not.toBeInTheDocument()
    expect(screen.queryByText('最近更新')).not.toBeInTheDocument()
    expect(screen.queryByText('学习足迹')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /contributions in/ })
    ).toBeInTheDocument()
    expect(within(articleSection).getAllByRole('link')).toHaveLength(5)
    expect(within(articleSection).getAllByRole('link')[0]).toHaveTextContent(
      '文章 1'
    )
    expect(within(articleSection).queryByText('文章 6')).not.toBeInTheDocument()
  })

  it('keeps the original heatmap structure and omits a colliding partial month label', () => {
    const { container } = render(
      <ProfileHome posts={posts} homePostCandidates={posts} />
    )
    const contributionSection = container.querySelector(
      '.claude-contrib-section'
    )
    const monthLabels = Array.from(
      contributionSection.querySelectorAll('.claude-contrib-months span')
    ).map(node => node.textContent)

    expect(
      contributionSection.querySelector('.claude-contrib-header')
    ).not.toBeInTheDocument()
    expect(monthLabels.slice(0, 2)).toEqual(['Aug', 'Sep'])
  })
})
