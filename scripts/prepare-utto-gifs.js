const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')

const SOURCE_DIR = path.resolve(process.cwd(), 'public', 'pet', 'utto')
const OUTPUT_DIR = path.join(SOURCE_DIR, 'slow')
const SPEED_FACTOR = 1.9
const GIF_NAMES = [
  'idle.gif',
  'reading.gif',
  'exploring.gif',
  'bored.gif',
  'break.gif',
  'sleep.gif',
  'interact.gif',
  'annoyed.gif',
  'success.gif'
]

function normalizeDelays(metadata) {
  const pageCount = Math.max(metadata.pages || 1, 1)
  const sourceDelays =
    Array.isArray(metadata.delay) && metadata.delay.length
      ? metadata.delay
      : new Array(pageCount).fill(100)

  return Array.from({ length: pageCount }, (_, index) => {
    const sourceDelay = sourceDelays[index] || sourceDelays.at(-1) || 100
    return Math.min(
      1200,
      Math.max(100, Math.round(sourceDelay * SPEED_FACTOR))
    )
  })
}

async function shouldSkip(sourcePath, outputPath) {
  try {
    const [sourceStat, outputStat] = await Promise.all([
      fs.stat(sourcePath),
      fs.stat(outputPath)
    ])
    return outputStat.mtimeMs >= sourceStat.mtimeMs
  } catch {
    return false
  }
}

async function prepareGif(name) {
  const sourcePath = path.join(SOURCE_DIR, name)
  const outputPath = path.join(OUTPUT_DIR, name)
  const temporaryPath = `${outputPath}.tmp`

  if (await shouldSkip(sourcePath, outputPath)) return

  try {
    const metadata = await sharp(sourcePath, { animated: true }).metadata()
    const delay = normalizeDelays(metadata)

    await sharp(sourcePath, { animated: true })
      .gif({
        delay,
        loop: Number.isInteger(metadata.loop) ? metadata.loop : 0
      })
      .toFile(temporaryPath)

    await fs.rename(temporaryPath, outputPath)
    console.log(`[UttoPet] Prepared slower GIF: ${name}`)
  } catch (error) {
    await fs.rm(temporaryPath, { force: true })
    await fs.copyFile(sourcePath, outputPath)
    console.warn(
      `[UttoPet] Could not slow ${name}; copied the original instead:`,
      error?.message || error
    )
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await Promise.all(GIF_NAMES.map(prepareGif))
}

main().catch(error => {
  console.error('[UttoPet] Failed to prepare GIF assets:', error)
  process.exitCode = 1
})
