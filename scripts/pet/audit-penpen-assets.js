const fs = require('node:fs')
const path = require('node:path')

const ROOT = process.cwd()
const MANIFEST_PATH = path.resolve(
  ROOT,
  'components',
  'pet',
  'penpen',
  'pet.manifest.json'
)
const manifest = require(MANIFEST_PATH)
const ASSET_DIR = path.resolve(
  ROOT,
  'public',
  manifest.assetBase.replace(/^\//, '')
)

const IGNORED_NAMES = new Set(['README.md', 'slow'])
const SUPPORTED_EXTENSIONS = new Set(['.gif', '.png', '.webp', '.svg', '.avif'])

const registeredFiles = new Set()
for (const state of Object.values(manifest.states)) {
  if (state.file) registeredFiles.add(state.file)
  if (state.fallbackFile) registeredFiles.add(state.fallbackFile)
}

const diskFiles = fs
  .readdirSync(ASSET_DIR, { withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => entry.name)
  .filter(name => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))

const missingFiles = [...registeredFiles].filter(
  file => !fs.existsSync(path.join(ASSET_DIR, file))
)
const unregisteredFiles = diskFiles.filter(file => !registeredFiles.has(file))
const invalidEntries = fs
  .readdirSync(ASSET_DIR, { withFileTypes: true })
  .map(entry => entry.name)
  .filter(name => {
    if (IGNORED_NAMES.has(name)) return false
    const fullPath = path.join(ASSET_DIR, name)
    if (fs.statSync(fullPath).isDirectory()) return true
    return !SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase())
  })

console.log(`[PenpenPet] Registered assets: ${registeredFiles.size}`)
console.log(`[PenpenPet] Asset files on disk: ${diskFiles.length}`)

if (missingFiles.length) {
  console.error('[PenpenPet] Missing registered assets:')
  missingFiles.forEach(file => console.error(`  - ${file}`))
}

if (unregisteredFiles.length) {
  console.warn('[PenpenPet] Unregistered assets:')
  unregisteredFiles.forEach(file => console.warn(`  - ${file}`))
}

if (invalidEntries.length) {
  console.warn('[PenpenPet] Unexpected files or directories:')
  invalidEntries.forEach(file => console.warn(`  - ${file}`))
}

if (missingFiles.length) {
  process.exitCode = 1
} else {
  console.log('[PenpenPet] Asset audit passed.')
}
