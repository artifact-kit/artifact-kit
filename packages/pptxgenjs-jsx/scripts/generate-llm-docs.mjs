import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const pptxTypesPath = path.join(root, "node_modules/pptxgenjs/types/index.d.ts");
const manifestTsPath = path.join(root, "src/schema/component-manifest.ts");

const paths = {
  manifestJson: path.join(root, "component-manifest.json"),
  readme: path.join(root, "README.md"),
  llms: path.join(root, "llms.txt"),
  llmDir: path.join(root, "docs/llm"),
  referenceDir: path.join(root, "docs/reference"),
};

const commonInterfaceNames = [
  "PositionProps",
  "DataOrPathProps",
  "BackgroundProps",
  "BorderProps",
  "HyperlinkProps",
  "ShadowProps",
  "ShapeFillProps",
  "ShapeLineProps",
  "TextBaseProps",
  "ThemeProps",
  "ImageProps",
  "MediaProps",
  "TableCellProps",
  "TableProps",
  "TextPropsOptions",
  "TextProps",
  "WriteProps",
  "WriteFileProps",
  "SectionProps",
  "PresLayout",
  "SlideNumberProps",
  "SlideMasterProps",
  "AddSlideProps",
  "PresentationProps",
];

const chartInterfaceNames = [
  "OptsChartData",
  "OptsChartGridLine",
  "IChartMulti",
  "IChartPropsFillLine",
  "IChartAreaProps",
  "IChartPropsBase",
  "IChartPropsAxisCat",
  "IChartPropsAxisSer",
  "IChartPropsAxisVal",
  "IChartPropsChartBar",
  "IChartPropsChartDoughnut",
  "IChartPropsChartLine",
  "IChartPropsChartPie",
  "IChartPropsChartRadar",
  "IChartPropsDataLabel",
  "IChartPropsDataTable",
  "IChartPropsLegend",
  "IChartPropsTitle",
  "IChartOpts",
];

const shapeInterfaceNames = ["ShapeProps", "ShapeFillProps", "ShapeLineProps", "ShadowProps", "HyperlinkProps"];

const allInterfaceNames = [
  ...commonInterfaceNames,
  "PlaceholderProps",
  "ObjectNameProps",
  "TableToSlidesProps",
  "TableCell",
  "TextGlowProps",
  ...chartInterfaceNames,
];

const aliasNames = [
  "CHART_NAME",
  "SHAPE_NAME",
  "Coord",
  "HexColor",
  "ThemeColor",
  "Color",
  "Margin",
  "HAlign",
  "VAlign",
  "MediaType",
  "PLACEHOLDER_TYPE",
  "WRITE_OUTPUT_TYPE",
  "JSZIP_OUTPUT_TYPE",
  "ChartAxisTickMark",
  "ChartLineCap",
];

await fs.mkdir(paths.llmDir, { recursive: true });
await fs.mkdir(paths.referenceDir, { recursive: true });

const manifest = await loadManifest();
const upstream = parsePptxTypes(await fs.readFile(pptxTypesPath, "utf8"));

await fs.writeFile(paths.manifestJson, `${JSON.stringify(manifest, null, 2)}\n`);
await fs.writeFile(paths.readme, buildReadme());
await fs.writeFile(paths.llms, buildLlmsTxt());
await fs.writeFile(path.join(paths.llmDir, "quickstart.md"), buildLlmQuickstart(manifest));
await fs.writeFile(path.join(paths.llmDir, "component-selection.md"), buildComponentSelection(manifest));
await fs.writeFile(path.join(paths.referenceDir, "common-props.md"), buildReference("Common Props", commonInterfaceNames, upstream));
await fs.writeFile(path.join(paths.referenceDir, "chart-props.md"), buildReference("Chart Props", chartInterfaceNames, upstream, ["CHART_NAME", "ChartAxisTickMark", "ChartLineCap"]));
await fs.writeFile(path.join(paths.referenceDir, "shape-props.md"), buildShapeReference(upstream));
await fs.writeFile(path.join(paths.referenceDir, "all-upstream-props.md"), buildReference("All Upstream Props", allInterfaceNames, upstream, aliasNames));

async function loadManifest() {
  const source = await fs.readFile(manifestTsPath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      verbatimModuleSyntax: false,
    },
  }).outputText;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  return mod.componentManifest;
}

