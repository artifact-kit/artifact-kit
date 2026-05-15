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
const reconstructionRouteSchema = z.enum([
  'layout-only',
  'native-shape',
  'native-text',
  'svg-image',
  'editable-vector',
  'imagegen',
  'source-raster',
  'drawio-svg',
])
const editabilitySchema = z.enum(['none', 'asset', 'group', 'element'])
const renderRoleSchema = z.enum(['render', 'layout', 'context'])
const childrenPolicySchema = z.enum(['none', 'optional', 'required'])
const granularityFeedbackSchema = z.enum(['ok', 'too-coarse', 'too-fine'])

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
  route: reconstructionRouteSchema.optional(),
  editability: editabilitySchema.optional(),
  renderRole: renderRoleSchema.optional(),
  childrenPolicy: childrenPolicySchema.optional(),
  granularityFeedback: granularityFeedbackSchema.optional(),
  routeReason: z.string().optional(),
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
