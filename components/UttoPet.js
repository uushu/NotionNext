import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'

const ASSET_BASE = '/pet/utto'

const PET_STATES = {
  idle: {
    src: `${ASSET_BASE}/idle.gif`,
    label: '一起继续搭建吧'
  },
  reading: {
    src: `${ASSET_BASE}/reading.gif`,
    label: '认真阅读中'
  },
  exploring: {
    src: `${ASSET_BASE}/exploring.gif`,
    label: '正在探索'
  },
  bored: {
    src: `${ASSET_BASE}/bored.gif`,
    label: '稍微发会儿呆'
  },
  break: {
    src: `${ASSET_BASE}/break.gif`,
    label: '休息一下'
  },
  sleep: {
    src: `${ASSET_BASE}/sleep.gif`,
    label: '呼……'
  },
  interact: {
    src: `${ASSET_BASE}/interact.gif`,
    label: '我在这里'
  },
  annoyed: {
    src: `${ASSET_BASE}/annoyed.gif`,
    label: '不要一直戳我啦'
  },
  success: {
    src: `${ASSET_BASE}/success.gif`,
    label: '读完啦，很棒'
  },
  fatalError: {
    src: `${ASSET_BASE}/fatal-error.webp`,
    label: '这里好像走丢了'
  }
}

const BASE_STATE_NAMES = new Set(['idle', 'reading', 'exploring', 'fatalError'])
const IDLE_STAGES = [
  [45000, 'bored'],
  [90000, 'break'],
  [150000, 'sleep']
]

const normalizePath = value => {
  const rawPath = String(value || '/').split('?')[0].split('#')[0]
  return rawPath || '/'
}

const getRouteState = (asPath, pathname) => {
  const path = normalizePath(asPath)

  if (pathname === '/404' || path === '/404') return 'fatalError'
  if (path === '/') return 'idle'

  if (/^\/(category|tag|archive|search)(\/|$)/i.test(path)) {
    return 'exploring'
  }

  if (/^\/(about|en)(\/|$)/i.test(path)) {
    return 'idle'
  }

  return 'reading'
}

/**
 * Claude 主题全站灵宠。
 * 根据所在页面、停留时间、点击与阅读进度切换 utto 兔子的状态。
 */
