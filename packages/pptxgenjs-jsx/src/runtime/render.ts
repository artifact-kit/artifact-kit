import PptxGenJS from "pptxgenjs";
import { isPptxNode, type PptxChild, type PptxNode } from "../core";
import type {
  ChartProps,
  DeckProps,
  ImageProps,
  LineBetweenProps,
  LineProps,
  MasterProps,
  MediaProps,
  NotesProps,
  PlaceholderProps,
  RawProps,
  SectionProps,
  ShapeProps,
  SlideProps,
  TableCellProps,
  TableProps,
  TableRowProps,
  TableToSlidesProps,
  TextProps,
  TextRunProps,
} from "../components";
import type PptxGenJSType from "pptxgenjs";

export type CreatePptxOptions = {
  /** Reuse an existing PptxGenJS instance instead of creating a new one. */
  pptx?: PptxGenJSType;
};

export type RenderPptxOptions = PptxGenJS.WriteFileProps & CreatePptxOptions;

export type WritePptxOptions = PptxGenJS.WriteProps & CreatePptxOptions;

type RenderScope = {
  pptx: PptxGenJSType;
  slide?: PptxGenJS.Slide;
};

const OPTION_CONTROL_KEYS = new Set(["children", "options", "text", "runs", "shape", "data", "rows", "cells", "eleId", "render"]);
const CHART_NODE_TYPES = new Set([
  "Chart",
  "AreaChart",
  "BarChart",
  "Bar3DChart",
  "BubbleChart",
  "DoughnutChart",
  "LineChart",
  "PieChart",
  "RadarChart",
  "ScatterChart",
]);
const SHAPE_NODE_TYPES = new Set([
  "Shape",
  "Rect",
  "RoundRect",
  "Ellipse",
  "Oval",
  "Triangle",
  "RightTriangle",
  "Diamond",
  "Pentagon",
  "Hexagon",
  "Star",
  "Star4",
  "Star5",
  "Star6",
  "Star8",
  "Star10",
  "Arc",
  "BlockArc",
  "PieShape",
  "CustomGeometry",
  "LeftArrow",
  "RightArrow",
  "UpArrow",
  "DownArrow",
  "LeftRightArrow",
  "UpDownArrow",
  "Chevron",
  "Cloud",
  "Heart",
  "Donut",
  "Plus",
]);

export function createPptx(root: PptxNode, options: CreatePptxOptions = {}): PptxGenJSType {
  const pptx = options.pptx ?? new PptxGenJS();
  const deck = root.type === "Deck" ? root : undefined;

  if (deck) {
    applyDeckProps(pptx, deck.props as DeckProps);
    renderDeckChildren(deck, { pptx });
    return pptx;
  }

  if (root.type === "Slide") {
    renderSlideNode(root, { pptx });
    return pptx;
  }

  throw new Error(`createPptx expected a Deck or Slide root, got ${root.type}.`);
}

export async function renderPptx(root: PptxNode, options: RenderPptxOptions = {}): Promise<string> {
  const pptx = createPptx(root, options);
  const { pptx: _pptx, ...writeOptions } = options;
  return pptx.writeFile(writeOptions);
}

export async function writePptx(root: PptxNode, options: WritePptxOptions = {}): Promise<string | ArrayBuffer | Blob | Uint8Array> {
  const pptx = createPptx(root, options);
  const { pptx: _pptx, ...writeOptions } = options;
  return pptx.write(writeOptions);
}

export const render = renderPptx;
export const write = writePptx;

function applyDeckProps(pptx: PptxGenJSType, props: DeckProps): void {
  props.layouts?.forEach((layout) => pptx.defineLayout(layout));
  props.sections?.forEach((section) => pptx.addSection(section));
  props.masters?.forEach((master) => pptx.defineSlideMaster(master));

  if (typeof props.layout === "string") {
    pptx.layout = props.layout;
  } else if (props.layout) {
    pptx.defineLayout(props.layout);
    pptx.layout = props.layout.name;
  }

  assignIfDefined(pptx, "title", props.title);
  assignIfDefined(pptx, "author", props.author);
  assignIfDefined(pptx, "company", props.company);
  assignIfDefined(pptx, "subject", props.subject);
  assignIfDefined(pptx, "revision", props.revision);
  assignIfDefined(pptx, "rtlMode", props.rtlMode);
  assignIfDefined(pptx, "theme", props.theme);
}

function renderDeckChildren(deck: PptxNode, scope: RenderScope): void {
  for (const child of elementChildren(deck)) {
    switch (child.type) {
      case "Layout":
        scope.pptx.defineLayout(child.props as unknown as PptxGenJS.PresLayout);
        break;
      case "Master":
        scope.pptx.defineSlideMaster(resolveMasterProps(child));
        break;
      case "Section":
        renderSectionNode(child, scope);
        break;
      case "Slide":
        renderSlideNode(child, scope);
        break;
      case "TableToSlides":
        renderTableToSlidesNode(child, scope);
        break;
      case "Raw":
        void (child.props as RawProps).render({ pptx: scope.pptx, node: child });
        break;
      case "Fragment":
        renderDeckChildren(child, scope);
        break;
      default:
        throw new Error(`${child.type} must be inside a Slide, Section, or Master.`);
    }
  }
}

