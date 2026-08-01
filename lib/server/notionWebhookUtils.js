import { createHmac, timingSafeEqual } from 'crypto'

const SUPPORTED_EVENT_TYPES = new Set([
  'page.created',
  'page.content_updated',
  'page.properties_updated',
  'page.moved',
  'page.deleted',
  'page.undeleted',
  'database.content_updated',
  'database.schema_updated',
  'data_source.content_updated',
  'data_source.schema_updated'
])

export function normalizeNotionId(value) {
  return String(value || '')
    .replace(/-/g, '')
    .trim()
    .toLowerCase()
}

export function verifyNotionWebhookSignature({
  rawBody,
  signature,
  verificationToken
}) {
  if (!rawBody || !signature || !verificationToken) return false

  const expected = `sha256=${createHmac('sha256', verificationToken)
    .update(rawBody)
    .digest('hex')}`
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(String(signature))

  if (expectedBuffer.length !== receivedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

export function isSupportedNotionWebhookEvent(type) {
  return SUPPORTED_EVENT_TYPES.has(String(type || ''))
}

function addPostPaths(paths, post) {
  if (!post) return

  const slug = String(post.slug || '').replace(/^\/+|\/+$/g, '')
  if (slug && !/^https?:\/\//i.test(slug)) paths.add(`/${slug}`)

  const category = String(post.category || '').trim()
  if (category) paths.add(`/category/${encodeURIComponent(category)}`)

  const tags = new Set()
  ;(Array.isArray(post.tags) ? post.tags : []).forEach(tag => {
    const value = typeof tag === 'string' ? tag : tag?.name
    if (value) tags.add(String(value).trim())
  })
  ;(Array.isArray(post.tagItems) ? post.tagItems : []).forEach(tag => {
    const value = typeof tag === 'string' ? tag : tag?.name
    if (value) tags.add(String(value).trim())
  })
  tags.forEach(tag => paths.add(`/tag/${encodeURIComponent(tag)}`))
}

export function getAffectedRevalidationPaths({ previousPost, currentPost }) {
  const paths = new Set(['/', '/archive', '/category', '/tag', '/search'])
  addPostPaths(paths, previousPost)
  addPostPaths(paths, currentPost)
  return Array.from(paths)
}
