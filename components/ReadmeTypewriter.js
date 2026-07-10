import { useRouter } from 'next/router'
import { useEffect } from 'react'

const BASE_CHARACTER_DELAY = 80
const SPACE_DELAY = 34
const COMMA_DELAY = 145
const SENTENCE_DELAY = 235
const DASH_DELAY = 180
const BLOCK_DELAY = 85
const FINAL_CURSOR_DURATION = 2400

/**
 * 首页 README 的静态快照。
 *
 * 文本直接进入服务端首屏 HTML，不读取 Notion。
 * 完整文本只作为透明占位，实际内容由客户端按字符逐步追加，避免 clip-path
 * 对中文、emoji 和彩色嵌套文本造成截断。
 */
const README_BLOCKS = [
  {
    tag: 'h3',
    className: 'notion-h notion-h2 notion-h-indent-0',
    segments: [{ text: '🐰 欢迎来到 utto 兔子的学习屋' }]
  },
  {
    tag: 'div',
    className: 'notion-text',
    segments: [
      { text: '你好，我是 ' },
      { text: 'utto 兔子 ', className: 'notion-orange', strong: true },
      { text: '( •̀ .̫ •́ )✧', className: 'notion-orange' }
    ]
  },
  {
    tag: 'div',
    className: 'notion-text',
    segments: [{ text: '记录我的学习、游戏开发、项目实践和吃喝玩乐' }]
  },
  {
    tag: 'h4',
    className: 'notion-h notion-h3 notion-h-indent-1',
    segments: [
      { text: '🟠', strong: true },
      { text: '这里主要会有', className: 'notion-brown' }
    ]
  },
  {
    tag: 'div',
    className: 'notion-text',
    segments: [{ text: '速通笔记', className: 'notion-purple' }]
  },
  {
    tag: 'div',
    className: 'notion-text',
    segments: [{ text: '学习分享', className: 'notion-yellow' }]
  },
  {
    tag: 'div',
    className: 'notion-text',
    segments: [{ text: '项目实践', className: 'notion-teal' }]
  },
  {
    tag: 'div',
    className: 'notion-text',
    segments: [{ text: '…… ' }]
  },
  {
    tag: 'div',
    className: 'notion-text',
    segments: [{ text: '目前正在持续建设中' }]
  }
]

const TYPEWRITER_CSS = `
 #theme-claude .claude-prestored-readme {
   width: 100%;
   max-width: 760px;
   margin-left: auto;
   margin-right: auto;
   overflow-anchor: none;
 }

 #theme-claude .claude-prestored-readme,
 #theme-claude .claude-prestored-readme * {
   text-align: center;
 }

 #theme-claude .claude-prestored-readme-line {
   position: relative;
   display: inline-grid;
   max-width: 100%;
   white-space: nowrap;
   vertical-align: bottom;
 }

 #theme-claude .claude-prestored-readme-placeholder,
 #theme-claude .claude-prestored-readme-visible {
   grid-area: 1 / 1;
 }

 #theme-claude .claude-prestored-readme-placeholder {
   visibility: hidden;
   pointer-events: none;
   user-select: none;
 }

 #theme-claude .claude-prestored-readme-visible {
   justify-self: start;
   min-width: 0;
 }

 #theme-claude .claude-prestored-readme-cursor {
   display: inline-block;
   width: 2px;
   height: 0.95em;
   margin-left: 3px;
   vertical-align: -0.08em;
   border-radius: 1px;
   background: currentColor;
   pointer-events: none;
 }

 #theme-claude .claude-prestored-readme-cursor.is-finished {
   animation: claude-prestored-readme-final-cursor 0.8s steps(1, end) 3;
 }

 @keyframes claude-prestored-readme-final-cursor {
   0%, 48% { opacity: 1; }
   49%, 100% { opacity: 0; }
 }

 @media (max-width: 640px) {
   #theme-claude .claude-prestored-readme-line {
     width: 100%;
     white-space: normal;
   }

   #theme-claude .claude-prestored-readme-placeholder,
   #theme-claude .claude-prestored-readme-visible {
     width: 100%;
   }
 }
 `

