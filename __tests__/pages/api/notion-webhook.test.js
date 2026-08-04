import { Readable } from 'stream'

const mockIsSupportedNotionWebhookEvent = jest.fn()
const mockMarkNotionWebhookEventProcessed = jest.fn()
const mockProcessNotionWebhookEvent = jest.fn()

jest.mock('@/lib/server/notionWebhook', () => ({
  markNotionWebhookEventProcessed: (...args) =>
    mockMarkNotionWebhookEventProcessed(...args),
  processNotionWebhookEvent: (...args) => mockProcessNotionWebhookEvent(...args)
}))

jest.mock('@/lib/server/notionWebhookUtils', () => ({
  isSupportedNotionWebhookEvent: (...args) =>
    mockIsSupportedNotionWebhookEvent(...args),
  verifyNotionWebhookSignature: (...args) =>
    mockVerifyNotionWebhookSignature(...args)
}))

const mockVerifyNotionWebhookSignature = jest.fn()

import handler from '@/pages/api/notion-webhook'

function createRequest(payload, headers = {}) {
  const rawBody = JSON.stringify(payload)
  const req = Readable.from([rawBody])
  req.method = 'POST'
  req.headers = headers
  return { req, rawBody }
}

function createResponse() {
  const res = {
    statusCode: 200,
    body: null,
    setHeader: jest.fn(),
    revalidate: jest.fn().mockResolvedValue(undefined),
    status: jest.fn(code => {
      res.statusCode = code
      return res
    }),
    json: jest.fn(body => {
      res.body = body
      return res
    })
  }
  return res
}

describe('POST /api/notion-webhook', () => {
  const originalToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN

  beforeEach(() => {
    process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = 'secret_test_token'
    mockIsSupportedNotionWebhookEvent.mockReturnValue(true)
    mockVerifyNotionWebhookSignature.mockReturnValue(true)
    mockMarkNotionWebhookEventProcessed.mockResolvedValue(undefined)
    mockProcessNotionWebhookEvent.mockResolvedValue({
      duplicate: false,
      eventId: 'event-1',
      entityId: 'page1',
      invalidatedKeys: ['global_data_zh-CN_root', 'site_root'],
      paths: ['/', '/article/test']
    })
  })

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN
    } else {
      process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = originalToken
    }
  })

  it('accepts the initial Notion verification request without exposing its token', async () => {
    const { req } = createRequest({ verification_token: 'secret_verify' })
    const res = createResponse()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      verificationRequestAccepted: true
    })
    expect(JSON.stringify(res.body)).not.toContain('secret_verify')
    expect(mockProcessNotionWebhookEvent).not.toHaveBeenCalled()
  })

  it('revalidates every affected path before recording the event as processed', async () => {
    const payload = {
      id: 'event-1',
      type: 'page.content_updated',
      entity: { id: 'page-1', type: 'page' }
    }
    const { req, rawBody } = createRequest(payload, {
      'x-notion-signature': 'sha256=trusted'
    })
    const res = createResponse()

    await handler(req, res)

    expect(mockVerifyNotionWebhookSignature).toHaveBeenCalledWith({
      rawBody: Buffer.from(rawBody),
      signature: 'sha256=trusted',
      verificationToken: 'secret_test_token'
    })
    expect(res.revalidate).toHaveBeenCalledTimes(2)
    expect(mockMarkNotionWebhookEventProcessed).toHaveBeenCalledWith('event-1')
    expect(res.statusCode).toBe(200)
  })

  it('returns a retryable error and does not deduplicate a partially failed event', async () => {
    const payload = {
      id: 'event-1',
      type: 'page.content_updated',
      entity: { id: 'page-1', type: 'page' }
    }
    const { req } = createRequest(payload, {
      'x-notion-signature': 'sha256=trusted'
    })
    const res = createResponse()
    res.revalidate.mockImplementation(path => {
      if (path === '/article/test') throw new Error('regeneration failed')
      return Promise.resolve()
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res.body.error).toContain('/article/test')
    expect(mockMarkNotionWebhookEventProcessed).not.toHaveBeenCalled()
  })

  it('rejects an invalid signature before cache invalidation', async () => {
    mockVerifyNotionWebhookSignature.mockReturnValue(false)
    const { req } = createRequest(
      {
        id: 'event-1',
        type: 'page.content_updated',
        entity: { id: 'page-1', type: 'page' }
      },
      { 'x-notion-signature': 'sha256=invalid' }
    )
    const res = createResponse()

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(mockProcessNotionWebhookEvent).not.toHaveBeenCalled()
  })
})
