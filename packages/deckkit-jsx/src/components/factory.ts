import { createNode, type PptxChildren, type PptxNode } from "../core";

export type PropsWithChildren<TProps extends object> = TProps & {
  children?: PptxChildren;
};

export function component<TType extends string, TProps extends object>(type: TType) {
  return function PptxComponent(props: PropsWithChildren<TProps>): PptxNode<TType, TProps> {
    return createNode(type, props);
  };
}

export function shapeComponent<TProps extends object>(type: string, shape: string) {
  return function PptxShapeComponent(props: PropsWithChildren<TProps>): PptxNode<string, TProps & { shape: string }> {
    return createNode(type, { ...props, shape });
  };
}

export function chartComponent<TProps extends object>(type: string, chartType: string) {
  return function PptxChartComponent(props: PropsWithChildren<TProps>): PptxNode<string, TProps & { type: string }> {
    return createNode(type, { ...props, type: chartType });
  };
}