export default function UttoPet({ enabled = true }) {
  const router = useRouter()
  const [stateName, setStateName] = useState('idle')
  const [collapsed, setCollapsed] = useState(false)

  const baseStateRef = useRef('idle')
  const idleTimersRef = useRef([])
  const transientTimerRef = useRef(null)
  const transientRef = useRef(false)
  const successPlayedRef = useRef(false)
  const clickTimesRef = useRef([])

  const clearIdleTimers = useCallback(() => {
    idleTimersRef.current.forEach(timer => window.clearTimeout(timer))
    idleTimersRef.current = []
  }, [])

  const scheduleIdleStates = useCallback(() => {
    clearIdleTimers()

    if (
      collapsed ||
      transientRef.current ||
      baseStateRef.current === 'fatalError'
    ) {
      return
    }

    idleTimersRef.current = IDLE_STAGES.map(([delay, nextState]) =>
      window.setTimeout(() => {
        if (!transientRef.current && !collapsed) {
          setStateName(nextState)
        }
      }, delay)
    )
  }, [clearIdleTimers, collapsed])

  const playTransient = useCallback(
    (nextState, duration) => {
      clearIdleTimers()

      if (transientTimerRef.current) {
        window.clearTimeout(transientTimerRef.current)
      }

      transientRef.current = true
      setStateName(nextState)

      transientTimerRef.current = window.setTimeout(() => {
        transientRef.current = false
        transientTimerRef.current = null
        setStateName(baseStateRef.current)
        scheduleIdleStates()
      }, duration)
    },
    [clearIdleTimers, scheduleIdleStates]
  )

  const resetActivity = useCallback(() => {
    if (
      collapsed ||
      transientRef.current ||
      baseStateRef.current === 'fatalError'
    ) {
      return
    }

    setStateName(baseStateRef.current)
    scheduleIdleStates()
  }, [collapsed, scheduleIdleStates])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const storedCollapsed = window.localStorage.getItem('utto-pet-collapsed')
    if (storedCollapsed === 'true') {
      setCollapsed(true)
    }

    const preloadSources = [
      PET_STATES.idle.src,
      PET_STATES.reading.src,
      PET_STATES.exploring.src,
      PET_STATES.interact.src
    ]

    preloadSources.forEach(src => {
      const image = new window.Image()
      image.src = src
    })

    return undefined
  }, [enabled])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const applyRouteState = url => {
      const nextBaseState = getRouteState(url, router.pathname)

      baseStateRef.current = nextBaseState
      successPlayedRef.current = false
      transientRef.current = false
      clickTimesRef.current = []

      clearIdleTimers()
      if (transientTimerRef.current) {
        window.clearTimeout(transientTimerRef.current)
        transientTimerRef.current = null
      }

      setStateName(nextBaseState)
      scheduleIdleStates()
    }

    applyRouteState(router.asPath)
    router.events.on('routeChangeComplete', applyRouteState)

    return () => {
      router.events.off('routeChangeComplete', applyRouteState)
    }
  }, [
    clearIdleTimers,
    enabled,
    router.asPath,
    router.events,
    router.pathname,
    scheduleIdleStates
  ])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const handleScroll = () => {
      resetActivity()

      if (
        baseStateRef.current !== 'reading' ||
        successPlayedRef.current ||
        transientRef.current
      ) {
        return
      }

      const documentHeight = document.documentElement.scrollHeight
      const currentBottom = window.scrollY + window.innerHeight

      if (
        documentHeight > window.innerHeight &&
        currentBottom >= documentHeight - 96
      ) {
        successPlayedRef.current = true
        playTransient('success', 2600)
      }
    }

    const activityEvents = ['pointermove', 'keydown', 'touchstart']
    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, resetActivity, { passive: true })
    })
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, resetActivity)
      })
      window.removeEventListener('scroll', handleScroll)
    }
  }, [enabled, playTransient, resetActivity])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    scheduleIdleStates()

    return () => {
      clearIdleTimers()
      if (transientTimerRef.current) {
        window.clearTimeout(transientTimerRef.current)
        transientTimerRef.current = null
      }
    }
  }, [clearIdleTimers, enabled, scheduleIdleStates])

  if (!enabled) return null

  const state = PET_STATES[stateName] || PET_STATES.idle
  const isSpeaking = !BASE_STATE_NAMES.has(stateName)

  const handlePetClick = event => {
    event.stopPropagation()

    const now = Date.now()
    const recentClicks = clickTimesRef.current.filter(time => now - time < 1200)
    recentClicks.push(now)
    clickTimesRef.current = recentClicks

    if (recentClicks.length >= 3) {
      clickTimesRef.current = []
      playTransient('annoyed', 1900)
      return
    }

    playTransient('interact', 1300)
  }

  const hidePet = event => {
    event.stopPropagation()
    setCollapsed(true)
    clearIdleTimers()
    window.localStorage.setItem('utto-pet-collapsed', 'true')
  }

  const showPet = () => {
    setCollapsed(false)
    setStateName(baseStateRef.current)
    window.localStorage.setItem('utto-pet-collapsed', 'false')
  }

  if (collapsed) {
    return (
      <>
        <button
          type='button'
          className='utto-pet-restore'
          onClick={showPet}
          aria-label='显示 utto 灵宠'
          title='显示 utto 灵宠'>
          🐇
        </button>
        <PetStyles />
      </>
    )
  }

  return (
    <>
      <aside
        className={`utto-pet ${isSpeaking ? 'utto-pet--speaking' : ''}`}
        data-state={stateName}
        aria-label='utto 灵宠'>
        <div className='utto-pet__bubble' aria-live='polite'>
          {state.label}
        </div>

        <button
          type='button'
          className='utto-pet__button'
          onClick={handlePetClick}
          aria-label={`utto 灵宠：${state.label}`}
          title='点一点 utto'>
          <img
            className='utto-pet__image'
            src={state.src}
            alt=''
            draggable='false'
          />
        </button>

        <button
          type='button'
          className='utto-pet__close'
          onClick={hidePet}
          aria-label='收起 utto 灵宠'
          title='收起'>
          ×
        </button>
      </aside>
      <PetStyles />
    </>
  )
}