const escapeHtml = value => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const splitGraphemes = value => {
  const characters = Array.from(String(value || ''))
  const graphemes = []

  for (const character of characters) {
    if (/\p{Mark}/u.test(character) && graphemes.length) {
      graphemes[graphemes.length - 1] += character
      continue
    }
    graphemes.push(character)
  }

  return graphemes
}

const getCharacterDuration = character => {
  if (/[。！？!?]/u.test(character)) return SENTENCE_DELAY
  if (/[，、：；,;:]/u.test(character)) return COMMA_DELAY
  if (/[…—]/u.test(character)) return DASH_DELAY
  if (/\s/u.test(character)) return SPACE_DELAY
  return BASE_CHARACTER_DELAY
}

const renderSegmentBody = (segment, text) => {
  const classAttribute = segment.className
    ? ` class="${escapeHtml(segment.className)}"`
    : ''
  const escapedText = escapeHtml(text)
  const body = segment.strong ? `<b>${escapedText}</b>` : escapedText

  return segment.className || segment.strong
    ? `<span${classAttribute}>${body}</span>`
    : body
}

const renderFullBlock = block => {
  return block.segments
    .map(segment => renderSegmentBody(segment, segment.text))
    .join('')
}

const getBlockCharacters = block => {
  const characters = []

  block.segments.forEach((segment, segmentIndex) => {
    splitGraphemes(segment.text).forEach(character => {
      characters.push({ character, segmentIndex })
    })
  })

  return characters
}

const renderVisibleBlock = (block, visibleCount) => {
  let remaining = Math.max(0, visibleCount)

  return block.segments
    .map(segment => {
      if (remaining <= 0) return ''

      const characters = splitGraphemes(segment.text)
      const visibleCharacters = characters.slice(0, remaining)
      remaining -= visibleCharacters.length

      if (!visibleCharacters.length) return ''
      return renderSegmentBody(segment, visibleCharacters.join(''))
    })
    .join('')
}

const createStaticReadmeHtml = () => {
  const blocksHtml = README_BLOCKS.map((block, blockIndex) => {
    const fullHtml = renderFullBlock(block)
    const initialVisibleHtml =
      blockIndex === 0 ? renderVisibleBlock(block, 1) : ''

    return `<${block.tag} class="${escapeHtml(
      block.className
    )}" aria-label="${escapeHtml(
      block.segments.map(segment => segment.text).join('')
    )}"><span class="claude-prestored-readme-line"><span class="claude-prestored-readme-placeholder" aria-hidden="true">${fullHtml}</span><span class="claude-prestored-readme-visible" data-claude-readme-block="${blockIndex}" aria-hidden="true">${initialVisibleHtml}${
      blockIndex === 0
        ? '<span class="claude-prestored-readme-cursor" aria-hidden="true"></span>'
        : ''
    }</span></span></${block.tag}>`
  }).join('')

  return `<style data-claude-prestored-readme-style>${TYPEWRITER_CSS}</style><div id="notion-article" class="mx-auto overflow-hidden claude-readme-notion claude-prestored-readme" data-claude-readme-state="idle"><main class="notion light-mode notion-page">${blocksHtml}</main></div>`
}

const STATIC_README_HTML = createStaticReadmeHtml()
const BLOCK_CHARACTERS = README_BLOCKS.map(getBlockCharacters)

/**
 * 用预存文本替换首页 README 的动态 HTML。
 * 第一个字符直接进入首屏 HTML，避免动画启动前出现空白。
 */
export const prepareReadmeTypewriterHtml = () => STATIC_README_HTML

