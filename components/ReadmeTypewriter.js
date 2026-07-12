import { useRouter } from 'next/router'
import { useEffect } from 'react'

const BASE_CHARACTER_DELAY = 80
const SPACE_DELAY = 34
const COMMA_DELAY = 145
const SENTENCE_DELAY = 235
const DASH_DELAY = 180
const BLOCK_DELAY = 85
const FINAL_CURSOR_DURATION = 2400

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

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

const escapeHtml = value =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const decodeBasicEntities = value =>
  String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )

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

const stripHtmlToText = html =>
  decodeBasicEntities(
    String(html || '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
  )

const getClassName = openingTag => {
  const match = String(openingTag || '').match(
    /\sclass\s*=\s*(["'])([\s\S]*?)\1/i
  )
  return match?.[2] || ''
}

const cleanHeadingInnerHtml = html =>
  String(html || '')
    .replace(
      /<div\b[^>]*class\s*=\s*(["'])[^"']*\bnotion-header-anchor\b[^"']*\1[^>]*>[\s\S]*?<\/div>/gi,
      ''
    )
    .replace(
      /<a\b[^>]*class\s*=\s*(["'])[^"']*\bnotion-hash-link\b[^"']*\1[^>]*>[\s\S]*?<\/a>/gi,
      ''
    )

const getMainContent = html => {
  const source = String(html || '')
  const openingMatch = source.match(/<main\b[^>]*>/i)
  if (!openingMatch || openingMatch.index === undefined) return null

  const contentStart = openingMatch.index + openingMatch[0].length
  const contentEnd = source.lastIndexOf('</main>')
  if (contentEnd < contentStart) return null

  return {
    openingTag: openingMatch[0],
    innerHtml: source.slice(contentStart, contentEnd)
  }
}

const splitTopLevelElements = html => {
  const source = String(html || '')
  const tagPattern = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g
  const elements = []
  let depth = 0
  let elementStart = -1
  let match

  while ((match = tagPattern.exec(source))) {
    const rawTag = match[0]
    if (rawTag.startsWith('<!--')) continue

    const tagName = String(match[1] || '').toLowerCase()
    const isClosing = /^<\//.test(rawTag)
    const isSelfClosing = /\/\s*>$/.test(rawTag) || VOID_TAGS.has(tagName)

    if (!isClosing) {
      if (depth === 0) elementStart = match.index
      if (!isSelfClosing) depth += 1

      if (isSelfClosing && depth === 0 && elementStart >= 0) {
        elements.push(source.slice(elementStart, tagPattern.lastIndex))
        elementStart = -1
      }
      continue
    }

    if (depth > 0) depth -= 1
    if (depth === 0 && elementStart >= 0) {
      elements.push(source.slice(elementStart, tagPattern.lastIndex))
      elementStart = -1
    }
  }

  return elements
}

const parseRootElement = outerHtml => {
  const openingMatch = String(outerHtml || '').match(
    /^<([a-zA-Z][\w:-]*)\b[^>]*>/
  )
  if (!openingMatch) return null

  const tag = openingMatch[1].toLowerCase()
  const openingTag = openingMatch[0]
  const closingTag = `</${tag}>`
  const closingIndex = outerHtml.toLowerCase().lastIndexOf(closingTag)
  const innerHtml =
    closingIndex >= openingTag.length
      ? outerHtml.slice(openingTag.length, closingIndex)
      : ''

  return {
    tag,
    className: getClassName(openingTag),
    innerHtml,
    outerHtml
  }
}

const shouldExcludeElement = element => {
  const classes = ` ${element.className} `
  return (
    classes.includes(' notion-viewport ') ||
    classes.includes(' notion-collection-page-properties ')
  )
}

const isAnimatedTextBlock = element => {
  const classes = ` ${element.className} `
  const isHeading =
    /^h[1-6]$/.test(element.tag) && classes.includes(' notion-h ')
  const isText =
    element.tag === 'div' && classes.includes(' notion-text ')
  return isHeading || isText
}

const getReadmeElements = sourceHtml => {
  const main = getMainContent(sourceHtml)
  if (!main) return null

  const elements = splitTopLevelElements(main.innerHtml)
    .map(parseRootElement)
    .filter(Boolean)
    .filter(element => !shouldExcludeElement(element))

  const mainClassName =
    getClassName(main.openingTag) || 'notion light-mode notion-page'
  return { elements, mainClassName }
}

const renderAnimatedElement = (element, blockIndex) => {
  const cleanedInnerHtml = /^h[1-6]$/.test(element.tag)
    ? cleanHeadingInnerHtml(element.innerHtml)
    : element.innerHtml
  const fullText = stripHtmlToText(cleanedInnerHtml)
  const firstCharacter = splitGraphemes(fullText)[0] || ''
  const classAttribute = element.className
    ? ` class="${escapeHtml(element.className)}"`
    : ''

  return `<${element.tag}${classAttribute} aria-label="${escapeHtml(
    fullText
  )}"><span class="claude-prestored-readme-line"><span class="claude-prestored-readme-placeholder" aria-hidden="true">${cleanedInnerHtml}</span><span class="claude-prestored-readme-visible" data-claude-readme-block="${blockIndex}" aria-hidden="true">${
    blockIndex === 0 ? escapeHtml(firstCharacter) : ''
  }${
    blockIndex === 0
      ? '<span class="claude-prestored-readme-cursor" aria-hidden="true"></span>'
      : ''
  }</span></span></${element.tag}>`
}

export const prepareReadmeTypewriterHtml = sourceHtml => {
  const readme = getReadmeElements(sourceHtml)
  if (!readme?.elements?.length) return sourceHtml

  let animatedBlockIndex = 0
  const contentHtml = readme.elements
    .map(element => {
      if (!isAnimatedTextBlock(element)) return element.outerHtml

      const text = stripHtmlToText(element.innerHtml)
      if (!text.trim()) return element.outerHtml

      const html = renderAnimatedElement(element, animatedBlockIndex)
      animatedBlockIndex += 1
      return html
    })
    .join('')

  if (!animatedBlockIndex) return sourceHtml

  return `<style data-claude-prestored-readme-style>${TYPEWRITER_CSS}</style><div id="notion-article" class="mx-auto overflow-hidden claude-readme-notion claude-prestored-readme" data-claude-readme-state="idle"><main class="${escapeHtml(
    readme.mainClassName
  )}">${contentHtml}</main></div>`
}

const createRuntimeBlocks = shell =>
  Array.from(
    shell.querySelectorAll(
      '.claude-prestored-readme-visible[data-claude-readme-block]'
    )
  )
    .map(node => {
      const placeholder = node.previousElementSibling
      if (
        !placeholder ||
        !placeholder.classList.contains(
          'claude-prestored-readme-placeholder'
        )
      ) {
        return null
      }

      const sourceHtml = placeholder.innerHTML
      const characters = splitGraphemes(placeholder.textContent || '')
      return { node, sourceHtml, characters }
    })
    .filter(block => block && block.characters.length)

const renderRuntimeBlock = (block, visibleCount, cursorClassName = '') => {
  const template = document.createElement('template')
  template.innerHTML = block.sourceHtml
  let remaining = Math.max(0, visibleCount)
  const walker = document.createTreeWalker(
    template.content,
    window.NodeFilter.SHOW_TEXT
  )
  let textNode = walker.nextNode()

  while (textNode) {
    const characters = splitGraphemes(textNode.nodeValue || '')
    const visibleCharacters = characters.slice(0, remaining)
    textNode.nodeValue = visibleCharacters.join('')
    remaining = Math.max(0, remaining - characters.length)
    textNode = walker.nextNode()
  }

  const cursorHtml = cursorClassName
    ? `<span class="claude-prestored-readme-cursor ${cursorClassName}" aria-hidden="true"></span>`
    : ''
  block.node.innerHTML = `${template.innerHTML}${cursorHtml}`
}

export default function ReadmeTypewriter({ enabled = true }) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled || router.pathname !== '/') return undefined

    const shell = document.querySelector('.claude-prestored-readme')
    if (!shell) return undefined

    const blocks = createRuntimeBlocks(shell)
    if (!blocks.length) return undefined

    let timer = null
    let cancelled = false

    const renderBlock = ({
      blockIndex,
      visibleCount,
      cursorClassName = ''
    }) => {
      const block = blocks[blockIndex]
      if (!block) return
      renderRuntimeBlock(block, visibleCount, cursorClassName)
    }

    const appendCursor = (blockIndex, className = '') => {
      const block = blocks[blockIndex]
      if (!block) return
      block.node.insertAdjacentHTML(
        'beforeend',
        `<span class="claude-prestored-readme-cursor ${className}" aria-hidden="true"></span>`
      )
    }

    const showAll = () => {
      blocks.forEach((block, blockIndex) => {
        renderBlock({
          blockIndex,
          visibleCount: block.characters.length
        })
      })
      shell.dataset.claudeReadmeState = 'done'
    }

    const resetForTyping = () => {
      blocks.forEach((_, blockIndex) => {
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

    resetForTyping()
    shell.dataset.claudeReadmeState = 'typing'

    let blockIndex = 0
    let visibleCount = 1

    const finish = () => {
      const lastBlockIndex = blocks.length - 1
      renderBlock({
        blockIndex: lastBlockIndex,
        visibleCount: blocks[lastBlockIndex].characters.length,
        cursorClassName: 'is-finished'
      })

      timer = window.setTimeout(() => {
        if (cancelled) return
        renderBlock({
          blockIndex: lastBlockIndex,
          visibleCount: blocks[lastBlockIndex].characters.length
        })
        shell.dataset.claudeReadmeState = 'done'
      }, FINAL_CURSOR_DURATION)
    }

    const advance = () => {
      if (cancelled) return

      const characters = blocks[blockIndex].characters
      const currentCharacter =
        characters[Math.max(0, visibleCount - 1)] || ''

      if (visibleCount < characters.length) {
        timer = window.setTimeout(() => {
          if (cancelled) return
          visibleCount += 1
          renderBlock({ blockIndex, visibleCount })
          appendCursor(blockIndex)
          advance()
        }, getCharacterDuration(currentCharacter))
        return
      }

      if (blockIndex >= blocks.length - 1) {
        finish()
        return
      }

      timer = window.setTimeout(() => {
        if (cancelled) return

        renderBlock({ blockIndex, visibleCount: characters.length })
        blockIndex += 1
        visibleCount = 1
        renderBlock({ blockIndex, visibleCount })
        appendCursor(blockIndex)
        advance()
      }, BLOCK_DELAY)
    }

    advance()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      showAll()
    }
  }, [enabled, router.pathname, router.asPath])

  return null
}
