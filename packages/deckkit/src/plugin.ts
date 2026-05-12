import type { Color, PresSlide, ShapeFillProps, ShapeLineProps, ShapeProps } from './core-interfaces'
import type { SHAPE_NAME } from './core-enums'

export type DeckKitFillProps = Color | ShapeFillProps | ShapeLineProps

export type DeckKitFillRenderer = (props: DeckKitFillProps) => string | null | undefined
export interface DeckKitShapeHandlerContext {
	target: PresSlide
	shape: SHAPE_NAME
	options: ShapeProps
	next: () => void
}
export type DeckKitShapeHandler = (context: DeckKitShapeHandlerContext) => boolean | void

const shapeHandlers: DeckKitShapeHandler[] = []

export function addShapeHandler(handler: DeckKitShapeHandler): void {
	shapeHandlers.push(handler)
}

export function getShapeHandlers(): DeckKitShapeHandler[] {
	return shapeHandlers
}

export interface DeckKitPluginContext {
	addFillRenderer: (renderer: DeckKitFillRenderer) => void
	addShapeHandler: (handler: DeckKitShapeHandler) => void
}

export interface DeckKitPlugin<TOptions = unknown> {
	name?: string
	setup: (context: DeckKitPluginContext, options?: TOptions) => void
}
