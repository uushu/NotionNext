import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { siteConfig } from '@/lib/config'
import counter from '@/lib/plugins/busuanzi'
import ProfileHome from '@/themes/claude/components/ProfileHome'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn()
}))

jest.mock('@/lib/plugins/busuanzi', () => ({
  __esModule: true,
  default: {
    read: jest.fn()
  }
}))

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

describe('Claude ProfileHome article tabs', () => {
  beforeEach(() => {
    siteConfig.mockImplementation((key, defaultValue) => {
      if (key === 'LINK') return 'https://www.yyshow.xyz'
      return defaultValue
    })
    counter.read.mockImplementation(({ url }) => {
      const articleNumber = Number(url.split('/').pop())
      return Promise.resolve({ page_pv: articleNumber * 10 })
    })
  })

  it('shows the latest five by default and switches the same list to popular', async () => {
    render(<ProfileHome posts={posts} homePostCandidates={posts} />)

    const latestTab = screen.getByRole('tab', { name: '最新文章' })
    const popularTab = screen.getByRole('tab', { name: '热门文章' })
    const panel = screen.getByRole('tabpanel')

    expect(latestTab).toHaveAttribute('aria-selected', 'true')
    expect(latestTab).toHaveClass('active')
    expect(popularTab).toHaveAttribute('aria-selected', 'false')
    expect(popularTab).not.toHaveClass('active')
    expect(counter.read).not.toHaveBeenCalled()

    expect(within(panel).getAllByRole('link')).toHaveLength(5)
    expect(within(panel).getAllByRole('link')[0]).toHaveTextContent('文章 1')
    expect(within(panel).queryByText('文章 6')).not.toBeInTheDocument()

    fireEvent.click(popularTab)

    await waitFor(() => {
      expect(counter.read).toHaveBeenCalledTimes(6)
      expect(within(panel).getAllByRole('link')).toHaveLength(5)
    })

    expect(popularTab).toHaveAttribute('aria-selected', 'true')
    expect(popularTab).toHaveClass('active')
    expect(latestTab).toHaveAttribute('aria-selected', 'false')
    expect(latestTab).not.toHaveClass('active')
    expect(within(panel).getAllByRole('link')[0]).toHaveTextContent('文章 6')
    expect(within(panel).getAllByRole('link')[0]).toHaveTextContent('60 次阅读')
    expect(within(panel).queryByText('文章 1')).not.toBeInTheDocument()

    fireEvent.click(latestTab)

    expect(within(panel).getAllByRole('link')).toHaveLength(5)
    expect(within(panel).getAllByRole('link')[0]).toHaveTextContent('文章 1')
    expect(within(panel).queryByText('文章 6')).not.toBeInTheDocument()
  })
})
