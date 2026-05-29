#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const execFileAsync = promisify(execFile);

function usage() {
  console.error([
    "Usage:",
    "  node iconfont-top20-summary.mjs --query 护士 --out /tmp/iconfont-nurse",
    "  node iconfont-top20-summary.mjs <iconfont-search.json> --out /tmp/iconfont-nurse",
    "",
    "Options:",
    "  --query <text>       Query Iconfont API directly. Preferred to avoid placing raw JSON in model context.",
    "  --out <dir>          Directory for raw-response.json, summary.json, candidates/*.svg, contact-sheet.svg.",
    "  --limit <n>          Candidate count, default 20.",
    "  --columns <n>        Contact sheet columns, default 4.",
    "  --cell <n>           Contact sheet cell size, default 360.",
    "  --icon <n>           Contact sheet icon target size, default 230.",
    "  --no-render          Skip best-effort qlmanage PNG render.",
  ].join("\n"));
  process.exit(2);
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function sanitizeFilePart(value) {
  return String(value || "icon").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 80);
}

function extractViewBox(svg) {
  return svg.match(/\bviewBox\s*=\s*"([^"]+)"/i)?.[1] ?? null;
}

function countPaths(svg) {
  return [...svg.matchAll(/<path\b/gi)].length;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function candidateFileName(icon, index) {
  return `${String(index + 1).padStart(2, "0")}-${icon.id}-${sanitizeFilePart(icon.name)}.svg`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function innerSvg(svg) {
  return svg
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
}

function parseViewBox(svg) {
  const viewBox = extractViewBox(svg);
  if (!viewBox) return null;
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) return null;
  return { raw: viewBox, x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
}

async function fetchIconfont(query) {
  const encodedQuery = encodeURIComponent(query);
  const body = `q=${encodedQuery}&sortType=updated_at&page=1&pageSize=20&sType=&fromCollection=-1&complex=1&fills=&ctoken=null`;
  const env = { ...process.env };
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]) {
    delete env[key];
  }
  const { stdout } = await execFileAsync("curl", [
    "-sS",
    "https://www.iconfont.cn/api/icon/search.json",
    "-H",
    "accept: application/json, text/javascript, */*; q=0.01",
    "-H",
    "accept-language: zh-CN,zh;q=0.9",
    "-H",
    "content-type: application/x-www-form-urlencoded; charset=UTF-8",
    "-H",
    "origin: https://www.iconfont.cn",
    "-H",
    `referer: https://www.iconfont.cn/search/index?searchType=icon&q=${encodedQuery}`,
    "-H",
    "x-requested-with: XMLHttpRequest",
    "--data-raw",
    body,
  ], {
    env,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

async function writeContactSheet(icons, outPath, options) {
  const columns = options.columns;
  const cell = options.cell;
  const iconSize = options.icon;
  const rows = Math.ceil(icons.length / columns);
  const width = columns * cell;
  const height = rows * cell;
  let sheet = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  sheet += `  <rect width="${width}" height="${height}" fill="#ffffff"/>\n`;

  for (const [index, icon] of icons.entries()) {
    const svg = typeof icon.show_svg === "string" ? icon.show_svg : "";
    const viewBox = parseViewBox(svg) ?? { raw: "0 0 1024 1024", x: 0, y: 0, w: 1024, h: 1024 };
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * cell;
    const y = row * cell;
    const panelPad = Math.round(cell * 0.055);
    const labelHeight = Math.round(cell * 0.18);
    const panelSize = cell - panelPad * 2;
    const scale = Math.min(iconSize / viewBox.w, iconSize / viewBox.h);
    const tx = x + cell / 2 - (viewBox.w * scale) / 2;
    const ty = y + panelPad + (panelSize - labelHeight - viewBox.h * scale) / 2;
    const label = `${index + 1}. ${icon.name ?? "icon"} ${icon.id ?? ""}`.trim();

    sheet += `  <rect x="${x + panelPad}" y="${y + panelPad}" width="${panelSize}" height="${panelSize}" rx="16" fill="#ffffff" stroke="#d9e2ef" stroke-width="2"/>\n`;
    sheet += `  <g transform="translate(${tx} ${ty}) scale(${scale})">\n`;
    sheet += `    <svg width="${viewBox.w}" height="${viewBox.h}" viewBox="${escapeXml(viewBox.raw)}" xmlns="http://www.w3.org/2000/svg">\n`;
    sheet += `      ${innerSvg(svg)}\n`;
    sheet += "    </svg>\n";
    sheet += "  </g>\n";
    sheet += `  <text x="${x + cell / 2}" y="${y + cell - panelPad - 32}" font-family="Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#1d2b4f">${escapeXml(label)}</text>\n`;
    sheet += `  <text x="${x + cell / 2}" y="${y + cell - panelPad - 8}" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="#52627a">${escapeXml(icon.font_class ?? "")}</text>\n`;
  }

  sheet += "</svg>\n";
  await writeFile(outPath, sheet, "utf8");
}

async function renderContactSheetPng(svgPath, outDir, size) {
  try {
    await execFileAsync("qlmanage", [
      "-t",
      "-s",
      String(size),
      "-o",
      outDir,
      svgPath,
    ], {
      maxBuffer: 2 * 1024 * 1024,
    });
    return path.join(outDir, `${path.basename(svgPath)}.png`);
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
const query = argValue(args, "--query");
const valueOptions = new Set(["--query", "--out", "--limit", "--columns", "--cell", "--icon"]);
const positional = [];
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (valueOptions.has(arg)) {
    index += 1;
    continue;
  }
  if (!arg.startsWith("--")) positional.push(arg);
}
const inputPath = positional[0];
const outDir = argValue(args, "--out") ?? (query ? path.resolve(process.cwd(), `iconfont-${sanitizeFilePart(query)}`) : undefined);
const limit = Number.parseInt(argValue(args, "--limit") ?? "20", 10);
const columns = Number.parseInt(argValue(args, "--columns") ?? "4", 10);
const cell = Number.parseInt(argValue(args, "--cell") ?? "360", 10);
const icon = Number.parseInt(argValue(args, "--icon") ?? "230", 10);
const shouldRender = !args.includes("--no-render");
if (!Number.isFinite(limit) || limit <= 0) usage();
if (!Number.isFinite(columns) || columns <= 0 || !Number.isFinite(cell) || cell <= 0 || !Number.isFinite(icon) || icon <= 0) {
  usage();
}
if (!query && (!inputPath || inputPath.startsWith("--"))) usage();

const raw = query ? await fetchIconfont(query) : await readFile(inputPath, "utf8");
const parsed = JSON.parse(raw);
const icons = Array.isArray(parsed?.data?.icons) ? parsed.data.icons : [];
const top = icons.slice(0, limit).map((icon, index) => {
  const showSvg = typeof icon.show_svg === "string" ? icon.show_svg : "";
  const fileName = candidateFileName(icon, index);
  return {
    rank: index + 1,
    id: icon.id,
    name: icon.name,
    font_class: icon.font_class,
    width: icon.width,
    height: icon.height,
    fills: icon.fills,
    preview_image: icon.preview_image,
    viewBox: extractViewBox(showSvg),
    pathCount: countPaths(showSvg),
    showSvgLength: showSvg.length,
    showSvgSha256: showSvg ? sha256(showSvg) : null,
    candidateFile: outDir ? path.join("candidates", fileName) : null,
    candidateSvgPath: outDir ? path.join(outDir, "candidates", fileName) : null,
  };
});

const summary = {
  query,
  code: parsed?.code,
  count: parsed?.data?.count,
  responseShape: "code + data.icons[] + data.count; each icon may include id/name/font_class/width/height/fills/preview_image/show_svg",
  icons: top,
};

if (outDir) {
  await mkdir(outDir, { recursive: true });
  const candidatesDir = path.join(outDir, "candidates");
  await mkdir(candidatesDir, { recursive: true });
  await writeFile(path.join(outDir, "raw-response.json"), raw, "utf8");
  await writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  for (const [index, icon] of icons.slice(0, limit).entries()) {
    if (typeof icon.show_svg !== "string" || !icon.show_svg.trim()) continue;
    const fileName = candidateFileName(icon, index);
    await writeFile(path.join(candidatesDir, fileName), icon.show_svg, "utf8");
  }
  const contactSheetPath = path.join(outDir, "contact-sheet.svg");
  await writeContactSheet(icons.slice(0, limit), contactSheetPath, { columns, cell, icon });
  const renderedPngPath = shouldRender
    ? await renderContactSheetPng(contactSheetPath, outDir, Math.max(1000, columns * cell))
    : null;
  console.log(JSON.stringify({
    query,
    summaryPath: path.join(outDir, "summary.json"),
    rawResponsePath: path.join(outDir, "raw-response.json"),
    candidatesDir,
    contactSheetPath,
    renderedPngPath,
    candidates: top.map(({ rank, id, name, font_class, viewBox, pathCount, showSvgSha256, candidateSvgPath }) => ({
      rank,
      id,
      name,
      font_class,
      viewBox,
      pathCount,
      showSvgSha256,
      candidateSvgPath,
    })),
  }, null, 2));
} else {
  console.log(JSON.stringify(summary, null, 2));
}
