import { PET_MANIFEST } from './pet.config'

const HOUR_IN_MS = 60 * 60 * 1000
const MAX_OFFLINE_HOURS = 48
const NEED_KEYS = ['fullness', 'mood', 'energy', 'affinity']

const clampNeed = value => Math.min(100, Math.max(0, Math.round(value)))

const normalizeTimestamp = (value, fallback) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback

export const createInitialNeeds = (now = Date.now()) => ({
  ...PET_MANIFEST.needs.initial,
  updatedAt: now
})

export const normalizeNeeds = (value, now = Date.now()) => {
  const initial = createInitialNeeds(now)
  const source = value && typeof value === 'object' ? value : {}

  return {
    ...Object.fromEntries(
      NEED_KEYS.map(key => [
        key,
        clampNeed(
          Number.isFinite(Number(source[key])) ? source[key] : initial[key]
        )
      ])
    ),
    updatedAt: normalizeTimestamp(source.updatedAt, now)
  }
}

export const advanceNeeds = (value, now = Date.now()) => {
  const needs = normalizeNeeds(value, now)
  const elapsedHours = Math.min(
    MAX_OFFLINE_HOURS,
    Math.max(0, now - needs.updatedAt) / HOUR_IN_MS
  )

  return {
    fullness: clampNeed(
      needs.fullness - PET_MANIFEST.needs.decayPerHour.fullness * elapsedHours
    ),
    mood: clampNeed(
      needs.mood - PET_MANIFEST.needs.decayPerHour.mood * elapsedHours
    ),
    energy: clampNeed(
      needs.energy - PET_MANIFEST.needs.decayPerHour.energy * elapsedHours
    ),
    affinity: needs.affinity,
    updatedAt: now
  }
}

export const changeNeeds = (value, changes, now = Date.now()) => {
  const current = advanceNeeds(value, now)

  return {
    fullness: clampNeed(current.fullness + Number(changes.fullness || 0)),
    mood: clampNeed(current.mood + Number(changes.mood || 0)),
    energy: clampNeed(current.energy + Number(changes.energy || 0)),
    affinity: clampNeed(current.affinity + Number(changes.affinity || 0)),
    updatedAt: now
  }
}

export const applyCareAction = (value, action, now = Date.now()) => {
  const current = advanceNeeds(value, now)

  if (action === 'feed' && current.fullness >= 96) {
    return {
      needs: current,
      state: 'interact',
      message: 'penpen 现在还不饿'
    }
  }

  const actions = {
    feed: {
      changes: { fullness: 34, mood: 6, affinity: 2 },
      state: 'success',
      message: '胡萝卜真好吃！'
    },
    pet: {
      changes: { mood: 18, affinity: 1 },
      state: 'interact',
      message: 'penpen 被摸得很开心'
    },
    rest: {
      changes: { energy: 28, mood: 4, affinity: 1 },
      state: 'sleep',
      message: '陪 penpen 休息一下'
    }
  }
  const selected = actions[action]

  if (!selected) {
    return { needs: current, state: 'idle', message: '' }
  }

  return {
    needs: changeNeeds(current, selected.changes, now),
    state: selected.state,
    message: selected.message
  }
}

export const getNeedState = value => {
  const needs = normalizeNeeds(value)
  const thresholds = PET_MANIFEST.needs.thresholds

  if (needs.energy <= thresholds.energy) return 'sleep'
  if (needs.fullness <= thresholds.fullness) return 'hungry'
  if (needs.mood <= thresholds.mood) return 'bored'
  return null
}

export const getNeedHint = value => {
  const needs = normalizeNeeds(value)
  const lowest = [
    ['fullness', needs.fullness, '想吃胡萝卜'],
    ['mood', needs.mood, '想让你摸摸'],
    ['energy', needs.energy, '想休息一会儿']
  ].sort((a, b) => a[1] - b[1])[0]

  return lowest[1] <= 35 ? lowest[2] : '状态很好'
}
