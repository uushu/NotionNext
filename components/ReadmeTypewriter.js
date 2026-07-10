const BASE_CHARACTER_DELAY = 68
const SPACE_DELAY = 28
const COMMA_DELAY = 125
const SENTENCE_DELAY = 205
const DASH_DELAY = 155
const BLOCK_DELAY = 36

/**
 * 首页 README 的静态快照。
 *
 * 这里故意不依赖 Notion、readmeHtml、React hydration 或页面 DOM。
 * 每个字符都直接进入服务端首屏 HTML，再由纯 CSS 时间轴逐字显示。
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

#theme-claude .claude-prestored-readme-char {
  opacity: 0;
  animation-name: claude-prestored-readme-reveal;
  animation-duration: 1ms;
  animation-timing-function: step-end;
  animation-delay: var(--claude-readme-char-delay);
  animation-fill-mode: forwards;
}

#theme-claude .claude-prestored-readme-cursor {
  display: inline-block;
  width: 2px;
  height: 0.95em;
  margin-left: 2px;
  margin-right: -4px;
  vertical-align: -0.08em;
  background: currentColor;
  opacity: 0;
  pointer-events: none;
  animation-name: claude-prestored-readme-cursor-window;
  animation-duration: var(--claude-readme-cursor-duration);
  animation-timing-function: step-end;
  animation-delay: var(--claude-readme-cursor-delay);
  animation-iteration-count: 1;
}

#theme-claude .claude-prestored-readme-cursor.is-final {
  animation-name: claude-prestored-readme-final-cursor;
  animation-duration: 0.8s;
  animation-timing-function: steps(1, end);
  animation-iteration-count: 3;
}

@keyframes claude-prestored-readme-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes claude-prestored-readme-cursor-window {
  0%, 98% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes claude-prestored-readme-final-cursor {
  0%, 48% { opacity: 1; }
  49%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  #theme-claude .claude-prestored-readme-char {
    opacity: 1 !important;
    animation: none !important;
  }

  #theme-claude .claude-prestored-readme-cursor {
    display: none !important;
    animation: none !important;
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

const renderCharacter = ({ character, delay, duration, isFinal }) => {
  const visibleCharacter = /\s/u.test(character) ? '&#160;' : escapeHtml(character)
  const cursorClassName = `claude-prestored-readme-cursor${isFinal ? ' is-final' : ''}`

  return `<span class="claude-prestored-readme-char" style="--claude-readme-char-delay:${delay}ms">${visibleCharacter}</span><span class="${cursorClassName}" aria-hidden="true" style="--claude-readme-cursor-delay:${delay}ms;--claude-readme-cursor-duration:${duration}ms"></span>`
}

const countCharacters = () => {
  return README_BLOCKS.reduce((blockTotal, block) => {
    return (
      blockTotal +
      block.segments.reduce(
        (segmentTotal, segment) => segmentTotal + splitGraphemes(segment.text).length,
        0
      )
    )
  }, 0)
}

const createStaticReadmeHtml = () => {
  const totalCharacters = countCharacters()
  let characterIndex = 0
  let timeline = 0

  const blocksHtml = README_BLOCKS.map((block, blockIndex) => {
    const segmentsHtml = block.segments
      .map(segment => {
        const charactersHtml = splitGraphemes(segment.text)
          .map(character => {
            const duration = getCharacterDuration(character)
            const html = renderCharacter({
              character,
              delay: timeline,
              duration,
              isFinal: characterIndex === totalCharacters - 1
            })

            timeline += duration
            characterIndex += 1
            return html
          })
          .join('')

        const classAttribute = segment.className
          ? ` class="${escapeHtml(segment.className)}"`
          : ''
        const segmentBody = segment.strong
          ? `<b>${charactersHtml}</b>`
          : charactersHtml

        return segment.className || segment.strong
          ? `<span${classAttribute}>${segmentBody}</span>`
          : segmentBody
      })
      .join('')

    if (blockIndex < README_BLOCKS.length - 1) {
      timeline += BLOCK_DELAY
    }

    return `<${block.tag} class="${escapeHtml(block.className)}">${segmentsHtml}</${block.tag}>`
  }).join('')

  return `<style data-claude-prestored-readme-style>${TYPEWRITER_CSS}</style><div id="notion-article" class="mx-auto overflow-hidden claude-readme-notion claude-prestored-readme"><main class="notion light-mode notion-page">${blocksHtml}</main></div>`
}

const STATIC_README_HTML = createStaticReadmeHtml()

/**
 * 用预存文本完全替换首页 README 的动态 HTML。
 * 参数保留是为了兼容现有调用，但不会读取或解析传入内容。
 */
export const prepareReadmeTypewriterHtml = () => STATIC_README_HTML

/**
 * 样式与动画均已随 README 首屏 HTML 直接输出，这里无需运行客户端逻辑。
 */
export default function ReadmeTypewriter() {
  return null
}
