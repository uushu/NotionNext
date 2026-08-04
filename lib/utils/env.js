const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off'])

/**
 * Parse a boolean environment variable without treating the string "false"
 * as truthy. Unknown values fall back to the supplied default.
 */
function parseBooleanEnv(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === undefined || value === null) return fallback

  const normalized = String(value).trim().toLowerCase()
  if (TRUE_VALUES.has(normalized)) return true
  if (FALSE_VALUES.has(normalized)) return false
  return fallback
}

module.exports = {
  parseBooleanEnv
}
