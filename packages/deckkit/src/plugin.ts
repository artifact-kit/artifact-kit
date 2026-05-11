import type { Color, ShapeFillProps, ShapeLineProps } from './core-interfaces'

export type DeckKitFillProps = Color | ShapeFillProps | ShapeLineProps

export type DeckKitFillRenderer = (props: DeckKitFillProps) => string | null | undefined

export interface DeckKitPluginContext {
	addFillRenderer: (renderer: DeckKitFillRenderer) => void
}

export interface DeckKitPlugin<TOptions = unknown> {
	name?: string
	setup: (context: DeckKitPluginContext, options?: TOptions) => void
}
