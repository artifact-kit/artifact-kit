import type { NextApiRequest, NextApiResponse } from "next";
import { completeBridgeExecution } from "../../../lib/bridge-state";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};

  if (typeof body.id !== "string") {
    res.status(400).json({ ok: false, error: "Body must include a string 'id'." });
    return;
  }

  const handled = completeBridgeExecution({
    id: body.id,
    ok: body.ok === true,
    result: body.result,
    error: body.error,
  });

  res.status(200).json({ ok: true, handled });
}
