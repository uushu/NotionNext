import { useEffect, useMemo, useState } from 'react'

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
  if (/[…—]/.test(character)) return 170
  if (/\s/.test(character)) return 35
  return 55 + Math.round(Math.random() * 30)
}

const AnimatedBlock = ({ block, visibleText, showCursor, isFinished }) => {
  const Tag = block.tag

  return (
    <Tag className={`${block.className} claude-readme-animated-block`}>
      <span className='claude-readme-block-grid'>
        <span className='claude-readme-block-placeholder' aria-hidden='true'>
          {block.text}
        </span>
        <span className='claude-readme-block-visible' aria-hidden='true'>
          {visibleText}
          {showCursor && (
            <span
              className={`claude-readme-block-cursor ${
                isFinished ? 'is-finished' : ''
              }`}
            />
          )}
        </span>
      </span>
    </Tag>
  )
}

/**
 * README 全文打字动画。
 *
 * readmeHtml 在 React 渲染前被解析成独立文本块。首个字符直接进入服务端 HTML，
 * 后续字符在客户端连续播放，不查询、不清空、不克隆 Notion DOM。
 */
export default function ReadmeTypewriter({ html = '', enabled = true }) {
  const blocks = useMemo(() => parseReadmeBlocks(html), [html])
  const graphemes = useMemo(
    () => blocks.map(block => splitGraphemes(block.text)),
    [blocks]
  )
  const [position, setPosition] = useState({ blockIndex: 0, characterCount: 1 })
  const [status, setStatus] = useState('typing')

  useEffect(() => {
    if (!enabled || !blocks.length) return undefined

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setStatus('done')
      return undefined
    }

    let blockIndex = 0
    let characterCount = 1
    let typeTimer
    let finishTimer
    let cancelled = false

    setPosition({ blockIndex, characterCount })
    setStatus('typing')

    const typeNext = () => {
      if (cancelled) return

      const currentCharacters = graphemes[blockIndex] || []

      if (characterCount < currentCharacters.length) {
        const previousCharacter = currentCharacters[characterCount - 1] || ''
        characterCount += 1
        setPosition({ blockIndex, characterCount })
        typeTimer = window.setTimeout(
          typeNext,
          getCharacterDelay(previousCharacter)
        )
        return
      }

      if (blockIndex < graphemes.length - 1) {
        const previousCharacter = currentCharacters[currentCharacters.length - 1] || ''
        blockIndex += 1
        characterCount = Math.min(1, graphemes[blockIndex]?.length || 0)
        setPosition({ blockIndex, characterCount })
        typeTimer = window.setTimeout(
          typeNext,
          getCharacterDelay(previousCharacter)
        )
        return
      }

      setStatus('finished')
      finishTimer = window.setTimeout(() => {
        if (!cancelled) setStatus('done')
      }, CURSOR_FINISH_DURATION)
    }

    const firstCharacter = graphemes[0]?.[0] || ''
    typeTimer = window.setTimeout(typeNext, getCharacterDelay(firstCharacter))

    return () => {
      cancelled = true
      window.clearTimeout(typeTimer)
      window.clearTimeout(finishTimer)
    }
  }, [blocks, enabled, graphemes])

  if (!html) return null

  if (!enabled || !blocks.length) {
    return (
      <div
        className='markdown-body'
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  const accessibleText = blocks.map(block => block.text).join('\n')

  return (
    <div className={`markdown-body claude-readme-typewriter is-${status}`}>
      {status !== 'done' && <span className='sr-only'>{accessibleText}</span>}

      <div
        className={`claude-readme-original ${
          status === 'done' ? 'is-visible' : ''
        }`}
        aria-hidden={status !== 'done'}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div
        className={`claude-readme-animation-surface claude-readme-notion ${
          status === 'done' ? 'is-hidden' : ''
        }`}
        aria-hidden='true'>
        <main className='notion light-mode notion-page'>
          {blocks.map((block, index) => {
            const characters = graphemes[index] || []
            let visibleText = ''

            if (index < position.blockIndex) {
              visibleText = block.text
            } else if (index === position.blockIndex) {
              visibleText = characters
                .slice(0, position.characterCount)
                .join('')
            }

            return (
              <AnimatedBlock
                key={`${block.index}-${index}`}
                block={block}
                visibleText={visibleText}
                showCursor={index === position.blockIndex && status !== 'done'}
                isFinished={status === 'finished'}
              />
            )
          })}
        </main>
      </div>

      <style jsx global>{`
        .claude-readme-typewriter {
          position: relative;
          width: 100%;
          overflow-anchor: none;
        }

        .claude-readme-original {
          visibility: hidden;
          pointer-events: none;
        }

        .claude-readme-original.is-visible {
          visibility: visible;
          pointer-events: auto;
        }

        .claude-readme-animation-surface {
          position: absolute;
          top: 0;
          left: 50%;
          width: 100%;
          max-width: 760px;
          margin: 0;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .claude-readme-animation-surface.is-hidden {
          visibility: hidden;
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
          .claude-readme-original {
            visibility: visible !important;
            pointer-events: auto !important;
          }

          .claude-readme-animation-surface {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
