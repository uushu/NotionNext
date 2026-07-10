const BASE_CHARACTER_DELAY = 68
const SPACE_DELAY = 28
const COMMA_DELAY = 125
const SENTENCE_DELAY = 205
const DASH_DELAY = 155
const BLOCK_DELAY = 70

/**
 * 首页 README 的静态快照。
 *
 * 文本直接进入服务端首屏 HTML，不读取 Notion，也不等待客户端脚本。
 * 每个内容块只使用一个裁切动画和一个光标，避免逐字符 DOM 节点破坏排版。
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
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  vertical-align: bottom;
}

#theme-claude .claude-prestored-readme-text {
  display: inline-block;
  max-width: 100%;
  -webkit-clip-path: inset(0 100% 0 0);
  clip-path: inset(0 100% 0 0);
  animation-name: claude-prestored-readme-reveal;
  animation-duration: var(--claude-readme-duration);
  animation-timing-function: steps(var(--claude-readme-steps), end);
  animation-delay: var(--claude-readme-delay);
  animation-fill-mode: forwards;
}

#theme-claude .claude-prestored-readme-line::after {
  content: '';
  position: absolute;
  top: 0.12em;
  bottom: 0.12em;
  left: 0;
  width: 2px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0;
  pointer-events: none;
  animation-name: claude-prestored-readme-cursor-move;
  animation-duration: var(--claude-readme-duration);
  animation-timing-function: steps(var(--claude-readme-steps), end);
  animation-delay: var(--claude-readme-delay);
  animation-fill-mode: forwards;
}

#theme-claude .claude-prestored-readme-line.is-final::after {
  animation-name:
    claude-prestored-readme-cursor-move,
    claude-prestored-readme-final-cursor;
  animation-duration:
    var(--claude-readme-duration),
    0.8s;
  animation-timing-function:
    steps(var(--claude-readme-steps), end),
    steps(1, end);
  animation-delay:
    var(--claude-readme-delay),
    calc(var(--claude-readme-delay) + var(--claude-readme-duration));
  animation-iteration-count:
    1,
    3;
  animation-fill-mode:
    forwards,
    none;
}

@keyframes claude-prestored-readme-reveal {
  from {
    -webkit-clip-path: inset(0 100% 0 0);
    clip-path: inset(0 100% 0 0);
  }
  to {
    -webkit-clip-path: inset(0 0 0 0);
    clip-path: inset(0 0 0 0);
  }
}

@keyframes claude-prestored-readme-cursor-move {
  0% {
    left: 0;
    opacity: 1;
  }
  98% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
}

@keyframes claude-prestored-readme-final-cursor {
  0%, 48% {
    left: 100%;
    opacity: 1;
  }
  49%, 100% {
    left: 100%;
    opacity: 0;
  }
}

@media (max-width: 640px), (prefers-reduced-motion: reduce) {
  #theme-claude .claude-prestored-readme-line {
    white-space: normal;
  }

  #theme-claude .claude-prestored-readme-text {
    -webkit-clip-path: none !important;
    clip-path: none !important;
    animation: none !important;
  }

  #theme-claude .claude-prestored-readme-line::after {
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

const getBlockTiming = block => {
  const characters = block.segments.flatMap(segment => splitGraphemes(segment.text))
  const duration = characters.reduce(
    (total, character) => total + getCharacterDuration(character),
    0
  )

  return {
    steps: Math.max(1, characters.length),
    duration: Math.max(BASE_CHARACTER_DELAY, duration)
  }
}

const renderSegment = segment => {
  const classAttribute = segment.className
    ? ` class="${escapeHtml(segment.className)}"`
    : ''
  const text = escapeHtml(segment.text)
  const body = segment.strong ? `<b>${text}</b>` : text

  return segment.className || segment.strong
    ? `<span${classAttribute}>${body}</span>`
    : body
}

const createStaticReadmeHtml = () => {
  let timeline = 0

  const blocksHtml = README_BLOCKS.map((block, blockIndex) => {
    const { steps, duration } = getBlockTiming(block)
    const segmentsHtml = block.segments.map(renderSegment).join('')
    const isFinal = blockIndex === README_BLOCKS.length - 1
    const lineClassName = `claude-prestored-readme-line${isFinal ? ' is-final' : ''}`
    const lineStyle = [
      `--claude-readme-delay:${timeline}ms`,
      `--claude-readme-duration:${duration}ms`,
      `--claude-readme-steps:${steps}`
    ].join(';')

    timeline += duration
    if (!isFinal) timeline += BLOCK_DELAY

    return `<${block.tag} class="${escapeHtml(block.className)}"><span class="${lineClassName}" style="${lineStyle}"><span class="claude-prestored-readme-text">${segmentsHtml}</span></span></${block.tag}>`
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
