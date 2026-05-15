import { copyFile, mkdir, opendir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");

const defaults = {
  source: path.join(repoRoot, "references/lucide/icons"),
  out: path.join(packageRoot, "dist"),
  indexFile: "lucide-icons.jsonl",
};

function parseArgs(argv) {
  const options = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--source") {
      options.source = path.resolve(readOptionValue(argv, ++index, "--source"));
      continue;
    }

    if (arg === "--out") {
      options.out = path.resolve(readOptionValue(argv, ++index, "--out"));
      continue;
    }

    if (arg === "--index-file") {
      options.indexFile = readOptionValue(argv, ++index, "--index-file");
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${optionName}.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage: node src/generate-lucide-reference.mjs [--source DIR] [--out DIR] [--index-file FILE]

Options:
  --source DIR      Directory containing Lucide .json and .svg files.
  --out DIR         Output directory for icons/ and the JSONL index.
  --index-file FILE JSONL file name written inside the output directory.`);
}

async function listIconFiles(sourceDir) {
  const jsonFiles = [];
  const svgFiles = [];
  const directory = await opendir(sourceDir);

  for await (const entry of directory) {
    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.endsWith(".json")) {
      jsonFiles.push(entry.name);
      continue;
    }

    if (entry.name.endsWith(".svg")) {
      svgFiles.push(entry.name);
    }
  }

  jsonFiles.sort();
  svgFiles.sort();

  return { jsonFiles, svgFiles };
}

function mergeKeywords(metadata, jsonFile) {
  const tags = readStringArray(metadata.tags, jsonFile, "tags");
  const categories = readStringArray(metadata.categories, jsonFile, "categories");
  return [...new Set([...tags, ...categories])];
}

function readStringArray(value, jsonFile, fieldName) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${jsonFile}: expected "${fieldName}" to be an array.`);
  }

  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

async function buildReference({ source, out, indexFile }) {
  const iconOutDir = path.join(out, "icons");
  const indexOutFile = path.join(out, indexFile);
  const { jsonFiles, svgFiles } = await listIconFiles(source);

  await rm(iconOutDir, { recursive: true, force: true });
  await mkdir(iconOutDir, { recursive: true });

  await Promise.all(
    svgFiles.map((svgFile) =>
      copyFile(path.join(source, svgFile), path.join(iconOutDir, svgFile)),
    ),
  );

  const svgNames = new Set(svgFiles);
  const lines = [];
  const missingSvgFiles = [];

  for (const jsonFile of jsonFiles) {
    const baseName = path.basename(jsonFile, ".json");
    const svgName = `${baseName}.svg`;

    if (!svgNames.has(svgName)) {
      missingSvgFiles.push(svgName);
      continue;
    }

    const jsonPath = path.join(source, jsonFile);
    const metadata = JSON.parse(await readFile(jsonPath, "utf8"));
    lines.push(
      JSON.stringify({
        name: svgName,
        key_words: mergeKeywords(metadata, jsonFile),
      }),
    );
  }

  if (missingSvgFiles.length > 0) {
    throw new Error(
      `Missing matching SVG files for ${missingSvgFiles.length} JSON files. First missing file: ${missingSvgFiles[0]}`,
    );
  }

  await writeFile(indexOutFile, `${lines.join("\n")}\n`, "utf8");

  return {
    copiedSvgCount: svgFiles.length,
    indexedIconCount: lines.length,
    indexOutFile,
    iconOutDir,
  };
}

try {
  const result = await buildReference(parseArgs(process.argv.slice(2)));
  console.log(`Copied ${result.copiedSvgCount} SVG files to ${result.iconOutDir}`);
  console.log(`Wrote ${result.indexedIconCount} icon rows to ${result.indexOutFile}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
