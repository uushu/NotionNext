import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import Head from 'next/head'

const Rabbit404Illustration = () => (
  <svg
    viewBox='0 0 360 330'
    role='img'
    aria-label='迷路困惑的 utto 兔子'
    className='h-auto w-full overflow-visible'>
    <g
      fill='none'
      stroke='currentColor'
      strokeWidth='7'
      strokeLinecap='round'
      strokeLinejoin='round'>
      {/* 身体轮廓：顶部留空，由脑袋下沿自然衔接 */}
      <path d='M125 215c-17 17-19 55-3 74 10 12 25 11 36 0 11 14 33 14 44 0 11 11 26 12 36 0 16-19 14-57-3-74' />
      <path d='M146 287c-2 12 3 21 14 22' />
      <path d='M214 287c2 12-3 21-14 22' />

      {/* 一体式脑袋与长耳朵，避免多段路径接缝 */}
      <path d='M138 90c-9-26-8-61 10-70 17-8 26 19 21 63 7-2 15-2 22 0-5-44 4-71 21-63 18 9 19 44 10 70 32 8 55 30 60 60 8 48-33 76-102 76S70 198 78 150c5-30 28-52 60-60Z' />

      {/* 眼睛与嘴巴 */}
      <circle cx='132' cy='164' r='8' fill='currentColor' stroke='none' />
      <circle cx='228' cy='164' r='8' fill='currentColor' stroke='none' />
      <ellipse cx='168' cy='192' rx='14' ry='18' />
      <ellipse cx='192' cy='192' rx='14' ry='18' />

      {/* 困惑动作：左手托脸，右手放在肚子上 */}
      <ellipse cx='122' cy='207' rx='16' ry='20' />
      <path d='M132 264c-10-14-13-28-10-37' />
      <ellipse cx='211' cy='254' rx='19' ry='13' />
      <path d='M229 271c-3-9-9-15-18-17' />
      <path d='M202 253c4 4 7 8 8 13' />
    </g>

    {/* 腮红 */}
    <circle cx='105' cy='194' r='18' fill='#f6c7dc' opacity='0.86' />
    <circle cx='255' cy='194' r='18' fill='#f6c7dc' opacity='0.86' />

    {/* 问号使用文字，避免复杂线稿变形 */}
    <g fill='currentColor' opacity='0.9' fontFamily='Arial, sans-serif' fontWeight='700'>
      <text x='44' y='112' fontSize='48'>?</text>
      <text x='292' y='132' fontSize='38'>?</text>
    </g>
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
