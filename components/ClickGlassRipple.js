import { useEffect } from 'react'

const EFFECT_DURATION = 620
const CLICK_MOVE_TOLERANCE = 12
const SPARK_OFFSETS = [
  [-16, -11],
  [15, -13],
  [18, 9]
]

/**
 * Claude 主题点击反馈。
 * 使用暖色纸张晕染与细小光点，避免原先偏蓝、偏 iOS 玻璃质感的突兀效果。
 */
export default function ClickGlassRipple({ enabled = true }) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )
    if (reduceMotion.matches) return undefined

    let pointerStart = null

    const createEffect = (x, y) => {
      const effect = document.createElement('span')
      effect.className = 'claude-paper-click'
      effect.setAttribute('aria-hidden', 'true')
      effect.style.setProperty('--claude-click-x', `${x}px`)
      effect.style.setProperty('--claude-click-y', `${y}px`)

      SPARK_OFFSETS.forEach(([offsetX, offsetY], index) => {
        const spark = document.createElement('i')
        spark.className = 'claude-paper-click__spark'
        spark.style.setProperty('--spark-x', `${offsetX}px`)
        spark.style.setProperty('--spark-y', `${offsetY}px`)
        spark.style.setProperty('--spark-delay', `${index * 34}ms`)
        effect.appendChild(spark)
      })

      document.body.appendChild(effect)

      const removeEffect = () => effect.remove()
      const fallbackTimer = window.setTimeout(
        removeEffect,
        EFFECT_DURATION + 140
      )

      effect.addEventListener(
        'animationend',
        event => {
          if (event.target !== effect) return
          window.clearTimeout(fallbackTimer)
          removeEffect()
        },
        { once: true }
      )
    }

    const handlePointerDown = event => {
      if (!event.isPrimary) return
      if (event.pointerType === 'mouse' && event.button !== 0) return

      pointerStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        target: event.target
      }
    }

    const handlePointerUp = event => {
      if (!pointerStart || pointerStart.pointerId !== event.pointerId) return

      const distance = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y
      )
      const target = pointerStart.target
      pointerStart = null

      if (distance > CLICK_MOVE_TOLERANCE) return
      if (target instanceof Element && target.closest('.penpen-pet')) return

      createEffect(event.clientX, event.clientY)
    }

    const handlePointerCancel = () => {
      pointerStart = null
    }

    document.addEventListener('pointerdown', handlePointerDown, {
      passive: true
    })
    document.addEventListener('pointerup', handlePointerUp, { passive: true })
    document.addEventListener('pointercancel', handlePointerCancel, {
      passive: true
    })

    return () => {
      pointerStart = null
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerCancel)
      document.querySelectorAll('.claude-paper-click').forEach(node => {
        node.remove()
      })
    }
  }, [enabled])

  return (
    <style jsx global>{`
      .claude-paper-click {
        position: fixed;
        left: var(--claude-click-x);
        top: var(--claude-click-y);
        width: 54px;
        height: 54px;
        z-index: 2147483646;
        pointer-events: none;
        border: 1px solid rgba(169, 119, 79, 0.38);
        border-radius: 999px;
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.22);
        background: radial-gradient(
          circle,
          rgba(255, 250, 244, 0.7) 0%,
          rgba(226, 193, 158, 0.2) 35%,
          rgba(196, 148, 105, 0.06) 58%,
          rgba(196, 148, 105, 0) 74%
        );
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.44),
          0 8px 22px rgba(107, 75, 49, 0.1);
        animation: claude-paper-click-expand ${EFFECT_DURATION}ms
          cubic-bezier(0.2, 0.72, 0.24, 1) forwards;
        will-change: transform, opacity;
      }

      .claude-paper-click::before {
        position: absolute;
        inset: 8px;
        content: '';
        border: 1px solid rgba(185, 132, 89, 0.3);
        border-radius: inherit;
        animation: claude-paper-click-inner ${EFFECT_DURATION}ms ease-out
          forwards;
      }

      .claude-paper-click__spark {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 4px;
        height: 4px;
        margin: -2px 0 0 -2px;
        border-radius: 999px;
        background: rgba(176, 116, 68, 0.72);
        box-shadow: 0 0 7px rgba(198, 143, 91, 0.28);
        opacity: 0;
        transform: translate(0, 0) scale(0.5);
        animation: claude-paper-click-spark 430ms ease-out
          var(--spark-delay) forwards;
      }

      @keyframes claude-paper-click-expand {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.22);
        }
        18% {
          opacity: 0.8;
        }
        62% {
          opacity: 0.36;
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(1.42);
        }
      }

      @keyframes claude-paper-click-inner {
        0% {
          opacity: 0.68;
          transform: scale(0.62);
        }
        100% {
          opacity: 0;
          transform: scale(1.22);
        }
      }

      @keyframes claude-paper-click-spark {
        0% {
          opacity: 0;
          transform: translate(0, 0) scale(0.5);
        }
        24% {
          opacity: 0.72;
        }
        100% {
          opacity: 0;
          transform: translate(var(--spark-x), var(--spark-y)) scale(1);
        }
      }

      html.dark .claude-paper-click,
      .dark .claude-paper-click,
      [data-theme='dark'] .claude-paper-click {
        border-color: rgba(229, 190, 150, 0.42);
        background: radial-gradient(
          circle,
          rgba(255, 244, 232, 0.26) 0%,
          rgba(214, 167, 121, 0.16) 36%,
          rgba(166, 112, 73, 0.05) 60%,
          rgba(166, 112, 73, 0) 76%
        );
        box-shadow:
          0 0 0 1px rgba(255, 239, 223, 0.12),
          0 8px 24px rgba(0, 0, 0, 0.18);
      }

      html.dark .claude-paper-click__spark,
      .dark .claude-paper-click__spark,
      [data-theme='dark'] .claude-paper-click__spark {
        background: rgba(237, 193, 149, 0.78);
      }

      @media (prefers-reduced-motion: reduce) {
        .claude-paper-click {
          display: none !important;
          animation: none !important;
        }
      }
    `}</style>
  )
}
