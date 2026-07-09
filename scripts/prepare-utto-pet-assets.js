const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const archivePath = path.join(repoRoot, 'tools', 'utto-pet-assets-v1.zip')
const tempRoot = path.join(repoRoot, '.tmp', 'utto-pet-assets')
const sourceDir = path.join(tempRoot, 'utto-pet-assets-v1')
const targetDir = path.join(repoRoot, 'public', 'pet', 'utto')

if (!fs.existsSync(archivePath)) {
  console.log('[utto-pet] Asset archive not found, skipping extraction.')
  process.exit(0)
}

fs.rmSync(tempRoot, { recursive: true, force: true })
fs.mkdirSync(tempRoot, { recursive: true })

if (process.platform === 'win32') {
  const escapedArchive = archivePath.replace(/'/g, "''")
  const escapedTemp = tempRoot.replace(/'/g, "''")
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${escapedArchive}' -DestinationPath '${escapedTemp}' -Force`
    ],
    { stdio: 'inherit' }
  )
} else {
  execFileSync('unzip', ['-q', '-o', archivePath, '-d', tempRoot], {
    stdio: 'inherit'
  })
}

if (!fs.existsSync(sourceDir)) {
  throw new Error(`[utto-pet] Extracted asset directory is missing: ${sourceDir}`)
}

fs.rmSync(targetDir, { recursive: true, force: true })
fs.mkdirSync(path.dirname(targetDir), { recursive: true })
fs.cpSync(sourceDir, targetDir, { recursive: true })
fs.rmSync(tempRoot, { recursive: true, force: true })

console.log(`[utto-pet] Assets prepared at ${targetDir}`)
