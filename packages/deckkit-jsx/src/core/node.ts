export type PrimitiveChild = string | number | boolean | null | undefined;

export type PptxChild = PptxNode | PrimitiveChild;

export type PptxChildren = PptxChild | PptxChildren[];

export type ComponentProps = object;

export type ComponentFactory<P extends ComponentProps = ComponentProps> = (
  props: P & { children?: PptxChildren }
) => PptxNode<string, P>;

export class PptxNode<TType extends string = string, TProps extends ComponentProps = ComponentProps> {
  readonly $$pptxNode = true;
  readonly type: TType;
  readonly props: Readonly<TProps>;
  readonly children: readonly PptxChild[];

  constructor(type: TType, props: TProps & { children?: PptxChildren }) {
    const { children, ...rest } = props;
    this.type = type;
    this.props = Object.freeze(rest as TProps);
    this.children = Object.freeze(normalizeChildren(children));
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      props: this.props,
      children: this.children.filter(isSerializableChild).map((child) => {
        return isPptxNode(child) ? child.toJSON() : child;
      }),
    };
  }
}

export function createNode<TType extends string, TProps extends ComponentProps>(
  type: TType,
  props: TProps & { children?: PptxChildren }
): PptxNode<TType, TProps> {
  return new PptxNode(type, props);
}

export function isPptxNode(value: unknown): value is PptxNode {
  return value instanceof PptxNode || Boolean(value && typeof value === "object" && (value as PptxNode).$$pptxNode);
}

export function flattenChildren(children: PptxChildren | undefined): PptxChild[] {
  return normalizeChildren(children);
}

function normalizeChildren(children: PptxChildren | undefined): PptxChild[] {
  if (children === undefined || children === null || children === false) {
    return [];
  }

  const result: PptxChild[] = [];
  appendChildren(children, result);
  return result;
}

function isSerializableChild(child: PptxChild): child is PptxNode | string | number | boolean {
  return isPptxNode(child) || typeof child === "string" || typeof child === "number" || typeof child === "boolean";
}

function appendChildren(children: PptxChildren, result: PptxChild[]): void {
  if (Array.isArray(children)) {
    children.forEach((child) => appendChildren(child, result));
    return;
  }

  if (children !== undefined && children !== null && children !== false) {
    result.push(children);
  }
}
