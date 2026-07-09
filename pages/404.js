import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import Head from 'next/head'

const Rabbit404Illustration = () => (
  <svg
    viewBox='0 0 320 260'
    role='img'
    aria-label='困惑迷路的 utto 兔子'
    className='h-auto w-full overflow-visible'>
    <g
      fill='none'
      stroke='currentColor'
      strokeWidth='7'
      strokeLinecap='round'
      strokeLinejoin='round'>
      {/* 一体式兔子轮廓：只有头和耳朵，不再使用容易交叉错乱的手臂路径 */}
      <path d='M110 74 C102 48 104 20 120 14 C137 8 148 30 146 66 C155 63 165 63 174 66 C172 30 183 8 200 14 C216 20 218 48 210 74 C246 87 268 116 268 151 C268 199 225 226 160 226 C95 226 52 199 52 151 C52 116 74 87 110 74 Z' />

      {/* 困惑表情 */}
      <circle cx='112' cy='145' r='8' fill='currentColor' stroke='none' />
      <circle cx='206' cy='145' r='8' fill='currentColor' stroke='none' />
      <path d='M96 122 Q112 112 127 121' />
      <path d='M193 121 Q207 108 221 120' />
      <ellipse cx='148' cy='174' rx='14' ry='18' />
      <ellipse cx='172' cy='174' rx='14' ry='18' />
      <path d='M152 198 Q160 205 168 198' />

      {/* 两侧问号 */}
      <path d='M37 91 Q29 75 40 64 Q52 52 65 64 Q77 76 66 89 L58 96' />
      <circle cx='56' cy='111' r='4' fill='currentColor' stroke='none' />
      <path d='M263 85 Q271 72 283 79 Q296 87 288 99 L280 106' />
      <circle cx='278' cy='120' r='4' fill='currentColor' stroke='none' />
    </g>

    <circle cx='91' cy='177' r='18' fill='#f6c7dc' opacity='0.86' />
    <circle cx='229' cy='177' r='18' fill='#f6c7dc' opacity='0.86' />
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
        <div className='mb-3 w-full max-w-[300px] text-[#654729] dark:text-[#d8b58a]'>
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
