import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import type { AssetRef, WorkbenchSession } from './types'
import { bboxReviewDataSchema, type BBoxReviewData } from './workbench-registry'

type InputKind = 'bbox-review-data' | 'session-envelope' | 'element-manifest' | 'project'

interface BBoxReviewJob {
  id: string
  workbenchType: 'bbox-review'
  inputPath: string
  outputPath: string
  inputKind: InputKind
  data: BBoxReviewData
  assets?: AssetRef[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  originalInput: unknown
}

const jobKey = Symbol.for('deckkit-workbench.current-job')
const globalStore = globalThis as typeof globalThis & { [jobKey]?: BBoxReviewJob }

export async function getCurrentJob(): Promise<WorkbenchSession> {
  const job = await loadJob()
  return toSession(job)
}

export async function updateCurrentJob(input: { data: unknown; assets?: AssetRef[]; complete?: boolean }): Promise<WorkbenchSession> {
  const job = await loadJob()
  job.data = bboxReviewDataSchema.parse(input.data)
  if ('assets' in input) job.assets = input.assets
  job.updatedAt = new Date().toISOString()
  if (input.complete) {
    job.data.status = 'complete'
    job.completedAt = job.updatedAt
  }
  await writeOutput(job)
  return toSession(job)
}

export function isSingleJobMode(): boolean {
  return process.env.DECKKIT_WORKBENCH_MODE === 'bbox-review'
}

async function loadJob(): Promise<BBoxReviewJob> {
  if (!isSingleJobMode()) throw new Error('Workbench was not started in CLI single-job mode.')
  if (globalStore[jobKey]) return globalStore[jobKey]

  const inputPath = process.env.DECKKIT_WORKBENCH_INPUT
  const outputPath = process.env.DECKKIT_WORKBENCH_OUTPUT
  if (!inputPath || !outputPath) throw new Error('Missing DECKKIT_WORKBENCH_INPUT or DECKKIT_WORKBENCH_OUTPUT.')

  const originalInput = JSON.parse(await readFile(inputPath, 'utf8')) as unknown
  const normalized = normalizeInput(originalInput, inputPath)
  const now = new Date().toISOString()
  const job: BBoxReviewJob = {
    id: 'cli-job',
    workbenchType: 'bbox-review',
    inputPath,
    outputPath,
    inputKind: normalized.inputKind,
    data: normalized.data,
    assets: normalized.assets,
    createdAt: now,
    updatedAt: now,
    originalInput,
  }
  globalStore[jobKey] = job
  return job
}

function normalizeInput(input: unknown, inputPath: string): { inputKind: InputKind; data: BBoxReviewData; assets?: AssetRef[] } {
  if (isObject(input) && input.workbenchType === 'bbox-review' && 'data' in input) {
    return {
      inputKind: 'session-envelope',
      data: bboxReviewDataSchema.parse(input.data),
      assets: Array.isArray(input.assets) ? input.assets as AssetRef[] : undefined,
    }
  }

  if (isObject(input) && 'manifest' in input && isObject(input.manifest) && Array.isArray(input.manifest.boxes)) {
    const sourceImagePath = typeof input.sourceImagePath === 'string' ? input.sourceImagePath : undefined
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
      assets: sourceImagePath ? [imageAsset(sourceImagePath)] : inferManifestAsset(input.manifest, inputPath),
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
      assets: inferManifestAsset(input, inputPath),
    }
  }

  return {
    inputKind: 'bbox-review-data',
    data: bboxReviewDataSchema.parse(input),
  }
}

async function writeOutput(job: BBoxReviewJob): Promise<void> {
  await mkdir(dirname(job.outputPath), { recursive: true })
  await writeFile(job.outputPath, `${JSON.stringify(formatOutput(job), null, 2)}\n`)
}

function formatOutput(job: BBoxReviewJob): unknown {
  if (job.inputKind === 'session-envelope' && isObject(job.originalInput)) {
    return {
      ...job.originalInput,
      workbenchType: 'bbox-review',
      data: job.data,
      assets: job.assets,
    }
  }

  if (job.inputKind === 'project' && isObject(job.originalInput) && isObject(job.originalInput.manifest)) {
    return {
      ...job.originalInput,
      manifest: {
        ...job.originalInput.manifest,
        image: job.data.image,
        boxes: job.data.elements,
      },
      review: {
        ...(isObject(job.originalInput.review) ? job.originalInput.review : {}),
        type: 'bbox-review',
        status: job.data.status ?? (job.completedAt ? 'complete' : 'needs-human'),
        activeElementId: job.data.activeElementId,
        instructions: job.data.instructions,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      },
      updatedAt: job.updatedAt,
    }
  }

  if (job.inputKind === 'element-manifest' && isObject(job.originalInput)) {
    return {
      ...job.originalInput,
      image: job.data.image,
      boxes: job.data.elements,
    }
  }

  return job.data
}

function toSession(job: BBoxReviewJob): WorkbenchSession {
  return {
    id: job.id,
    workbenchType: job.workbenchType,
    data: job.data,
    assets: job.assets,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}

function inferManifestAsset(manifest: Record<string, unknown>, inputPath: string): AssetRef[] | undefined {
  if (typeof manifest.source !== 'string') return undefined
  const sourcePath = resolve(dirname(inputPath), manifest.source)
  return [imageAsset(sourcePath)]
}

function imageAsset(path: string): AssetRef {
  return {
    id: 'source',
    kind: 'image',
    source: 'workspace-file',
    path: toWorkspacePath(path),
    mimeType: imageMimeType(path),
  }
}

function toWorkspacePath(path: string): string {
  const repoRoot = resolve(process.cwd(), '../..')
  const absolute = isAbsolute(path) ? path : resolve(repoRoot, path)
  const rel = relative(repoRoot, absolute)
  return rel.startsWith('..') ? absolute : rel
}

function imageMimeType(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return 'image/png'
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
