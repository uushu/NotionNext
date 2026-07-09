import { useRouter } from 'next/router'
import { useEffect } from 'react'

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])

const collectReadableTextNodes = root => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || SKIPPED_TAGS.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT
      }

      return node.nodeValue?.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    }
  })

  const entries = []
  let current = walker.nextNode()
  while (current) {
    entries.push({ node: current, text: current.nodeValue || '' })
    current = walker.nextNode()
  }
  return entries
}

/**
 * 将 Claude 首页中已经渲染完成的 README 正文逐字显示。
 * 保留原有 HTML 结构，因此标题、段落、链接和行内样式不会被破坏。
 */
export default function ReadmeTypewriter({ enabled = true }) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled || router.pathname !== '/' || typeof document === 'undefined') {
      return undefined
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (reduceMotion) return undefined

    let observer
    let startTimer
    let typeTimer
    let cleanupAnimation = () => {}

    const startTyping = () => {
      const card = document.querySelector(
        '#theme-claude .claude-readme-card'
      )
      const readme = card?.querySelector('.markdown-body')
      if (!card || !readme) return false

      card
        .querySelector('[data-claude-readme-typewriter]')
        ?.remove()

      const entries = collectReadableTextNodes(readme)
      const totalCharacters = entries.reduce(
        (sum, entry) => sum + entry.text.length,
        0
      )
      if (!entries.length || !totalCharacters) return true

      const previousMinHeight = readme.style.minHeight
      const previousAriaBusy = readme.getAttribute('aria-busy')
      const originalHeight = Math.ceil(readme.getBoundingClientRect().height)
      const cursor = document.createElement('span')
      cursor.className = 'claude-readme-live-cursor'
      cursor.setAttribute('aria-hidden', 'true')

      readme.style.minHeight = `${originalHeight}px`
      readme.setAttribute('aria-busy', 'true')
      readme.classList.add('claude-readme-is-typing')

      entries.forEach(entry => {
        entry.node.nodeValue = ''
      })

      // README 内容较短，固定使用更舒适的打字速度，避免一闪而过。
      const characterDelay = 92
      let nodeIndex = 0
      let characterIndex = 0
      let finished = false

      const restore = () => {
        window.clearTimeout(startTimer)
        window.clearTimeout(typeTimer)

        entries.forEach(entry => {
          entry.node.nodeValue = entry.text
        })

        cursor.remove()
        readme.classList.remove('claude-readme-is-typing')
        readme.style.minHeight = previousMinHeight

        if (previousAriaBusy === null) {
          readme.removeAttribute('aria-busy')
        } else {
          readme.setAttribute('aria-busy', previousAriaBusy)
        }
      }

      cleanupAnimation = restore

      const typeNextCharacter = () => {
        if (nodeIndex >= entries.length) {
          finished = true
          readme.removeAttribute('aria-busy')
          readme.classList.remove('claude-readme-is-typing')
          readme.style.minHeight = previousMinHeight
          // 打字结束后保留闪烁光标，表示仍在等待输入。
          return
        }

        const entry = entries[nodeIndex]
        const parent = entry.node.parentNode
        if (!parent) {
          nodeIndex += 1
          characterIndex = 0
          typeTimer = window.setTimeout(typeNextCharacter, characterDelay)
          return
        }

        if (cursor.parentNode !== parent || cursor.previousSibling !== entry.node) {
          parent.insertBefore(cursor, entry.node.nextSibling)
        }

        characterIndex += 1
        entry.node.nodeValue = entry.text.slice(0, characterIndex)

        if (characterIndex >= entry.text.length) {
          nodeIndex += 1
          characterIndex = 0
        }

        typeTimer = window.setTimeout(typeNextCharacter, characterDelay)
      }

      startTimer = window.setTimeout(typeNextCharacter, 500)

      cleanupAnimation = () => {
        if (!finished) restore()
        else cursor.remove()
      }

      return true
    }

    if (!startTyping()) {
      observer = new MutationObserver(() => {
        if (startTyping()) observer.disconnect()
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer?.disconnect()
      cleanupAnimation()
    }
  }, [enabled, router.asPath, router.pathname])

  return (
    <style jsx global>{`
      .claude-readme-live-cursor {
        display: inline-block;
        width: 2px;
        height: 0.95em;
        margin-left: 3px;
        vertical-align: -0.08em;
        background: currentColor;
        animation: claude-readme-live-cursor-blink 0.8s steps(1, end)
          infinite;
      }

      .claude-readme-is-typing {
        overflow-anchor: none;
      }

      @keyframes claude-readme-live-cursor-blink {
        0%,
        48% {
          opacity: 1;
        }
        49%,
        100% {
          opacity: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .claude-readme-live-cursor {
          display: none;
          animation: none;
        }
      }
    `}</style>
  )
}
