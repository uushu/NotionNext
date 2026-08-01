import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import {
  cleanPostSummaries,
  fetchGlobalAllData,
  getPostBlocks
} from '@/lib/db/SiteDataApi'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import { generateRobotsTxt } from '@/lib/utils/robots.txt'
import { generateRss, shouldGenerateRssForLocale } from '@/lib/utils/rss'
import { generateSitemapXml } from '@/lib/utils/sitemap.xml'
import { isExport } from '@/lib/utils/buildMode'
import { DynamicLayout } from '@/themes/theme'
import ClaudeProfileHome from '@/themes/claude/components/ProfileHome'
import { generateRedirectJson } from '@/lib/utils/redirect'
import { checkDataFromAlgolia } from '@/lib/plugins/algolia'
import {
  buildContributionPostSnapshot,
  isContributionStoreEnabled,
  listContributionEvents,
  syncContributionSnapshots
} from '@/lib/server/claude/contributionStore'
import pLimit from 'p-limit'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'

const normalizeSlug = value =>
  String(value || '')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()

/**
 * 读取 Claude 主题首页的 README 页面。
 * 复用站点现有 NotionPage 渲染器，避免维护第二套 Notion -> HTML 转换逻辑。
 */
async function getClaudeReadmePage(allPages) {
  const readmePage = allPages?.find(
    page =>
      page?.status === 'Published' && normalizeSlug(page?.slug) === 'readme.md'
  )

  if (!readmePage) return null

  const fallback = {
    id: readmePage.id,
    slug: readmePage.slug,
    title: readmePage.title,
    excerpt: readmePage.summary || readmePage.description || '',
    readmeHtml: ''
  }

  try {
    const rawBlockMap = await getPostBlocks(readmePage.id, 'claude-readme', {
      cacheVersion: readmePage.lastEditedDate
    })

    if (!rawBlockMap) return fallback

    const adaptedBlockMap = adapterNotionBlockMap(rawBlockMap)
    const blockMap = adaptedBlockMap?.block
      ? {
          ...adaptedBlockMap,
          block: formatNotionBlock(adaptedBlockMap.block)
        }
      : adaptedBlockMap

    if (!blockMap?.block) return fallback

    const [{ renderToStaticMarkup }, { default: NotionPage }] =
      await Promise.all([
        import('react-dom/server'),
        import('@/components/NotionPage')
      ])

    return {
      ...fallback,
      readmeHtml: renderToStaticMarkup(
        <NotionPage
          post={{ ...readmePage, blockMap }}
          className='claude-readme-notion'
        />
      )
    }
  } catch (error) {
    console.warn('[Claude README] Failed to render README page:', error)
    return fallback
  }
}

async function getClaudeContributionEvents(publishedPosts, notionConfig) {
  const persistEnabled = siteConfig(
    'CLAUDE_CONTRIBUTION_PERSIST_ENABLED',
    true,
    notionConfig
  )
  if (!persistEnabled) return []
  if (!isContributionStoreEnabled()) {
    console.warn(
      '[Contrib] Persistence is enabled but Supabase credentials are missing.'
    )
    return []
  }

  const snapshots = publishedPosts
    .filter(post => normalizeSlug(post?.slug) !== 'readme.md')
    .map(buildContributionPostSnapshot)
    .filter(Boolean)

  try {
    await syncContributionSnapshots(snapshots)
    return await listContributionEvents({
      limit: siteConfig('CLAUDE_CONTRIBUTION_EVENT_LIMIT', 50000, notionConfig)
    })
  } catch (error) {
    console.warn(
      '[Contrib] Failed to sync contribution history:',
      error?.message || error
    )
    return []
  }
}

/**
 * 首页布局
 * @param {*} props
 * @returns
 */
const Index = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  const primaryTheme = theme?.split(',')[0]?.trim()

  // 当前生产首页直接渲染 Claude 组件，避免动态主题包加载期间显示空壳。
  if (primaryTheme === 'claude') {
    return <ClaudeProfileHome {...props} />
  }

  return <DynamicLayout theme={theme} layoutName='LayoutIndex' {...props} />
}

