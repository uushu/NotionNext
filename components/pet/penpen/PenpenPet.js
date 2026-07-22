import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PetStyles from './PetStyles'
import {
  BASE_STATE_NAMES,
  COLLAPSED_STORAGE_KEY,
  IDLE_STAGES,
  INACTIVE_STATE_NAMES,
  LEGACY_COLLAPSED_STORAGE_KEY,
  LEGACY_POSITION_STORAGE_KEY,
  NEEDS_STORAGE_KEY,
  PET_STATES,
  POSITION_STORAGE_KEY
} from './pet.config'
import {
  advanceNeeds,
  applyCareAction,
  changeNeeds,
  createInitialNeeds,
  getNeedHint,
  getNeedState,
  normalizeNeeds
} from './pet.needs'
import {
  clampPosition,
  getDefaultPosition,
  getPetSize,
  getRoamingDelay,
  getRoamingDuration,
  getRoamingPosition,
  getRouteState
} from './pet.utils'

const NEED_ITEMS = [
  ['fullness', '饱腹'],
  ['mood', '心情'],
  ['energy', '精力'],
  ['affinity', '亲密']
]

const safeRead = key => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeWrite = (key, value) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {}
}

/**
 * Claude 主题全站兔子灵宠 penpen。
 * 路由状态、需求值、自主移动、互动和拖动位置分别管理，
 * 避免页面滚动或普通鼠标移动频繁重置 GIF。
 */
