import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ORIGINAL_ASSET_BASE = '/pet/utto'
const SLOW_ASSET_BASE = `${ORIGINAL_ASSET_BASE}/slow`
const POSITION_STORAGE_KEY = 'utto-pet-position-v2'
const COLLAPSED_STORAGE_KEY = 'utto-pet-collapsed'
const VISUAL_TRANSITION_MS = 240

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

const retainedAssets = new Map()
const assetPromises = new Map()

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

const getRouteState = ({ asPath, pathname, contentType, hasPostTitle }) => {
  const path = normalizePath(asPath)

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

  return hasPostTitle ? 'reading' : 'idle'
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

const loadImage = src =>
  new Promise((resolve, reject) => {
    const image = new window.Image()
    image.decoding = 'async'
    image.onload = async () => {
      try {
        await image.decode?.()
      } catch {}
      resolve({ image, src })
    }
    image.onerror = reject
    image.src = src
  })

const preparePetAsset = stateName => {
  const state = PET_STATES[stateName] || PET_STATES.idle
  if (typeof window === 'undefined') return Promise.resolve(state.src)

  if (retainedAssets.has(stateName)) {
    return Promise.resolve(retainedAssets.get(stateName).src)
  }

  if (assetPromises.has(stateName)) {
    return assetPromises.get(stateName)
  }

  const promise = loadImage(state.src)
    .catch(() => loadImage(state.fallbackSrc))
    .then(asset => {
      retainedAssets.set(stateName, asset)
      assetPromises.delete(stateName)
      return asset.src
    })
    .catch(() => {
      assetPromises.delete(stateName)
      return state.fallbackSrc
    })

  assetPromises.set(stateName, promise)
  return promise
}

/**
 * Claude 主题全站灵宠。
 * GIF 会先完成首帧解码再切换，并在短暂交叉淡入期间保留旧状态；
 * 拖动位移直接写入 DOM，每帧最多更新一次，避免连续 React 重渲染。
 */
export default function UttoPet({ enabled = true, pageProps = {} }) {
  const router = useRouter()
  const [stateName, setStateName] = useState('idle')
  const [collapsed, setCollapsed] = useState(false)
  const [position, setPosition] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [visual, setVisual] = useState({
    name: 'idle',
    src: PET_STATES.idle.src
  })
  const [outgoingVisual, setOutgoingVisual] = useState(null)

  const petElementRef = useRef(null)
  const stateNameRef = useRef('idle')
  const positionRef = useRef(null)
  const baseStateRef = useRef('idle')
  const idleTimersRef = useRef([])
  const transientTimerRef = useRef(null)
  const transientRef = useRef(false)
  const successPlayedRef = useRef(false)
  const clickTimesRef = useRef([])
  const dragRef = useRef(null)
  const dragFrameRef = useRef(0)
  const lastActivityRef = useRef(0)
  const visualRef = useRef({
    name: 'idle',
    src: PET_STATES.idle.src
  })
  const visualRequestRef = useRef(0)
  const visualTransitionTimerRef = useRef(null)

  const contentType = getContentType(pageProps)
  const hasPostTitle = Boolean(pageProps?.post?.title)
  const routeState = useMemo(
    () =>
      getRouteState({
        asPath: router.asPath,
        pathname: router.pathname,
        contentType,
        hasPostTitle
      }),
    [contentType, hasPostTitle, router.asPath, router.pathname]
  )

  const setPetState = useCallback(nextState => {
    const normalizedState = PET_STATES[nextState] ? nextState : 'idle'
    if (stateNameRef.current === normalizedState) return
    stateNameRef.current = normalizedState
    setStateName(normalizedState)
  }, [])

  const applyPosition = useCallback((nextPosition, commit = false) => {
    const clamped = clampPosition(nextPosition)
    positionRef.current = clamped

    const petElement = petElementRef.current
    if (petElement) {
      petElement.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`
      petElement.dataset.side =
        clamped.x + getPetSize() / 2 > window.innerWidth / 2 ? 'left' : 'right'
    }

    if (commit) setPosition(clamped)
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
    applyPosition(initialPosition, true)

    const priorityStates = ['idle', 'reading', 'exploring', 'interact', 'annoyed']
    priorityStates.forEach(preparePetAsset)

    const preloadRemaining = () => {
      Object.keys(PET_STATES)
        .filter(name => !priorityStates.includes(name))
        .forEach(preparePetAsset)
    }

    const idleCallbackId = window.requestIdleCallback?.(preloadRemaining, {
      timeout: 1800
    })
    const preloadTimer = window.requestIdleCallback
      ? null
      : window.setTimeout(preloadRemaining, 500)

    const handleResize = () => {
      setViewportWidth(window.innerWidth)
      applyPosition(positionRef.current || getDefaultPosition(), true)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (idleCallbackId) window.cancelIdleCallback?.(idleCallbackId)
      if (preloadTimer) window.clearTimeout(preloadTimer)
    }
  }, [applyPosition, enabled])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined
    if (stateName === visualRef.current.name) return undefined

    const requestId = ++visualRequestRef.current
    let cancelled = false

    preparePetAsset(stateName).then(src => {
      if (cancelled || requestId !== visualRequestRef.current) return

      const previousVisual = visualRef.current
      const nextVisual = { name: stateName, src }

      setOutgoingVisual(previousVisual)
      visualRef.current = nextVisual
      setVisual(nextVisual)

      if (visualTransitionTimerRef.current) {
        window.clearTimeout(visualTransitionTimerRef.current)
      }
      visualTransitionTimerRef.current = window.setTimeout(() => {
        setOutgoingVisual(null)
        visualTransitionTimerRef.current = null
      }, VISUAL_TRANSITION_MS + 40)
    })

    return () => {
      cancelled = true
    }
  }, [enabled, stateName])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    baseStateRef.current = routeState
    successPlayedRef.current = false
    transientRef.current = false
    clickTimesRef.current = []

    clearIdleTimers()
    if (transientTimerRef.current) {
      window.clearTimeout(transientTimerRef.current)
      transientTimerRef.current = null
    }

    setPetState(routeState)
    scheduleIdleStates()
  }, [
    clearIdleTimers,
    enabled,
    routeState,
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
      if (visualTransitionTimerRef.current) {
        window.clearTimeout(visualTransitionTimerRef.current)
        visualTransitionTimerRef.current = null
      }
      if (dragFrameRef.current) {
        window.cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = 0
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
      moved: false,
      pendingPosition: currentPosition
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

    if (!drag.moved) return

    event.preventDefault()
    drag.pendingPosition = {
      x: drag.originX + dx,
      y: drag.originY + dy
    }

    if (dragFrameRef.current) return
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = 0
      const activeDrag = dragRef.current
      if (activeDrag?.pendingPosition) {
        applyPosition(activeDrag.pendingPosition)
      }
    })
  }

  const finishPointer = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {}

    if (dragFrameRef.current) {
      window.cancelAnimationFrame(dragFrameRef.current)
      dragFrameRef.current = 0
    }

    if (drag.moved && drag.pendingPosition) {
      applyPosition(drag.pendingPosition)
    }

    dragRef.current = null
    setDragging(false)

    if (drag.moved) {
      const finalPosition = positionRef.current || getDefaultPosition()
      setPosition(finalPosition)
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

    if (dragFrameRef.current) {
      window.cancelAnimationFrame(dragFrameRef.current)
      dragFrameRef.current = 0
    }

    dragRef.current = null
    setDragging(false)
    setPosition(positionRef.current || getDefaultPosition())
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
    window.setTimeout(() => {
      applyPosition(positionRef.current || getDefaultPosition(), true)
      recordActivity(true)
    }, 0)
  }

  const handleImageError = (event, visualStateName) => {
    const image = event.currentTarget
    const fallbackSrc =
      PET_STATES[visualStateName]?.fallbackSrc || PET_STATES.idle.fallbackSrc
    if (image.dataset.usedFallback === 'true') return
    image.dataset.usedFallback = 'true'
    image.src = fallbackSrc
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
        ref={petElementRef}
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
          <span className='utto-pet__visual' aria-hidden='true'>
            {outgoingVisual && (
              <img
                key={`outgoing-${outgoingVisual.name}-${outgoingVisual.src}`}
                className='utto-pet__image utto-pet__image--outgoing'
                src={outgoingVisual.src}
                alt=''
                draggable='false'
                onError={event =>
                  handleImageError(event, outgoingVisual.name)
                }
              />
            )}
            <img
              key={`current-${visual.name}-${visual.src}`}
              className='utto-pet__image utto-pet__image--current'
              src={visual.src}
              alt=''
              draggable='false'
              onError={event => handleImageError(event, visual.name)}
            />
          </span>
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
        contain: layout style paint;
        will-change: transform;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
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

      .utto-pet__visual {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        pointer-events: none;
        filter: drop-shadow(0 8px 14px rgba(76, 48, 34, 0.14));
        transform: translateZ(0);
        transition:
          transform 180ms ease,
          filter 180ms ease;
        will-change: transform, filter;
      }

      .utto-pet__image {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        will-change: opacity, transform;
      }

      .utto-pet__image--current {
        z-index: 2;
        animation: utto-pet-state-in ${VISUAL_TRANSITION_MS}ms
          cubic-bezier(0.22, 0.8, 0.28, 1) both;
      }

      .utto-pet__image--outgoing {
        z-index: 1;
        animation: utto-pet-state-out ${VISUAL_TRANSITION_MS}ms ease-out both;
      }

      .utto-pet__button:hover .utto-pet__visual {
        transform: translateY(-2px) scale(1.035);
        filter: drop-shadow(0 10px 18px rgba(76, 48, 34, 0.2));
      }

      .utto-pet__button:active .utto-pet__visual {
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
        z-index: 3;
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
          opacity: 0;
          transform: scale(0.985);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes utto-pet-state-out {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(1.015);
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

        .utto-pet__image--outgoing {
          opacity: 0;
        }

        .utto-pet__visual,
        .utto-pet__image,
        .utto-pet__bubble,
        .utto-pet__close {
          transition: none !important;
        }
      }
    `}</style>
  )
}
