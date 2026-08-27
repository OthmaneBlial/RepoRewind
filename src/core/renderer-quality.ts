export type RendererQualityTier = 'cinematic' | 'balanced' | 'dense'

export interface RendererQuality {
  tier: RendererQualityTier
  maximumDpr: number
  antialias: boolean
  shadows: boolean
  shadowMapSize: 1024 | 2048
}

export function rendererQualityForPathCount(pathCount: number): RendererQuality {
  if (pathCount > 5_000) {
    return { tier: 'dense', maximumDpr: 1, antialias: false, shadows: false, shadowMapSize: 1024 }
  }
  if (pathCount > 1_000) {
    return { tier: 'balanced', maximumDpr: 1.25, antialias: true, shadows: true, shadowMapSize: 1024 }
  }
  return { tier: 'cinematic', maximumDpr: 1.65, antialias: true, shadows: true, shadowMapSize: 2048 }
}

export function rendererDprForExport(renderWidth: number, viewportWidth: number): number {
  return Math.max(0.5, Math.min(4, renderWidth / Math.max(1, viewportWidth)))
}
