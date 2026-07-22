import { PET_MANIFEST } from './pet.config'

export const normalizePath = value => {
  const rawPath = String(value || '/')
    .split('?')[0]
    .split('#')[0]
  return rawPath || '/'
}

const getContentType = pageProps =>
  String(
    pageProps?.post?.type ||
      pageProps?.page?.type ||
      pageProps?.post?.pageType ||
      ''
  ).toLowerCase()

export const getRouteState = ({ asPath, pathname, pageProps }) => {
  const path = normalizePath(asPath)
  const contentType = getContentType(pageProps)

  if (pathname === '/404' || path === '/404') return 'fatalError'
  if (path === '/') return 'idle'

  if (/^\/(category|tag|archive|search)(\/|$)/i.test(path)) {
    return 'exploring'
  }

  if (contentType === 'post') return 'reading'

  if (
    ['page', 'menu', 'submenu', 'notice'].includes(contentType) ||
    /^\/(about|portfolio|en)(\/|$)/i.test(path)
  ) {
    return 'idle'
  }

  return pageProps?.post?.title ? 'reading' : 'idle'
}

export const getPetSize = () => (window.innerWidth <= 768 ? 84 : 112)

export const clampPosition = position => {
  const size = getPetSize()
  const margin = 8

  return {
    x: Math.min(
      Math.max(position.x, margin),
      Math.max(margin, window.innerWidth - size - margin)
    ),
    y: Math.min(
      Math.max(position.y, margin),
      Math.max(margin, window.innerHeight - size - margin)
    )
  }
}

export const getDefaultPosition = () => {
  const size = getPetSize()

  return clampPosition({
    x: window.innerWidth - size - 18,
    y: window.innerHeight - size - 76
  })
}

const randomBetween = (min, max) => min + Math.random() * (max - min)

export const getRoamingDelay = () => {
  const isMobile = window.innerWidth <= 768
  const [minimum, maximum] = isMobile
    ? PET_MANIFEST.roaming.mobileDelay
    : PET_MANIFEST.roaming.desktopDelay

  return Math.round(randomBetween(minimum, maximum))
}

export const getRoamingPosition = currentPosition => {
  const size = getPetSize()
  const margin = 8
  const maximumX = Math.max(margin, window.innerWidth - size - margin)
  const maximumY = Math.max(margin, window.innerHeight - size - 72)
  const minimumY = Math.min(
    maximumY,
    Math.max(margin, window.innerHeight * PET_MANIFEST.roaming.topRatio)
  )
  const current = clampPosition(currentPosition || getDefaultPosition())

  let candidate = current
  for (let attempt = 0; attempt < 6; attempt += 1) {
    candidate = clampPosition({
      x: randomBetween(margin, maximumX),
      y: randomBetween(minimumY, maximumY)
    })
    if (
      Math.hypot(candidate.x - current.x, candidate.y - current.y) >=
      PET_MANIFEST.roaming.minDistance
    ) {
      break
    }
  }

  return candidate
}

export const getRoamingDuration = (from, to) =>
  Math.round(
    Math.min(3000, Math.max(1500, Math.hypot(to.x - from.x, to.y - from.y) * 6))
  )
