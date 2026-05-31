import type { NextApiRequest, NextApiResponse } from "next";
import { getPendingExecution, waitForBridgeExecution } from "../../../lib/bridge-state";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  let request = getPendingExecution();

  if (!request) {
    await waitForBridgeExecution(res);
    request = getPendingExecution();
  }

  res.status(200).json({
    ok: true,
    request,
  });
}