export default function PenpenPet({ enabled = true, pageProps = {} }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [stateName, setStateName] = useState('idle')
  const [message, setMessage] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [careOpen, setCareOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [roaming, setRoaming] = useState(false)
  const [roamingDuration, setRoamingDuration] = useState(1800)
  const [needs, setNeeds] = useState(() => createInitialNeeds(0))

  const stateNameRef = useRef('idle')
  const positionRef = useRef(null)
  const routeStateRef = useRef('idle')
  const baseStateRef = useRef('idle')
  const needsRef = useRef(createInitialNeeds(0))
  const idleTimersRef = useRef([])
  const transientTimerRef = useRef(null)
  const transientRef = useRef(false)
  const roamingRef = useRef(false)
  const roamingTimerRef = useRef(null)
  const roamingFrameRef = useRef(null)
  const successPlayedRef = useRef(false)
  const clickTimesRef = useRef([])
  const dragRef = useRef(null)
  const lastActivityRef = useRef(0)
  const hiddenAtRef = useRef(null)
  const collapsedRef = useRef(false)
  const careOpenRef = useRef(false)
  const draggingRef = useRef(false)

  const setPetState = useCallback((nextState, nextMessage = '') => {
    stateNameRef.current = nextState
    setStateName(nextState)
    setMessage(nextMessage)
  }, [])

  const updatePosition = useCallback(nextPosition => {
    const clamped = clampPosition(nextPosition)
    positionRef.current = clamped
    setPosition(clamped)
    return clamped
  }, [])

  const resolveBaseState = useCallback(nextNeeds => {
    if (routeStateRef.current === 'fatalError') return 'fatalError'
    return getNeedState(nextNeeds) || routeStateRef.current
  }, [])

  const syncBaseState = useCallback(
    (nextNeeds = needsRef.current) => {
      const nextBaseState = resolveBaseState(nextNeeds)
      baseStateRef.current = nextBaseState

      if (!transientRef.current && !roamingRef.current) {
        setPetState(nextBaseState)
      }
      return nextBaseState
    },
    [resolveBaseState, setPetState]
  )

  const commitNeeds = useCallback(
    (nextNeeds, { syncState = true } = {}) => {
      const normalized = normalizeNeeds(nextNeeds)
      needsRef.current = normalized
      setNeeds(normalized)
      safeWrite(NEEDS_STORAGE_KEY, JSON.stringify(normalized))
      if (syncState) syncBaseState(normalized)
      return normalized
    },
    [syncBaseState]
  )

  const clearIdleTimers = useCallback(() => {
    idleTimersRef.current.forEach(timer => window.clearTimeout(timer))
    idleTimersRef.current = []
  }, [])

  const stopRoaming = useCallback(
    ({ restoreState = true } = {}) => {
      if (roamingFrameRef.current) {
        window.cancelAnimationFrame(roamingFrameRef.current)
        roamingFrameRef.current = null
      }
      if (roamingTimerRef.current) {
        window.clearTimeout(roamingTimerRef.current)
        roamingTimerRef.current = null
      }
      roamingRef.current = false
      setRoaming(false)
      if (restoreState && !transientRef.current) syncBaseState()
    },
    [syncBaseState]
  )

  const scheduleIdleStates = useCallback(() => {
    clearIdleTimers()

    if (
      collapsedRef.current ||
      transientRef.current ||
      roamingRef.current ||
      ['fatalError', 'hungry', 'sleep'].includes(baseStateRef.current)
    ) {
      return
    }

    idleTimersRef.current = IDLE_STAGES.map(([delay, nextState]) =>
      window.setTimeout(() => {
        if (
          !transientRef.current &&
          !roamingRef.current &&
          !collapsedRef.current
        ) {
          setPetState(nextState)
        }
      }, delay)
    )
  }, [clearIdleTimers, setPetState])

  const playTransient = useCallback(
    (nextState, duration, nextMessage = '') => {
      if (baseStateRef.current === 'fatalError') return

      clearIdleTimers()
      stopRoaming({ restoreState: false })
      if (transientTimerRef.current) {
        window.clearTimeout(transientTimerRef.current)
      }

      transientRef.current = true
      setPetState(nextState, nextMessage)

      transientTimerRef.current = window.setTimeout(() => {
        transientRef.current = false
        transientTimerRef.current = null
        syncBaseState()
        scheduleIdleStates()
      }, duration)
    },
    [
      clearIdleTimers,
      scheduleIdleStates,
      setPetState,
      stopRoaming,
      syncBaseState
    ]
  )

  const recordActivity = useCallback(
    (force = false) => {
      if (
        collapsedRef.current ||
        transientRef.current ||
        baseStateRef.current === 'fatalError'
      ) {
        return
      }

      const now = Date.now()
      if (!force && now - lastActivityRef.current < 1200) return
      lastActivityRef.current = now

      if (INACTIVE_STATE_NAMES.has(stateNameRef.current)) {
        syncBaseState()
      }
      scheduleIdleStates()
    },
    [scheduleIdleStates, syncBaseState]
  )

  const startRoaming = useCallback(() => {
    if (
      document.hidden ||
      collapsedRef.current ||
      careOpenRef.current ||
      draggingRef.current ||
      transientRef.current ||
      roamingRef.current ||
      !['idle', 'reading', 'exploring'].includes(baseStateRef.current) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const current = positionRef.current || getDefaultPosition()
    const target = getRoamingPosition(current)
    const duration = getRoamingDuration(current, target)

    clearIdleTimers()
    roamingRef.current = true
    setRoamingDuration(duration)
    setRoaming(true)
    setPetState('exploring', 'penpen 去附近转转')

    roamingFrameRef.current = window.requestAnimationFrame(() => {
      roamingFrameRef.current = null
      updatePosition(target)
    })
    roamingTimerRef.current = window.setTimeout(() => {
      roamingTimerRef.current = null
      roamingRef.current = false
      setRoaming(false)
      syncBaseState()
      scheduleIdleStates()
    }, duration + 120)
  }, [
    clearIdleTimers,
    scheduleIdleStates,
    setPetState,
    syncBaseState,
    updatePosition
  ])

  useEffect(() => {
    collapsedRef.current = collapsed
  }, [collapsed])

  useEffect(() => {
    careOpenRef.current = careOpen
  }, [careOpen])

  useEffect(() => {
    draggingRef.current = dragging
  }, [dragging])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    setViewportWidth(window.innerWidth)
    const storedCollapsed =
      safeRead(COLLAPSED_STORAGE_KEY) ?? safeRead(LEGACY_COLLAPSED_STORAGE_KEY)
    const shouldCollapse = storedCollapsed === 'true'
    collapsedRef.current = shouldCollapse
    setCollapsed(shouldCollapse)
    safeWrite(COLLAPSED_STORAGE_KEY, String(shouldCollapse))

    let initialPosition = getDefaultPosition()
    try {
      const storedPosition = JSON.parse(
        safeRead(POSITION_STORAGE_KEY) ||
          safeRead(LEGACY_POSITION_STORAGE_KEY) ||
          'null'
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
    safeWrite(POSITION_STORAGE_KEY, JSON.stringify(initialPosition))

    let initialNeeds = createInitialNeeds()
    try {
      initialNeeds = advanceNeeds(
        JSON.parse(safeRead(NEEDS_STORAGE_KEY) || 'null')
      )
    } catch {}
    needsRef.current = initialNeeds
    setNeeds(initialNeeds)
    safeWrite(NEEDS_STORAGE_KEY, JSON.stringify(initialNeeds))

    Object.values(PET_STATES).forEach(({ src, fallbackSrc }) => {
      const image = new window.Image()
      image.src = src

      if (fallbackSrc !== src) {
        const fallbackImage = new window.Image()
        fallbackImage.src = fallbackSrc
      }
    })

    const handleResize = () => {
      setViewportWidth(window.innerWidth)
      updatePosition(positionRef.current || getDefaultPosition())
    }
    window.addEventListener('resize', handleResize)
    setReady(true)

    return () => window.removeEventListener('resize', handleResize)
  }, [enabled, updatePosition])

  useEffect(() => {
    if (!ready || !enabled || typeof window === 'undefined') return undefined

    const nextRouteState = getRouteState({
      asPath: router.asPath,
      pathname: router.pathname,
      pageProps
    })

    routeStateRef.current = nextRouteState
    successPlayedRef.current = false
    transientRef.current = false
    clickTimesRef.current = []

    clearIdleTimers()
    stopRoaming({ restoreState: false })
    if (transientTimerRef.current) {
      window.clearTimeout(transientTimerRef.current)
      transientTimerRef.current = null
    }

    syncBaseState()
    scheduleIdleStates()
  }, [
    clearIdleTimers,
    enabled,
    pageProps,
    ready,
    router.asPath,
    router.pathname,
    scheduleIdleStates,
    stopRoaming,
    syncBaseState
  ])

  useEffect(() => {
    if (!ready || !enabled || typeof window === 'undefined') return undefined

    const handleScroll = () => {
      recordActivity()

      if (
        routeStateRef.current !== 'reading' ||
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
        commitNeeds(changeNeeds(needsRef.current, { mood: 8, affinity: 1 }), {
          syncState: false
        })
        playTransient('success', 4200, '和 penpen 一起读完啦！')
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
        hiddenAtRef.current = Date.now()
        if (!transientRef.current && baseStateRef.current !== 'fatalError') {
          clearIdleTimers()
          stopRoaming({ restoreState: false })
          setPetState('sleep')
        }
        return
      }

      const now = Date.now()
      const awayTime = hiddenAtRef.current ? now - hiddenAtRef.current : 0
      hiddenAtRef.current = null
      const restedEnergy = Math.min(24, (awayTime / (60 * 60 * 1000)) * 10)
      const nextNeeds = changeNeeds(advanceNeeds(needsRef.current, now), {
        energy: restedEnergy
      })
      commitNeeds(nextNeeds)
      recordActivity(true)
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
    commitNeeds,
    enabled,
    playTransient,
    ready,
    recordActivity,
    setPetState,
    stopRoaming
  ])

  useEffect(() => {
    if (!ready || !enabled || typeof window === 'undefined') return undefined

    const timer = window.setInterval(() => {
      commitNeeds(advanceNeeds(needsRef.current))
    }, 60 * 1000)

    return () => window.clearInterval(timer)
  }, [commitNeeds, enabled, ready])

  useEffect(() => {
    if (!ready || !enabled || typeof window === 'undefined') return undefined

    let timer = null
    let cancelled = false
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return
        startRoaming()
        schedule()
      }, getRoamingDelay())
    }
    schedule()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      stopRoaming({ restoreState: false })
    }
  }, [enabled, ready, startRoaming, stopRoaming])

  useEffect(() => {
    if (!careOpen || typeof document === 'undefined') return undefined

    const handleOutsidePointer = event => {
      if (
        event.target instanceof Element &&
        event.target.closest('.penpen-pet')
      ) {
        return
      }
      setCareOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    return () =>
      document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [careOpen])

  useEffect(
    () => () => {
      clearIdleTimers()
      stopRoaming({ restoreState: false })
      if (transientTimerRef.current) {
        window.clearTimeout(transientTimerRef.current)
      }
    },
    [clearIdleTimers, stopRoaming]
  )

  const state = PET_STATES[stateName] || PET_STATES.idle
  const spokenMessage = message || state.label
  const isSpeaking = Boolean(message) || !BASE_STATE_NAMES.has(stateName)
  const needsAttention = Boolean(getNeedState(needs))
  const needHint = getNeedHint(needs)
  const bubbleSide = useMemo(() => {
    if (!position || !viewportWidth) return 'left'
    return position.x + getPetSize() / 2 > viewportWidth / 2 ? 'left' : 'right'
  }, [position, viewportWidth])
  const carePanelOffset = useMemo(() => {
    if (!position || !viewportWidth) return 0

    const petSize = getPetSize()
    const panelWidth = Math.min(
      viewportWidth <= 768 ? 218 : 228,
      viewportWidth - 16
    )
    const opensToLeft = position.x + petSize / 2 > viewportWidth / 2
    const preferredLeft = opensToLeft
      ? position.x - panelWidth + 12
      : position.x + petSize - 12
    const globalLeft = Math.min(
      Math.max(8, preferredLeft),
      Math.max(8, viewportWidth - panelWidth - 8)
    )

    return globalLeft - position.x
  }, [position, viewportWidth])

  if (!enabled || !ready) return null

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
    stopRoaming()
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
      draggingRef.current = true
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
    draggingRef.current = false
    setDragging(false)

    if (drag.moved) {
      const finalPosition = positionRef.current || getDefaultPosition()
      safeWrite(POSITION_STORAGE_KEY, JSON.stringify(finalPosition))
      recordActivity(true)
      return
    }

    playClickReaction()
  }

  const cancelPointer = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    draggingRef.current = false
    setDragging(false)
    recordActivity(true)
  }

  const handleCareAction = action => {
    const result = applyCareAction(needsRef.current, action)
    commitNeeds(result.needs, { syncState: false })
    playTransient(result.state, 3000, result.message)
  }

  const hidePet = event => {
    event.stopPropagation()
    collapsedRef.current = true
    setCollapsed(true)
    setCareOpen(false)
    clearIdleTimers()
    stopRoaming({ restoreState: false })
    safeWrite(COLLAPSED_STORAGE_KEY, 'true')
  }

  const showPet = () => {
    collapsedRef.current = false
    setCollapsed(false)
    syncBaseState()
    safeWrite(COLLAPSED_STORAGE_KEY, 'false')
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
          className='penpen-pet-restore'
          onClick={showPet}
          aria-label='显示兔子灵宠 penpen'
          title='显示 penpen'
        >
          <img src={PET_STATES.idle.src} alt='' draggable='false' />
        </button>
        <PetStyles />
      </>
    )
  }

  return (
    <>
      <aside
        className={`penpen-pet ${isSpeaking ? 'penpen-pet--speaking' : ''} ${
          dragging ? 'penpen-pet--dragging' : ''
        } ${roaming ? 'penpen-pet--roaming' : ''}`}
        data-state={stateName}
        data-side={bubbleSide}
        data-needs-attention={needsAttention ? 'true' : 'false'}
        style={
          position
            ? {
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                '--penpen-roaming-duration': `${roamingDuration}ms`
              }
            : undefined
        }
        aria-label='兔子灵宠 penpen'
      >
        <div className='penpen-pet__bubble' aria-live='polite'>
          {spokenMessage}
        </div>

        <section
          className={`penpen-pet__care-panel ${
            careOpen ? 'penpen-pet__care-panel--open' : ''
          }`}
          aria-label='照顾 penpen'
          aria-hidden={!careOpen}
          style={{ left: `${carePanelOffset}px`, right: 'auto' }}
        >
          <div className='penpen-pet__care-header'>
            <strong>penpen</strong>
            <span>{needHint}</span>
          </div>
          <div className='penpen-pet__needs'>
            {NEED_ITEMS.map(([key, label]) => (
              <div className='penpen-pet__need' key={key}>
                <span>{label}</span>
                <span
                  className='penpen-pet__need-track'
                  role='progressbar'
                  aria-label={`${label} ${needs[key]}`}
                  aria-valuemin='0'
                  aria-valuemax='100'
                  aria-valuenow={needs[key]}
                >
                  <i style={{ width: `${needs[key]}%` }} />
                </span>
                <b>{needs[key]}</b>
              </div>
            ))}
          </div>
          <div className='penpen-pet__care-actions'>
            <button
              type='button'
              tabIndex={careOpen ? 0 : -1}
              onClick={() => handleCareAction('feed')}
            >
              <span aria-hidden='true'>🥕</span> 投喂
            </button>
            <button
              type='button'
              tabIndex={careOpen ? 0 : -1}
              onClick={() => handleCareAction('pet')}
            >
              <span aria-hidden='true'>♡</span> 摸摸
            </button>
            <button
              type='button'
              tabIndex={careOpen ? 0 : -1}
              onClick={() => handleCareAction('rest')}
            >
              <span aria-hidden='true'>☾</span> 休息
            </button>
          </div>
        </section>

        <button
          type='button'
          className='penpen-pet__button'
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={cancelPointer}
          aria-label={`penpen：${spokenMessage}`}
          title='拖动可以移动，点一下可以互动'
        >
          <img
            key={stateName}
            className='penpen-pet__image'
            src={state.src}
            alt=''
            draggable='false'
            onError={handleImageError}
          />
        </button>

        <button
          type='button'
          className='penpen-pet__care-toggle'
          onClick={() => setCareOpen(value => !value)}
          aria-label='查看并照顾 penpen'
          aria-expanded={careOpen}
          title='照顾 penpen'
        >
          🥕
          {needsAttention && <i aria-hidden='true' />}
        </button>

        <button
          type='button'
          className='penpen-pet__close'
          onClick={hidePet}
          aria-label='收起 penpen'
          title='收起'
        >
          ×
        </button>
      </aside>
      <PetStyles />
    </>
  )
}
