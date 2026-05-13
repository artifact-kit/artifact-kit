export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export type ElementKind =
  | 'architecture-box'
  | 'canvas'
  | 'card'
  | 'content-row'
  | 'decorative-background'
  | 'decorative-line'
  | 'decorative-shape'
  | 'footer'
  | 'icon'
  | 'section'
  | 'section-body'
  | 'section-header'
  | 'text'
  | 'text-group'
  | 'group'
  | 'image'
  | 'shape'

export type ReviewStatus = 'pending' | 'reviewing' | 'accepted' | 'needs-agent'

export interface ElementNode {
  id: string
  parentId?: string
  label: string
  kind: ElementKind
  bbox: BBox
  description?: string
  reviewStatus?: ReviewStatus
  confidence?: number
  notes?: string
}

export interface ElementManifest {
  source?: string
  image: {
    width: number
    height: number
  }
  coordinateSystem: 'pixel'
  scope?: string
  boxes: ElementNode[]
}

export interface AssetRef {
  id: string
  kind: 'image' | 'json' | 'text' | 'other'
  source: 'url' | 'data-url' | 'workspace-file'
  src?: string
  dataUrl?: string
  path?: string
  mimeType?: string
}

export interface WorkbenchSession {
  id: string
  data: unknown
  assets?: AssetRef[]
  createdAt: string
  updatedAt: string
}
