const { parseBooleanEnv } = require('../../lib/utils/env')

describe('parseBooleanEnv', () => {
  it.each(['true', 'TRUE', '1', 'yes', 'on'])(
    'parses %s as true',
    value => {
      expect(parseBooleanEnv(value, false)).toBe(true)
    }
  )

  it.each(['false', 'FALSE', '0', 'no', 'off'])(
    'parses %s as false',
    value => {
      expect(parseBooleanEnv(value, true)).toBe(false)
    }
  )

  it('uses the fallback for missing or unsupported values', () => {
    expect(parseBooleanEnv(undefined, true)).toBe(true)
    expect(parseBooleanEnv(null, false)).toBe(false)
    expect(parseBooleanEnv('', true)).toBe(true)
    expect(parseBooleanEnv('unexpected', false)).toBe(false)
  })
})
