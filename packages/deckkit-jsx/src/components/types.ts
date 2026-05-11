import type DeckKit from "@artifact-kit/deckkit";
import type { PptxChildren } from "../core";

export type PptxPresentation = DeckKit;
export type PptxSlide = DeckKit.Slide;

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
  theme?: DeckKit.ThemeProps;
  /** Built-in layout name or custom layout object. Use `layouts` for additional custom layouts. */
  layout?: string | DeckKit.PresLayout;
  /** Additional custom layouts passed to `pptx.defineLayout`. */
  layouts?: DeckKit.PresLayout[];
  /** Master slides passed to `pptx.defineSlideMaster`. */
  masters?: DeckKit.SlideMasterProps[];
  /** Presentation sections passed to `pptx.addSection`. */
  sections?: DeckKit.SectionProps[];
  children?: PptxChildren;
};

export type SlideProps = Partial<Pick<DeckKit.PresSlide, "background" | "color" | "hidden" | "slideNumber">> &
  DeckKit.AddSlideProps & {
    children?: PptxChildren;
  };

export type LayoutProps = DeckKit.PresLayout;

export type SectionProps = DeckKit.SectionProps & {
  children?: PptxChildren;
};

export type MasterProps = DeckKit.SlideMasterProps & {
  children?: PptxChildren;
};

export type TextRunProps = DeckKit.TextProps;

export type TextProps = Omit<DeckKit.TextPropsOptions, "children"> & {
  /** Text string passed as first argument to `slide.addText`. Children strings are joined when `text` is omitted. */
  text?: string | DeckKit.TextProps[];
  /** Rich text runs passed as first argument to `slide.addText`. Same shape as DeckKit `TextProps[]`. */
  runs?: DeckKit.TextProps[];
  /** Optional nested `<TextRun />` nodes or plain strings. */
  children?: PptxChildren;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: DeckKit.TextPropsOptions;
};

export type ShapeProps = Omit<DeckKit.ShapeProps, "children"> & {
  /** Shape type passed as first argument to `slide.addShape`. Example: `rect`, `ellipse`, `roundRect`, `line`. */
  shape: DeckKit.SHAPE_NAME;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: DeckKit.ShapeProps;
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

export type ShapeOptionsProps = Omit<DeckKit.ShapeProps, "children"> & {
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: DeckKit.ShapeProps;
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
  | { x: DeckKit.Coord; y: DeckKit.Coord; moveTo?: boolean }
  | { x: DeckKit.Coord; y: DeckKit.Coord; curve: { type: "arc"; hR: DeckKit.Coord; wR: DeckKit.Coord; stAng: number; swAng: number } }
  | { x: DeckKit.Coord; y: DeckKit.Coord; curve: { type: "cubic"; x1: DeckKit.Coord; y1: DeckKit.Coord; x2: DeckKit.Coord; y2: DeckKit.Coord } }
  | { x: DeckKit.Coord; y: DeckKit.Coord; curve: { type: "quadratic"; x1: DeckKit.Coord; y1: DeckKit.Coord } }
  | { close: true };

export type CustomGeometryProps = ShapeOptionsProps & {
  /**
   * Custom geometry path points passed to DeckKit `custGeom`.
   * Convert SVG path commands before passing them here:
   * `M` -> `{ x, y, moveTo:true }`, `L` -> `{ x, y }`, `C` -> cubic curve,
   * `Q` -> quadratic curve, `Z` -> `{ close:true }`.
   * Coordinates are local PPT units inside the custom geometry box, not raw SVG units.
   * For SVG conversion, subtract the path bbox origin, then scale local deltas to inches.
   */
  points: CustomGeometryPoint[];
};

export type ImageProps = DeckKit.ImageProps & {
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: DeckKit.ImageProps;
};

export type MediaProps = DeckKit.MediaProps & {
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: DeckKit.MediaProps;
};

export type ChartProps = Omit<DeckKit.IChartOpts, "children"> & {
  /** Chart type or multi-chart descriptor passed as first argument to `slide.addChart`. */
  type: DeckKit.CHART_NAME | DeckKit.IChartMulti[];
  /** Chart series data passed as second argument to `slide.addChart`. */
  data: DeckKit.OptsChartData[];
  /** Base chart options merged with top-level option props. Top-level props win. */
  options?: DeckKit.IChartOpts;
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

export type TableCellProps = DeckKit.TableCellProps & {
  /** Cell text. Children strings are joined when `text` is omitted. */
  text?: string | DeckKit.TableCell[];
  children?: PptxChildren;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: DeckKit.TableCellProps;
};

export type TableRowProps = {
  /** Optional direct row data. When omitted, nested `<TableCell />` nodes are collected. */
  cells?: DeckKit.TableRow;
  children?: PptxChildren;
};

export type TableProps = Omit<DeckKit.TableProps, "children"> & {
  /** Table rows passed as first argument to `slide.addTable`. */
  rows?: DeckKit.TableRow[];
  children?: PptxChildren;
  /** Base options object merged with top-level option props. Top-level props win. */
  options?: DeckKit.TableProps;
};

export type NotesProps = {
  /** Speaker notes string. Children strings are joined when `text` is omitted. */
  text?: string;
  children?: PptxChildren;
};

export type PlaceholderProps = {
  /** Placeholder options used inside `defineSlideMaster({ objects })`. */
  options: DeckKit.PlaceholderProps;
  /** Placeholder text shown until edited. Children strings are joined when `text` is omitted. */
  text?: string;
  children?: PptxChildren;
};

export type RawProps = {
  /** Escape hatch for unsupported or newly added DeckKit APIs. */
  render: (context: RenderContext) => void | Promise<void>;
};

export type RenderContext = {
  pptx: PptxPresentation;
  slide?: PptxSlide;
  node: import("../core").PptxNode;
};
