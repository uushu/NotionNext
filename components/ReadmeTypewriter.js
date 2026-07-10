import { useRouter } from 'next/router'
import { useEffect, useLayoutEffect } from 'react'

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * 首次打开首页时，这段内联脚本会在 HTML 解析到组件后立刻启动动画，
 * 无需等待 React hydration 和主题 JavaScript 加载完成。
 * 客户端路由返回首页时，下面的 React effect 仍负责启动动画。
 */
const README_TYPEWRITER_BOOTSTRAP = `
;(function () {
  if (window.location.pathname !== '/') return

  var card = document.querySelector('#theme-claude .claude-readme-card')
  var readme = card && card.querySelector('.markdown-body')
  if (!card || !readme) return
  if (card.dataset.claudeReadmeTypewriterStarted === 'true') return
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  var walker = document.createTreeWalker(
    readme,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        var parent = node.parentElement
        if (
          !parent ||
          parent.tagName === 'SCRIPT' ||
          parent.tagName === 'STYLE' ||
          parent.tagName === 'NOSCRIPT'
        ) {
          return NodeFilter.FILTER_REJECT
        }

        return node.nodeValue && node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
      }
    }
  )

  var entries = []
  var current = walker.nextNode()
  while (current) {
    entries.push({ node: current, text: current.nodeValue || '' })
    current = walker.nextNode()
  }
  if (!entries.length) return

  card.dataset.claudeReadmeTypewriterStarted = 'true'

  var previousMinHeight = readme.style.minHeight
  var originalHeight = Math.ceil(readme.getBoundingClientRect().height)
  var cursor = document.createElement('span')
  cursor.className = 'claude-readme-live-cursor'
  cursor.setAttribute('aria-hidden', 'true')

  readme.style.minHeight = originalHeight + 'px'
  readme.setAttribute('aria-busy', 'true')
  readme.classList.add('claude-readme-is-typing')

  entries.forEach(function (entry) {
    entry.node.nodeValue = ''
  })

  var nodeIndex = 0
  var characterIndex = 0
  var timer

  var typeNextCharacter = function () {
    if (!card.isConnected) {
      window.clearTimeout(timer)
      return
    }

    if (nodeIndex >= entries.length) {
      readme.removeAttribute('aria-busy')
      readme.classList.remove('claude-readme-is-typing')
      readme.style.minHeight = previousMinHeight
      return
    }

    var entry = entries[nodeIndex]
    var parent = entry.node.parentNode
    if (!parent) {
      nodeIndex += 1
      characterIndex = 0
      timer = window.setTimeout(typeNextCharacter, 92)
      return
    }

    if (
      cursor.parentNode !== parent ||
      cursor.previousSibling !== entry.node
    ) {
      parent.insertBefore(cursor, entry.node.nextSibling)
    }

    characterIndex += 1
    entry.node.nodeValue = entry.text.slice(0, characterIndex)

    if (characterIndex >= entry.text.length) {
      nodeIndex += 1
      characterIndex = 0
    }

    timer = window.setTimeout(typeNextCharacter, 92)
  }

  typeNextCharacter()
})()
`

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

  useIsomorphicLayoutEffect(() => {
    if (!enabled || router.pathname !== '/' || typeof document === 'undefined') {
      return undefined
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (reduceMotion) return undefined

    let observer
    let typeTimer
    let cleanupAnimation = () => {}

    const startTyping = () => {
      const card = document.querySelector(
        '#theme-claude .claude-readme-card'
      )
      const readme = card?.querySelector('.markdown-body')
      if (!card || !readme) return false
      if (card.dataset.claudeReadmeTypewriterStarted === 'true') {
        return true
      }

      card
        .querySelector('[data-claude-readme-typewriter]')
        ?.remove()

      const entries = collectReadableTextNodes(readme)
      const totalCharacters = entries.reduce(
        (sum, entry) => sum + entry.text.length,
        0
      )
      if (!entries.length || !totalCharacters) return true

      card.dataset.claudeReadmeTypewriterStarted = 'true'

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

      const characterDelay = 92
      let nodeIndex = 0
      let characterIndex = 0
      let finished = false

      const restore = () => {
        window.clearTimeout(typeTimer)

        entries.forEach(entry => {
          entry.node.nodeValue = entry.text
        })

        cursor.remove()
        delete card.dataset.claudeReadmeTypewriterStarted
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

      // README 节点出现后立即输出第一个字符，不再额外空等半秒。
      typeNextCharacter()

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
    <>
      {enabled && (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: README_TYPEWRITER_BOOTSTRAP }}
        />
      )}
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
    </>
  )
}
