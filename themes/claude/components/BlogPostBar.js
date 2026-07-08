import SmartLink from '@/components/SmartLink'
import { useGlobal } from '@/lib/global'

/**
 * 文章列表上方嵌入
 * @param {*} props
 * @returns
 */
export default function BlogPostBar(props) {
  const { tag, category } = props
  const { locale } = useGlobal()

  if (tag) {
    return (
      <div className='mb-6'>
        <SmartLink
          href='/tag'
          className='mb-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[var(--primary-color)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200'>
          <i className='fas fa-arrow-left text-xs' />
          <span>返回全部标签</span>
        </SmartLink>
        <div className='flex items-center text-xl py-2'>
          <i className='mr-2 fas fa-tag' />
          {locale.COMMON.TAGS}: {tag}
        </div>
      </div>
    )
  } else if (category) {
    return (
      <div className='mb-6'>
        <SmartLink
          href='/category'
          className='mb-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[var(--primary-color)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200'>
          <i className='fas fa-arrow-left text-xs' />
          <span>返回全部分类</span>
        </SmartLink>
        <div className='flex items-center text-xl py-2'>
          <i className='mr-2 fas fa-th' />
          {locale.COMMON.CATEGORY}: {category}
        </div>
      </div>
    )
  } else {
    return <></>
  }
}
