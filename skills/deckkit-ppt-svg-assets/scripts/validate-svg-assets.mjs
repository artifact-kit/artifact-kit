#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";

function usage() {
  console.error([
    "Usage:",
    "  node validate-svg-assets.mjs --workdir /path/to/work",
    "  node validate-svg-assets.mjs --manifest manifests/svg-assets.json",
    "",
    "Checks SVG files, manifest shape, and Iconfont candidate provenance.",
  ].join("\n"));
  process.exit(2);
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasExternalDependency(svg) {
  return (
    /<script\b/i.test(svg) ||
    /\bfile:\/\//i.test(svg) ||
    /url\(\s*["']?https?:\/\//i.test(svg) ||
    /\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)
  );
}

function resolveWorkPath(workdir, filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(workdir, filePath);
}

function isInsideDirectory(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

const args = process.argv.slice(2);
const explicitManifest = argValue(args, "--manifest");
const workdir = path.resolve(argValue(args, "--workdir") ?? process.cwd());
const manifestPath = path.resolve(explicitManifest ? resolveWorkPath(workdir, explicitManifest) : path.join(workdir, "manifests", "svg-assets.json"));
if (args.includes("--help")) usage();

const errors = [];
const warnings = [];

if (!(await exists(manifestPath))) {
  errors.push(`manifest does not exist: ${manifestPath}`);
} else {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!isRecord(manifest)) {
    errors.push("manifest must be an object");
  }
  if (manifest.taskId !== "svg-assets") errors.push("taskId must be svg-assets");
  if (!Array.isArray(manifest.assets)) errors.push("assets must be an array");
  if (!Array.isArray(manifest.outputPaths)) errors.push("outputPaths must be an array");
  if (!Array.isArray(manifest.validationGaps)) errors.push("validationGaps must be an array");

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const svgDir = path.resolve(workdir, "svg");
  const outputPaths = new Set((Array.isArray(manifest.outputPaths) ? manifest.outputPaths : []).filter((value) => typeof value === "string"));

  for (const asset of assets) {
    if (!isRecord(asset)) {
      errors.push("asset entry must be an object");
      continue;
    }
    const label = typeof asset.elementId === "string" ? asset.elementId : "<missing elementId>";
    if (typeof asset.elementId !== "string") errors.push("asset entry missing string elementId");
    if (typeof asset.svgPath !== "string") {
      errors.push(`bad svgPath on ${label}`);
      continue;
    }
    if (!asset.svgPath.endsWith(".svg")) errors.push(`svgPath must end with .svg on ${label}`);
    if (!outputPaths.has(asset.svgPath)) warnings.push(`outputPaths does not include svgPath for ${label}: ${asset.svgPath}`);

    const svgPath = resolveWorkPath(workdir, asset.svgPath);
    if (!isInsideDirectory(svgDir, svgPath)) errors.push(`svgPath must stay under svg/ on ${label}: ${asset.svgPath}`);
    if (!(await exists(svgPath))) {
      errors.push(`svg file does not exist on ${label}: ${asset.svgPath}`);
      continue;
    }
    const generatedSvg = await readFile(svgPath, "utf8");
    if (!/<svg\b/i.test(generatedSvg)) errors.push(`svg file missing <svg> root on ${label}`);
    if (!/\bviewBox\s*=/i.test(generatedSvg)) errors.push(`svg file missing viewBox on ${label}`);
    if (hasExternalDependency(generatedSvg)) errors.push(`svg file has external script/link dependency on ${label}`);

    const iconfontReferences = Array.isArray(asset.iconfontReferences) ? asset.iconfontReferences : [];
    const selected = asset.selectedIconfontCandidate;
    if (iconfontReferences.length > 0 && selected === undefined) {
      warnings.push(`iconfontReferences present without selectedIconfontCandidate provenance on ${label}`);
    }
    if (selected !== undefined && iconfontReferences.length === 0) {
      warnings.push(`selectedIconfontCandidate present without iconfontReferences on ${label}`);
    }
    if (selected !== undefined) {
      if (!isRecord(selected)) {
        warnings.push(`selectedIconfontCandidate is not an object on ${label}`);
        continue;
      }
      if (typeof selected.candidateSvgPath !== "string") {
        warnings.push(`selectedIconfontCandidate.candidateSvgPath is missing on ${label}`);
        continue;
      }
      const candidateSvgPath = resolveWorkPath(workdir, selected.candidateSvgPath);
      if (!(await exists(candidateSvgPath))) {
        warnings.push(`selectedIconfontCandidate.candidateSvgPath does not exist on ${label}: ${selected.candidateSvgPath}`);
        continue;
      }
    }
  }
}

const result = {
  ok: errors.length === 0,
  manifestPath,
  errors,
  warnings,
};
console.log(JSON.stringify(result, null, 2));
process.exit(errors.length === 0 ? 0 : 1);
