import { siteConfig } from '@/lib/config'
import DarkModeButton from './DarkModeButton'
import CONFIG from '../config'

/**
 * 页脚 — 紧凑风格
 */
export default function Footer(props) {
  const d = new Date()
  const currentYear = d.getFullYear()
  const since = siteConfig('SINCE')
  const customCopyright = siteConfig('CLAUDE_FOOTER_COPYRIGHT', '', CONFIG)
  const statsEnable = siteConfig('CLAUDE_STATS_ENABLE', true, CONFIG)
  const copyrightDate =
    parseInt(since) < currentYear ? since + '-' + currentYear : currentYear

  return (
    <footer className='claude-footer'>
      <DarkModeButton className='mb-3' />

      {statsEnable && (
        <div className='mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs'>
          <span
            className='busuanzi_container_site_pv'
            title='访问量'
            aria-label='访问量'
          >
            <i className='fas fa-eye mr-1' aria-hidden='true' />
            <span className='busuanzi_value_site_pv'>--</span>
          </span>
          <span
            className='busuanzi_container_site_uv'
            title='访客数'
            aria-label='访客数'
          >
            <i className='fas fa-user mr-1' aria-hidden='true' />
            <span className='busuanzi_value_site_uv'>--</span>
          </span>
        </div>
      )}

      <div>
        {customCopyright || `© ${copyrightDate} ${siteConfig('AUTHOR')}`}
      </div>
    </footer>
  )
}
