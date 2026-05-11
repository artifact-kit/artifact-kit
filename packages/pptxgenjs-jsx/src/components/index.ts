export type PptxComponentName =
  | "Deck"
  | "Slide"
  | "Layout"
  | "Section"
  | "Master"
  | "Text"
  | "TextRun"
  | "Shape"
  | "Rect"
  | "RoundRect"
  | "Ellipse"
  | "Oval"
  | "Triangle"
  | "RightTriangle"
  | "Diamond"
  | "Pentagon"
  | "Hexagon"
  | "Star"
  | "Star4"
  | "Star5"
  | "Star6"
  | "Star8"
  | "Star10"
  | "Line"
  | "LineBetween"
  | "Arc"
  | "BlockArc"
  | "PieShape"
  | "CustomGeometry"
  | "LeftArrow"
  | "RightArrow"
  | "UpArrow"
  | "DownArrow"
  | "LeftRightArrow"
  | "UpDownArrow"
  | "Chevron"
  | "Cloud"
  | "Heart"
  | "Donut"
  | "Plus"
  | "Image"
  | "Media"
  | "Chart"
  | "AreaChart"
  | "BarChart"
  | "Bar3DChart"
  | "BubbleChart"
  | "DoughnutChart"
  | "LineChart"
  | "PieChart"
  | "RadarChart"
  | "ScatterChart"
  | "Table"
  | "TableRow"
  | "TableCell"
  | "Notes"
  | "Placeholder"
  | "TableToSlides"
  | "Raw";

export * from "./charts";
export * from "./deck";
export * from "./factory";
export * from "./media";
export * from "./presentation-structure";
export * from "./raw";
export * from "./shapes";
export * from "./slide";
export * from "./table";
export * from "./text";
export * from "./types";
