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
  const subscriberCount = siteConfig('CLAUDE_SUBSCRIBER_COUNT', '', CONFIG)
  const copyrightDate =
    parseInt(since) < currentYear ? since + '-' + currentYear : currentYear

  return (
    <footer className='claude-footer'>
      <DarkModeButton className='mb-3' />

      {statsEnable && (
        <div className='mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs'>
          <span
            className='busuanzi_container_site_uv'
            style={{ display: 'none' }}>
            <i className='fas fa-user mr-1' />
            访客 <span className='busuanzi_value_site_uv'>--</span>
          </span>
          <span
            className='busuanzi_container_site_pv'
            style={{ display: 'none' }}>
            <i className='fas fa-eye mr-1' />
            访问 <span className='busuanzi_value_site_pv'>--</span>
          </span>
          {subscriberCount !== '' && subscriberCount !== null && (
            <span>
              <i className='fas fa-rss mr-1' />
              订阅 {subscriberCount}
            </span>
          )}
        </div>
      )}

      <div>
        {customCopyright || `© ${copyrightDate} ${siteConfig('AUTHOR')}`}
      </div>
    </footer>
  )
}
