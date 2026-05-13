import * as z from 'zod/v4'

const bboxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})

const elementKindSchema = z.enum([
  'architecture-box',
  'canvas',
  'card',
  'content-row',
  'decorative-background',
  'decorative-line',
  'decorative-shape',
  'footer',
  'icon',
  'section',
  'section-body',
  'section-header',
  'text',
  'text-group',
  'group',
  'image',
  'shape',
])

const reviewStatusSchema = z.enum(['pending', 'reviewing', 'accepted', 'needs-agent'])

const elementNodeSchema = z.object({
  id: z.string(),
  parentId: z.string().optional(),
  label: z.string(),
  kind: elementKindSchema,
  bbox: bboxSchema,
  description: z.string().optional(),
  reviewStatus: reviewStatusSchema.optional(),
  confidence: z.number().optional(),
  notes: z.string().optional(),
})

export const bboxReviewDataSchema = z.object({
  title: z.string().optional(),
  imageAssetId: z.string(),
  image: z.object({
    width: z.number(),
    height: z.number(),
  }),
  activeElementId: z.string().optional(),
  instructions: z.string().optional(),
  status: z.enum(['needs-human', 'complete']).optional(),
  elements: z.array(elementNodeSchema),
})

export type BBoxReviewData = z.infer<typeof bboxReviewDataSchema>
export type WorkbenchType = 'bbox-review'

export interface WorkbenchDefinition {
  id: WorkbenchType
  route: string
  title: string
  description: string
  dataSchema: z.ZodType
}

export const workbenches = [
  {
    id: 'bbox-review',
    route: '/bbox-review',
    title: 'BBox Review',
    description: 'Review and correct element bounding boxes over a source image.',
    dataSchema: bboxReviewDataSchema,
  },
] satisfies WorkbenchDefinition[]

export function listWorkbenches() {
  return workbenches.map(workbench => ({
    id: workbench.id,
    route: workbench.route,
    title: workbench.title,
    description: workbench.description,
    dataSchema: z.toJSONSchema(workbench.dataSchema),
  }))
}

export function getWorkbenchDefinition(type: string): WorkbenchDefinition {
  const workbench = workbenches.find(item => item.id === type)
  if (!workbench) throw new Error(`Unknown workbench type: ${type}`)
  return workbench
}

export function parseWorkbenchData(type: string, data: unknown): unknown {
  if (typeof type !== 'string' || type.length === 0) throw new Error('Missing workbenchType')
  return getWorkbenchDefinition(type).dataSchema.parse(data)
}
