import { render, screen, within } from '@testing-library/react'
import ProfileHome from '@/themes/claude/components/ProfileHome'

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
