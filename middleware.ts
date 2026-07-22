import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

/**
 * Clerk 身份验证中间件
 */
export const config = {
  // 静态资源继续直出；像 /.env、/.git/config 这类带点的探测路径则进入中间件并被提前拦截。
  matcher: [
    '/((?!_next|sign-in|auth|.*\\.(?:css|js|mjs|map|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|txt|xml)$).*)',
    '/',
    '/(api|trpc)(.*)'
  ]
}

const blockedProbePatterns = [
  /^\/\.env(?:\.|\/|$)/i,
  /^\/\.git(?:\/|$)/i,
  /^\/(?:wp-admin|phpmyadmin)(?:\/|$)/i,
  /^\/wp-login\.php$/i
]

export const isBlockedProbePath = (pathname: string) =>
  blockedProbePatterns.some(pattern => pattern.test(pathname))

const getBlockedProbeResponse = (req: NextRequest) => {
  if (!isBlockedProbePath(req.nextUrl.pathname)) return null

  return new NextResponse(null, {
    status: 404,
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  })
}

// 限制登录访问的路由
const isTenantRoute = createRouteMatcher([
  '/user/organization-selector(.*)',
  '/user/orgid/(.*)',
  '/dashboard',
  '/dashboard/(.*)'
])

// 限制权限访问的路由
const isTenantAdminRoute = createRouteMatcher([
  '/admin/(.*)/memberships',
  '/admin/(.*)/domain'
])

/**
 * 没有配置权限相关功能的返回
 * @param req
 * @param ev
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
const noAuthMiddleware = async (req: NextRequest, ev: any) => {
  const blockedResponse = getBlockedProbeResponse(req)
  if (blockedResponse) return blockedResponse

  // 如果没有配置 Clerk 相关环境变量，返回一个默认响应或者继续处理请求
  if (BLOG['UUID_REDIRECT']) {
    let redirectJson: Record<string, string> = {}
    try {
      const response = await fetch(`${req.nextUrl.origin}/redirect.json`)
      if (response.ok) {
        redirectJson = (await response.json()) as Record<string, string>
      }
    } catch (err) {
      console.error('Error fetching static file:', err)
    }
    let lastPart = getLastPartOfUrl(req.nextUrl.pathname) as string
    if (checkStrIsNotionId(lastPart)) {
      lastPart = idToUuid(lastPart)
    }
    if (lastPart && redirectJson[lastPart]) {
      const redirectToUrl = req.nextUrl.clone()
      redirectToUrl.pathname = '/' + redirectJson[lastPart]
      console.log(
        `redirect from ${req.nextUrl.pathname} to ${redirectToUrl.pathname}`
      )
      return NextResponse.redirect(redirectToUrl, 308)
    }
  }
  return NextResponse.next()
}
/**
 * 鉴权中间件
 */
const authMiddleware = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware((auth, req) => {
      const blockedResponse = getBlockedProbeResponse(req)
      if (blockedResponse) return blockedResponse

      const { userId } = auth()
      // 处理 /dashboard 路由的登录保护
      if (isTenantRoute(req)) {
        if (!userId) {
          // 用户未登录，重定向到 /sign-in
          const url = new URL('/sign-in', req.url)
          url.searchParams.set('redirectTo', req.url) // 保存重定向目标
          return NextResponse.redirect(url)
        }
      }

      // 处理管理员相关权限保护
      if (isTenantAdminRoute(req)) {
        auth().protect(has => {
          return (
            has({ permission: 'org:sys_memberships:manage' }) ||
            has({ permission: 'org:sys_domains_manage' })
          )
        })
      }

      // 默认继续处理请求
      return NextResponse.next()
    })
  : noAuthMiddleware

export default authMiddleware
