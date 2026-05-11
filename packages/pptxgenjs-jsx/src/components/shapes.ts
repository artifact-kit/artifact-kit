import { component, shapeComponent } from "./factory";
import type {
  ArcProps,
  ArrowProps,
  BlockArcProps,
  CustomGeometryProps,
  DiamondProps,
  EllipseProps,
  HexagonProps,
  LineBetweenProps,
  LineProps,
  PentagonProps,
  PieShapeProps,
  RectProps,
  RoundRectProps,
  ShapeOptionsProps,
  ShapeProps,
  StarProps,
  TriangleProps,
} from "./types";

export const Shape = component<"Shape", ShapeProps>("Shape");

export const Rect = shapeComponent<RectProps>("Rect", "rect");
export const RoundRect = shapeComponent<RoundRectProps>("RoundRect", "roundRect");
export const Ellipse = shapeComponent<EllipseProps>("Ellipse", "ellipse");
export const Oval = Ellipse;
export const Triangle = shapeComponent<TriangleProps>("Triangle", "triangle");
export const RightTriangle = shapeComponent<TriangleProps>("RightTriangle", "rtTriangle");
export const Diamond = shapeComponent<DiamondProps>("Diamond", "diamond");
export const Pentagon = shapeComponent<PentagonProps>("Pentagon", "pentagon");
export const Hexagon = shapeComponent<HexagonProps>("Hexagon", "hexagon");
export const Star = shapeComponent<StarProps>("Star", "star5");
export const Star4 = shapeComponent<StarProps>("Star4", "star4");
export const Star5 = Star;
export const Star6 = shapeComponent<StarProps>("Star6", "star6");
export const Star8 = shapeComponent<StarProps>("Star8", "star8");
export const Star10 = shapeComponent<StarProps>("Star10", "star10");
export const Line = shapeComponent<LineProps>("Line", "line");
export const LineBetween = component<"LineBetween", LineBetweenProps>("LineBetween");
export const Arc = shapeComponent<ArcProps>("Arc", "arc");
export const BlockArc = shapeComponent<BlockArcProps>("BlockArc", "blockArc");
export const PieShape = shapeComponent<PieShapeProps>("PieShape", "pie");
export const CustomGeometry = shapeComponent<CustomGeometryProps>("CustomGeometry", "custGeom");

export const LeftArrow = shapeComponent<ArrowProps>("LeftArrow", "leftArrow");
export const RightArrow = shapeComponent<ArrowProps>("RightArrow", "rightArrow");
export const UpArrow = shapeComponent<ArrowProps>("UpArrow", "upArrow");
export const DownArrow = shapeComponent<ArrowProps>("DownArrow", "downArrow");
export const LeftRightArrow = shapeComponent<ArrowProps>("LeftRightArrow", "leftRightArrow");
export const UpDownArrow = shapeComponent<ArrowProps>("UpDownArrow", "upDownArrow");
export const Chevron = shapeComponent<ShapeOptionsProps>("Chevron", "chevron");
export const Cloud = shapeComponent<ShapeOptionsProps>("Cloud", "cloud");
export const Heart = shapeComponent<ShapeOptionsProps>("Heart", "heart");
export const Donut = shapeComponent<ShapeOptionsProps>("Donut", "donut");
export const Plus = shapeComponent<ShapeOptionsProps>("Plus", "plus");