function renderSectionNode(section: PptxNode, scope: RenderScope): void {
  const props = section.props as unknown as SectionProps;
  scope.pptx.addSection({ title: props.title, order: props.order });

  for (const child of elementChildren(section)) {
    if (child.type !== "Slide") {
      throw new Error(`Section children must be Slide nodes. Got ${child.type}.`);
    }

    renderSlideNode(child, scope, props.title);
  }
}

function renderSlideNode(slideNode: PptxNode, scope: RenderScope, inheritedSectionTitle?: string): void {
  const props = slideNode.props as SlideProps;
  const pptxSlide = scope.pptx.addSlide({
    masterName: props.masterName,
    sectionTitle: props.sectionTitle ?? inheritedSectionTitle,
  });

  assignIfDefined(pptxSlide, "background", props.background);
  assignIfDefined(pptxSlide, "color", props.color);
  assignIfDefined(pptxSlide, "hidden", props.hidden);
  assignIfDefined(pptxSlide, "slideNumber", props.slideNumber);

  for (const child of elementChildren(slideNode)) {
    renderSlideChild(child, { ...scope, slide: pptxSlide });
  }
}

function renderSlideChild(node: PptxNode, scope: RenderScope): void {
  if (!scope.slide) {
    throw new Error(`${node.type} requires a slide render scope.`);
  }

  if (CHART_NODE_TYPES.has(node.type)) {
    renderChartNode(node, scope.slide);
    return;
  }

  if (SHAPE_NODE_TYPES.has(node.type)) {
    renderShapeNode(node, scope.slide);
    return;
  }

  switch (node.type) {
    case "Text":
      renderTextNode(node, scope.slide);
      break;
    case "Line":
      renderLineNode(node, scope.slide);
      break;
    case "LineBetween":
      renderLineBetweenNode(node, scope.slide);
      break;
    case "Image":
      renderImageNode(node, scope.slide);
      break;
    case "Media":
      renderMediaNode(node, scope.slide);
      break;
    case "Table":
      renderTableNode(node, scope.slide);
      break;
    case "Notes":
      scope.slide.addNotes(resolveTextContent(node, (node.props as NotesProps).text));
      break;
    case "Raw":
      void (node.props as RawProps).render({ pptx: scope.pptx, slide: scope.slide, node });
      break;
    case "Fragment":
      elementChildren(node).forEach((child) => renderSlideChild(child, scope));
      break;
    default:
      throw new Error(`${node.type} cannot be rendered directly on a slide.`);
  }
}

function renderTextNode(node: PptxNode, slide: PptxGenJS.Slide): void {
  const props = node.props as TextProps;
  const text = cloneForPptx(props.runs ?? collectTextRuns(node) ?? props.text ?? resolveTextContent(node));
  slide.addText(text as string | PptxGenJS.TextProps[], mergeOptions(props.options, props));
}

function renderShapeNode(node: PptxNode, slide: PptxGenJS.Slide): void {
  const props = node.props as ShapeProps;
  slide.addShape(props.shape, mergeOptions(props.options, props, ["shape"]));
}

function renderLineNode(node: PptxNode, slide: PptxGenJS.Slide): void {
  const props = node.props as LineProps;
  slide.addShape("line", mergeOptions(props.options, props));
}

function renderLineBetweenNode(node: PptxNode, slide: PptxGenJS.Slide): void {
  const props = node.props as LineBetweenProps;
  const x = Math.min(props.x1, props.x2);
  const y = Math.min(props.y1, props.y2);
  const w = Math.abs(props.x2 - props.x1);
  const h = Math.abs(props.y2 - props.y1);
  const options = mergeOptions(props.options, props, ["x1", "y1", "x2", "y2"]);
  slide.addShape("line", {
    ...options,
    x,
    y,
    w,
    h,
    flipH: props.x2 < props.x1,
    flipV: props.y2 < props.y1,
  });
}

function renderImageNode(node: PptxNode, slide: PptxGenJS.Slide): void {
  const props = node.props as ImageProps;
  slide.addImage(mergeOptions(props.options, props));
}

function renderMediaNode(node: PptxNode, slide: PptxGenJS.Slide): void {
  const props = node.props as MediaProps;
  slide.addMedia(mergeOptions(props.options, props));
}

function renderChartNode(node: PptxNode, slide: PptxGenJS.Slide): void {
  const props = node.props as ChartProps;
  slide.addChart(props.type, cloneForPptx(props.data), mergeOptions(props.options, props, ["type", "data"]));
}

