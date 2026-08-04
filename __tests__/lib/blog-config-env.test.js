const ENV_KEYS = [
  'NOTION_PAGE_ID',
  'NEXT_PUBLIC_PSEUDO_STATIC',
  'NEXT_PUBLIC_ENABLE_RSS',
  'NEXT_PUBLIC_CUSTOM_MENU',
  'NEXT_PUBLIC_CAN_COPY',
  'NEXT_PUBLIC_LAYOUT_SIDEBAR_REVERSE',
  'UUID_REDIRECT'
]

const originalValues = Object.fromEntries(
  ENV_KEYS.map(key => [key, process.env[key]])
)

function restoreEnvironment() {
  ENV_KEYS.forEach(key => {
    const value = originalValues[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  })
}

function loadBlogConfig(values = {}) {
  ENV_KEYS.forEach(key => delete process.env[key])
  Object.entries(values).forEach(([key, value]) => {
    process.env[key] = value
  })
  jest.resetModules()
  return require('../../blog.config')
}

describe('blog.config boolean environment values', () => {
  afterEach(() => {
    restoreEnvironment()
    jest.resetModules()
  })

  afterAll(() => {
    restoreEnvironment()
  })

  it('uses the production Notion database when NOTION_PAGE_ID is absent', () => {
    const config = loadBlogConfig()

    expect(config.NOTION_PAGE_ID).toBe(
      '3a3560c488bc83c5bec601388734c5db'
    )
  })

  it('treats explicit false strings as false', () => {
    const config = loadBlogConfig({
      NEXT_PUBLIC_PSEUDO_STATIC: 'false',
      NEXT_PUBLIC_ENABLE_RSS: 'false',
      NEXT_PUBLIC_CUSTOM_MENU: 'false',
      NEXT_PUBLIC_CAN_COPY: 'false',
      NEXT_PUBLIC_LAYOUT_SIDEBAR_REVERSE: 'false',
      UUID_REDIRECT: 'false'
    })

    expect(config.PSEUDO_STATIC).toBe(false)
    expect(config.ENABLE_RSS).toBe(false)
    expect(config.CUSTOM_MENU).toBe(false)
    expect(config.CAN_COPY).toBe(false)
    expect(config.LAYOUT_SIDEBAR_REVERSE).toBe(false)
    expect(config.UUID_REDIRECT).toBe(false)
  })

  it('treats explicit true strings as true', () => {
    const config = loadBlogConfig({
      NEXT_PUBLIC_PSEUDO_STATIC: 'true',
      NEXT_PUBLIC_ENABLE_RSS: 'true',
      NEXT_PUBLIC_CUSTOM_MENU: 'true',
      NEXT_PUBLIC_CAN_COPY: 'true',
      NEXT_PUBLIC_LAYOUT_SIDEBAR_REVERSE: 'true',
      UUID_REDIRECT: 'true'
    })

    expect(config.PSEUDO_STATIC).toBe(true)
    expect(config.ENABLE_RSS).toBe(true)
    expect(config.CUSTOM_MENU).toBe(true)
    expect(config.CAN_COPY).toBe(true)
    expect(config.LAYOUT_SIDEBAR_REVERSE).toBe(true)
    expect(config.UUID_REDIRECT).toBe(true)
  })
})
