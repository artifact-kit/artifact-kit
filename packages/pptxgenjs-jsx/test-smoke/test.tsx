/** @jsxImportSource @artifact-kit/pptxgenjs-jsx */
import {
  BarChart,
  CustomGeometry,
  Deck,
  Line,
  LineBetween,
  Notes,
  Rect,
  RoundRect,
  Slide,
  Table,
  TableCell,
  TableRow,
  Text,
  TextRun,
  renderPptx,
  validateDeck,
} from "../src";

const deck = (
  <Deck
    title="PptxGenJS JSX Smoke Test"
    author="artifact-kit"
    layout={{ name: "LAYOUT_CUSTOM_WIDE", width: 13.333, height: 7.5 }}
    theme={{ headFontFace: "Aptos Display", bodyFontFace: "Aptos" }}
  >
    <Slide background={{ color: "0B132B" }}>
      <Rect x={0} y={0} w={13.333} h={7.5} fill={{ color: "0B132B" }} line={{ color: "0B132B", transparency: 100 }} />
      <RoundRect x={0.65} y={0.45} w={2.55} h={0.38} rectRadius={0.08} fill={{ color: "00FFCC", transparency: 18 }} line={{ color: "00FFCC", transparency: 100 }} />
      <Text x={0.82} y={0.54} w={2.2} h={0.18} color="FFFFFF" fontSize={10} bold align="center" margin={0}>
        CONFIDENTIAL
      </Text>
      <Text x={0.65} y={1.35} w={5.3} h={1.15} fontFace="Aptos Display" fontSize={44} bold color="FFFFFF" fit="shrink" margin={0}>
        Q1 Business Review
      </Text>
      <Text x={0.68} y={2.8} w={5.55} h={0.9} fontSize={18} color="D8E2DC" breakLine margin={0}>
        <TextRun text="Revenue grew " options={{ color: "D8E2DC" }} />
        <TextRun text="24%" options={{ color: "00FFCC", bold: true }} />
        <TextRun text=" year over year." options={{ color: "D8E2DC" }} />
      </Text>
      <Line x={0.65} y={4.0} w={4.2} h={0} line={{ color: "00FFCC", width: 2, beginArrowType: "none", endArrowType: "triangle" }} />
      <LineBetween x1={5.1} y1={4.05} x2={5.85} y2={3.72} line={{ color: "00FFCC", width: 1.5, endArrowType: "triangle" }} />
      <CustomGeometry
        x={5.2}
        y={3.82}
        w={0.72}
        h={0.36}
        points={[
          { x: 0, y: 0, moveTo: true },
          { x: 55, y: 0 },
          { x: 72, y: 18 },
          { x: 55, y: 36 },
          { x: 0, y: 36 },
          { close: true },
        ]}
        fill={{ color: "00FFCC", transparency: 10 }}
        line={{ color: "00FFCC", width: 1 }}
      />
      <BarChart
        data={[{ name: "Revenue", labels: ["Jan", "Feb", "Mar"], values: [12, 18, 24] }]}
        x={7.1}
        y={0.8}
        w={5.1}
        h={2.45}
        showLegend={false}
        showValue
        valAxisHidden
        catAxisLabelColor="FFFFFF"
        chartColors={["00FFCC"]}
      />
      <Table x={7.1} y={4.05} w={5.0} h={1.25} border={{ type: "solid", color: "243B55", pt: 1 }} color="FFFFFF" fontSize={10}>
        <TableRow>
          <TableCell text="Metric" options={{ bold: true, fill: { color: "1C2541" } }} />
          <TableCell text="Value" options={{ bold: true, fill: { color: "1C2541" } }} />
        </TableRow>
        <TableRow>
          <TableCell text="ARR" />
          <TableCell text="$9.6M" options={{ color: "00FFCC", bold: true }} />
        </TableRow>
      </Table>
      <Notes>Speaker note generated through JSX.</Notes>
    </Slide>
    <Slide background={{ color: "FFFFFF" }}>
      <Text text="Second slide" x={0.7} y={0.7} w={4} h={0.5} fontSize={28} bold color="111827" />
    </Slide>
  </Deck>
);

const issues = validateDeck(deck);
if (issues.some((issue) => issue.level === "error")) {
  console.error(issues);
  throw new Error("Validation failed");
}

console.log(JSON.stringify(deck.toJSON(), null, 2).slice(0, 900));
await renderPptx(deck, { fileName: "pptxgenjs-jsx-smoke.pptx" });
console.log("PptxGenJS JSX smoke test passed");
