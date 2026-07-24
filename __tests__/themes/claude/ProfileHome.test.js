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
  it('shows only the five most recent articles', () => {
    render(<ProfileHome posts={posts} homePostCandidates={posts} />)

    const articleSection = screen
      .getByRole('heading', { name: '最新文章' })
      .closest('section')

    expect(screen.queryByText('热门文章')).not.toBeInTheDocument()
    expect(within(articleSection).getAllByRole('link')).toHaveLength(5)
    expect(within(articleSection).getAllByRole('link')[0]).toHaveTextContent(
      '文章 1'
    )
    expect(within(articleSection).queryByText('文章 6')).not.toBeInTheDocument()
  })
})
