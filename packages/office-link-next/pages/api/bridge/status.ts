import type { NextApiRequest, NextApiResponse } from "next";
import { deriveBridgeStatus, waitForBridgeStatusChange } from "../../../lib/bridge-state";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sinceParam = Array.isArray(req.query.since) ? req.query.since[0] : req.query.since;
  const since = sinceParam ? Number(sinceParam) : NaN;
  let payload = deriveBridgeStatus();

  res.setHeader("Cache-Control", "no-store");

  if (Number.isFinite(since) && payload.updatedAt <= since) {
    await waitForBridgeStatusChange(res);
    payload = deriveBridgeStatus();
  }

  res.status(200).json(payload);
}
