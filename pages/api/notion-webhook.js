import {
  markNotionWebhookEventProcessed,
  processNotionWebhookEvent
} from '@/lib/server/notionWebhook'
import {
  isSupportedNotionWebhookEvent,
  verifyNotionWebhookSignature
} from '@/lib/server/notionWebhookUtils'

export const config = {
  api: {
    bodyParser: false
  },
  maxDuration: 60
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' })
  }

  try {
    const rawBody = await readRawBody(req)
    let payload
    try {
      payload = JSON.parse(rawBody.toString('utf8'))
    } catch {
      return res.status(400).json({ ok: false, message: 'Invalid JSON body' })
    }

    if (payload?.verification_token && !payload?.type) {
      return res.status(200).json({
        ok: true,
        verificationRequestAccepted: true
      })
    }

    const verificationToken =
      process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN || ''
    if (!verificationToken) {
      return res.status(503).json({
        ok: false,
        message:
          'Webhook event handling is disabled: missing NOTION_WEBHOOK_VERIFICATION_TOKEN'
      })
    }

    const signature = req.headers['x-notion-signature']
    const trusted = verifyNotionWebhookSignature({
      rawBody,
      signature: Array.isArray(signature) ? signature[0] : signature,
      verificationToken
    })
    if (!trusted) {
      return res.status(401).json({ ok: false, message: 'Invalid signature' })
    }

    if (!isSupportedNotionWebhookEvent(payload?.type)) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        eventId: payload?.id || '',
        type: payload?.type || ''
      })
    }

    const result = await processNotionWebhookEvent(payload)
    if (result.duplicate) {
      return res.status(200).json({
        ok: true,
        duplicate: true,
        eventId: result.eventId
      })
    }

    const revalidationResults = await Promise.all(
      result.paths.map(async path => {
        try {
          await res.revalidate(path)
          return { path, revalidated: true }
        } catch (error) {
          return {
            path,
            revalidated: false,
            error: String(error?.message || error)
          }
        }
      })
    )
    const failedPaths = revalidationResults.filter(item => !item.revalidated)
    if (failedPaths.length > 0) {
      throw new Error(
        `Failed to revalidate: ${failedPaths
          .map(item => `${item.path} (${item.error})`)
          .join(', ')}`
      )
    }

    await markNotionWebhookEventProcessed(result.eventId)

    return res.status(200).json({
      ok: true,
      duplicate: false,
      eventId: result.eventId,
      type: payload.type,
      entityId: result.entityId,
      invalidatedCacheKeys: result.invalidatedKeys.length,
      revalidationResults
    })
  } catch (error) {
    console.error('[NotionWebhook] Processing failed:', error)
    return res.status(500).json({
      ok: false,
      message: 'Notion webhook processing failed',
      error: String(error?.message || error)
    })
  }
}
