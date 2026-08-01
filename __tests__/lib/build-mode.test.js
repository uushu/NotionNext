describe('build mode parsing', () => {
  const originalExport = process.env.EXPORT

  afterEach(() => {
    if (originalExport === undefined) {
      delete process.env.EXPORT
    } else {
      process.env.EXPORT = originalExport
    }
  })

  test.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['0', false],
    ['true', true]
  ])('treats EXPORT=%p as export mode: %p', (value, expected) => {
    if (value === undefined) {
      delete process.env.EXPORT
    } else {
      process.env.EXPORT = value
    }

    jest.isolateModules(() => {
      const { isExport } = require('@/lib/utils/buildMode')
      expect(isExport()).toBe(expected)
    })
  })
})
