import { createNode, flattenChildren, type ComponentFactory, type ComponentProps, type PptxChildren, type PptxNode } from "./core";

type JsxProps = ComponentProps & {
  children?: PptxChildren;
};

export function jsx<P extends ComponentProps>(
  Component: ComponentFactory<P> | string,
  props: JsxProps,
  _key?: string
): PptxNode {
  const { children, ...rest } = props ?? {};

  if (typeof Component === "string") {
    return createNode(Component, {
      ...(rest as ComponentProps),
      children: flattenChildren(children),
    });
  }

  return Component({
    ...(rest as P),
    children: flattenChildren(children),
  });
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export function Fragment(props: { children?: PptxChildren }): PptxNode<"Fragment", { children?: PptxChildren }> {
  return createNode("Fragment", { children: flattenChildren(props.children) });
}

export namespace JSX {
  export type Element = PptxNode;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicElements {
    [elementName: string]: ComponentProps & { children?: PptxChildren };
  }
}
