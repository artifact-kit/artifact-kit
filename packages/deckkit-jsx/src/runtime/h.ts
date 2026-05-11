import { flattenChildren, type ComponentFactory, type ComponentProps, type PptxChild, type PptxNode } from "../core";

export function h<P extends ComponentProps>(
  Component: ComponentFactory<P>,
  props: P | null,
  ...children: PptxChild[]
): PptxNode {
  return Component({
    ...((props ?? {}) as P),
    children: flattenChildren(children),
  });
}

/** JSX factory for Babel classic runtime. Prefer this over `h` to avoid shadowing DeckKit height props. */
export const pptxElement = h;

/** React-compatible alias for tools that expect a createElement-style JSX factory name. */
export const createElement = h;
