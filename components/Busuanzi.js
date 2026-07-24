import busuanzi from '@/lib/plugins/busuanzi'
import { useRouter } from 'next/router'
import { useGlobal } from '@/lib/global'
import { useEffect } from 'react'

export default function Busuanzi() {
  const { theme } = useGlobal()
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = () => {
      busuanzi.fetch()
    }

    busuanzi.fetch()
    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
      busuanzi.cancel()
    }
  }, [router.events])

  // Switching themes recreates the counter DOM, so restore the last known data
  // without recording an extra page view.
  useEffect(() => {
    if (theme) {
      busuanzi.renderCached()
    }
  }, [theme])

  return null
}
