import type { NextApiRequest, NextApiResponse } from "next";
import { BridgeBatchCommand, executeOfficeBatch } from "../../../lib/bridge-state";

function normalizeCommands(value: unknown): BridgeBatchCommand[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const commands: BridgeBatchCommand[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || !("code" in entry) || typeof entry.code !== "string") {
      return null;
    }

    if (entry.code.trim().length === 0) {
      return null;
    }

    commands.push({
      code: entry.code,
      args: "args" in entry ? entry.args : undefined,
    });
  }

  return commands;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const commands = normalizeCommands(body.commands);

  if (!commands) {
    res.status(400).json({ ok: false, error: "Body must include a non-empty 'commands' array with string 'code' entries." });
    return;
  }

  try {
    const result = await executeOfficeBatch({
      commands,
      timeoutMs: body.timeoutMs,
    });

    res.status(200).json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Batch failed.";
    res.status(500).json({ ok: false, error: message });
  }
}