function parsePptxTypes(sourceText) {
  const sourceFile = ts.createSourceFile(pptxTypesPath, sourceText, ts.ScriptTarget.Latest, true);
  const interfaces = new Map();
  const aliases = new Map();

  function visit(node) {
    if (ts.isInterfaceDeclaration(node)) {
      interfaces.set(node.name.text, parseInterface(node, sourceFile));
    } else if (ts.isTypeAliasDeclaration(node)) {
      aliases.set(node.name.text, {
        name: node.name.text,
        type: cleanType(node.type.getText(sourceFile)),
        comment: cleanComment(readJsDoc(node)),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { interfaces, aliases };
}

function parseInterface(node, sourceFile) {
  return {
    name: node.name.text,
    extends: node.heritageClauses?.flatMap((clause) => clause.types.map((type) => type.expression.getText(sourceFile))) ?? [],
    comment: cleanComment(readJsDoc(node)),
    props: node.members.filter(ts.isPropertySignature).map((member) => ({
      name: member.name.getText(sourceFile).replace(/^['"]|['"]$/g, ""),
      optional: Boolean(member.questionToken),
      type: cleanType(member.type?.getText(sourceFile) ?? "unknown"),
      comment: cleanComment(readJsDoc(member)) || "PptxGenJS upstream option.",
    })),
  };
}

function readJsDoc(node) {
  const ranges = ts.getJSDocCommentsAndTags(node);
  if (ranges.length === 0) return "";
  return ranges.map((range) => range.getText()).join("\n");
}

function cleanComment(text) {
  return text
    .replace(/\/\*\*|\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line && !line.startsWith("@source") && !line.startsWith("@code"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanType(text) {
  return text.replace(/\s+/g, " ").replace(/\s*([|&<>{}()[\],:;])\s*/g, "$1");
}

function buildReadme() {
  return `# @artifact-kit/pptxgenjs-jsx

Write editable PowerPoint decks as JSX. Recreate rendered HTML and SVG as native \`.pptx\` objects when a screenshot is not good enough.

This package wraps [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) with an LLM-friendly component model:

- Describe a deck as a readable tree: \`<Deck><Slide><Text /></Slide></Deck>\`.
- Use dedicated components for text, shapes, images, tables, charts, lines, and raw PptxGenJS escape hatches.
- Validate the structure before writing a file.
- In browser workflows, measure real DOM nodes and map them into PowerPoint coordinates.
- Export editable PowerPoint objects instead of flattening a page into one bitmap.

## What It Can Produce

The attention example is the clearest proof in this repo. It starts with a 1600x900 HTML/Tailwind/SVG lecture slide, measures the rendered DOM in the browser, then rebuilds the slide as editable PowerPoint text, shapes, lines, arrows, chart objects, and diagram parts.

Source HTML:

![Source HTML slide](assets/proof/01-source-html.png)

Generated PPTX preview:

![Generated PPTX preview](assets/proof/02-generated-pptx-preview.png)

Editable native PowerPoint objects:

![Editable native PowerPoint objects](assets/proof/03-editable-native-objects.png)

Open the exporter at [examples/attention/exporter.html](examples/attention/exporter.html). It exercises DOM measurement, SVG primitive mapping, \`LineBetween\`, \`CustomGeometry\`, native chart output, validation, and browser download behavior.

## Install

\`\`\`bash
pnpm add @artifact-kit/pptxgenjs-jsx
\`\`\`

## Basic Usage

Use JSX when you already know the slide structure and coordinates:

\`\`\`tsx
/** @jsxImportSource @artifact-kit/pptxgenjs-jsx */
import { BarChart, Deck, RoundRect, Slide, Text, renderPptx, validateDeck } from "@artifact-kit/pptxgenjs-jsx";

const deck = (
  <Deck title="Q1 Review" layout={{ name: "WIDE", width: 13.333, height: 7.5 }}>
    <Slide background={{ color: "FFFFFF" }}>
      <RoundRect x={0.7} y={0.6} w={3.8} h={0.6} fill={{ color: "EEF2FF" }} />
      <Text x={0.9} y={0.78} w={3.4} h={0.3} fontSize={18} bold>Q1 Review</Text>
      <BarChart data={[{ name: "Revenue", labels: ["Jan", "Feb", "Mar"], values: [12, 18, 24] }]} x={6.5} y={1} w={5.5} h={3} />
    </Slide>
  </Deck>
);

const issues = validateDeck(deck);
if (issues.some((issue) => issue.level === "error")) throw new Error(JSON.stringify(issues, null, 2));
await renderPptx(deck, { fileName: "q1-review.pptx" });
\`\`\`

If you do not want a JSX transform, use \`pptxElement(Component, props, ...children)\`.

## HTML to Editable PPTX

For local tools and agent-generated exporters, you can write JSX directly in the browser with the IIFE build plus Babel Standalone. This is useful when the source of truth is a rendered HTML page, dashboard, report, or slide-like document.

The workflow is:

1. Keep the source HTML clean.
2. Copy it into an exporter page.
3. Make every slide/page visible in one vertical document.
4. Add \`data-ak-slide\`, \`data-ak-width\`, \`data-ak-height\`, \`data-ak-px-per-in\`, and \`data-ak-measure\` markers.
5. On export, call \`measureArtifacts({ document })\`.
6. Use \`readSlideLayout()\`, \`readPptBox()\`, and \`readFontPt()\` to place native PowerPoint objects.
7. Run \`validateDeck()\`, then \`renderPptx()\`.

Minimal browser pattern:

\`\`\`html
<script src="https://unpkg.com/@artifact-kit/pptxgenjs-jsx/dist/pptxgenjs-jsx.browser.iife.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" data-presets="typescript,react">
  /** @jsx pptxElement */
  const {
    Deck,
    Slide,
    Text,
    measureArtifacts,
    pptxElement,
    readFontPt,
    readPptBox,
    readSlideLayout,
    renderPptx,
    validateDeck,
  } = window.ArtifactKitPptxGenJsx;

  document.querySelector("#export-pptx").addEventListener("click", async () => {
    await measureArtifacts({ document });

    const deck = (
      <Deck title="Measured deck" layout={readSlideLayout("slide-1")}>
        <Slide background={{ color: "FFFFFF" }}>
          <Text {...readPptBox("title-1")} fontSize={readFontPt("title-1")} bold margin={0}>
            {document.querySelector('[data-ak-measure="title-1"]').textContent.trim()}
          </Text>
        </Slide>
      </Deck>
    );

    const issues = validateDeck(deck);
    if (issues.some((issue) => issue.level === "error")) throw new Error(JSON.stringify(issues, null, 2));
    await renderPptx(deck, { fileName: "measured-export.pptx" });
  });
</script>
\`\`\`

See [examples/browser-jsx.html](examples/browser-jsx.html) for a small browser example and [examples/attention/exporter.html](examples/attention/exporter.html) for the full measure-first HTML-to-PPTX example.

## When To Use It

Use this package when you need:

- Editable PowerPoint files generated from TypeScript, browser tools, or agent-authored code.
- A declarative surface that is easier for LLMs to write and review than ordered imperative calls.
- Native charts, tables, shapes, images, text runs, lines, and custom geometry.
- HTML-to-PPTX reconstruction where layout comes from real browser measurement.
- Machine-readable docs and a component manifest for coding agents.

Do not use it when a single screenshot image is the intended final artifact. This package is most valuable when the generated deck must remain editable.

## Documentation Layout

This repo is organized for both humans and agents:

- [llms.txt](llms.txt): load order and retrieval hints for coding agents.
- [docs/llm/quickstart.md](docs/llm/quickstart.md): default LLM context, always useful.
- [docs/llm/component-selection.md](docs/llm/component-selection.md): component choice table.
- [docs/reference/common-props.md](docs/reference/common-props.md): common PptxGenJS props for text, images, tables, slides, and output.
- [docs/reference/shape-props.md](docs/reference/shape-props.md): shape props and the full shape-name list.
- [docs/reference/chart-props.md](docs/reference/chart-props.md): chart data, axis, label, legend, and style props.
- [docs/reference/all-upstream-props.md](docs/reference/all-upstream-props.md): complete generated upstream reference.
- [docs/measure-contract.md](docs/measure-contract.md): browser DOM measurement contract for HTML-to-PPTX workflows.
- [component-manifest.json](component-manifest.json): machine-readable component manifest.

## Build Outputs

| Output | File |
| :-- | :-- |
| Node ESM | \`dist/pptxgenjs-jsx.es.js\` |
| Node CJS | \`dist/pptxgenjs-jsx.cjs\` |
| Browser ESM | \`dist/pptxgenjs-jsx.browser.es.js\` |
| Browser IIFE | \`dist/pptxgenjs-jsx.browser.iife.js\` global \`ArtifactKitPptxGenJsx\` |

## Development

\`\`\`bash
pnpm install
pnpm docs:generate
pnpm test
pnpm test:attention
\`\`\`
`;
}

function buildLlmsTxt() {
  return `# @artifact-kit/pptxgenjs-jsx LLM Loading Guide

Always load:
- docs/llm/quickstart.md
- component-manifest.json

Load when choosing components:
- docs/llm/component-selection.md

Load on demand:
- docs/reference/common-props.md for normal slides, text, image, table, media, deck, and write options.
- docs/reference/shape-props.md when using Shape or uncommon shapes.
- docs/reference/chart-props.md when using charts.
- docs/measure-contract.md when recreating rendered HTML and reading exact DOM-derived x/y/w/h values.
- docs/reference/all-upstream-props.md only when common/chart/shape docs are insufficient.

Generation rule:
Prefer dedicated components. Use generic Shape, Chart, or Raw only to unlock an upstream PptxGenJS feature that has no dedicated component.
`;
}

function buildLlmQuickstart(manifest) {
  const coreComponents = manifest.components
    .filter((component) => ["root", "structure", "text", "media", "table"].includes(component.category))
    .map((component) => `- \`${component.name}\`: ${component.useWhen}`)
    .join("\n");

  return `# LLM Quickstart

This is the default context agents should read before writing code with \`@artifact-kit/pptxgenjs-jsx\`.

## Core Rules

1. Use TSX with \`/** @jsxImportSource @artifact-kit/pptxgenjs-jsx */\`.
2. Prefer dedicated components: \`RoundRect\`, \`BarChart\`, \`TableCell\`, etc.
3. Use PptxGenJS prop names exactly: \`x\`, \`y\`, \`w\`, \`h\`, \`fill\`, \`line\`, \`fontFace\`, \`fontSize\`, \`chartColors\`.
4. Coordinates are PptxGenJS inches or percentages, not CSS pixels.
5. Use hex colors without \`#\`.
6. Run \`validateDeck(deck)\` before \`renderPptx(deck)\`.
7. Use \`Shape\`, \`Chart\`, or \`Raw\` as escape hatches when dedicated components do not cover an upstream feature.
8. When recreating HTML/SVG, derive inches from source dimensions with explicit formulas such as \`const inch = (px) => px / 120\`; do not invent approximate coordinates.

## Common Components

${coreComponents}

## Basic TSX Example

\`\`\`tsx
/** @jsxImportSource @artifact-kit/pptxgenjs-jsx */
import { Deck, Slide, Text, RoundRect, validateDeck, renderPptx } from "@artifact-kit/pptxgenjs-jsx";

const deck = (
  <Deck title="Example" layout={{ name: "WIDE", width: 13.333, height: 7.5 }}>
    <Slide background={{ color: "FFFFFF" }}>
      <RoundRect x={1} y={1} w={4} h={0.8} rectRadius={0.08} fill={{ color: "EEF2FF" }} />
      <Text x={1.2} y={1.22} w={3.5} h={0.35} fontSize={18} color="111827" bold>Hello PPTX</Text>
    </Slide>
  </Deck>
);

const issues = validateDeck(deck);
if (issues.some((issue) => issue.level === "error")) throw new Error(JSON.stringify(issues, null, 2));
await renderPptx(deck, { fileName: "example.pptx" });
\`\`\`

## Browser JSX With Babel Standalone

For local workflows, HTML can import Babel Standalone and write JSX directly. Use Babel's classic JSX runtime with \`/** @jsx pptxElement */\`, then import \`pptxElement\` from this package. Do not use \`h\` as the JSX factory in deck code because PptxGenJS uses \`h\` for height props and local helper parameters often shadow it. See \`examples/browser-jsx.html\`.

## No JSX Transform

\`\`\`ts
import { Deck, Slide, Text, pptxElement, renderPptx } from "@artifact-kit/pptxgenjs-jsx";

const deck = pptxElement(Deck, { title: "No JSX" },
  pptxElement(Slide, { background: { color: "FFFFFF" } },
    pptxElement(Text, { text: "Hello", x: 1, y: 1, w: 4, h: 0.5 })
  )
);

await renderPptx(deck, { fileName: "no-jsx.pptx" });
\`\`\`
`;
}

function buildComponentSelection(manifest) {
  const componentsByCategory = groupBy(manifest.components, (component) => component.category);
  return `# Component Selection

${Object.entries(componentsByCategory)
  .map(([category, components]) => renderComponentCategory(category, components))
  .join("\n\n")}
`;
}

function buildReference(title, interfaceNames, upstream, aliasList = []) {
  const aliases = aliasList.map((name) => renderAlias(upstream.aliases.get(name))).filter(Boolean).join("\n\n");
  const interfaces = interfaceNames.map((name) => renderInterface(upstream.interfaces.get(name))).filter(Boolean).join("\n\n");
  return `# ${title}

Generated from \`pptxgenjs/types/index.d.ts\`.

${aliases ? `## Type Aliases\n\n${aliases}\n\n` : ""}## Interfaces

${interfaces}
`;
}

function buildShapeReference(upstream) {
  return `# Shape Props

Use dedicated shape components when available. Use \`<Shape shape="VALUE" ... />\` for every other PptxGenJS shape.

## Dedicated Shape Components

- \`Rect\`
- \`RoundRect\`
- \`Ellipse\` / \`Oval\`
- \`Line\`
- \`LineBetween\`
- \`Arc\`
- \`BlockArc\`
- \`PieShape\`
- \`CustomGeometry\`
- \`Triangle\`
- \`RightTriangle\`
- \`Diamond\`
- \`Pentagon\`
- \`Hexagon\`
- \`Star\`, \`Star4\`, \`Star5\`, \`Star6\`, \`Star8\`, \`Star10\`
- \`LeftArrow\`, \`RightArrow\`, \`UpArrow\`, \`DownArrow\`, \`LeftRightArrow\`, \`UpDownArrow\`
- \`Chevron\`, \`Cloud\`, \`Heart\`, \`Donut\`, \`Plus\`

## Wrapper-Specific Shape Props

${buildWrapperShapeProps()}

## Shape Type Alias

${renderAlias(upstream.aliases.get("SHAPE_NAME"))}

## Full Shape List

${renderShapeList(upstream.aliases.get("SHAPE_NAME"))}

## Shape Interfaces

${shapeInterfaceNames.map((name) => renderInterface(upstream.interfaces.get(name))).filter(Boolean).join("\n\n")}
`;
}

function buildWrapperShapeProps() {
  return `### \`RoundRectProps\`

Extends: \`ShapeProps\`.

| Prop | Type | Comment |
| :-- | :-- | :-- |
| \`rectRadius?\` | \`number\` | Rounded rectangle radius. Valid only for \`roundRect\`; range 0.0 to 1.0. |

### \`ArcProps\`

Extends: \`ShapeProps\`.

| Prop | Type | Comment |
| :-- | :-- | :-- |
| \`angleRange?\` | \`[number, number]\` | Arc angle range. Valid for \`arc\`, \`pie\`, and \`blockArc\`; range [0-359, 0-359]. |

### \`BlockArcProps\`

Extends: \`ArcProps\`.

| Prop | Type | Comment |
| :-- | :-- | :-- |
| \`arcThicknessRatio?\` | \`number\` | Block arc thickness ratio. Valid only for \`blockArc\`; range 0.0 to 1.0. |

### \`CustomGeometryProps\`

Extends: \`ShapeProps\`.

| Prop | Type | Comment |
| :-- | :-- | :-- |
| \`points\` | \`CustomGeometryPoint[]\` | Required custom geometry path points passed to PptxGenJS \`custGeom\`. Coordinates are local PPT units inside the custom geometry box, not raw SVG units. |

\`\`\`ts
type CustomGeometryPoint =
  | { x: Coord; y: Coord; moveTo?: boolean }
  | { x: Coord; y: Coord; curve: { type: "cubic"; x1: Coord; y1: Coord; x2: Coord; y2: Coord } }
  | { x: Coord; y: Coord; curve: { type: "quadratic"; x1: Coord; y1: Coord } }
  | { x: Coord; y: Coord; curve: { type: "arc"; hR: Coord; wR: Coord; stAng: number; swAng: number } }
  | { close: true };
\`\`\`

SVG conversion rule:

1. Compute the source SVG element's absolute pixel box from DOM/CSS/source attributes.
2. Convert the path bounding box to slide PPT inches with formulas: \`x = inch(svgLeftPx + pathBBox.x * svgScaleX)\`, \`y = inch(svgTopPx + pathBBox.y * svgScaleY)\`, \`w = inch(pathBBox.width * svgScaleX)\`, \`h = inch(pathBBox.height * svgScaleY)\`.
3. Convert path coordinates into local PPT inches by subtracting the path bbox origin, applying the SVG render scale, then applying \`inch(...)\`. For example SVG \`M 140 40 L 180 60\` with \`pathBBox.x = 120\`, \`pathBBox.y = 30\`, \`svgScaleX = 0.5\`, and \`svgScaleY = 0.5\` becomes \`[{ x: inch(20 * 0.5), y: inch(10 * 0.5), moveTo: true }, { x: inch(60 * 0.5), y: inch(30 * 0.5) }]\`.
4. Map SVG commands: \`M\` -> \`moveTo\`, \`L/H/V\` -> line points, \`C\` -> cubic curve, \`Q\` -> quadratic curve, \`Z\` -> \`{ close: true }\`. Use native \`LineBetween\`, \`Rect\`, \`Ellipse\`, and arrow shapes for simpler primitives.

### \`LineBetweenProps\`

Extends: \`LineProps\` but replaces \`x/y/w/h\` with endpoints.

| Prop | Type | Comment |
| :-- | :-- | :-- |
| \`x1\` | \`number\` | Start x coordinate in PPT inches. |
| \`y1\` | \`number\` | Start y coordinate in PPT inches. |
| \`x2\` | \`number\` | End x coordinate in PPT inches. |
| \`y2\` | \`number\` | End y coordinate in PPT inches. |

Use \`LineBetween\` for SVG line/path endpoint conversion. It computes positive \`x/y/w/h\` plus \`flipH/flipV\` internally, so diagonal and vertical arrows keep the same direction as the source. Raw \`Line\` expects PowerPoint's shape box model; passing \`w = x2 - x1\` and \`h = y2 - y1\` can reverse arrows or create invalid negative extents.`;
}

function renderComponentCategory(category, components) {
  return `## ${titleCase(category)} Components\n\n| Component | Maps to | Use when | Props interface |\n| :-- | :-- | :-- | :-- |\n${components
    .map((component) => `| \`${component.name}\` | \`${component.mapsTo}\` | ${escapeCell(component.useWhen)} | \`${component.propsInterface}\` |`)
    .join("\n")}`;
}

function renderAlias(alias) {
  if (!alias) return "";
  return `### \`${alias.name}\`\n\n\`\`\`ts\ntype ${alias.name} = ${alias.type}\n\`\`\``;
}

function renderInterface(item) {
  if (!item) return "";
  const extendsText = item.extends.length > 0 ? ` Extends: ${item.extends.map((name) => `\`${name}\``).join(", ")}.` : "";
  const rows = item.props.length
    ? item.props
        .map((prop) => `| \`${prop.name}${prop.optional ? "?" : ""}\` | \`${escapeCode(prop.type)}\` | ${escapeCell(prop.comment)} |`)
        .join("\n")
    : "| none | none | No direct props. |";

  return `### \`${item.name}\`\n\n${item.comment ? `${item.comment}\n\n` : ""}${extendsText}\n\n| Prop | Type | Comment |\n| :-- | :-- | :-- |\n${rows}`;
}

function renderShapeList(alias) {
  if (!alias) return "";
  const values = [...alias.type.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const rows = [];
  for (let index = 0; index < values.length; index += 4) {
    rows.push(`| ${values.slice(index, index + 4).map((value) => `\`${value}\``).join(" | ")} |`);
  }
  return `| Shape values |\n| :-- |\n${rows.join("\n")}`;
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function titleCase(value) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeCode(value) {
  return escapeCell(value).replace(/`/g, "\\`");
}
