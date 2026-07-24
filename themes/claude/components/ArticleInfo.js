import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { formatDateFmt } from '@/lib/utils/formatDate'
import NotionIcon from '@/components/NotionIcon'
import { useRouter } from 'next/router'
import CONFIG from '../config'

/**
 * 文章描述
 * @param {*} props
 * @returns
 */
export default function ArticleInfo(props) {
  const { post } = props
  const router = useRouter()
  const statsEnable = siteConfig('CLAUDE_STATS_ENABLE', true, CONFIG)
  const sourceType = Array.isArray(router.query.from)
    ? router.query.from[0]
    : router.query.from
  const sourceValue = Array.isArray(router.query.source)
    ? router.query.source[0]
    : router.query.source

  const hasExplicitParent =
    Boolean(sourceValue) && (sourceType === 'tag' || sourceType === 'category')

  let parentPath = ''

  if (sourceType === 'tag' && sourceValue) {
    parentPath = `/tag/${encodeURIComponent(sourceValue)}`
  } else if (sourceType === 'category' && sourceValue) {
    parentPath = `/category/${encodeURIComponent(sourceValue)}`
  }

  const handleBack = () => {
    const fallbackPath = post?.category
      ? `/category/${encodeURIComponent(post.category)}`
      : '/category'

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackPath)
    }
  }

  const backButtonClass =
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[var(--primary-color)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200'

  return (
    <section className='mt-2 text-gray-600 dark:text-gray-400 leading-8'>
      {post?.type === 'Post' && (
        <div className='mb-6'>
          {hasExplicitParent ? (
            <SmartLink href={parentPath} className={backButtonClass}>
              <i className='fas fa-arrow-left text-xs' />
              <span>返回</span>
            </SmartLink>
          ) : (
            <button
              type='button'
              onClick={handleBack}
              className={backButtonClass}
            >
              <i className='fas fa-arrow-left text-xs' />
              <span>返回</span>
            </button>
          )}
        </div>
      )}

      <h2 className='blog-item-title mb-5 font-bold text-black dark:text-white text-4xl no-underline'>
        {siteConfig('POST_TITLE_ICON') && <NotionIcon icon={post?.pageIcon} />}
        {post?.title}
      </h2>

      <div className='flex flex-wrap text-[var(--primary-color)] dark:text-gray-300'>
        {post?.type !== 'Page' && (
          <header className='text-md text-[var(--primary-color)] dark:text-gray-300 flex-wrap flex items-center gap-x-2 leading-6'>
            <span className='text-sm'>
              发布于
              <SmartLink
                className='p-1 hover:text-red-400 transition-all duration-200'
                href={`/archive#${formatDateFmt(post?.publishDate, 'yyyy-MM')}`}
              >
                {post.date?.start_date || post.createdTime}
              </SmartLink>
            </span>

            {statsEnable && (
              <span className='busuanzi_container_page_pv text-sm'>
                <i className='fas fa-eye mr-1' />
                阅读 <span className='busuanzi_value_page_pv'>--</span>
              </span>
            )}

            <div className='text-sm'>
              {post?.tags &&
                post?.tags?.length > 0 &&
                post?.tags.map(t => (
                  <SmartLink
                    key={t}
                    href={`/tag/${t}`}
                    className='hover:text-red-400 transition-all duration-200'
                  >
                    <span> #{t}</span>
                  </SmartLink>
                ))}
            </div>
          </header>
        )}
      </div>
    </section>
  )
}
