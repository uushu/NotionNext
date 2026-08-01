import { createHmac } from 'crypto'
import {
  getAffectedRevalidationPaths,
  isSupportedNotionWebhookEvent,
  normalizeNotionId,
  verifyNotionWebhookSignature
} from '@/lib/server/notionWebhookUtils'

describe('Notion webhook helpers', () => {
  it('verifies the raw request body with the Notion HMAC signature', () => {
    const rawBody = Buffer.from(
      '{"id":"event-1","type":"page.content_updated"}'
    )
    const verificationToken = 'secret_test_token'
    const signature = `sha256=${createHmac('sha256', verificationToken)
      .update(rawBody)
      .digest('hex')}`

    expect(
      verifyNotionWebhookSignature({
        rawBody,
        signature,
        verificationToken
      })
    ).toBe(true)
    expect(
      verifyNotionWebhookSignature({
        rawBody: Buffer.from(`${rawBody.toString()} `),
        signature,
        verificationToken
      })
    ).toBe(false)
  })

  it('rejects malformed signatures without throwing', () => {
    expect(
      verifyNotionWebhookSignature({
        rawBody: Buffer.from('{}'),
        signature: 'sha256=short',
        verificationToken: 'secret_test_token'
      })
    ).toBe(false)
  })

  it('only accepts content events that can affect the blog', () => {
    expect(isSupportedNotionWebhookEvent('page.content_updated')).toBe(true)
    expect(isSupportedNotionWebhookEvent('data_source.content_updated')).toBe(
      true
    )
    expect(isSupportedNotionWebhookEvent('comment.created')).toBe(false)
  })

  it('normalizes dashed and compact Notion IDs equally', () => {
    expect(normalizeNotionId('ABC-123')).toBe('abc123')
  })

  it('revalidates old and new routes when a slug or taxonomy changes', () => {
    const paths = getAffectedRevalidationPaths({
      previousPost: {
        slug: 'article/old-slug',
        category: '学习笔记',
        tags: ['C#']
      },
      currentPost: {
        slug: 'article/new-slug',
        category: '技术分享',
        tagItems: [{ name: 'Unity' }]
      }
    })

    expect(paths).toEqual(
      expect.arrayContaining([
        '/',
        '/archive',
        '/category',
        '/tag',
        '/search',
        '/article/old-slug',
        '/article/new-slug',
        `/category/${encodeURIComponent('学习笔记')}`,
        `/category/${encodeURIComponent('技术分享')}`,
        `/tag/${encodeURIComponent('C#')}`,
        `/tag/${encodeURIComponent('Unity')}`
      ])
    )
  })
})
