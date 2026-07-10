import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import Head from 'next/head'

const Rabbit404Illustration = () => (
  <div className='relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-[36px] border border-[#dcc9b8]/70 bg-[#f8f1e8]/85 shadow-[0_18px_50px_rgba(98,72,50,0.12)] backdrop-blur-sm dark:border-white/10 dark:bg-[#2b2723]/80 dark:shadow-[0_18px_55px_rgba(0,0,0,0.28)]'>
    <div className='absolute inset-x-10 bottom-7 h-12 rounded-full bg-[#d9b99a]/25 blur-xl dark:bg-[#d7b28e]/15' />
    <picture className='relative z-10 block h-[86%] w-[86%]'>
      <source srcSet='/pet/utto/fatal-error.webp' type='image/webp' />
      <img
        src='/pet/utto/fatal-error.png'
        alt='迷路的 utto 兔子'
        className='h-full w-full object-contain drop-shadow-[0_12px_16px_rgba(87,61,42,0.16)]'
        draggable='false'
      />
    </picture>
  </div>
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
        <div className='mb-5 w-full'>
          <Rabbit404Illustration />
        </div>

        <h1 className='mb-2 text-6xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-7xl'>
          404
        </h1>
        <p className='mb-2 text-base font-medium text-[#6b4f3b] dark:text-[#e7cdb6] md:text-lg'>
          utto兔子好像走错路了
        </p>
        <p className='mb-7 text-sm text-gray-500 dark:text-gray-400'>
          这个页面不存在，或者已经被移动到别处。
        </p>

        <nav
          aria-label='404 页面导航'
          className='flex flex-wrap items-center justify-center gap-3'>
          {links.map(link => (
            <SmartLink
              key={link.href}
              href={link.href}
              className='inline-flex items-center rounded-xl border border-[#d8c7b7] bg-white/80 px-4 py-2 text-sm font-medium text-[#654b38] shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#b99575] hover:bg-[#fffaf5] hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-[#ead8c8] dark:hover:border-white/20 dark:hover:bg-white/10'>
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
