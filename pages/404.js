import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import Head from 'next/head'

const Rabbit404Illustration = () => (
  <svg
    viewBox='0 0 320 360'
    role='img'
    aria-label='蹲坐的 utto 兔子线稿'
    className='h-auto w-full overflow-visible'>
    <g
      fill='none'
      stroke='currentColor'
      strokeWidth='8'
      strokeLinecap='round'
      strokeLinejoin='round'>
      {/* 身体与小脚 */}
      <path d='M112 258c-13 22-17 54-7 74 8 16 23 21 38 9 7 13 18 18 29 11 12 8 25 4 34-10 16 10 31 5 39-11 9-20 4-51-8-73' />
      <path d='M142 341c-2-13-2-25 1-36' />
      <path d='M178 341c2-13 2-25-1-36' />

      {/* 大圆脑袋和两只长耳朵 */}
      <path d='M147 94V58c0-28-15-45-31-34-20 14-22 54-12 88-31 18-49 48-49 82 0 49 42 79 105 79s105-30 105-79c0-34-18-64-49-82 10-34 8-74-12-88-16-11-34 6-34 34v36c-8-3-15-4-23 0Z' />

      {/* 眼睛和嘴巴 */}
      <circle cx='116' cy='180' r='8' fill='currentColor' stroke='none' />
      <circle cx='204' cy='180' r='8' fill='currentColor' stroke='none' />
      <ellipse cx='148' cy='207' rx='14' ry='18' />
      <ellipse cx='172' cy='207' rx='14' ry='18' />

      {/* 抱在胸前的小手 */}
      <path d='M118 286c16-11 31-7 42 9-10 8-23 13-37 11' />
      <path d='M202 286c-16-11-31-7-42 9 10 8 23 13 37 11' />
      <path d='M160 295v27' />
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
