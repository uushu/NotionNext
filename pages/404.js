import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import Head from 'next/head'

const Rabbit404Illustration = () => (
  <svg
    viewBox='0 0 420 300'
    role='img'
    aria-label='摔倒的 utto 兔子线稿'
    className='h-auto w-full overflow-visible'>
    <g
      transform='rotate(-4 210 150)'
      fill='none'
      stroke='currentColor'
      strokeWidth='8'
      strokeLinecap='round'
      strokeLinejoin='round'>
      <path d='M111 144C83 122 55 123 31 145c21 11 37 26 49 46 10-18 20-33 31-47Z' />
      <path d='M108 144c14-40 54-58 110-53 62 5 102 34 107 76 6 48-34 76-101 80-66 4-116-15-130-53-7-18-2-36 14-50Z' />
      <path d='M159 101c-7-27-7-56 5-70 11-13 27-6 32 17 5 19 2 38 4 57' />
      <path d='M221 100c1-24 3-52 17-66 12-12 28-4 31 18 3 19-1 38 0 56' />
      <path d='M319 146c24-14 37-3 31 19-5 19-17 34-33 44' />
      <path d='M141 232c-5 23 2 38 17 39 14 1 23-13 24-31' />

      <circle cx='169' cy='164' r='11' />
      <circle cx='265' cy='159' r='11' />
      <ellipse cx='210' cy='184' rx='14' ry='18' />
      <ellipse cx='232' cy='182' rx='14' ry='18' />

      <path d='M142 31c-7-10-13-13-21-13' />
      <path d='M151 19c4-10 10-14 17-16' />
      <path d='M275 19c7 1 13 5 17 13' />
      <path d='M288 35c9 2 14 6 18 12' />
      <path d='M69 112c-11-2-19 0-26 5' />
      <path d='M54 128c-8 2-14 7-18 13' />
      <path d='M348 117c10 1 18 5 23 11' />
      <path d='M361 138c8 3 13 8 16 14' />
      <path d='M38 203c-9 1-16 5-21 11' />
      <path d='M354 218c10 0 17 3 23 8' />
      <path d='M133 272c-7 7-12 11-20 12' />
      <path d='M169 280c7 0 13-3 18-8' />
    </g>

    <circle cx='152' cy='193' r='20' fill='#f6c7dc' opacity='0.82' />
    <circle cx='285' cy='184' r='20' fill='#f6c7dc' opacity='0.82' />
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
        <div className='mb-2 w-full max-w-[360px] text-[#654729] dark:text-[#d8b58a]'>
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
