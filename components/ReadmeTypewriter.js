import { useRouter } from 'next/router'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const FALLBACK_TITLE = '🐰 欢迎来到 utto 兔子的学习屋'
const SESSION_KEY = 'utto-readme-title-played-v1'
const START_DELAY = 120
const CURSOR_FINISH_DURATION = 2400

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

const README_TITLE_MOUNT_BOOTSTRAP = `
;(function () {
  if (window.location.pathname !== '/') return

  var card = document.querySelector('#theme-claude .claude-readme-card')
  var body = card && card.querySelector('.markdown-body')
  if (!card || !body) return

  var mount = card.querySelector('[data-claude-readme-title-mount]')
  if (!mount) {
    mount = document.createElement('div')
    mount.setAttribute('data-claude-readme-title-mount', '')
    body.parentNode.insertBefore(mount, body)
  }

  card.classList.add('claude-readme-title-ready')
})()
`

const decodeHtmlEntities = value => {
  if (!value) return ''

  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
}

const extractReadmeTitle = html => {
  if (!html || typeof html !== 'string') return FALLBACK_TITLE

  const heading = html.match(
    /<h[1-6]\b[^>]*class=(['"])[^'"]*\bnotion-h\b[^'"]*\1[^>]*>[\s\S]*?<\/h[1-6]>/i
  )?.[0]
  const title = heading?.match(/\btitle=(['"])(.*?)\1/i)?.[2]

  return decodeHtmlEntities(title || '') || FALLBACK_TITLE
}

const splitGraphemes = text => {
  if (
    typeof Intl !== 'undefined' &&
    typeof Intl.Segmenter === 'function'
  ) {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), segment => segment.segment)
  }

  return Array.from(text)
}

const getCharacterDelay = character => {
  if (/[。！？!?]/.test(character)) return 220
  if (/[，、：；,;:]/.test(character)) return 140
  if (/\s/.test(character)) return 35
  return 55 + Math.round(Math.random() * 30)
}

const ensureTitleMount = () => {
  const card = document.querySelector('#theme-claude .claude-readme-card')
  const body = card?.querySelector('.markdown-body')
  if (!card || !body) return null

  let mount = card.querySelector('[data-claude-readme-title-mount]')
  if (!mount) {
    mount = document.createElement('div')
    mount.setAttribute('data-claude-readme-title-mount', '')
    body.parentNode?.insertBefore(mount, body)
  }

  card.classList.add('claude-readme-title-ready')
  return mount
}

const TypewriterTitle = ({ text }) => {
  const [visibleText, setVisibleText] = useState('')
  const [status, setStatus] = useState('waiting')

  useEffect(() => {
    let typeTimer
    let finishTimer
    let cancelled = false

    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const hasPlayed = window.sessionStorage?.getItem(SESSION_KEY) === 'true'

    if (reduceMotion || hasPlayed) {
      setVisibleText(text)
      setStatus('done')
      return undefined
    }

    const characters = splitGraphemes(text)
    let index = 0

    const typeNext = () => {
      if (cancelled) return

      index += 1
      setStatus('typing')
      setVisibleText(characters.slice(0, index).join(''))

      if (index >= characters.length) {
        window.sessionStorage?.setItem(SESSION_KEY, 'true')
        setStatus('finished')
        finishTimer = window.setTimeout(() => {
          if (!cancelled) setStatus('done')
        }, CURSOR_FINISH_DURATION)
        return
      }

      typeTimer = window.setTimeout(
        typeNext,
        getCharacterDelay(characters[index - 1])
      )
    }

    typeTimer = window.setTimeout(typeNext, START_DELAY)

    return () => {
      cancelled = true
      window.clearTimeout(typeTimer)
      window.clearTimeout(finishTimer)
    }
  }, [text])

  return (
    <h3
      className={`claude-readme-typewriter-title is-${status}`}
      aria-label={text}>
      <span className='claude-readme-title-placeholder' aria-hidden='true'>
        {text}
      </span>
      <span className='claude-readme-title-visible' aria-hidden='true'>
        {visibleText}
        {status !== 'done' && <span className='claude-readme-title-cursor' />}
      </span>
    </h3>
  )
}

/**
 * Claude 首页 README 独立标题动画。
 *
 * 只在卡片中创建独立标题挂载点，不遍历、不清空、不重写 Notion 正文。
 * 隐藏的完整标题负责固定尺寸，因此逐字显示期间不会引起布局跳动。
 */
export default function ReadmeTypewriter({ enabled = true, readmeHtml = '' }) {
  const router = useRouter()
  const [mount, setMount] = useState(null)
  const title = useMemo(() => extractReadmeTitle(readmeHtml), [readmeHtml])
  const isHome = router.pathname === '/'

  useIsomorphicLayoutEffect(() => {
    if (!enabled || !isHome || typeof document === 'undefined') {
      setMount(null)
      return undefined
    }

    const target = ensureTitleMount()
    setMount(target)

    return () => {
      const card = target?.closest('.claude-readme-card')
      card?.classList.remove('claude-readme-title-ready')
      target?.remove()
      setMount(null)
    }
  }, [enabled, isHome, router.asPath])

  if (!enabled) return null

  return (
    <>
      {isHome && (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: README_TITLE_MOUNT_BOOTSTRAP }}
        />
      )}

      {mount && createPortal(<TypewriterTitle text={title} />, mount)}

      <style jsx global>{`
        [data-claude-readme-title-mount] {
          width: 100%;
          max-width: 760px;
          min-height: 25px;
          margin: 24px auto 16px;
          text-align: center;
        }

        .claude-readme-typewriter-title {
          display: grid;
          width: 100%;
          margin: 0;
          color: var(--claude-gh-fg-default);
          font-family: var(
            --fontStack-sansSerif,
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            'Noto Sans',
            Helvetica,
            Arial,
            sans-serif,
            'Apple Color Emoji',
            'Segoe UI Emoji'
          );
          font-size: 1.25em;
          font-weight: 600;
          line-height: 1.25;
          letter-spacing: normal;
          text-align: center;
          overflow-wrap: anywhere;
        }

        .claude-readme-title-placeholder,
        .claude-readme-title-visible {
          grid-area: 1 / 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .claude-readme-title-placeholder {
          visibility: hidden;
          pointer-events: none;
          user-select: none;
        }

        .claude-readme-title-visible {
          position: relative;
        }

        .claude-readme-title-cursor {
          display: inline-block;
          width: 2px;
          height: 0.95em;
          margin-left: 4px;
          vertical-align: -0.08em;
          background: currentColor;
          animation: claude-readme-title-cursor-blink 0.8s steps(1, end)
            infinite;
        }

        .claude-readme-typewriter-title.is-finished
          .claude-readme-title-cursor {
          animation-iteration-count: 3;
        }

        @media (scripting: enabled) {
          #theme-claude
            .claude-readme-card
            .markdown-body
            .claude-readme-notion
            main
            > .notion-h:first-of-type {
            visibility: hidden !important;
          }

          #theme-claude
            .claude-readme-card.claude-readme-title-ready
            .markdown-body
            .claude-readme-notion
            main
            > .notion-h:first-of-type {
            display: none !important;
          }
        }

        @keyframes claude-readme-title-cursor-blink {
          0%,
          48% {
            opacity: 1;
          }
          49%,
          100% {
            opacity: 0;
          }
        }

        @media (max-width: 420px) {
          [data-claude-readme-title-mount] {
            margin-top: 20px;
          }

          .claude-readme-typewriter-title {
            font-size: 1.12em;
            line-height: 1.4;
            padding: 0 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .claude-readme-title-cursor {
            display: none;
            animation: none;
          }
        }
      `}</style>
    </>
  )
}
