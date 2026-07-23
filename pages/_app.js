// import '@/styles/animate.css' // @see https://animate.style/
import '@/styles/globals.css'
import '@/styles/utility-patterns.css'
import '@/styles/claude-category-cards.css'
import '@/styles/claude-category-overrides.css'

// core styles shared by all of react-notion-x (required)
import '@/styles/notion.css' //  重写部分notion样式
import 'react-notion-x/src/styles.css' // 原版的react-notion-x

import useAdjustStyle from '@/hooks/useAdjustStyle'
import { GlobalContextProvider } from '@/lib/global'
import { getBaseLayoutByTheme } from '@/themes/theme'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getQueryParam } from '../lib/utils'
import ErrorHandler from '@/lib/utils/errorHandler'

// 各种扩展插件 这个要阻塞引入
import BLOG from '@/blog.config'
import { LayoutBase as ClaudeLayoutBase } from '@/themes/claude'
import ClickGlassRipple from '@/components/ClickGlassRipple'
import ExternalPlugins from '@/components/ExternalPlugins'
import ReadmeTypewriter, {
  prepareReadmeTypewriterHtml
} from '@/components/ReadmeTypewriter'
import SEO from '@/components/SEO'
import { zhCN } from '@clerk/localizations'
import dynamic from 'next/dynamic'
// import { ClerkProvider } from '@clerk/nextjs'
const ClerkProvider = dynamic(() =>
  import('@clerk/nextjs').then(m => m.ClerkProvider)
)
const PenpenPet = dynamic(() => import('@/components/pet/penpen'), {
  ssr: false
})
const AppErrorBoundary = ErrorHandler.createErrorBoundary(
  <div style={{ padding: '2rem', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h1>
    <p style={{ color: '#666', marginBottom: '1.5rem' }}>An unexpected error occurred. Please refresh the page.</p>
    <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1.5rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: 'transparent' }}>Refresh</button>
  </div>
)

/**
 * App挂载DOM 入口文件
 * @param {*} param0
 * @returns
 */
const MyApp = ({ Component, pageProps }) => {
  // 一些可能出现 bug 的样式，可以统一放入该钩子进行调整
  useAdjustStyle()

  const route = useRouter()
  const [readmeNavigationEpoch, setReadmeNavigationEpoch] = useState(0)
  const queryTheme = getQueryParam(route.asPath, 'theme')
  const notionTheme = pageProps?.NOTION_CONFIG?.THEME
  const configTheme = BLOG.THEME
  const theme = useMemo(() => {
    return queryTheme || notionTheme || configTheme
  }, [queryTheme, notionTheme, configTheme])
  const isClaudeTheme = theme?.split(',')[0]?.trim() === 'claude'
  const isHomePage = route.pathname === '/'

  const renderPageProps = useMemo(() => {
    const readmeHtml = pageProps?.readmePage?.readmeHtml
    if (!isClaudeTheme || !readmeHtml) return pageProps

    return {
      ...pageProps,
      readmePage: {
        ...pageProps.readmePage,
        readmeHtml: prepareReadmeTypewriterHtml(readmeHtml)
      }
    }
  }, [isClaudeTheme, pageProps])

  useEffect(() => {
    const handleRouteComplete = () => {
      // route.asPath 在 / → / 的同路由导航中不会变化。
      // 独立递增序号确保重复点击“首页”也会销毁旧动画并创建新实例。
      setReadmeNavigationEpoch(epoch => epoch + 1)
    }

    route.events.on('routeChangeComplete', handleRouteComplete)
    return () => {
      route.events.off('routeChangeComplete', handleRouteComplete)
    }
  }, [route.events])

  useEffect(() => {
    const source = queryTheme
      ? 'url:theme'
      : notionTheme
        ? 'notion:config'
        : 'blog/env:config'
    console.log(
      '[ThemeResolver][runtime-final]',
      JSON.stringify(
        {
          note: 'This is the final theme used for rendering.',
          configTheme,
          notionTheme: notionTheme || null,
          queryTheme: queryTheme || null,
          finalTheme: theme,
          source
        },
        null,
        2
      )
    )
  }, [configTheme, notionTheme, queryTheme, theme])

  // 整体布局
  const GLayout = useCallback(
    props => {
      // Claude 是当前生产主题，直接打进首屏包，避免等待动态主题模块。
      if (isClaudeTheme) {
        return <ClaudeLayoutBase {...props} />
      }

      const Layout = getBaseLayoutByTheme(theme)
      return <Layout {...props} />
    },
    [isClaudeTheme, theme]
  )

  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const content = (
    <AppErrorBoundary>
      <GlobalContextProvider {...renderPageProps}>
        <GLayout {...renderPageProps}>
          <SEO {...renderPageProps} />
          <Component {...renderPageProps} />
        </GLayout>
        {isClaudeTheme && isHomePage && (
          <ReadmeTypewriter
            key={`readme-${route.asPath}-${readmeNavigationEpoch}`}
            enabled
          />
        )}
        <ClickGlassRipple enabled={isClaudeTheme} />
        <PenpenPet enabled={isClaudeTheme} pageProps={renderPageProps} />
        <ExternalPlugins {...renderPageProps} />
      </GlobalContextProvider>
    </AppErrorBoundary>
  )
  return (
    <>
      {enableClerk ? (
        <ClerkProvider localization={zhCN}>{content}</ClerkProvider>
      ) : (
        content
      )}
    </>
  )
}

export default MyApp
