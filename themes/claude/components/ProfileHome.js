import SmartLink from '@/components/SmartLink'
import { useEffect, useMemo, useRef, useState } from 'react'

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
const HOME_ARTICLE_COUNT = 5
const CONTRIBUTION_LEVEL_THRESHOLDS = {
  level2: 2,
  level3: 3,
  level4: 6
}

const normalizeDate = value => {
  if (!value) return null
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const toTimestampMs = value => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number')
    return Number.isFinite(value) ? Math.trunc(value) : 0
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeRepositoryId = value => {
  if (!value) return ''
  return String(value).replace(/-/g, '').trim().toLowerCase()
}

const formatDayKey = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfWeekSunday = date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const offset = d.getDay()
  d.setDate(d.getDate() - offset)
  return d
}

const endOfWeekSaturday = date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const offset = 6 - d.getDay()
  d.setDate(d.getDate() + offset)
  return d
}

const getHeatmapLevel = count => {
  if (!count) return 0
  if (count >= CONTRIBUTION_LEVEL_THRESHOLDS.level4) return 4
  if (count >= CONTRIBUTION_LEVEL_THRESHOLDS.level3) return 3
  if (count >= CONTRIBUTION_LEVEL_THRESHOLDS.level2) return 2
  return 1 // 1 contribution/day
}

const getCreatedDate = post => {
  return (
    normalizeDate(post?.createdTime) ||
    normalizeDate(post?.publishDate) ||
    normalizeDate(post?.date?.start_date)
  )
}

const getPublishedDate = post => {
  return (
    normalizeDate(post?.date?.start_date) ||
    normalizeDate(post?.publishDate) ||
    normalizeDate(post?.createdTime)
  )
}

const getUpdatedDate = post => {
  return normalizeDate(post?.lastEditedDate)
}

const formatMonthLabel = (year, month) => {
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'short' })
}

const getOrdinalSuffix = day => {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return 'th'
  const mod10 = day % 10
  if (mod10 === 1) return 'st'
  if (mod10 === 2) return 'nd'
  if (mod10 === 3) return 'rd'
  return 'th'
}

const formatContributionTooltipText = (date, count) => {
  const month = date.toLocaleString('en-US', { month: 'long' })
  const day = date.getDate()
  const dateLabel = `${month} ${day}${getOrdinalSuffix(day)}`

  if (count === 0) return `No contributions on ${dateLabel}.`
  if (count === 1) return `1 contribution on ${dateLabel}.`
  return `${count} contributions on ${dateLabel}.`
}

const getLastSlugPart = value => {
  if (!value || typeof value !== 'string') return ''
  try {
    const normalized = decodeURIComponent(value).split('?')[0].split('#')[0]
    return normalized
      .replace(/^\/+|\/+$/g, '')
      .replace(/\.html$/i, '')
      .split('/')
      .pop()
      .toLowerCase()
  } catch (error) {
    return value
      .split('?')[0]
      .split('#')[0]
      .replace(/^\/+|\/+$/g, '')
      .replace(/\.html$/i, '')
      .split('/')
      .pop()
      .toLowerCase()
  }
}

const isReadmeLikePage = page => {
  if (!page) return false
  return getLastSlugPart(page.slug) === 'readme.md'
}

const sanitizeReadmeHtml = html => {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\shref\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, ' href="#"')
}

