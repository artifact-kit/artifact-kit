import type { AssetRef } from './types'
import { bboxReviewDataSchema, type BBoxReviewData } from './workbench-registry'

type InputKind = 'bbox-review-data' | 'session-envelope' | 'element-manifest' | 'project'

export interface LoadedBBoxInput {
  inputKind: InputKind
  data: BBoxReviewData
  assets?: AssetRef[]
  originalInput: unknown
  inputFileName?: string
}

export function normalizeBBoxInput(input: unknown, inputFileName?: string): LoadedBBoxInput {
  if (isObject(input) && input.workbenchType === 'bbox-review' && 'data' in input) {
    return {
      inputKind: 'session-envelope',
      data: bboxReviewDataSchema.parse(input.data),
      assets: Array.isArray(input.assets) ? input.assets as AssetRef[] : undefined,
      originalInput: input,
      inputFileName,
    }
  }

  if (isObject(input) && 'manifest' in input && isObject(input.manifest) && Array.isArray(input.manifest.boxes)) {
    return {
      inputKind: 'project',
      data: bboxReviewDataSchema.parse({
        title: typeof input.name === 'string' ? input.name : 'BBox Review',
        imageAssetId: 'source',
        image: input.manifest.image,
        activeElementId: isObject(input.review) && typeof input.review.activeElementId === 'string' ? input.review.activeElementId : input.manifest.boxes[0]?.id,
        instructions: isObject(input.review) && typeof input.review.instructions === 'string' ? input.review.instructions : undefined,
        status: isObject(input.review) && input.review.status === 'complete' ? 'complete' : 'needs-human',
        elements: input.manifest.boxes,
      }),
      originalInput: input,
      inputFileName,
    }
  }

  if (isObject(input) && Array.isArray(input.boxes) && isObject(input.image)) {
    return {
      inputKind: 'element-manifest',
      data: bboxReviewDataSchema.parse({
        title: typeof input.scope === 'string' ? input.scope : 'BBox Review',
        imageAssetId: 'source',
        image: input.image,
        elements: input.boxes,
      }),
      originalInput: input,
      inputFileName,
    }
  }

  return {
    inputKind: 'bbox-review-data',
    data: bboxReviewDataSchema.parse(input),
    originalInput: input,
    inputFileName,
  }
}

export function formatBBoxOutput(input: LoadedBBoxInput, data: BBoxReviewData): unknown {
  const now = new Date().toISOString()

  if (input.inputKind === 'session-envelope' && isObject(input.originalInput)) {
    return {
      ...input.originalInput,
      workbenchType: 'bbox-review',
      data,
      assets: input.assets,
    }
  }

  if (input.inputKind === 'project' && isObject(input.originalInput) && isObject(input.originalInput.manifest)) {
    return {
      ...input.originalInput,
      manifest: {
        ...input.originalInput.manifest,
        image: data.image,
        boxes: data.elements,
      },
      review: {
        ...(isObject(input.originalInput.review) ? input.originalInput.review : {}),
        type: 'bbox-review',
        status: data.status ?? 'needs-human',
        activeElementId: data.activeElementId,
        instructions: data.instructions,
        updatedAt: now,
        completedAt: data.status === 'complete' ? now : undefined,
      },
      updatedAt: now,
    }
  }

  if (input.inputKind === 'element-manifest' && isObject(input.originalInput)) {
    return {
      ...input.originalInput,
      image: data.image,
      boxes: data.elements,
    }
  }

  return data
}

export function outputFileName(input: LoadedBBoxInput): string {
  const base = input.inputFileName?.replace(/\.json$/i, '') || 'bbox-review'
  return `${base}.final.json`
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
