import type PptxGenJS from "pptxgenjs";
import type { PptxChildren } from "../core";

export type PptxPresentation = PptxGenJS;
export type PptxSlide = PptxGenJS.Slide;

export type DeckProps = {
  /** Presentation title metadata. */
  title?: string;
  /** Presentation author metadata. */
  author?: string;
  /** Presentation company metadata. */
  company?: string;
  /** Presentation subject metadata. */
  subject?: string;
  /** Presentation revision metadata. Must be a whole-number string for PowerPoint compatibility. */
  revision?: string;
  /** Enable right-to-left mode for the whole presentation. */
  rtlMode?: boolean;
  /** Default theme fonts. Maps to `pptx.theme`. */
  theme?: PptxGenJS.ThemeProps;
  /** Built-in layout name or custom layout object. Use `layouts` for additional custom layouts. */
  layout?: string | PptxGenJS.PresLayout;
  /** Additional custom layouts passed to `pptx.defineLayout`. */
  layouts?: PptxGenJS.PresLayout[];
  /** Master slides passed to `pptx.defineSlideMaster`. */
  masters?: PptxGenJS.SlideMasterProps[];
  /** Presentation sections passed to `pptx.addSection`. */
  sections?: PptxGenJS.SectionProps[];
  children?: PptxChildren;
};

export type SlideProps = Partial<Pick<PptxGenJS.PresSlide, "background" | "color" | "hidden" | "slideNumber">> &
  PptxGenJS.AddSlideProps & {
    children?: PptxChildren;
  };

export type LayoutProps = PptxGenJS.PresLayout;

export type SectionProps = PptxGenJS.SectionProps & {
  children?: PptxChildren;
};

export type MasterProps = PptxGenJS.SlideMasterProps & {
  children?: PptxChildren;
};

export type TextRunProps = PptxGenJS.TextProps;

export type TextProps = Omit<PptxGenJS.TextPropsOptions, "children"> & {
  /** Text string passed as first argument to `slide.addText`. Children strings are joined when `text` is omitted. */
  text?: string | PptxGenJS.TextProps[];
  /** Rich text runs passed as first argument to `slide.addText`. Same shape as PptxGenJS `TextProps[]`. */
  runs?: PptxGenJS.TextProps[];
  /** Optional nested `<TextRun />` nodes or plain strings. */
  children?: PptxChildren;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.TextPropsOptions;
};

export type ShapeProps = Omit<PptxGenJS.ShapeProps, "children"> & {
  /** Shape type passed as first argument to `slide.addShape`. Example: `rect`, `ellipse`, `roundRect`, `line`. */
  shape: PptxGenJS.SHAPE_NAME;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.ShapeProps;
};

export type LineProps = Omit<ShapeProps, "shape">;

export type LineBetweenProps = Omit<LineProps, "x" | "y" | "w" | "h" | "flipH" | "flipV"> & {
  /** Start x coordinate in PPT inches. Prefer this for SVG line/path endpoints. */
  x1: number;
  /** Start y coordinate in PPT inches. Prefer this for SVG line/path endpoints. */
  y1: number;
  /** End x coordinate in PPT inches. */
  x2: number;
  /** End y coordinate in PPT inches. */
  y2: number;
};

export type ShapeOptionsProps = Omit<PptxGenJS.ShapeProps, "children"> & {
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.ShapeProps;
};

export type RectProps = ShapeOptionsProps;
export type EllipseProps = ShapeOptionsProps;
export type TriangleProps = ShapeOptionsProps;
export type DiamondProps = ShapeOptionsProps;
export type PentagonProps = ShapeOptionsProps;
export type HexagonProps = ShapeOptionsProps;
export type StarProps = ShapeOptionsProps;
export type ArrowProps = ShapeOptionsProps;

export type RoundRectProps = ShapeOptionsProps & {
  /** Rounded rectangle radius. Valid only for `roundRect`; range 0.0 to 1.0. */
  rectRadius?: number;
};

export type ArcProps = ShapeOptionsProps & {
  /** Arc angle range. Valid for `arc`, `pie`, and `blockArc`; range [0-359, 0-359]. */
  angleRange?: [number, number];
};

export type BlockArcProps = ArcProps & {
  /** Block arc thickness ratio. Valid only for `blockArc`; range 0.0 to 1.0. */
  arcThicknessRatio?: number;
};

