import { useEffect } from 'react'

const CURSOR_FINISH_DURATION = 2400
const PREPARED_MARKER = 'data-claude-readme-prepared'

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

const escapeHtml = value => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

const splitGraphemesForServer = text => Array.from(text || '')

const serializeBlocks = blocks => {
  return JSON.stringify(blocks)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function startPreparedReadmeTypewriter() {
  const finishDuration = 2400

  const splitGraphemes = text => {
    if (window.Intl && typeof window.Intl.Segmenter === 'function') {
      const segmenter = new window.Intl.Segmenter('zh-CN', {
        granularity: 'grapheme'
      })
      return Array.from(segmenter.segment(text), segment => segment.segment)
    }
    return Array.from(text)
  }

  const getDelay = character => {
    if (/[。！？!?]/.test(character)) return 220
    if (/[，、：；,;:]/.test(character)) return 140
    if (/[…—]/.test(character)) return 170
    if (/\s/.test(character)) return 35
    return 55 + Math.round(Math.random() * 30)
  }

  const revealOriginal = shell => {
    const original = shell.querySelector('.claude-readme-typewriter-original')
    const animation = shell.querySelector('.claude-readme-animation-surface')

    if (animation) animation.style.visibility = 'hidden'
    if (original) {
      original.style.visibility = 'visible'
      original.style.pointerEvents = 'auto'
      original.removeAttribute('aria-hidden')
    }
    shell.dataset.claudeReadmeState = 'done'
  }

  const startShell = shell => {
    if (!shell || shell.dataset.claudeReadmeState !== 'idle') return

    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      revealOriginal(shell)
      return
    }

    const dataNode = shell.querySelector('[data-claude-readme-blocks]')
    const original = shell.querySelector('.claude-readme-typewriter-original')
    const animation = shell.querySelector('.claude-readme-animation-surface')
    const visibleNodes = Array.from(
      shell.querySelectorAll('[data-claude-readme-visible]')
    )

    let blocks = []
    try {
      blocks = JSON.parse(dataNode?.textContent || '[]')
    } catch (error) {
      revealOriginal(shell)
      return
    }

    if (!original || !animation || !blocks.length || !visibleNodes.length) {
      revealOriginal(shell)
      return
    }

    const blockStates = blocks.map((block, index) => ({
      characters: splitGraphemes(block.text),
      visible: visibleNodes[index]
    }))

    if (!blockStates[0]?.characters.length) {
      revealOriginal(shell)
      return
    }

    shell.dataset.claudeReadmeState = 'typing'

    original.style.visibility = 'hidden'
    original.style.pointerEvents = 'none'
    original.setAttribute('aria-hidden', 'true')
    animation.style.visibility = 'visible'

    const cursor = document.createElement('span')
    cursor.className = 'claude-readme-block-cursor'
    cursor.setAttribute('aria-hidden', 'true')

    blockStates.forEach((state, index) => {
      state.visible.textContent = index === 0 ? state.characters[0] : ''
    })
    blockStates[0].visible.appendChild(cursor)

    let blockIndex = 0
    let characterCount = 1
    let timer
    let finishTimer

    const finish = () => {
      shell.dataset.claudeReadmeState = 'finished'
      cursor.classList.add('is-finished')
      finishTimer = window.setTimeout(() => {
        if (!shell.isConnected) return
        cursor.remove()
        revealOriginal(shell)
      }, finishDuration)
    }

    const typeNext = () => {
      if (!shell.isConnected) {
        window.clearTimeout(timer)
        window.clearTimeout(finishTimer)
        return
      }

      let state = blockStates[blockIndex]
      let characters = state.characters

      if (characterCount < characters.length) {
        const previousCharacter = characters[characterCount - 1] || ''
        characterCount += 1
        state.visible.textContent = characters.slice(0, characterCount).join('')
        state.visible.appendChild(cursor)
        timer = window.setTimeout(typeNext, getDelay(previousCharacter))
        return
      }

      if (blockIndex < blockStates.length - 1) {
        const lastCharacter = characters[characters.length - 1] || ''
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

  document
    .querySelectorAll('[data-claude-readme-prepared]')
    .forEach(startShell)
}

const createAnimationBlocksHtml = blocks => {
  return blocks
    .map((block, index) => {
      const characters = splitGraphemesForServer(block.text)
      const firstCharacter = index === 0 ? characters[0] || '' : ''
      const className = `${block.className} claude-readme-animated-block`.trim()

      return `<${block.tag} class="${escapeHtml(className)}"><span class="claude-readme-block-grid"><span class="claude-readme-block-placeholder" aria-hidden="true">${escapeHtml(block.text)}</span><span class="claude-readme-block-visible" data-claude-readme-visible aria-hidden="true">${escapeHtml(firstCharacter)}${index === 0 ? '<span class="claude-readme-block-cursor" aria-hidden="true"></span>' : ''}</span></span></${block.tag}>`
    })
    .join('')
}

/**
 * 把 README 原始 HTML 转换成服务端可直接输出的全文打字机结构。
 * 动画层和第一个字符已经位于首屏 HTML 中，不依赖 hydration 后的 DOM 重建。
 */
export const prepareReadmeTypewriterHtml = html => {
  if (!html || typeof html !== 'string' || html.includes(PREPARED_MARKER)) {
    return html
  }

  const blocks = parseReadmeBlocks(html)
  if (!blocks.length) return html

  const blocksJson = serializeBlocks(blocks)
  const animationBlocksHtml = createAnimationBlocksHtml(blocks)
  const bootstrap = `window.__startClaudeReadmePreparedTypewriter=${startPreparedReadmeTypewriter.toString()};window.__startClaudeReadmePreparedTypewriter();`

  return `<div class="claude-readme-typewriter-shell" data-claude-readme-prepared data-claude-readme-state="idle"><div class="claude-readme-typewriter-original" aria-hidden="true" style="visibility:hidden;pointer-events:none">${html}</div><div class="claude-readme-animation-surface claude-readme-notion" aria-hidden="true"><main class="notion light-mode notion-page">${animationBlocksHtml}</main></div><script type="application/json" data-claude-readme-blocks>${blocksJson}</script><script>${bootstrap}</script><noscript><style>.claude-readme-typewriter-original{visibility:visible!important;pointer-events:auto!important}.claude-readme-animation-surface{display:none!important}</style></noscript></div>`
}

/**
 * 提供共享样式，并在客户端路由进入首页时启动已经服务端渲染的动画结构。
 */
export default function ReadmeTypewriter({ enabled = true }) {
  useEffect(() => {
    if (!enabled) return
    window.__startClaudeReadmePreparedTypewriter = startPreparedReadmeTypewriter
    startPreparedReadmeTypewriter()
  }, [enabled])

  if (!enabled) return null

  return (
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
  )
}
