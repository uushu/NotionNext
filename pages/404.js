import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import Head from 'next/head'

const Rabbit404Illustration = () => (
  <svg
    viewBox='0 0 320 360'
    role='img'
    aria-label='蹲坐抱手的 utto 兔子线稿'
    className='h-auto w-full overflow-visible'>
    <g
      fill='none'
      stroke='currentColor'
      strokeWidth='7'
      strokeLinecap='round'
      strokeLinejoin='round'>
      {/* 身体：先画在后面，避免与脑袋边缘交叉 */}
      <path d='M118 248c-18 20-23 59-10 83 8 16 24 21 38 9 8 13 21 16 30 2 10 14 23 11 31-2 14 12 30 7 38-9 13-24 8-63-10-83Z' />
      <path d='M144 340c-2-12-1-23 2-32' />
      <path d='M176 340c2-12 1-23-2-32' />

      {/* 正面大圆脸和两只长耳朵 */}
      <path d='M116 104c-10-30-11-69 4-83 15-14 29 7 29 37v35c7-2 15-3 22 0V58c0-30 14-51 29-37 15 14 14 53 4 83 37 17 59 49 59 84 0 51-43 81-103 81S57 239 57 188c0-35 22-67 59-84Z' />

      {/* 五官 */}
      <circle cx='116' cy='180' r='8' fill='currentColor' stroke='none' />
      <circle cx='204' cy='180' r='8' fill='currentColor' stroke='none' />
      <ellipse cx='148' cy='207' rx='14' ry='18' />
      <ellipse cx='172' cy='207' rx='14' ry='18' />

      {/* 抱在胸前的手：全部限制在身体内部 */}
      <path d='M128 291c11-9 23-8 32 4 9-12 21-13 32-4' />
      <path d='M136 306c9 2 17-2 24-11 7 9 15 13 24 11' />
      <path d='M160 295v24' />
    </g>

    <circle cx='92' cy='213' r='20' fill='#f6c7dc' opacity='0.82' />
    <circle cx='228' cy='213' r='20' fill='#f6c7dc' opacity='0.82' />
  </svg>
)

const NotFoundPage = () => {
  const title = siteConfig('TITLE') || 'utto兔子的学习屋'
  const links = [
    { href: '/', icon: 'fa-home', label: '返回首页' },
    { href: '/category', icon: 'fa-folder', label: '文章分类' },
    { href: '/archive', icon: 'fa-archive', label: '文章归档' }
  ]

  return (
    <>
      <Head>
        <title>{`404 | ${title}`}</title>
        <meta name='robots' content='noindex, nofollow' />
      </Head>

      <section className='mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-2xl flex-col items-center justify-center px-4 py-8 text-center md:py-12'>
        <div className='mb-2 w-full max-w-[300px] text-[#654729] dark:text-[#d8b58a]'>
          <Rabbit404Illustration />
        </div>

        <h1 className='mb-2 text-6xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-7xl'>
          404
        </h1>
        <p className='mb-7 text-base text-gray-600 dark:text-gray-300 md:text-lg'>
          utto兔子没有找到你要的页面
        </p>

        <nav
          aria-label='404 页面导航'
          className='flex flex-wrap items-center justify-center gap-3'>
          {links.map(link => (
            <SmartLink
              key={link.href}
              href={link.href}
              className='inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-500'>
              <i className={`fas ${link.icon} mr-2 text-xs`} />
              {link.label}
            </SmartLink>
          ))}
        </nav>
      </section>
    </>
  )
}

export async function getStaticProps(req) {
  const { locale } = req
  const props = (await fetchGlobalAllData({ from: '404', locale })) || {}
  return { props }
}

export default NotFoundPage
