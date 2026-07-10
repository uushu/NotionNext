import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PetStyles from './PetStyles'
import {
  BASE_STATE_NAMES,
  COLLAPSED_STORAGE_KEY,
  IDLE_STAGES,
  INACTIVE_STATE_NAMES,
  PET_STATES,
  POSITION_STORAGE_KEY
} from './pet.config'
import {
  clampPosition,
  getDefaultPosition,
  getPetSize,
  getRouteState
} from './pet.utils'

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
