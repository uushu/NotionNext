const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const repoRoot = path.resolve(__dirname, '..')
const archivePath = path.join(repoRoot, 'tools', 'utto-pet-assets-v1.zip')
const tempRoot = path.join(repoRoot, '.tmp', 'utto-pet-assets')
const sourceDir = path.join(tempRoot, 'utto-pet-assets-v1')
const targetDir = path.join(repoRoot, 'public', 'pet', 'utto')

function extractZip(archiveBuffer, destination) {
  let offset = 0
  let extractedFiles = 0

  while (offset + 30 <= archiveBuffer.length) {
    const signature = archiveBuffer.readUInt32LE(offset)

    // Central directory reached: all local file entries have been processed.
    if (signature === 0x02014b50 || signature === 0x06054b50) break

    if (signature !== 0x04034b50) {
      throw new Error(
        `[utto-pet] Unsupported ZIP structure at byte ${offset}.`
      )
    }

    const flags = archiveBuffer.readUInt16LE(offset + 6)
    const compressionMethod = archiveBuffer.readUInt16LE(offset + 8)
    const compressedSize = archiveBuffer.readUInt32LE(offset + 18)
    const uncompressedSize = archiveBuffer.readUInt32LE(offset + 22)
    const fileNameLength = archiveBuffer.readUInt16LE(offset + 26)
    const extraLength = archiveBuffer.readUInt16LE(offset + 28)

    if ((flags & 0x08) !== 0) {
      throw new Error(
        '[utto-pet] ZIP data descriptors are not supported by this extractor.'
      )
    }

    const fileNameStart = offset + 30
    const fileNameEnd = fileNameStart + fileNameLength
    const fileName = archiveBuffer.toString('utf8', fileNameStart, fileNameEnd)
    const dataStart = fileNameEnd + extraLength
    const dataEnd = dataStart + compressedSize

    if (dataEnd > archiveBuffer.length) {
      throw new Error(`[utto-pet] Corrupted ZIP entry: ${fileName}`)
    }

    const normalizedName = path.posix.normalize(fileName.replace(/\\/g, '/'))
    if (
      normalizedName.startsWith('../') ||
      normalizedName.includes('/../') ||
      path.posix.isAbsolute(normalizedName)
    ) {
      throw new Error(`[utto-pet] Unsafe ZIP entry path: ${fileName}`)
    }

    const outputPath = path.join(destination, ...normalizedName.split('/'))

    if (normalizedName.endsWith('/')) {
      fs.mkdirSync(outputPath, { recursive: true })
    } else {
      const compressedData = archiveBuffer.subarray(dataStart, dataEnd)
      let fileData

      if (compressionMethod === 0) {
        fileData = compressedData
      } else if (compressionMethod === 8) {
        fileData = zlib.inflateRawSync(compressedData)
      } else {
        throw new Error(
          `[utto-pet] Unsupported ZIP compression method ${compressionMethod} for ${fileName}`
        )
      }

      if (fileData.length !== uncompressedSize) {
        throw new Error(`[utto-pet] Size mismatch after extracting ${fileName}`)
      }

      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, fileData)
      extractedFiles += 1
    }

    offset = dataEnd
  }

  return extractedFiles
}

if (!fs.existsSync(archivePath)) {
  console.log('[utto-pet] Asset archive not found, skipping extraction.')
  process.exit(0)
}

fs.rmSync(tempRoot, { recursive: true, force: true })
fs.mkdirSync(tempRoot, { recursive: true })

const archiveBuffer = fs.readFileSync(archivePath)
const extractedFiles = extractZip(archiveBuffer, tempRoot)

if (!fs.existsSync(sourceDir)) {
  throw new Error(`[utto-pet] Extracted asset directory is missing: ${sourceDir}`)
}

fs.rmSync(targetDir, { recursive: true, force: true })
fs.mkdirSync(path.dirname(targetDir), { recursive: true })
fs.cpSync(sourceDir, targetDir, { recursive: true })
fs.rmSync(tempRoot, { recursive: true, force: true })

console.log(
  `[utto-pet] Prepared ${extractedFiles} files at ${targetDir}`
)
