#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function usage() {
  console.error([
    "Usage:",
    "  node svg-contact-sheet.mjs --manifest manifests/svg-assets.json --out preview/svg-assets/contact-sheet.svg",
    "  node svg-contact-sheet.mjs --out preview/contact-sheet.svg svg/a.svg svg/b.svg",
  ].join("\n"));
  process.exit(2);
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseViewBox(svg) {
  const match = svg.match(/\bviewBox\s*=\s*"([^"]+)"/i);
  if (!match) return null;
  const parts = match[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) return null;
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3], raw: match[1] };
}

function innerSvg(svg) {
  return svg
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
}

function hasExternalDependency(svg) {
  return (
    /<script\b/i.test(svg) ||
    /\bfile:\/\//i.test(svg) ||
    /url\(\s*["']?https?:\/\//i.test(svg) ||
    /\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)
  );
}

async function readManifestAssets(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.assets)) throw new Error(`Manifest has no assets array: ${manifestPath}`);
  const baseDir = path.dirname(path.resolve(manifestPath, ".."));
  return manifest.assets
    .filter((asset) => typeof asset.svgPath === "string")
    .map((asset) => ({
      label: asset.elementId ?? path.basename(asset.svgPath),
      filePath: path.isAbsolute(asset.svgPath) ? asset.svgPath : path.resolve(baseDir, asset.svgPath),
    }));
}

const args = process.argv.slice(2);
const manifestPath = argValue(args, "--manifest");
const outPath = argValue(args, "--out");
const columns = Number.parseInt(argValue(args, "--columns") ?? "2", 10);
const cell = Number.parseInt(argValue(args, "--cell") ?? "500", 10);
const icon = Number.parseInt(argValue(args, "--icon") ?? "310", 10);
if (!outPath || !Number.isFinite(columns) || !Number.isFinite(cell) || !Number.isFinite(icon)) usage();

const positional = args.filter((arg, index) => {
  const previous = args[index - 1];
  return !arg.startsWith("--") && !["--manifest", "--out", "--columns", "--cell", "--icon"].includes(previous);
});
let assets = manifestPath
  ? await readManifestAssets(manifestPath)
  : positional.map((filePath) => ({ label: path.basename(filePath, ".svg"), filePath: path.resolve(filePath) }));
if (assets.length === 0) usage();

const rows = Math.ceil(assets.length / columns);
const width = columns * cell;
const height = rows * cell;
const labelHeight = Math.max(44, Math.round(cell * 0.13));
let sheet = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
sheet += `  <rect width="${width}" height="${height}" fill="#ffffff"/>\n`;

for (const [index, asset] of assets.entries()) {
  const raw = await readFile(asset.filePath, "utf8");
  if (hasExternalDependency(raw)) throw new Error(`SVG has external dependency: ${asset.filePath}`);
  const viewBox = parseViewBox(raw) ?? { x: 0, y: 0, w: 24, h: 24, raw: "0 0 24 24" };
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x = col * cell;
  const y = row * cell;
  const panelPad = Math.round(cell * 0.06);
  const panelSize = cell - panelPad * 2;
  const scale = Math.min(icon / viewBox.w, icon / viewBox.h);
  const tx = x + cell / 2 - (viewBox.w * scale) / 2;
  const ty = y + panelPad + (panelSize - labelHeight - viewBox.h * scale) / 2;
  sheet += `  <rect x="${x + panelPad}" y="${y + panelPad}" width="${panelSize}" height="${panelSize}" rx="18" fill="#ffffff" stroke="#d9e2ef" stroke-width="3"/>\n`;
  sheet += `  <g transform="translate(${tx} ${ty}) scale(${scale})">\n`;
  sheet += `    <svg width="${viewBox.w}" height="${viewBox.h}" viewBox="${escapeXml(viewBox.raw)}" xmlns="http://www.w3.org/2000/svg">\n`;
  sheet += `      ${innerSvg(raw)}\n`;
  sheet += "    </svg>\n";
  sheet += "  </g>\n";
  sheet += `  <text x="${x + cell / 2}" y="${y + cell - panelPad - 24}" font-family="Arial, sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="#1d2b4f">${escapeXml(asset.label)}</text>\n`;
}

sheet += "</svg>\n";
await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
await writeFile(outPath, sheet, "utf8");
console.log(outPath);