function renderTableNode(node: PptxNode, slide: PptxGenJS.Slide): void {
  const props = node.props as TableProps;
  const rows = cloneForPptx(props.rows ?? elementChildren(node).map(resolveTableRowNode));
  slide.addTable(rows, mergeOptions(props.options, props));
}

function renderTableToSlidesNode(node: PptxNode, scope: RenderScope): void {
  const props = node.props as TableToSlidesProps;
  scope.pptx.tableToSlides(props.eleId, mergeOptions(props.options, props, ["eleId"]));
}

function resolveTableRowNode(node: PptxNode): PptxGenJS.TableRow {
  if (node.type !== "TableRow") {
    throw new Error(`Table children must be TableRow nodes. Got ${node.type}.`);
  }

  const props = node.props as TableRowProps;
  return cloneForPptx(props.cells ?? elementChildren(node).map(resolveTableCellNode));
}

function resolveTableCellNode(node: PptxNode): PptxGenJS.TableCell {
  if (node.type !== "TableCell") {
    throw new Error(`TableRow children must be TableCell nodes. Got ${node.type}.`);
  }

  const props = node.props as TableCellProps;
  return {
    text: cloneForPptx(props.text ?? resolveTextContent(node)),
    options: mergeOptions(props.options, props),
  };
}

function resolveMasterProps(node: PptxNode): PptxGenJS.SlideMasterProps {
  const props = node.props as unknown as MasterProps;
  const { children: _children, objects = [], ...rest } = props;
  const childObjects = elementChildren(node).map(resolveMasterObject);

  return {
    ...rest,
    objects: cloneForPptx([...objects, ...childObjects]),
  };
}

function resolveMasterObject(node: PptxNode): NonNullable<PptxGenJS.SlideMasterProps["objects"]>[number] {
  if (SHAPE_NODE_TYPES.has(node.type)) {
    const props = node.props as ShapeProps;
    const options = mergeOptions(props.options, props, ["shape"]);
    if (props.shape === "rect") {
      return { rect: options };
    }
    if (props.shape === "line") {
      return { line: options };
    }
    throw new Error("Master only supports rect and line shape objects directly. Use the objects prop for other master shapes.");
  }

  switch (node.type) {
    case "Text": {
      const props = node.props as TextProps;
      return { text: { text: resolveTextContent(node, typeof props.text === "string" ? props.text : undefined), options: mergeOptions(props.options, props) } };
    }
    case "Image":
      return { image: mergeOptions((node.props as ImageProps).options, node.props as ImageProps) };
    case "Line":
      return { line: mergeOptions((node.props as LineProps).options, node.props as LineProps) };
    case "LineBetween": {
      const props = node.props as LineBetweenProps;
      const x = Math.min(props.x1, props.x2);
      const y = Math.min(props.y1, props.y2);
      const w = Math.abs(props.x2 - props.x1);
      const h = Math.abs(props.y2 - props.y1);
      return {
        line: {
          ...mergeOptions(props.options, props, ["x1", "y1", "x2", "y2"]),
          x,
          y,
          w,
          h,
          flipH: props.x2 < props.x1,
          flipV: props.y2 < props.y1,
        },
      };
    }
    case "Placeholder": {
      const props = node.props as PlaceholderProps;
      return { placeholder: { options: props.options, text: resolveTextContent(node, props.text) } };
    }
    default:
      throw new Error(`${node.type} is not supported inside Master. Use the objects prop or Raw for advanced master content.`);
  }
}

function collectTextRuns(node: PptxNode): PptxGenJS.TextProps[] | undefined {
  const runs = elementChildren(node)
    .filter((child) => child.type === "TextRun")
    .map((child) => cloneForPptx(child.props as TextRunProps));

  return runs.length > 0 ? runs : undefined;
}

function resolveTextContent(node: PptxNode, explicit?: string): string {
  if (explicit !== undefined) {
    return explicit;
  }

  return node.children
    .filter((child): child is string | number => typeof child === "string" || typeof child === "number")
    .map(String)
    .join("");
}

function elementChildren(node: PptxNode): PptxNode[] {
  return node.children.filter(isPptxNode);
}

function mergeOptions<TOptions extends object, TProps extends object>(
  base: TOptions | undefined,
  props: TProps,
  excludeKeys: readonly string[] = []
): TOptions {
  const result: Record<string, unknown> = cloneForPptx(base ?? {});
  const excluded = new Set(excludeKeys);

  for (const [key, value] of Object.entries(props)) {
    if (!OPTION_CONTROL_KEYS.has(key) && !excluded.has(key) && value !== undefined) {
      result[key] = cloneForPptx(value);
    }
  }

  return result as TOptions;
}

function cloneForPptx<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneForPptx(item)) as T;
  }

  if (value && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value)) {
        result[key] = cloneForPptx(child);
      }
      return result as T;
    }
  }

  return value;
}

function assignIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) {
    target[key] = value;
  }
}
