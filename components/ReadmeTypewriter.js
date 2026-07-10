import { useEffect, useMemo } from 'react'

const CURSOR_FINISH_DURATION = 2400

const decodeHtmlEntities = value => {
  if (!value) return ''

  return value
    .replace(/&nbsp;/gi, ' ')
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

const getClassName = attributes => {
  return attributes.match(/\bclass=(['"])(.*?)\1/i)?.[2] || ''
}

const htmlToText = html => {
  return decodeHtmlEntities(
    String(html || '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?>[\s\S]*?<\/svg>/gi, '')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

const parseReadmeBlocks = html => {
  if (!html || typeof html !== 'string') return []

  const blocks = []
  const headingPattern =
    /<(h[1-6])\b([^>]*class=(['"])[^'"]*\bnotion-h\b[^'"]*\3[^>]*)>([\s\S]*?)<\/\1>/gi
  const textPattern =
    /<div\b([^>]*class=(['"])[^'"]*\bnotion-text\b[^'"]*\2[^>]*)>([\s\S]*?)<\/div>/gi

  let match = headingPattern.exec(html)
  while (match) {
    const text = htmlToText(match[4])
    if (text) {
      blocks.push({
        index: match.index,
        tag: match[1].toLowerCase(),
        className: getClassName(match[2]),
        text
      })
    }
    match = headingPattern.exec(html)
  }

  match = textPattern.exec(html)
  while (match) {
    const text = htmlToText(match[3])
    if (text) {
      blocks.push({
        index: match.index,
        tag: 'div',
        className: getClassName(match[1]),
        text
      })
    }
    match = textPattern.exec(html)
  }

  return blocks.sort((a, b) => a.index - b.index)
}

const serializeBlocks = blocks => {
  return JSON.stringify(blocks)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

const createBootstrapScript = blocks => `
;(function () {
  var blocks = ${serializeBlocks(blocks)}
  var finishDuration = ${CURSOR_FINISH_DURATION}

  var splitGraphemes = function (text) {
    if (window.Intl && typeof window.Intl.Segmenter === 'function') {
      var segmenter = new window.Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
      return Array.from(segmenter.segment(text), function (segment) {
        return segment.segment
      })
    }
    return Array.from(text)
  }

  var getDelay = function (character) {
    if (/[。！？!?]/.test(character)) return 220
    if (/[，、：；,;:]/.test(character)) return 140
    if (/[…—]/.test(character)) return 170
    if (/\\s/.test(character)) return 35
    return 55 + Math.round(Math.random() * 30)
  }

  var start = function (nextBlocks) {
    if (window.location.pathname !== '/') return
    if (!nextBlocks || !nextBlocks.length) return
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    var card = document.querySelector('#theme-claude .claude-readme-card')
    var original = card && card.querySelector(':scope > .markdown-body')
    if (!card || !original) return
    if (card.dataset.claudeReadmePreparsedStarted === 'true') return

    card.dataset.claudeReadmePreparsedStarted = 'true'

    var shell = document.createElement('div')
    shell.className = 'claude-readme-typewriter-shell'
    original.parentNode.insertBefore(shell, original)
    shell.appendChild(original)

    original.classList.add('claude-readme-typewriter-original')
    original.style.visibility = 'hidden'
    original.style.pointerEvents = 'none'
    original.setAttribute('aria-hidden', 'true')

    var animation = document.createElement('div')
    animation.className = 'markdown-body claude-readme-animation-surface'
    animation.setAttribute('aria-hidden', 'true')

    var notionRoot = document.createElement('div')
    notionRoot.className = 'claude-readme-notion'
    var main = document.createElement('main')
    main.className = 'notion light-mode notion-page'
    notionRoot.appendChild(main)
    animation.appendChild(notionRoot)
    shell.appendChild(animation)

    var cursor = document.createElement('span')
    cursor.className = 'claude-readme-block-cursor'
    cursor.setAttribute('aria-hidden', 'true')

    var blockStates = nextBlocks.map(function (block, index) {
      var element = document.createElement(block.tag)
      element.className = block.className + ' claude-readme-animated-block'

      var grid = document.createElement('span')
      grid.className = 'claude-readme-block-grid'

      var placeholder = document.createElement('span')
      placeholder.className = 'claude-readme-block-placeholder'
      placeholder.setAttribute('aria-hidden', 'true')
      placeholder.textContent = block.text

      var visible = document.createElement('span')
      visible.className = 'claude-readme-block-visible'
      visible.setAttribute('aria-hidden', 'true')

      var characters = splitGraphemes(block.text)
      if (index === 0 && characters.length) {
        visible.textContent = characters[0]
      }

      grid.appendChild(placeholder)
      grid.appendChild(visible)
      element.appendChild(grid)
      main.appendChild(element)

      return {
        characters: characters,
        visible: visible
      }
    })

    if (!blockStates.length || !blockStates[0].characters.length) {
      animation.remove()
      original.style.visibility = ''
      original.style.pointerEvents = ''
      original.removeAttribute('aria-hidden')
      return
    }

    var blockIndex = 0
    var characterCount = 1
    var timer
    var finishTimer

    blockStates[0].visible.appendChild(cursor)

    var finish = function () {
      cursor.classList.add('is-finished')
      finishTimer = window.setTimeout(function () {
        if (!card.isConnected) return
        cursor.remove()
        animation.style.visibility = 'hidden'
        original.style.visibility = ''
        original.style.pointerEvents = ''
        original.removeAttribute('aria-hidden')
        shell.classList.add('is-done')
      }, finishDuration)
    }

    var typeNext = function () {
      if (!card.isConnected) {
        window.clearTimeout(timer)
        window.clearTimeout(finishTimer)
        return
      }

      var state = blockStates[blockIndex]
      var characters = state.characters

      if (characterCount < characters.length) {
        var previousCharacter = characters[characterCount - 1] || ''
        characterCount += 1
        state.visible.textContent = characters.slice(0, characterCount).join('')
        state.visible.appendChild(cursor)
        timer = window.setTimeout(typeNext, getDelay(previousCharacter))
        return
      }

      if (blockIndex < blockStates.length - 1) {
        var lastCharacter = characters[characters.length - 1] || ''
        blockIndex += 1
        state = blockStates[blockIndex]
        characters = state.characters
        characterCount = Math.min(1, characters.length)
        state.visible.textContent = characters.slice(0, characterCount).join('')
        state.visible.appendChild(cursor)
        timer = window.setTimeout(typeNext, getDelay(lastCharacter))
        return
      }

      finish()
    }

    timer = window.setTimeout(
      typeNext,
      getDelay(blockStates[0].characters[0] || '')
    )
  }

  window.__startClaudeReadmePreparsedTypewriter = start
  start(blocks)
})()
`

/**
 * README 全文预解析打字动画。
 *
 * 文本块在服务端从 readmeHtml 提取，并在 HTML 解析阶段建立独立动画层。
 * 不等待 React hydration，不遍历、清空或克隆 Notion 正文。
 */
export default function ReadmeTypewriter({
  enabled = true,
  readmeHtml = '',
  html = ''
}) {
  const sourceHtml = readmeHtml || html
  const blocks = useMemo(() => parseReadmeBlocks(sourceHtml), [sourceHtml])

  useEffect(() => {
    if (!enabled || !blocks.length) return
    window.__startClaudeReadmePreparsedTypewriter?.(blocks)
  }, [blocks, enabled])

  if (!enabled || !blocks.length) return null

  return (
    <>
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: createBootstrapScript(blocks) }}
      />

      <style jsx global>{`
        .claude-readme-typewriter-shell {
          position: relative;
          width: 100%;
          overflow-anchor: none;
        }

        .claude-readme-animation-surface {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          margin: 0;
          pointer-events: none;
        }

        .claude-readme-block-grid {
          display: grid;
          width: 100%;
          min-width: 0;
        }

        .claude-readme-block-placeholder,
        .claude-readme-block-visible {
          grid-area: 1 / 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .claude-readme-block-placeholder {
          visibility: hidden;
          pointer-events: none;
          user-select: none;
        }

        .claude-readme-block-cursor {
          display: inline-block;
          width: 2px;
          height: 0.95em;
          margin-left: 4px;
          vertical-align: -0.08em;
          background: currentColor;
          animation: claude-readme-block-cursor-blink 0.8s steps(1, end)
            infinite;
        }

        .claude-readme-block-cursor.is-finished {
          animation-iteration-count: 3;
        }

        @keyframes claude-readme-block-cursor-blink {
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
          .claude-readme-typewriter-original {
            visibility: visible !important;
            pointer-events: auto !important;
          }

          .claude-readme-animation-surface {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
