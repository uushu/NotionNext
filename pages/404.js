import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import Head from 'next/head'

const Rabbit404Illustration = () => (
  <svg
    viewBox='0 0 360 280'
    role='img'
    aria-label='摔倒的 utto 兔子插画'
    className='h-auto w-full overflow-visible'>
    <g
      fill='none'
      stroke='currentColor'
      strokeWidth='9'
      strokeLinecap='round'
      strokeLinejoin='round'>
      <path d='M118 88C95 75 70 78 47 96' />
      <path d='M242 83c23-14 49-11 70 7' />
      <path d='M92 104c-28 9-49 30-58 58 19 7 36 19 50 36' />
      <path d='M267 102c29 9 49 31 57 59-19 6-36 18-51 35' />
      <path d='M113 105c-9-42-3-78 14-83 18-5 36 27 43 70' />
      <path d='M191 91c6-43 24-75 42-71 18 5 25 41 17 84' />
      <path d='M86 151c12-43 48-69 94-69 49 0 88 27 98 71 10 47-20 89-69 103-49 14-104 0-129-34-16-22-13-48 6-71Z' />
      <path d='M78 198c-22 7-36 20-45 39 23 5 42 15 57 30' />
      <path d='M276 195c24 5 41 18 51 37-22 7-39 18-53 34' />
      <path d='M114 238c-4 21 2 35 18 40 13 3 24-6 27-24' />
      <path d='M222 244c4 19 15 28 29 25 15-4 20-18 16-38' />
      <circle cx='145' cy='153' r='10' />
      <circle cx='222' cy='151' r='10' />
      <path d='M176 171c8-8 17-8 25 0-8 6-17 6-25 0Z' />
      <path d='M188 171v15' />
      <path d='M164 190c10 8 20 11 29 11 10 0 20-4 29-12' />
      <path d='M54 70l-18-10' />
      <path d='M75 51l-8-20' />
      <path d='M287 53l9-19' />
      <path d='M306 70l18-8' />
      <path d='M37 184l-20 2' />
      <path d='M325 181l19 2' />
    </g>
    <circle cx='119' cy='183' r='19' fill='#f5c9dc' opacity='0.82' />
    <circle cx='246' cy='181' r='19' fill='#f5c9dc' opacity='0.82' />
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
        <div className='mb-2 w-full max-w-[340px] text-[#9a6736] dark:text-[#d8b58a]'>
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