const formatPostDate = post => {
  const rawDate =
    post?.date?.start_date ||
    post?.publishDay ||
    post?.publishDate ||
    post?.lastEditedDay ||
    post?.lastEditedDate
  const dateMatch = String(rawDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateMatch) {
    return `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`
  }

  const date = normalizeDate(rawDate)
  if (!date) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export default function ProfileHome(props) {
  const {
    posts = [],
    homePostCandidates = posts,
    readmePage,
    contributionEvents: persistedContributionEvents = []
  } = props
  const heatmapGridRef = useRef(null)
  const tooltipTimerRef = useRef(null)
  const [contribCellSize, setContribCellSize] = useState(11)
  const [heatmapTooltip, setHeatmapTooltip] = useState(null)
  const postCandidates = Array.isArray(homePostCandidates)
    ? homePostCandidates
    : posts

  const readmeSource = useMemo(() => {
    if (readmePage) return readmePage
    return posts.find(isReadmeLikePage) || null
  }, [readmePage, posts])

  const readmeHtml = useMemo(
    () => sanitizeReadmeHtml(readmeSource?.readmeHtml || ''),
    [readmeSource?.readmeHtml]
  )
  const readmeExcerpt = readmeSource?.excerpt || ''

  const articlePosts = useMemo(() => {
    return postCandidates
      .filter(post => post?.href && !isReadmeLikePage(post))
      .map((post, index) => {
        const publishedAt = getPublishedDate(post)
        return {
          id:
            post.id ||
            post.href ||
            post.slug ||
            `${post.title || 'untitled'}-${index}`,
          title: post.title || '未命名文章',
          href: post.href,
          category: post.category || '',
          dateLabel: formatPostDate(post),
          publishedAt: publishedAt?.getTime() || 0
        }
      })
      .sort((a, b) => {
        if (b.publishedAt !== a.publishedAt) {
          return b.publishedAt - a.publishedAt
        }
        return a.title.localeCompare(b.title, 'zh-CN')
      })
  }, [postCandidates])

  const latestArticles = useMemo(
    () => articlePosts.slice(0, HOME_ARTICLE_COUNT),
    [articlePosts]
  )

  const timelinePosts = useMemo(() => {
    return postCandidates
      .map((post, index) => {
        const createdAt = getCreatedDate(post)
        const updatedAt = getUpdatedDate(post)
        if (!createdAt && !updatedAt) return null

        const postId =
          post.id ||
          post.href ||
          post.slug ||
          `${post.title || 'untitled'}-${index}`
        const hasUpdateEvent =
          Boolean(updatedAt) &&
          (!createdAt || updatedAt.getTime() !== createdAt.getTime())

        return {
          id: postId,
          title: post.title || 'Untitled',
          href: post.href || '#',
          createdAt,
          updatedAt,
          hasUpdateEvent
        }
      })
      .filter(Boolean)
  }, [postCandidates])

  const fallbackContributionEvents = useMemo(() => {
    const events = []

    timelinePosts.forEach(post => {
      if (post.createdAt) {
        events.push({
          type: 'create',
          postId: post.id,
          title: post.title,
          href: post.href,
          date: post.createdAt
        })
      }

      if (post.hasUpdateEvent && post.updatedAt) {
        events.push({
          type: 'update',
          postId: post.id,
          title: post.title,
          href: post.href,
          date: post.updatedAt
        })
      }
    })

    return events
  }, [timelinePosts])

  const contributionEvents = useMemo(() => {
    const persisted = Array.isArray(persistedContributionEvents)
      ? persistedContributionEvents
          .map(event => {
            const postId = normalizeRepositoryId(
              event?.repositoryId || event?.identifier || event?.postId
            )
            const timestampMs = toTimestampMs(
              event?.timestampMs ||
                event?.timestamp ||
                event?.date ||
                event?.time
            )
            const date = timestampMs ? new Date(timestampMs) : null
            if (!postId || !date) return null

            return {
              type: event?.type === 'create' ? 'create' : 'update',
              postId,
              title: event?.title || 'Untitled',
              href: event?.href || '#',
              date
            }
          })
          .filter(Boolean)
      : []

    if (persisted.length) {
      return persisted
    }
    return fallbackContributionEvents
  }, [persistedContributionEvents, fallbackContributionEvents])

  const years = useMemo(() => {
    const yearSet = new Set(
      contributionEvents.map(event => event.date.getFullYear())
    )
    yearSet.add(new Date().getFullYear())
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [contributionEvents])

  const [selectedYear, setSelectedYear] = useState(
    () => years[0] || new Date().getFullYear()
  )
  const [isYearModeActive, setIsYearModeActive] = useState(false)

  useEffect(() => {
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[0] || new Date().getFullYear())
      setIsYearModeActive(false)
    }
  }, [years, selectedYear])

  const heatmapRange = useMemo(() => {
    if (isYearModeActive) {
      return {
        start: new Date(selectedYear, 0, 1, 0, 0, 0, 0),
        end: new Date(selectedYear, 11, 31, 23, 59, 59, 999)
      }
    }

    const end = new Date()
    const start = new Date(end)
    start.setFullYear(start.getFullYear() - 1)
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)

    return { start, end }
  }, [isYearModeActive, selectedYear])

  const heatmapEvents = useMemo(() => {
    return contributionEvents.filter(event => {
      return event.date >= heatmapRange.start && event.date <= heatmapRange.end
    })
  }, [contributionEvents, heatmapRange])

  const dayCountMap = useMemo(() => {
    const map = new Map()
    heatmapEvents.forEach(event => {
      const key = formatDayKey(event.date)
      map.set(key, (map.get(key) || 0) + 1)
    })
    return map
  }, [heatmapEvents])

  const heatmapData = useMemo(() => {
    const start = startOfWeekSunday(heatmapRange.start)
    const end = endOfWeekSaturday(heatmapRange.end)
    const rangeStart = new Date(heatmapRange.start)
    rangeStart.setHours(0, 0, 0, 0)
    const rangeEnd = new Date(heatmapRange.end)
    rangeEnd.setHours(0, 0, 0, 0)
    const cells = []

    const cursor = new Date(start)
    while (cursor <= end) {
      const currentDate = new Date(cursor)
      const key = formatDayKey(currentDate)
      const inRange = currentDate >= rangeStart && currentDate <= rangeEnd
      cells.push({
        key,
        date: currentDate,
        count: dayCountMap.get(key) || 0,
        inRange
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    const weekCount = Math.ceil(cells.length / 7)
    const monthMarkers = []
    if (isYearModeActive) {
      let lastWeekIndex = -1
      for (let month = 0; month < 12; month++) {
        const firstDayOfMonth = new Date(selectedYear, month, 1)
        const monthWeekIndex = Math.floor(
          (startOfWeekSunday(firstDayOfMonth).getTime() - start.getTime()) /
            MS_PER_WEEK
        )
        if (monthWeekIndex < 0 || monthWeekIndex >= weekCount) continue
        if (monthWeekIndex === lastWeekIndex) continue

        monthMarkers.push({
          key: `${selectedYear}-${month}`,
          weekIndex: monthWeekIndex,
          label: formatMonthLabel(selectedYear, month)
        })
        lastWeekIndex = monthWeekIndex
      }
    } else {
      // GitHub 风格：月份标签从“该列首日(周一)属于该月”的第一列开始
      let lastMonthKey = ''
      for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
        const weekStartDate = cells[weekIndex * 7]?.date
        if (!weekStartDate) continue

        const markerYear = weekStartDate.getFullYear()
        const markerMonth = weekStartDate.getMonth()
        const markerKey = `${markerYear}-${markerMonth}`
        if (markerKey === lastMonthKey) continue

        monthMarkers.push({
          key: markerKey,
          weekIndex,
          label: formatMonthLabel(markerYear, markerMonth)
        })
        lastMonthKey = markerKey
      }
    }

    return { cells, weekCount, monthMarkers }
  }, [dayCountMap, heatmapRange, isYearModeActive, selectedYear])

  const contributionTitle = isYearModeActive
    ? `${heatmapEvents.length} contributions in ${selectedYear}`
    : `${heatmapEvents.length} contributions in the last year`
  const activeYear = isYearModeActive ? selectedYear : years[0] || selectedYear

  const handleSelectYear = year => {
    setSelectedYear(year)
    setIsYearModeActive(true)
  }

  const handleSelectYearFromDropdown = (year, event) => {
    handleSelectYear(year)
    const details = event?.currentTarget?.closest('details')
    if (details && details.hasAttribute('open')) {
      details.removeAttribute('open')
    }
  }

  const clearHeatmapTooltipTimer = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = null
    }
  }

  const getTooltipAnchorFromCell = target => {
    if (!target || typeof target.getBoundingClientRect !== 'function')
      return null
    const rect = target.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    }
  }

  const scheduleHeatmapTooltip = (event, cell) => {
    if (isYearModeActive && !cell.inRange) return
    clearHeatmapTooltipTimer()

    const text = formatContributionTooltipText(cell.date, cell.count)
    const anchor = getTooltipAnchorFromCell(event.currentTarget)
    if (!anchor) return

    tooltipTimerRef.current = setTimeout(() => {
      setHeatmapTooltip({ text, x: anchor.x, y: anchor.y })
      tooltipTimerRef.current = null
    }, 180)
  }

  const showHeatmapTooltip = (event, cell) => {
    scheduleHeatmapTooltip(event, cell)
  }

  const moveHeatmapTooltip = (event, cell) => {
    setHeatmapTooltip(prev => {
      if (!prev) {
        scheduleHeatmapTooltip(event, cell)
        return prev
      }
      const anchor = getTooltipAnchorFromCell(event.currentTarget)
      if (!anchor) return prev
      return {
        ...prev,
        x: anchor.x,
        y: anchor.y
      }
    })
  }

  const hideHeatmapTooltip = () => {
    clearHeatmapTooltipTimer()
    setHeatmapTooltip(null)
  }

  useEffect(() => {
    return () => {
      clearHeatmapTooltipTimer()
    }
  }, [])

  useEffect(() => {
    const gridEl = heatmapGridRef.current
    if (!gridEl || heatmapData.weekCount <= 0) return undefined

    const computeCellSize = () => {
      if (window.innerWidth <= 767) {
        setContribCellSize(prev => (prev === 11 ? prev : 11))
        return
      }

      const width = gridEl.clientWidth
      if (!width) return

      const styles = window.getComputedStyle(gridEl)
      const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0
      const weekCount = Math.max(1, heatmapData.weekCount)
      const size = (width - gap * (weekCount - 1)) / weekCount
      if (size > 0 && Number.isFinite(size)) {
        setContribCellSize(size)
      }
    }

    computeCellSize()

    const observer = new ResizeObserver(computeCellSize)
    observer.observe(gridEl)

    return () => {
      observer.disconnect()
    }
  }, [heatmapData.weekCount])

  return (
    <div className='claude-profile-home'>
      <div className='claude-profile-home-main'>
        <div className='claude-readme-card'>
          <div className='claude-readme-card-meta'>
            README
            <span className='claude-readme-card-meta-ext'>.md</span>
          </div>
          {readmeHtml ? (
            <div
              className='markdown-body'
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: readmeHtml }}
            />
          ) : (
            <p className='claude-readme-card-excerpt'>{readmeExcerpt}</p>
          )}
        </div>

        <div className='claude-profile-home-timeline'>
          <div className='claude-profile-home-timeline-main'>
            <div className='claude-contrib-section'>
              <div className='claude-contrib-header'>
                <h2 className='claude-contrib-title'>{contributionTitle}</h2>
                <details className='claude-activity-year-dropdown'>
                  <summary className='claude-activity-year-summary'>
                    <span className='claude-activity-year-summary-label'>
                      Year:
                    </span>
                    <span className='claude-activity-year-summary-main'>
                      <span className='claude-activity-year-summary-value'>
                        {activeYear}
                      </span>
                      <span
                        className='Button-visual Button-trailingAction claude-activity-year-summary-caret'
                        aria-hidden='true'
                      >
                        <svg
                          aria-hidden='true'
                          height='16'
                          viewBox='0 0 16 16'
                          width='16'
                          className='octicon octicon-triangle-down'
                        >
                          <path d='m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z' />
                        </svg>
                      </span>
                    </span>
                  </summary>
                  <ul className='claude-activity-year-menu'>
                    {years.map(year => {
                      const isActive = year === activeYear
                      return (
                        <li key={`activity-year-${year}`}>
                          <button
                            type='button'
                            className='claude-activity-year-option'
                            onClick={event =>
                              handleSelectYearFromDropdown(year, event)
                            }
                          >
                            <span
                              className='claude-activity-year-option-check'
                              aria-hidden='true'
                            >
                              {isActive ? (
                                <svg viewBox='0 0 16 16' width='16' height='16'>
                                  <path d='M13.78 3.97a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 1 1 1.06-1.06L6 10.69l6.72-6.72a.75.75 0 0 1 1.06 0Z' />
                                </svg>
                              ) : (
                                <span />
                              )}
                            </span>
                            <span>{year}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              </div>
              <section
                className='claude-contrib-card'
                style={{
                  '--claude-contrib-week-count': String(heatmapData.weekCount),
                  '--claude-contrib-cell-size': `${contribCellSize}px`
                }}
              >
                <div className='claude-contrib-scroll'>
                  <div className='claude-contrib-canvas'>
                    <div className='claude-contrib-months'>
                      {heatmapData.monthMarkers.map(marker => (
                        <span
                          key={marker.key}
                          style={{
                            '--claude-marker-week': String(marker.weekIndex)
                          }}
                        >
                          {marker.label}
                        </span>
                      ))}
                    </div>

                    <div className='claude-contrib-grid-wrap'>
                      <div className='claude-contrib-weekday'>
                        {DAY_LABELS.map((label, index) => (
                          <span key={`day-${index}`}>{label}</span>
                        ))}
                      </div>
                      <div ref={heatmapGridRef} className='claude-contrib-grid'>
                        {heatmapData.cells.map(cell => {
                          const isFutureCellInLastYearMode =
                            !isYearModeActive &&
                            !cell.inRange &&
                            cell.date > heatmapRange.end
                          const isPlaceholder =
                            (isYearModeActive && !cell.inRange) ||
                            isFutureCellInLastYearMode
                          return (
                            <div
                              key={cell.key}
                              className={`claude-contrib-cell ${
                                isPlaceholder
                                  ? 'is-placeholder'
                                  : `level-${getHeatmapLevel(cell.count)}`
                              }`}
                              onMouseEnter={event =>
                                showHeatmapTooltip(event, cell)
                              }
                              onMouseMove={event =>
                                moveHeatmapTooltip(event, cell)
                              }
                              onMouseLeave={hideHeatmapTooltip}
                              aria-hidden={isPlaceholder}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {heatmapTooltip && (
                  <div
                    className='claude-contrib-tooltip'
                    style={{
                      left: `${heatmapTooltip.x}px`,
                      top: `${heatmapTooltip.y}px`
                    }}
                  >
                    {heatmapTooltip.text}
                  </div>
                )}

                <div className='claude-contrib-legend'>
                  <span>Less</span>
                  <div className='claude-contrib-legend-cells'>
                    <i className='claude-contrib-cell level-0' />
                    <i className='claude-contrib-cell level-1' />
                    <i className='claude-contrib-cell level-2' />
                    <i className='claude-contrib-cell level-3' />
                    <i className='claude-contrib-cell level-4' />
                  </div>
                  <span>More</span>
                </div>
              </section>
            </div>

            <div className='claude-home-articles'>
              <section className='claude-home-article-panel'>
                <div className='claude-home-article-panel-header'>
                  <h2 className='claude-home-article-panel-title'>
                    <i className='far fa-clock' aria-hidden='true' />
                    最新文章
                  </h2>
                </div>

                {latestArticles.length > 0 ? (
                  <ol className='claude-home-article-list'>
                    {latestArticles.map((post, index) => (
                      <li key={`latest-${post.id}`}>
                        <SmartLink
                          href={post.href}
                          className='claude-home-article-row'
                        >
                          <span className='claude-home-article-rank'>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className='claude-home-article-content'>
                            <span className='claude-home-article-title'>
                              {post.title}
                            </span>
                            <span className='claude-home-article-meta'>
                              {post.dateLabel && <time>{post.dateLabel}</time>}
                              {post.category && (
                                <span className='claude-home-article-category'>
                                  {post.category}
                                </span>
                              )}
                            </span>
                          </span>
                          <i
                            className='fas fa-arrow-right claude-home-article-arrow'
                            aria-hidden='true'
                          />
                        </SmartLink>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className='claude-home-article-status'>
                    还没有已发布文章
                  </div>
                )}
              </section>
            </div>
          </div>

          <aside id='year-list-container' className='claude-year-switcher'>
            <div className='claude-year-switcher-sticky'>
              <ul className='claude-year-filter-list'>
                {years.map(year => {
                  const isActive = year === activeYear
                  return (
                    <li key={year}>
                      <button
                        id={`year-link-${year}`}
                        type='button'
                        aria-current={isActive ? 'true' : undefined}
                        aria-label={`Contribution activity in ${year}`}
                        className={`claude-year-filter-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelectYear(year)}
                      >
                        {year}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
