import type { NextApiRequest, NextApiResponse } from "next";
import { executeOfficeCommand } from "../../../lib/bridge-state";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const code = body.code;

  if (typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ ok: false, error: "Body must include a string 'code'." });
    return;
  }

  try {
    const result = await executeOfficeCommand({
      code,
      args: body.args,
      timeoutMs: body.timeoutMs,
    });

    res.status(200).json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed.";
    res.status(500).json({ ok: false, error: message });
  }
}