const renderBlockIntoNode = ({
  blockIndex,
  visibleCount,
  cursorClassName = '',
  root = document
}) => {
  const node = root.querySelector(
    `.claude-prestored-readme-visible[data-claude-readme-block="${blockIndex}"]`
  )
  if (!node) return

  const cursorHtml = cursorClassName
    ? `<span class="claude-prestored-readme-cursor ${cursorClassName}" aria-hidden="true"></span>`
    : ''

  node.innerHTML = `${renderVisibleBlock(
    README_BLOCKS[blockIndex],
    visibleCount
  )}${cursorHtml}`
}

export default function ReadmeTypewriter({ enabled = true }) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled || router.pathname !== '/') return undefined

    const shell = document.querySelector('.claude-prestored-readme')
    if (!shell) return undefined

    let timer = null
    let cancelled = false

    const renderBlock = options => {
      renderBlockIntoNode({ ...options, root: shell })
    }

    const appendCursor = (blockIndex, className = '') => {
      const node = shell.querySelector(
        `.claude-prestored-readme-visible[data-claude-readme-block="${blockIndex}"]`
      )
      if (!node) return

      node.insertAdjacentHTML(
        'beforeend',
        `<span class="claude-prestored-readme-cursor ${className}" aria-hidden="true"></span>`
      )
    }

    const showAll = () => {
      README_BLOCKS.forEach((_, blockIndex) => {
        renderBlock({
          blockIndex,
          visibleCount: BLOCK_CHARACTERS[blockIndex].length
        })
      })
      shell.dataset.claudeReadmeState = 'done'
    }

    const resetForTyping = () => {
      README_BLOCKS.forEach((_, blockIndex) => {
        renderBlock({
          blockIndex,
          visibleCount: blockIndex === 0 ? 1 : 0
        })
      })
      appendCursor(0)
      shell.dataset.claudeReadmeState = 'idle'
    }

    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      showAll()
      return undefined
    }

    // 每次通过客户端路由重新进入首页，都从一致的初始状态开始。
    // 不能沿用上一次被中断的 typing 状态，否则会永久停在第一个 emoji。
    resetForTyping()
    shell.dataset.claudeReadmeState = 'typing'

    let blockIndex = 0
    let visibleCount = 1

    const finish = () => {
      renderBlock({
        blockIndex: README_BLOCKS.length - 1,
        visibleCount: BLOCK_CHARACTERS[README_BLOCKS.length - 1].length,
        cursorClassName: 'is-finished'
      })

      timer = window.setTimeout(() => {
        if (cancelled) return
        renderBlock({
          blockIndex: README_BLOCKS.length - 1,
          visibleCount: BLOCK_CHARACTERS[README_BLOCKS.length - 1].length
        })
        shell.dataset.claudeReadmeState = 'done'
      }, FINAL_CURSOR_DURATION)
    }

    const advance = () => {
      if (cancelled) return

      const characters = BLOCK_CHARACTERS[blockIndex]
      const currentCharacter =
        characters[Math.max(0, visibleCount - 1)]?.character || ''

      if (visibleCount < characters.length) {
        timer = window.setTimeout(() => {
          if (cancelled) return
          visibleCount += 1
          renderBlock({
            blockIndex,
            visibleCount
          })
          appendCursor(blockIndex)
          advance()
        }, getCharacterDuration(currentCharacter))
        return
      }

      if (blockIndex >= README_BLOCKS.length - 1) {
        finish()
        return
      }

      timer = window.setTimeout(() => {
        if (cancelled) return

        renderBlock({ blockIndex, visibleCount: characters.length })
        blockIndex += 1
        visibleCount = 1
        renderBlock({
          blockIndex,
          visibleCount
        })
        appendCursor(blockIndex)
        advance()
      }, BLOCK_DELAY)
    }

    advance()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)

      // 离开首页时必须把被中断的逐字内容恢复完整。
      // 返回首页后，新的 effect 会再次调用 resetForTyping() 正常重播。
      showAll()
    }
  }, [enabled, router.pathname, router.asPath])

  return null
}
