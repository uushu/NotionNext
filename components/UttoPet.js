import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ORIGINAL_ASSET_BASE = '/pet/utto'
const SLOW_ASSET_BASE = `${ORIGINAL_ASSET_BASE}/slow`
const POSITION_STORAGE_KEY = 'utto-pet-position-v2'
const COLLAPSED_STORAGE_KEY = 'utto-pet-collapsed'

const PET_STATES = {
  idle: {
    src: `${SLOW_ASSET_BASE}/idle.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/idle.gif`,
    label: '一起学习吧'
  },
  reading: {
    src: `${SLOW_ASSET_BASE}/reading.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/reading.gif`,
    label: '认真看一会儿'
  },
  exploring: {
    src: `${SLOW_ASSET_BASE}/exploring.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/exploring.gif`,
    label: '去看看别的内容'
  },
  bored: {
    src: `${SLOW_ASSET_BASE}/bored.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/bored.gif`,
    label: '发会儿呆'
  },
  break: {
    src: `${SLOW_ASSET_BASE}/break.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/break.gif`,
    label: '喝口水再继续'
  },
  sleep: {
    src: `${SLOW_ASSET_BASE}/sleep.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/sleep.gif`,
    label: '先眯一会儿'
  },
  interact: {
    src: `${SLOW_ASSET_BASE}/interact.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/interact.gif`,
    label: '嗨，我在呢'
  },
  annoyed: {
    src: `${SLOW_ASSET_BASE}/annoyed.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/annoyed.gif`,
    label: '轻一点戳我'
  },
  success: {
    src: `${SLOW_ASSET_BASE}/success.gif`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/success.gif`,
    label: '这篇读完啦'
  },
  fatalError: {
    src: `${ORIGINAL_ASSET_BASE}/fatal-error.webp`,
    fallbackSrc: `${ORIGINAL_ASSET_BASE}/fatal-error.png`,
    label: '这里好像走丢了'
  }
}

const BASE_STATE_NAMES = new Set(['idle', 'reading', 'exploring', 'fatalError'])
const INACTIVE_STATE_NAMES = new Set(['bored', 'break', 'sleep'])
const IDLE_STAGES = [
  [90000, 'bored'],
  [210000, 'break'],
  [420000, 'sleep']
]

const normalizePath = value => {
  const rawPath = String(value || '/').split('?')[0].split('#')[0]
  return rawPath || '/'
}

const getContentType = pageProps =>
  String(
    pageProps?.post?.type ||
      pageProps?.page?.type ||
      pageProps?.post?.pageType ||
      ''
  ).toLowerCase()

const getRouteState = ({ asPath, pathname, pageProps }) => {
  const path = normalizePath(asPath)
  const contentType = getContentType(pageProps)

  if (pathname === '/404' || path === '/404') return 'fatalError'
  if (path === '/') return 'idle'

  if (/^\/(category|tag|archive|search)(\/|$)/i.test(path)) {
    return 'exploring'
  }

  if (contentType === 'post') return 'reading'

  if (
    ['page', 'menu', 'submenu', 'notice'].includes(contentType) ||
    /^\/(about|portfolio|en)(\/|$)/i.test(path)
  ) {
    return 'idle'
  }

  // 动态文章页通常会带 post 数据；无法判断时保持安静的待机状态，
  // 避免把关于页或自定义页面误判成“阅读中”。
  return pageProps?.post?.title ? 'reading' : 'idle'
}

const getPetSize = () => (window.innerWidth <= 768 ? 84 : 112)

const clampPosition = position => {
  const size = getPetSize()
  const margin = 8
  return {
    x: Math.min(
      Math.max(position.x, margin),
      Math.max(margin, window.innerWidth - size - margin)
    ),
    y: Math.min(
      Math.max(position.y, margin),
      Math.max(margin, window.innerHeight - size - margin)
    )
  }
}

const getDefaultPosition = () => {
  const size = getPetSize()
  return clampPosition({
    x: window.innerWidth - size - 18,
    y: window.innerHeight - size - 76
  })
}

/**
 * Claude 主题全站灵宠。
 * 页面状态、停留时间、互动、阅读进度和拖动位置均独立管理，
 * 避免鼠标移动或滚动时频繁重置 GIF。
 */
export default function UttoPet({ enabled = true, pageProps = {} }) {
  const router = useRouter()
  const [stateName, setStateName] = useState('idle')
  const [collapsed, setCollapsed] = useState(false)
  const [position, setPosition] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [dragging, setDragging] = useState(false)

  const stateNameRef = useRef('idle')
  const positionRef = useRef(null)
  const baseStateRef = useRef('idle')
  const idleTimersRef = useRef([])
  const transientTimerRef = useRef(null)
  const transientRef = useRef(false)
  const successPlayedRef = useRef(false)
  const clickTimesRef = useRef([])
  const dragRef = useRef(null)
  const lastActivityRef = useRef(0)

  const setPetState = useCallback(nextState => {
    stateNameRef.current = nextState
    setStateName(nextState)
  }, [])

  const updatePosition = useCallback(nextPosition => {
    const clamped = clampPosition(nextPosition)
    positionRef.current = clamped
    setPosition(clamped)
    return clamped
  }, [])

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
          setPetState(nextState)
        }
      }, delay)
    )
  }, [clearIdleTimers, collapsed, setPetState])

  const playTransient = useCallback(
    (nextState, duration) => {
      if (baseStateRef.current === 'fatalError') return

      clearIdleTimers()
      if (transientTimerRef.current) {
        window.clearTimeout(transientTimerRef.current)
      }

      transientRef.current = true
      setPetState(nextState)

      transientTimerRef.current = window.setTimeout(() => {
        transientRef.current = false
        transientTimerRef.current = null
        setPetState(baseStateRef.current)
        scheduleIdleStates()
      }, duration)
    },
    [clearIdleTimers, scheduleIdleStates, setPetState]
  )

  const recordActivity = useCallback(
    (force = false) => {
      if (
        collapsed ||
        transientRef.current ||
        baseStateRef.current === 'fatalError'
      ) {
        return
      }

      const now = Date.now()
      if (!force && now - lastActivityRef.current < 1200) return
      lastActivityRef.current = now

      if (INACTIVE_STATE_NAMES.has(stateNameRef.current)) {
        setPetState(baseStateRef.current)
      }
      scheduleIdleStates()
    },
    [collapsed, scheduleIdleStates, setPetState]
  )

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    setViewportWidth(window.innerWidth)
    const storedCollapsed = window.localStorage.getItem(COLLAPSED_STORAGE_KEY)
    if (storedCollapsed === 'true') setCollapsed(true)

    let initialPosition = getDefaultPosition()
    try {
      const storedPosition = JSON.parse(
        window.localStorage.getItem(POSITION_STORAGE_KEY) || 'null'
      )
      if (
        storedPosition &&
        Number.isFinite(storedPosition.x) &&
        Number.isFinite(storedPosition.y)
      ) {
        initialPosition = clampPosition(storedPosition)
      }
    } catch {}
    updatePosition(initialPosition)

    Object.values(PET_STATES).forEach(({ src, fallbackSrc }) => {
      const image = new window.Image()
      image.src = src
      const fallbackImage = new window.Image()
      fallbackImage.src = fallbackSrc
    })

    const handleResize = () => {
      setViewportWidth(window.innerWidth)
      updatePosition(positionRef.current || getDefaultPosition())
    }
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [enabled, updatePosition])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const nextBaseState = getRouteState({
      asPath: router.asPath,
      pathname: router.pathname,
      pageProps
    })

    baseStateRef.current = nextBaseState
    successPlayedRef.current = false
    transientRef.current = false
    clickTimesRef.current = []

    clearIdleTimers()
    if (transientTimerRef.current) {
      window.clearTimeout(transientTimerRef.current)
      transientTimerRef.current = null
    }

    setPetState(nextBaseState)
    scheduleIdleStates()
  }, [
    clearIdleTimers,
    enabled,
    pageProps,
    router.asPath,
    router.pathname,
    scheduleIdleStates,
    setPetState
  ])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const handleScroll = () => {
      recordActivity()

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
        currentBottom >= documentHeight - 120
      ) {
        successPlayedRef.current = true
        playTransient('success', 4200)
      }
    }

    const activityEvents = ['pointerdown', 'keydown', 'touchstart']
    const handleActivity = () => recordActivity()
    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, handleActivity, { passive: true })
    })
    window.addEventListener('scroll', handleScroll, { passive: true })

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!transientRef.current && baseStateRef.current !== 'fatalError') {
          clearIdleTimers()
          setPetState('sleep')
        }
      } else {
        recordActivity(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity)
      })
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    clearIdleTimers,
    enabled,
    playTransient,
    recordActivity,
    setPetState
  ])

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

  const state = PET_STATES[stateName] || PET_STATES.idle
  const isSpeaking = !BASE_STATE_NAMES.has(stateName)
  const bubbleSide = useMemo(() => {
    if (!position || !viewportWidth) return 'left'
    return position.x + getPetSize() / 2 > viewportWidth / 2 ? 'left' : 'right'
  }, [position, viewportWidth])

  if (!enabled) return null

  const playClickReaction = () => {
    const now = Date.now()
    const recentClicks = clickTimesRef.current.filter(time => now - time < 2200)
    recentClicks.push(now)
    clickTimesRef.current = recentClicks

    if (recentClicks.length >= 4) {
      clickTimesRef.current = []
      playTransient('annoyed', 3600)
      return
    }

    playTransient('interact', 2600)
  }

  const handlePointerDown = event => {
    if (!event.isPrimary) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.stopPropagation()
    const currentPosition = positionRef.current || getDefaultPosition()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: currentPosition.x,
      originY: currentPosition.y,
      moved: false
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) >= 6) {
      drag.moved = true
      setDragging(true)
      clearIdleTimers()
    }

    if (drag.moved) {
      event.preventDefault()
      updatePosition({ x: drag.originX + dx, y: drag.originY + dy })
    }
  }

  const finishPointer = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {}

    dragRef.current = null
    setDragging(false)

    if (drag.moved) {
      const finalPosition = positionRef.current || getDefaultPosition()
      window.localStorage.setItem(
        POSITION_STORAGE_KEY,
        JSON.stringify(finalPosition)
      )
      recordActivity(true)
      return
    }

    playClickReaction()
  }

  const cancelPointer = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    recordActivity(true)
  }

  const hidePet = event => {
    event.stopPropagation()
    setCollapsed(true)
    clearIdleTimers()
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, 'true')
  }

  const showPet = () => {
    setCollapsed(false)
    setPetState(baseStateRef.current)
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, 'false')
    window.setTimeout(() => recordActivity(true), 0)
  }

  const handleImageError = event => {
    const image = event.currentTarget
    if (image.dataset.usedFallback === 'true') return
    image.dataset.usedFallback = 'true'
    image.src = state.fallbackSrc
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
        className={`utto-pet ${isSpeaking ? 'utto-pet--speaking' : ''} ${
          dragging ? 'utto-pet--dragging' : ''
        }`}
        data-state={stateName}
        data-side={bubbleSide}
        style={
          position
            ? {
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`
              }
            : undefined
        }
        aria-label='utto 灵宠'>
        <div className='utto-pet__bubble' aria-live='polite'>
          {state.label}
        </div>

        <button
          type='button'
          className='utto-pet__button'
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={cancelPointer}
          aria-label={`utto 灵宠：${state.label}`}
          title='拖动可以移动，点一下可以互动'>
          <img
            key={stateName}
            className='utto-pet__image'
            src={state.src}
            alt=''
            draggable='false'
            onError={handleImageError}
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
        left: 0;
        top: 0;
        z-index: 80;
        width: 112px;
        height: 112px;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        will-change: transform;
      }

      .utto-pet__button {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 104px;
        height: 104px;
        padding: 0;
        border: 0;
        border-radius: 30px;
        background: transparent;
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        animation: utto-pet-float 5.2s ease-in-out infinite;
      }

      .utto-pet--dragging .utto-pet__button {
        cursor: grabbing;
        animation-play-state: paused;
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
        animation: utto-pet-state-in 260ms ease-out both;
        transition:
          transform 180ms ease,
          filter 180ms ease;
      }

      .utto-pet__button:hover .utto-pet__image {
        transform: translateY(-2px) scale(1.035);
        filter: drop-shadow(0 10px 18px rgba(76, 48, 34, 0.2));
      }

      .utto-pet__button:active .utto-pet__image {
        transform: scale(0.96);
      }

      .utto-pet__bubble {
        position: absolute;
        bottom: 72px;
        width: max-content;
        max-width: 176px;
        padding: 8px 11px;
        border: 1px solid rgba(190, 160, 142, 0.32);
        background: rgba(255, 255, 255, 0.84);
        color: #60483a;
        box-shadow: 0 8px 24px rgba(72, 48, 36, 0.12);
        backdrop-filter: blur(12px) saturate(135%);
        -webkit-backdrop-filter: blur(12px) saturate(135%);
        font-size: 13px;
        line-height: 1.35;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(5px) scale(0.96);
        transition:
          opacity 180ms ease,
          transform 180ms ease;
        pointer-events: none;
      }

      .utto-pet[data-side='left'] .utto-pet__bubble {
        right: 92px;
        border-radius: 14px 14px 4px 14px;
        transform-origin: right bottom;
      }

      .utto-pet[data-side='right'] .utto-pet__bubble {
        left: 92px;
        border-radius: 14px 14px 14px 4px;
        transform-origin: left bottom;
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
      .utto-pet:focus-within .utto-pet__close,
      .utto-pet--dragging .utto-pet__close {
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
          transform: translateY(-4px);
        }
      }

      @keyframes utto-pet-state-in {
        from {
          opacity: 0.45;
          transform: scale(0.96);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @media (max-width: 768px) {
        .utto-pet {
          width: 84px;
          height: 84px;
        }

        .utto-pet__button {
          width: 78px;
          height: 78px;
          border-radius: 22px;
        }

        .utto-pet__bubble {
          bottom: 53px;
          max-width: 136px;
          padding: 7px 9px;
          font-size: 12px;
        }

        .utto-pet[data-side='left'] .utto-pet__bubble {
          right: 68px;
        }

        .utto-pet[data-side='right'] .utto-pet__bubble {
          left: 68px;
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
        .utto-pet__button,
        .utto-pet__image {
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