function PetStyles() {
  return (
    <style jsx global>{`
      .utto-pet {
        position: fixed;
        right: 18px;
        bottom: 76px;
        z-index: 80;
        width: 104px;
        height: 104px;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
      }

      .utto-pet__button {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 96px;
        height: 96px;
        padding: 0;
        border: 0;
        border-radius: 28px;
        background: transparent;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        animation: utto-pet-float 3.8s ease-in-out infinite;
      }

      .utto-pet__button:focus-visible,
      .utto-pet-restore:focus-visible,
      .utto-pet__close:focus-visible {
        outline: 2px solid rgba(226, 139, 112, 0.78);
        outline-offset: 3px;
      }

      .utto-pet__image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        filter: drop-shadow(0 8px 14px rgba(76, 48, 34, 0.14));
        transition:
          transform 180ms ease,
          filter 180ms ease;
      }

      .utto-pet__button:hover .utto-pet__image {
        transform: translateY(-2px) scale(1.035);
        filter: drop-shadow(0 10px 18px rgba(76, 48, 34, 0.2));
      }

      .utto-pet__button:active .utto-pet__image {
        transform: scale(0.94);
      }

      .utto-pet__bubble {
        position: absolute;
        right: 82px;
        bottom: 66px;
        width: max-content;
        max-width: 168px;
        padding: 8px 11px;
        border: 1px solid rgba(190, 160, 142, 0.32);
        border-radius: 14px 14px 4px 14px;
        background: rgba(255, 255, 255, 0.82);
        color: #60483a;
        box-shadow: 0 8px 24px rgba(72, 48, 36, 0.12);
        backdrop-filter: blur(12px) saturate(135%);
        -webkit-backdrop-filter: blur(12px) saturate(135%);
        font-size: 13px;
        line-height: 1.35;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(5px) scale(0.96);
        transform-origin: right bottom;
        transition:
          opacity 180ms ease,
          transform 180ms ease;
        pointer-events: none;
      }

      .utto-pet:hover .utto-pet__bubble,
      .utto-pet:focus-within .utto-pet__bubble,
      .utto-pet--speaking .utto-pet__bubble {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .utto-pet__close {
        position: absolute;
        top: 1px;
        right: 1px;
        z-index: 2;
        width: 22px;
        height: 22px;
        padding: 0 0 2px;
        border: 1px solid rgba(162, 132, 116, 0.25);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        color: rgba(85, 65, 55, 0.74);
        font-size: 16px;
        line-height: 18px;
        cursor: pointer;
        pointer-events: auto;
        opacity: 0;
        transform: scale(0.82);
        transition:
          opacity 160ms ease,
          transform 160ms ease;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .utto-pet:hover .utto-pet__close,
      .utto-pet:focus-within .utto-pet__close {
        opacity: 1;
        transform: scale(1);
      }

      .utto-pet-restore {
        position: fixed;
        right: 18px;
        bottom: 82px;
        z-index: 80;
        width: 42px;
        height: 42px;
        padding: 0;
        border: 1px solid rgba(190, 160, 142, 0.34);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 8px 22px rgba(72, 48, 36, 0.13);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        cursor: pointer;
        font-size: 21px;
        line-height: 1;
        -webkit-tap-highlight-color: transparent;
      }

      html.dark .utto-pet__bubble,
      .dark .utto-pet__bubble,
      [data-theme='dark'] .utto-pet__bubble,
      html.dark .utto-pet__close,
      .dark .utto-pet__close,
      [data-theme='dark'] .utto-pet__close,
      html.dark .utto-pet-restore,
      .dark .utto-pet-restore,
      [data-theme='dark'] .utto-pet-restore {
        border-color: rgba(255, 255, 255, 0.16);
        background: rgba(35, 34, 33, 0.76);
        color: rgba(255, 248, 241, 0.88);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
      }

      @keyframes utto-pet-float {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
      }

      @media (max-width: 768px) {
        .utto-pet {
          right: 9px;
          bottom: 70px;
          width: 78px;
          height: 78px;
        }

        .utto-pet__button {
          width: 72px;
          height: 72px;
          border-radius: 22px;
        }

        .utto-pet__bubble {
          right: 62px;
          bottom: 49px;
          max-width: 132px;
          padding: 7px 9px;
          font-size: 12px;
        }

        .utto-pet__close {
          top: -2px;
          right: -1px;
          width: 20px;
          height: 20px;
          opacity: 0.9;
          transform: scale(1);
          font-size: 14px;
        }

        .utto-pet-restore {
          right: 10px;
          bottom: 76px;
          width: 38px;
          height: 38px;
          font-size: 19px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .utto-pet__button {
          animation: none !important;
        }

        .utto-pet__image,
        .utto-pet__bubble,
        .utto-pet__close {
          transition: none !important;
        }
      }
    `}</style>
  )
}