export type PieShapeProps = ArcProps;

export type CustomGeometryPoint =
  | { x: PptxGenJS.Coord; y: PptxGenJS.Coord; moveTo?: boolean }
  | { x: PptxGenJS.Coord; y: PptxGenJS.Coord; curve: { type: "arc"; hR: PptxGenJS.Coord; wR: PptxGenJS.Coord; stAng: number; swAng: number } }
  | { x: PptxGenJS.Coord; y: PptxGenJS.Coord; curve: { type: "cubic"; x1: PptxGenJS.Coord; y1: PptxGenJS.Coord; x2: PptxGenJS.Coord; y2: PptxGenJS.Coord } }
  | { x: PptxGenJS.Coord; y: PptxGenJS.Coord; curve: { type: "quadratic"; x1: PptxGenJS.Coord; y1: PptxGenJS.Coord } }
  | { close: true };

export type CustomGeometryProps = ShapeOptionsProps & {
  /**
   * Custom geometry path points passed to PptxGenJS `custGeom`.
   * Convert SVG path commands before passing them here:
   * `M` -> `{ x, y, moveTo:true }`, `L` -> `{ x, y }`, `C` -> cubic curve,
   * `Q` -> quadratic curve, `Z` -> `{ close:true }`.
   * Coordinates are local PPT units inside the custom geometry box, not raw SVG units.
   * For SVG conversion, subtract the path bbox origin, then scale local deltas to inches.
   */
  points: CustomGeometryPoint[];
};

export type ImageProps = PptxGenJS.ImageProps & {
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.ImageProps;
};

export type MediaProps = PptxGenJS.MediaProps & {
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.MediaProps;
};

export type ChartProps = Omit<PptxGenJS.IChartOpts, "children"> & {
  /** Chart type or multi-chart descriptor passed as first argument to `slide.addChart`. */
  type: PptxGenJS.CHART_NAME | PptxGenJS.IChartMulti[];
  /** Chart series data passed as second argument to `slide.addChart`. */
  data: PptxGenJS.OptsChartData[];
  /** Base chart options merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.IChartOpts;
};

export type TypedChartProps = Omit<ChartProps, "type">;
export type AreaChartProps = TypedChartProps;
export type BarChartProps = TypedChartProps;
export type Bar3DChartProps = TypedChartProps;
export type BubbleChartProps = TypedChartProps;
export type DoughnutChartProps = TypedChartProps;
export type LineChartProps = TypedChartProps;
export type PieChartProps = TypedChartProps;
export type RadarChartProps = TypedChartProps;
export type ScatterChartProps = TypedChartProps;

export type TableCellProps = PptxGenJS.TableCellProps & {
  /** Cell text. Children strings are joined when `text` is omitted. */
  text?: string | PptxGenJS.TableCell[];
  children?: PptxChildren;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.TableCellProps;
};

export type TableRowProps = {
  /** Optional direct row data. When omitted, nested `<TableCell />` nodes are collected. */
  cells?: PptxGenJS.TableRow;
  children?: PptxChildren;
};

export type TableProps = Omit<PptxGenJS.TableProps, "children"> & {
  /** Table rows passed as first argument to `slide.addTable`. */
  rows?: PptxGenJS.TableRow[];
  children?: PptxChildren;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.TableProps;
};

export type NotesProps = {
  /** Speaker notes string. Children strings are joined when `text` is omitted. */
  text?: string;
  children?: PptxChildren;
};

export type PlaceholderProps = {
  /** Placeholder options used inside `defineSlideMaster({ objects })`. */
  options: PptxGenJS.PlaceholderProps;
  /** Placeholder text shown until edited. Children strings are joined when `text` is omitted. */
  text?: string;
  children?: PptxChildren;
};

export type TableToSlidesProps = PptxGenJS.TableToSlidesProps & {
  /** HTML table element id passed to `pptx.tableToSlides`. */
  eleId: string;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: PptxGenJS.TableToSlidesProps;
};

export type RawProps = {
  /** Escape hatch for unsupported or newly added PptxGenJS APIs. */
  render: (context: RenderContext) => void | Promise<void>;
};

export type RenderContext = {
  pptx: PptxPresentation;
  slide?: PptxSlide;
  node: import("../core").PptxNode;
};
