import { isPptxNode, type PptxNode } from "../core";

export type ValidationIssue = {
  code: string;
  message: string;
  path: string;
  level: "error" | "warning";
};

const DECK_CHILDREN = new Set(["Layout", "Master", "Section", "Slide", "Raw", "Fragment"]);
const SECTION_CHILDREN = new Set(["Slide", "Fragment"]);
const SLIDE_CHILDREN = new Set([
  "Text",
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
  "Line",
  "LineBetween",
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
  "Image",
  "Media",
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
  "Table",
  "Notes",
  "Raw",
  "Fragment",
]);
const TABLE_CHILDREN = new Set(["TableRow", "Fragment"]);
const TABLE_ROW_CHILDREN = new Set(["TableCell", "Fragment"]);

export function validateDeck(root: PptxNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (root.type !== "Deck" && root.type !== "Slide") {
    issues.push({
      code: "root.invalid",
      level: "error",
      path: root.type,
      message: `Root must be Deck or Slide, got ${root.type}.`,
    });
  }

  walk(root, root.type);
  return issues;

  function walk(node: PptxNode, path: string): void {
    validateNode(node, path, issues);

    for (const child of node.children) {
      if (!isPptxNode(child)) {
        continue;
      }

      validateParentChild(node, child, `${path}/${child.type}`, issues);
      walk(child, `${path}/${child.type}`);
    }
  }
}

export const validatePptxTree = validateDeck;

function validateParentChild(parent: PptxNode, child: PptxNode, path: string, issues: ValidationIssue[]): void {
  const allowed = allowedChildren(parent.type);
  if (allowed && !allowed.has(child.type)) {
    issues.push({
      code: "child.invalid",
      level: "error",
      path,
      message: `${child.type} is not a valid child of ${parent.type}.`,
    });
  }
}

function validateNode(node: PptxNode, path: string, issues: ValidationIssue[]): void {
  const props = node.props as Record<string, unknown>;

  if (node.type === "RoundRect" && "angleRange" in props) {
    issues.push({
      code: "shape.prop.invalid",
      level: "warning",
      path,
      message: "RoundRect ignores angleRange; use Arc, PieShape, or BlockArc for angle ranges.",
    });
  }

  if ((node.type === "Arc" || node.type === "PieShape") && "arcThicknessRatio" in props) {
    issues.push({
      code: "shape.prop.invalid",
      level: "warning",
      path,
      message: `${node.type} ignores arcThicknessRatio; use BlockArc for arc thickness.`,
    });
  }

  if (node.type === "LineBetween") {
    for (const key of ["x1", "y1", "x2", "y2"]) {
      if (typeof props[key] !== "number" || Number.isNaN(props[key])) {
        issues.push({
          code: "line.endpoint.invalid",
          level: "error",
          path,
          message: `LineBetween requires numeric ${key} in PPT inches.`,
        });
      }
    }
  }

  if (node.type === "CustomGeometry" && (!Array.isArray(props.points) || props.points.length === 0)) {
    issues.push({
      code: "shape.prop.missing",
      level: "error",
      path,
      message: "CustomGeometry requires a non-empty points array.",
    });
  }

  if ((node.type === "Image" || node.type === "Media") && !("path" in props) && !("data" in props) && !("link" in props)) {
    issues.push({
      code: "asset.source.missing",
      level: "warning",
      path,
      message: `${node.type} usually needs path, data, or link.`,
    });
  }
}

function allowedChildren(type: string): Set<string> | undefined {
  switch (type) {
    case "Deck":
      return DECK_CHILDREN;
    case "Section":
      return SECTION_CHILDREN;
    case "Slide":
      return SLIDE_CHILDREN;
    case "Table":
      return TABLE_CHILDREN;
    case "TableRow":
      return TABLE_ROW_CHILDREN;
    default:
      return undefined;
  }
}
