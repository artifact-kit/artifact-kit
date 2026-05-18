#!/usr/bin/env node
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "skills");
const targetRoot = path.join(os.homedir(), ".agents", "skills");

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function main() {
  if (!(await pathExists(sourceRoot))) {
    throw new Error(`No skills directory found at ${sourceRoot}`);
  }

  await mkdir(targetRoot, { recursive: true });

  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sourceDir = path.join(sourceRoot, entry.name);
    const skillFile = path.join(sourceDir, "SKILL.md");
    if (!(await pathExists(skillFile))) continue;

    skills.push({ name: entry.name, sourceDir });
  }

  if (skills.length === 0) {
    console.log(`No skills with SKILL.md found under ${sourceRoot}`);
    return;
  }

  for (const skill of skills) {
    const targetDir = path.join(targetRoot, skill.name);
    await rm(targetDir, { recursive: true, force: true });
    await cp(skill.sourceDir, targetDir, { recursive: true });
    console.log(`Copied full skill directory: ${skill.sourceDir} -> ${targetDir}`);
  }

  console.log(`Installed ${skills.length} skill(s), including all files and subfolders, to ${targetRoot}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`install-skills: ${message}`);
  process.exit(1);
});
