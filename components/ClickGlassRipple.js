import { useEffect } from 'react'

const RIPPLE_DURATION = 780
const CLICK_MOVE_TOLERANCE = 12

/**
 * 全站点击水波纹。
 * 使用原生 DOM 创建动画节点，不触发 React 重渲染；
 * 拖动和页面滚动不会生成波纹，并尊重系统的“减少动态效果”设置。
 */
export default function ClickGlassRipple({ enabled = true }) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )
    if (reduceMotion.matches) return undefined

    let pointerStart = null

    const createRipple = (x, y) => {
      const ripple = document.createElement('span')
      ripple.className = 'claude-glass-ripple'
      ripple.setAttribute('aria-hidden', 'true')
      ripple.style.setProperty('--claude-ripple-x', `${x}px`)
      ripple.style.setProperty('--claude-ripple-y', `${y}px`)

      document.body.appendChild(ripple)

      const removeRipple = () => ripple.remove()
      const fallbackTimer = window.setTimeout(
        removeRipple,
        RIPPLE_DURATION + 120
      )

      ripple.addEventListener(
        'animationend',
        () => {
          window.clearTimeout(fallbackTimer)
          removeRipple()
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
        y: event.clientY
      }
    }

    const handlePointerUp = event => {
      if (!pointerStart || pointerStart.pointerId !== event.pointerId) return

      const distance = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y
      )
      pointerStart = null

      // 过滤拖动、选择文本以及移动端滚动手势。
      if (distance > CLICK_MOVE_TOLERANCE) return

      createRipple(event.clientX, event.clientY)
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
      document.querySelectorAll('.claude-glass-ripple').forEach(node => {
        node.remove()
      })
    }
  }, [enabled])

  return (
    <style jsx global>{`
      .claude-glass-ripple {
        position: fixed;
        left: var(--claude-ripple-x);
        top: var(--claude-ripple-y);
        width: 82px;
        height: 82px;
        z-index: 2147483646;
        pointer-events: none;
        border: 1px solid rgba(126, 176, 222, 0.52);
        border-radius: 999px;
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.16);
        background: radial-gradient(
          circle at 34% 28%,
          rgba(255, 255, 255, 0.7) 0%,
          rgba(255, 255, 255, 0.34) 12%,
          rgba(191, 224, 255, 0.2) 34%,
          rgba(148, 199, 238, 0.08) 54%,
          rgba(255, 255, 255, 0) 72%
        );
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.42),
          0 10px 28px rgba(77, 133, 184, 0.2),
          inset 0 1px 1px rgba(255, 255, 255, 0.9),
          inset 0 -12px 24px rgba(107, 173, 224, 0.12);
        backdrop-filter: blur(2px) saturate(145%);
        -webkit-backdrop-filter: blur(2px) saturate(145%);
        animation: claude-glass-ripple-expand ${RIPPLE_DURATION}ms
          cubic-bezier(0.16, 0.72, 0.26, 1) forwards;
        will-change: transform, opacity;
      }

      .claude-glass-ripple::before,
      .claude-glass-ripple::after {
        position: absolute;
        content: '';
        pointer-events: none;
        border-radius: inherit;
      }

      .claude-glass-ripple::before {
        inset: -1px;
        border: 1px solid rgba(116, 170, 217, 0.58);
        box-shadow:
          0 0 14px rgba(118, 183, 235, 0.2),
          inset 0 0 12px rgba(255, 255, 255, 0.26);
        animation: claude-glass-ripple-ring ${RIPPLE_DURATION}ms
          cubic-bezier(0.18, 0.7, 0.24, 1) forwards;
      }

      .claude-glass-ripple::after {
        left: 50%;
        top: 50%;
        width: 16px;
        height: 16px;
        transform: translate(-50%, -50%) scale(0.45);
        background: radial-gradient(
          circle at 35% 30%,
          rgba(255, 255, 255, 0.94),
          rgba(173, 218, 250, 0.4) 48%,
          rgba(102, 169, 220, 0.06) 74%
        );
        box-shadow:
          0 0 10px rgba(255, 255, 255, 0.72),
          0 0 22px rgba(93, 169, 225, 0.3);
        animation: claude-glass-ripple-core ${RIPPLE_DURATION}ms ease-out
          forwards;
      }

      @keyframes claude-glass-ripple-expand {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.16);
        }
        14% {
          opacity: 0.96;
        }
        58% {
          opacity: 0.5;
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(1.58);
        }
      }

      @keyframes claude-glass-ripple-ring {
        0% {
          opacity: 0.92;
          transform: scale(0.68);
        }
        100% {
          opacity: 0;
          transform: scale(1.24);
        }
      }

      @keyframes claude-glass-ripple-core {
        0% {
          opacity: 0.95;
          transform: translate(-50%, -50%) scale(0.45);
        }
        45% {
          opacity: 0.66;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(1.8);
        }
      }

      html.dark .claude-glass-ripple,
      .dark .claude-glass-ripple,
      [data-theme='dark'] .claude-glass-ripple {
        border-color: rgba(157, 205, 242, 0.56);
        background: radial-gradient(
          circle at 34% 28%,
          rgba(255, 255, 255, 0.48) 0%,
          rgba(207, 233, 255, 0.22) 14%,
          rgba(106, 173, 224, 0.14) 38%,
          rgba(50, 104, 151, 0.06) 58%,
          rgba(255, 255, 255, 0) 74%
        );
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.2),
          0 10px 30px rgba(42, 111, 166, 0.26),
          inset 0 1px 1px rgba(255, 255, 255, 0.58),
          inset 0 -12px 24px rgba(102, 176, 230, 0.12);
      }

      @media (prefers-reduced-motion: reduce) {
        .claude-glass-ripple {
          display: none !important;
          animation: none !important;
        }
      }
    `}</style>
  )
}
