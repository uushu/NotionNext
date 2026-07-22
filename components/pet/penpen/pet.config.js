import manifest from './pet.manifest.json'

const joinAssetPath = (base, file) => `${base.replace(/\/$/, '')}/${file}`

export const PET_ASSET_BASE = manifest.assetBase
export const GENERATED_ASSET_BASE = manifest.generatedAssetBase
export const POSITION_STORAGE_KEY = manifest.storageKeys.position
export const COLLAPSED_STORAGE_KEY = manifest.storageKeys.collapsed
export const NEEDS_STORAGE_KEY = manifest.storageKeys.needs
export const LEGACY_POSITION_STORAGE_KEY = manifest.legacyStorageKeys.position
export const LEGACY_COLLAPSED_STORAGE_KEY = manifest.legacyStorageKeys.collapsed
export const BASE_STATE_NAMES = new Set(manifest.baseStates)
export const INACTIVE_STATE_NAMES = new Set(manifest.inactiveStates)
export const IDLE_STAGES = manifest.idleStages

export const PET_STATES = Object.fromEntries(
  Object.entries(manifest.states).map(([stateName, state]) => {
    const originalSrc = joinAssetPath(PET_ASSET_BASE, state.file)
    const src = state.generateSlow
      ? joinAssetPath(GENERATED_ASSET_BASE, state.file)
      : originalSrc

    return [
      stateName,
      {
        src,
        fallbackSrc: state.fallbackFile
          ? joinAssetPath(PET_ASSET_BASE, state.fallbackFile)
          : originalSrc,
        label: state.label,
        generateSlow: Boolean(state.generateSlow)
      }
    ]
  })
)

export const PET_MANIFEST = manifest