/**
 * SSG 获取数据
 * @returns
 */
export async function getStaticProps(req) {
  const { locale } = req
  const from = 'index'
  const props = await fetchGlobalAllData({ from, locale })
  const resolvedTheme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)

  if (process.env.NODE_ENV === 'development') {
    const configTheme = BLOG.THEME
    const notionTheme = props?.NOTION_CONFIG?.THEME || null
    const source = notionTheme ? 'notion:config' : 'blog/env:config'
    console.log(
      '[ThemeResolver][server-static-props]',
      JSON.stringify({
        route: '/',
        configTheme,
        notionTheme,
        finalTheme: resolvedTheme,
        source
      })
    )
  }
  const POST_PREVIEW_LINES = siteConfig(
    'POST_PREVIEW_LINES',
    8,
    props?.NOTION_CONFIG
  )
  const POST_PREVIEW_MAX_COUNT = siteConfig(
    'POST_PREVIEW_MAX_COUNT',
    4,
    props?.NOTION_CONFIG
  )
  const POST_LIST_PREVIEW = siteConfig(
    'POST_LIST_PREVIEW',
    false,
    props?.NOTION_CONFIG
  )

  const publishedPosts =
    props.allPages?.filter(
      page => page.type === 'Post' && page.status === 'Published'
    ) || []

  props.posts = publishedPosts
  props.homePostCandidates = cleanPostSummaries(publishedPosts)

  if (resolvedTheme === 'claude') {
    const [readmePage, contributionEvents] = await Promise.all([
      getClaudeReadmePage(props.allPages),
      getClaudeContributionEvents(publishedPosts, props?.NOTION_CONFIG)
    ])
    props.readmePage = readmePage
    props.contributionEvents = contributionEvents
  }

  // 处理分页
  const POST_LIST_STYLE = siteConfig(
    'POST_LIST_STYLE',
    'page',
    props?.NOTION_CONFIG
  )
  if (POST_LIST_STYLE === 'scroll') {
    // 滚动列表默认给前端返回所有数据
  } else if (POST_LIST_STYLE === 'page') {
    props.posts = props.posts?.slice(
      0,
      siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)
    )
  }

  // 预览文章内容
  if (POST_LIST_PREVIEW) {
    const previewLimit = pLimit(
      siteConfig('POST_PREVIEW_CONCURRENCY', 5, props?.NOTION_CONFIG)
    )
    const previewTargets = props.posts
      .filter(post => !post.password || post.password === '')
      .slice(0, POST_PREVIEW_MAX_COUNT)
    await Promise.all(
      previewTargets.map(post =>
        previewLimit(async () => {
          const rawBlockMap = await getPostBlocks(
            post.id,
            'slug',
            POST_PREVIEW_LINES
          )
          post.blockMap = adapterNotionBlockMap(rawBlockMap)
          if (post.blockMap?.block) {
            post.blockMap.block = formatNotionBlock(post.blockMap.block)
          }
        })
      )
    )
  }
  const isBuildLifecycle = ['build', 'export'].includes(
    process.env.npm_lifecycle_event
  )
  if (isBuildLifecycle) {
    // 生成robotTxt
    generateRobotsTxt(props)
    // 生成Feed订阅
    if (shouldGenerateRssForLocale({ locale })) {
      await generateRss(props)
    }
    // 生成
    generateSitemapXml(props)
    // 检查数据是否需要从algolia删除
    await checkDataFromAlgolia(props)
    if (siteConfig('UUID_REDIRECT', false, props?.NOTION_CONFIG)) {
      generateRedirectJson(props)
    }
  }

  // 生成全文索引 - 仅在 yarn build 时执行 && process.env.npm_lifecycle_event === 'build'

  if (!POST_LIST_PREVIEW) {
    props.posts = cleanPostSummaries(props.posts)
  }
  props.latestPosts = cleanPostSummaries(props.latestPosts)
  delete props.allPages

  return {
    props,
    revalidate: isExport()
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export default Index
