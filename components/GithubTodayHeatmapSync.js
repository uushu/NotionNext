import { useRouter } from 'next/router'
import { useEffect } from 'react'

const formatLocalDayKey = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfWeekSunday = date => {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  value.setDate(value.getDate() - value.getDay())
  return value
}

const getCellIndexForToday = titleText => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yearMatch = titleText.match(/contributions in (\d{4})/i)
  let rangeStart

  if (yearMatch) {
    const selectedYear = Number(yearMatch[1])
    if (selectedYear !== today.getFullYear()) return -1
    rangeStart = startOfWeekSunday(new Date(selectedYear, 0, 1))
  } else {
    const rollingStart = new Date(today)
    rollingStart.setFullYear(rollingStart.getFullYear() - 1)
    rollingStart.setDate(rollingStart.getDate() + 1)
    rangeStart = startOfWeekSunday(rollingStart)
  }

  return Math.round((today.getTime() - rangeStart.getTime()) / 86400000)
}

const getLevel = count => {
  if (count >= 6) return 4
  if (count >= 3) return 3
  if (count >= 2) return 2
  return count > 0 ? 1 : 0
}

export default function GithubTodayHeatmapSync({ enabled = true }) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled || router.pathname !== '/' || typeof document === 'undefined') {
      return undefined
    }

    let cancelled = false
    let observer
    let syncedCell = null
    let syncedTitle = null

    const restore = () => {
      if (syncedCell?.isConnected && syncedCell.dataset.githubOriginalClass) {
        syncedCell.className = syncedCell.dataset.githubOriginalClass
        delete syncedCell.dataset.githubOriginalClass
        delete syncedCell.dataset.githubTodayCount
        syncedCell.removeAttribute('title')
      }

      if (syncedTitle?.isConnected && syncedTitle.dataset.githubOriginalText) {
        syncedTitle.textContent = syncedTitle.dataset.githubOriginalText
        delete syncedTitle.dataset.githubOriginalText
      }
    }

    const applyContribution = count => {
      if (!count || cancelled) return false

      const title = document.querySelector(
        '#theme-claude .claude-contrib-title'
      )
      const cells = Array.from(
        document.querySelectorAll(
          '#theme-claude .claude-contrib-grid .claude-contrib-cell'
        )
      )
      if (!title || !cells.length) return false

      const index = getCellIndexForToday(title.textContent || '')
      if (index < 0 || index >= cells.length) return false

      const cell = cells[index]
      const level = getLevel(count)

      if (!cell.dataset.githubOriginalClass) {
        cell.dataset.githubOriginalClass = cell.className
      }
      if (!title.dataset.githubOriginalText) {
        title.dataset.githubOriginalText = title.textContent || ''
      }

      cell.classList.remove('level-0', 'level-1', 'level-2', 'level-3', 'level-4')
      cell.classList.add(`level-${level}`)
      cell.dataset.githubTodayCount = String(count)
      cell.title = `${count} GitHub commit${count === 1 ? '' : 's'} today`

      const originalTitle = title.dataset.githubOriginalText
      const countMatch = originalTitle.match(/^(\d+)\s+contributions/i)
      if (countMatch) {
        const baseCount = Number(countMatch[1])
        title.textContent = originalTitle.replace(
          /^\d+\s+contributions/i,
          `${baseCount + count} contributions`
        )
      }

      syncedCell = cell
      syncedTitle = title
      return true
    }

    const load = async () => {
      try {
        const date = formatLocalDayKey(new Date())
        const response = await fetch(
          `/api/github-today-contributions?date=${encodeURIComponent(date)}`
        )
        if (!response.ok) return

        const data = await response.json()
        const count = Number(data?.count) || 0
        if (!count || cancelled) return

        const apply = () => applyContribution(count)
        apply()

        observer = new MutationObserver(() => {
          if (!syncedCell?.isConnected || !syncedTitle?.isConnected) {
            syncedCell = null
            syncedTitle = null
            apply()
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
      } catch (error) {
        console.warn('[GithubTodayHeatmapSync]', error)
      }
    }

    load()

    return () => {
      cancelled = true
      observer?.disconnect()
      restore()
    }
  }, [enabled, router.asPath, router.pathname])

  return null
}
