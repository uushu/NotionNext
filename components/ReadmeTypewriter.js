import { useRouter } from 'next/router'
import { useEffect, useLayoutEffect } from 'react'

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])
const CHARACTER_DELAY = 56

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * 首次打开首页时，在浏览器解析 HTML 的阶段监听 README 节点。
 * 无论脚本位于 README 前还是后，都能在首次绘制前启动动画，
 * 不再依赖 React hydration 才开始。
 */
const README_TYPEWRITER_BOOTSTRAP = `
;(function () {
  if (window.location.pathname !== '/') return
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  var observer
  var observerTimer

  var collectEntries = function (root) {
    var walker = document.createTreeWalker(
      root,
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
    return entries
  }

  var startTyping = function () {
    var card = document.querySelector('#theme-claude .claude-readme-card')
    var readme = card && card.querySelector('.markdown-body')
    if (!card || !readme) return false
    if (card.dataset.claudeReadmeTypewriterStarted === 'true') return true

    var entries = collectEntries(readme)
    if (!entries.length) return false

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
    var rafId = 0
    var lastFrameAt = performance.now() - ${CHARACTER_DELAY}

    var typeFrame = function (now) {
      if (!card.isConnected) {
        window.cancelAnimationFrame(rafId)
        return
      }

      var elapsed = now - lastFrameAt
      if (elapsed < ${CHARACTER_DELAY}) {
        rafId = window.requestAnimationFrame(typeFrame)
        return
      }

      var steps = Math.min(3, Math.max(1, Math.floor(elapsed / ${CHARACTER_DELAY})))
      lastFrameAt = now

      while (steps > 0 && nodeIndex < entries.length) {
        var entry = entries[nodeIndex]
        var parent = entry.node.parentNode

        if (!parent) {
          nodeIndex += 1
          characterIndex = 0
          steps -= 1
          continue
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

        steps -= 1
      }

      if (nodeIndex >= entries.length) {
        readme.removeAttribute('aria-busy')
        readme.classList.remove('claude-readme-is-typing')
        readme.style.minHeight = previousMinHeight
        return
      }

      rafId = window.requestAnimationFrame(typeFrame)
    }

    // 同一轮解析中立即写入第一个字符，下一帧继续平滑输出。
    typeFrame(performance.now())
    return true
  }

  if (startTyping()) return

  observer = new MutationObserver(function () {
    if (startTyping()) {
      observer.disconnect()
      window.clearTimeout(observerTimer)
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  observerTimer = window.setTimeout(function () {
    observer.disconnect()
  }, 10000)
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
 * 客户端路由返回首页时负责再次启动动画。
 * 首次直达首页由上面的解析阶段脚本负责。
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
    let observerTimer
    let rafId = 0
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

      let nodeIndex = 0
      let characterIndex = 0
      let finished = false
      let lastFrameAt = performance.now() - CHARACTER_DELAY

      const restore = () => {
        window.cancelAnimationFrame(rafId)

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

      const typeFrame = now => {
        const elapsed = now - lastFrameAt
        if (elapsed < CHARACTER_DELAY) {
          rafId = window.requestAnimationFrame(typeFrame)
          return
        }

        let steps = Math.min(
          3,
          Math.max(1, Math.floor(elapsed / CHARACTER_DELAY))
        )
        lastFrameAt = now

        while (steps > 0 && nodeIndex < entries.length) {
          const entry = entries[nodeIndex]
          const parent = entry.node.parentNode

          if (!parent) {
            nodeIndex += 1
            characterIndex = 0
            steps -= 1
            continue
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

          steps -= 1
        }

        if (nodeIndex >= entries.length) {
          finished = true
          readme.removeAttribute('aria-busy')
          readme.classList.remove('claude-readme-is-typing')
          readme.style.minHeight = previousMinHeight
          return
        }

        rafId = window.requestAnimationFrame(typeFrame)
      }

      typeFrame(performance.now())

      cleanupAnimation = () => {
        if (!finished) restore()
        else cursor.remove()
      }

      return true
    }

    if (!startTyping()) {
      observer = new MutationObserver(() => {
        if (startTyping()) {
          observer.disconnect()
          window.clearTimeout(observerTimer)
        }
      })
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      })
      observerTimer = window.setTimeout(() => observer.disconnect(), 10000)
    }

    return () => {
      observer?.disconnect()
      window.clearTimeout(observerTimer)
      window.cancelAnimationFrame(rafId)
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
