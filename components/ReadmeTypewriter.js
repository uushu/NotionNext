import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const PHRASES = ['记录学习', '分享技术', '保持构建']

/**
 * Claude 首页 README 卡片中的轻量打字机动画。
 * 使用 Portal 挂载到 README 标题栏下方，避免侵入 ProfileHome 的主体逻辑。
 */
export default function ReadmeTypewriter({ enabled = true }) {
  const router = useRouter()
  const [mountNode, setMountNode] = useState(null)
  const [text, setText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReduceMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener?.('change', updatePreference)

    return () => mediaQuery.removeEventListener?.('change', updatePreference)
  }, [])

  useEffect(() => {
    if (!enabled || router.pathname !== '/' || typeof document === 'undefined') {
      setMountNode(null)
      return undefined
    }

    let activeNode = null

    const attach = () => {
      const card = document.querySelector('#theme-claude .claude-readme-card')
      if (!card) return false

      let node = card.querySelector('[data-claude-readme-typewriter]')
      if (!node) {
        node = document.createElement('div')
        node.setAttribute('data-claude-readme-typewriter', '')
        const meta = card.querySelector('.claude-readme-card-meta')
        if (meta?.nextSibling) {
          card.insertBefore(node, meta.nextSibling)
        } else if (meta) {
          meta.insertAdjacentElement('afterend', node)
        } else {
          card.prepend(node)
        }
      }

      activeNode = node
      setMountNode(node)
      return true
    }

    attach()

    const observer = new MutationObserver(() => {
      if (!activeNode?.isConnected) attach()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      if (activeNode?.isConnected) activeNode.remove()
      setMountNode(null)
    }
  }, [enabled, router.asPath, router.pathname])

  useEffect(() => {
    if (!mountNode) return undefined

    if (reduceMotion) {
      setText(PHRASES.join(' · '))
      setDeleting(false)
      return undefined
    }

    const phrase = PHRASES[phraseIndex]
    let delay = deleting ? 70 : 120

    if (!deleting && text === phrase) {
      delay = 1350
    } else if (deleting && text === '') {
      delay = 350
    }

    const timer = window.setTimeout(() => {
      if (!deleting && text === phrase) {
        setDeleting(true)
        return
      }

      if (deleting && text === '') {
        setPhraseIndex(index => (index + 1) % PHRASES.length)
        setDeleting(false)
        return
      }

      const nextLength = text.length + (deleting ? -1 : 1)
      setText(phrase.slice(0, Math.max(0, nextLength)))
    }, delay)

    return () => window.clearTimeout(timer)
  }, [deleting, mountNode, phraseIndex, reduceMotion, text])

  if (!mountNode) return null

  return createPortal(
    <div
      className='claude-readme-typewriter'
      role='img'
      aria-label='记录学习，分享技术，保持构建'>
      <span className='claude-readme-typewriter-prompt' aria-hidden='true'>
        $
      </span>
      <span className='claude-readme-typewriter-text' aria-hidden='true'>
        {text || '\u00a0'}
      </span>
      {!reduceMotion && (
        <span className='claude-readme-typewriter-cursor' aria-hidden='true' />
      )}

      <style jsx>{`
        .claude-readme-typewriter {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          margin: 14px 0 18px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            'Liberation Mono', 'Courier New', monospace;
          font-size: 15px;
          line-height: 1.5;
          color: var(--claude-text-secondary, #57606a);
        }

        .claude-readme-typewriter-prompt {
          margin-right: 8px;
          color: var(--claude-accent, #d97757);
          font-weight: 700;
        }

        .claude-readme-typewriter-text {
          min-width: 5em;
          text-align: left;
          white-space: nowrap;
        }

        .claude-readme-typewriter-cursor {
          width: 2px;
          height: 1.15em;
          margin-left: 3px;
          background: currentColor;
          animation: claude-readme-cursor-blink 0.8s steps(1, end) infinite;
        }

        @keyframes claude-readme-cursor-blink {
          0%,
          48% {
            opacity: 1;
          }
          49%,
          100% {
            opacity: 0;
          }
        }

        :global(.dark) .claude-readme-typewriter {
          color: var(--claude-text-secondary, #9ca3af);
        }

        @media (max-width: 639px) {
          .claude-readme-typewriter {
            margin: 12px 0 16px;
            font-size: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .claude-readme-typewriter-cursor {
            animation: none;
          }
        }
      `}</style>
    </div>,
    mountNode
  )
}
