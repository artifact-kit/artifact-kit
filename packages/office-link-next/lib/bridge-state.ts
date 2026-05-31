import crypto from "node:crypto";
import type { NextApiResponse } from "next";

export type AgentState = "ready" | "working" | "busy" | "waiting" | "error";

export interface BridgeBatchCommand {
  code: string;
  args?: unknown;
}

export interface BridgeExecutionPayload {
  id: string;
  action: "runOfficeJs" | "runOfficeJsBatch";
  args: {
    code?: string;
    args?: unknown;
    commands?: BridgeBatchCommand[];
  };
  createdAt: number;
}

export interface BridgeExecutionResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface BridgeStatusPayload {
  hasSignal: boolean;
  state: AgentState;
  headline?: string;
  detail?: string;
  updatedAt: number;
}

interface ActiveExecution extends BridgeExecutionPayload {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  deliveredAt?: number;
  ackedAt?: number;
  deliveryCount: number;
}

type QueuedExecution = ActiveExecution;

interface BridgeListener {
  id: symbol;
  resolve: () => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface LastOutcome {
  ok: boolean;
  updatedAt: number;
  error?: string;
}

type BridgeGlobal = typeof globalThis & {
  __officeLinkActiveExecution?: ActiveExecution | null;
  __officeLinkExecutionQueue?: QueuedExecution[];
  __officeLinkStatusListeners?: BridgeListener[];
  __officeLinkExecutionListeners?: BridgeListener[];
  __officeLinkLastOutcome?: LastOutcome | null;
  __officeLinkStatusUpdatedAt?: number;
};

const longPollMs = 25_000;
const defaultTimeoutMs = 30_000;
const maxTimeoutMs = 120_000;
const recentOutcomeMs = 8_000;
const deliveryLeaseMs = 2_000;

function bridgeGlobal() {
  return globalThis as BridgeGlobal;
}

function statusListeners() {
  const store = bridgeGlobal();
  store.__officeLinkStatusListeners ??= [];
  return store.__officeLinkStatusListeners;
}

function executionListeners() {
  const store = bridgeGlobal();
  store.__officeLinkExecutionListeners ??= [];
  return store.__officeLinkExecutionListeners;
}

function executionQueue() {
  const store = bridgeGlobal();
  store.__officeLinkExecutionQueue ??= [];
  return store.__officeLinkExecutionQueue;
}

function statusUpdatedAt() {
  const store = bridgeGlobal();
  store.__officeLinkStatusUpdatedAt ??= Date.now();
  return store.__officeLinkStatusUpdatedAt;
}

function setStatusUpdatedAt(value = Date.now()) {
  bridgeGlobal().__officeLinkStatusUpdatedAt = value;
}

function normalizeTimeoutMs(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultTimeoutMs;
  }

  return Math.min(Math.max(parsed, 1_000), maxTimeoutMs);
}

function notify(list: BridgeListener[]) {
  const pending = list.splice(0);

  for (const listener of pending) {
    clearTimeout(listener.timeout);
    listener.resolve();
  }
}

function notifyStatusListeners() {
  notify(statusListeners());
}

function notifyExecutionListeners() {
  notify(executionListeners());
}

function touchStatus() {
  setStatusUpdatedAt();
  notifyStatusListeners();
}

function waitForChange(res: NextApiResponse, list: BridgeListener[]) {
  return new Promise<void>((resolve) => {
    const id = Symbol("office-link-bridge-listener");
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      const index = list.findIndex((listener) => listener.id === id);

      if (index >= 0) {
        const [listener] = list.splice(index, 1);
        clearTimeout(listener.timeout);
      }

      resolve();
    };

    const timeout = setTimeout(finish, longPollMs);

    list.push({
      id,
      resolve: finish,
      timeout,
    });

    res.on("close", finish);
  });
}

function createExecution(input: Omit<BridgeExecutionPayload, "id" | "createdAt">, timeoutMs: unknown) {
  const store = bridgeGlobal();
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const waitMs = normalizeTimeoutMs(timeoutMs);

  return new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (store.__officeLinkActiveExecution?.id === id) {
        store.__officeLinkActiveExecution = null;
      } else {
        const queue = executionQueue();
        const index = queue.findIndex((execution) => execution.id === id);

        if (index >= 0) {
          queue.splice(index, 1);
        }
      }

      store.__officeLinkLastOutcome = {
        ok: false,
        error: `Timed out waiting for add-in response after ${waitMs}ms.`,
        updatedAt: Date.now(),
      };
      touchStatus();
      notifyExecutionListeners();
      reject(new Error(`Timed out waiting for add-in response.`));
    }, waitMs);

    executionQueue().push({
      id,
      action: input.action,
      args: input.args,
      createdAt,
      resolve,
      reject,
      timeout,
      deliveryCount: 0,
    });
    store.__officeLinkLastOutcome = null;
    touchStatus();
    notifyExecutionListeners();
  });
}

export function executeOfficeCommand(input: { code: string; args?: unknown; timeoutMs?: unknown }) {
  return createExecution(
    {
      action: "runOfficeJs",
      args: {
        code: input.code,
        args: input.args,
      },
    },
    input.timeoutMs,
  );
}

export function executeOfficeBatch(input: { commands: BridgeBatchCommand[]; timeoutMs?: unknown }) {
  return createExecution(
    {
      action: "runOfficeJsBatch",
      args: {
        commands: input.commands,
      },
    },
    input.timeoutMs,
  );
}

export function getPendingExecution(): BridgeExecutionPayload | null {
  const store = bridgeGlobal();
  let active = store.__officeLinkActiveExecution;

  if (!active) {
    active = executionQueue().shift() ?? null;
    store.__officeLinkActiveExecution = active;

    if (active) {
      touchStatus();
    }
  }

  if (!active || active.ackedAt) {
    return null;
  }

  const now = Date.now();

  if (active.deliveredAt && now - active.deliveredAt < deliveryLeaseMs) {
    return null;
  }

  active.deliveredAt = now;
  active.deliveryCount += 1;
  touchStatus();

  return {
    id: active.id,
    action: active.action,
    args: active.args,
    createdAt: active.createdAt,
  };
}

export function ackBridgeExecution(input: { id: string }) {
  const active = bridgeGlobal().__officeLinkActiveExecution;

  if (!active || active.id !== input.id) {
    return false;
  }

  active.ackedAt = Date.now();
  touchStatus();
  return true;
}

export function completeBridgeExecution(input: { id: string; ok: boolean; result?: unknown; error?: unknown }) {
  const store = bridgeGlobal();
  const active = store.__officeLinkActiveExecution;

  if (!active || active.id !== input.id) {
    return false;
  }

  clearTimeout(active.timeout);
  store.__officeLinkActiveExecution = null;
  store.__officeLinkLastOutcome = {
    ok: input.ok,
    error: input.ok ? undefined : String(input.error || "Add-in command failed."),
    updatedAt: Date.now(),
  };

  if (input.ok) {
    active.resolve(input.result);
  } else {
    active.reject(new Error(String(input.error || "Add-in command failed.")));
  }

  touchStatus();
  notifyExecutionListeners();
  return true;
}

export function deriveBridgeStatus(): BridgeStatusPayload {
  const store = bridgeGlobal();
  const active = store.__officeLinkActiveExecution;
  const queuedCount = executionQueue().length;
  const lastOutcome = store.__officeLinkLastOutcome;
  const updatedAt = statusUpdatedAt();

  if (active || queuedCount > 0) {
    const isBatch = active?.action === "runOfficeJsBatch";
    const pickedUp = Boolean(active?.ackedAt);

    return {
      hasSignal: true,
      state: isBatch || queuedCount > 0 ? "busy" : "working",
      headline: queuedCount > 0 ? "Commands queued" : isBatch ? "Batch running" : "Command running",
      detail: active
        ? pickedUp
          ? queuedCount > 0
            ? `The add-in is executing one request. ${queuedCount} more waiting.`
            : isBatch
              ? "The add-in picked up the batch and is executing it."
              : "The add-in picked up the command and is executing it."
          : queuedCount > 0
            ? `Waiting for the add-in to pick up the current request. ${queuedCount} more waiting.`
            : isBatch
              ? "Waiting for the add-in to pick up the batch."
              : "Waiting for the add-in to pick up the command."
        : `${queuedCount} request${queuedCount === 1 ? "" : "s"} waiting for the add-in.`,
      updatedAt,
    };
  }

  if (lastOutcome && Date.now() - lastOutcome.updatedAt <= recentOutcomeMs) {
    if (lastOutcome.ok) {
      return {
        hasSignal: true,
        state: "ready",
        headline: "Command complete",
        detail: "PowerPoint returned a successful result.",
        updatedAt,
      };
    }

    return {
      hasSignal: true,
      state: "error",
      headline: "Command failed",
      detail: lastOutcome.error,
      updatedAt,
    };
  }

  return {
    hasSignal: false,
    state: "waiting",
    updatedAt,
  };
}

export function waitForBridgeStatusChange(res: NextApiResponse) {
  return waitForChange(res, statusListeners());
}

export function waitForBridgeExecution(res: NextApiResponse) {
  return waitForChange(res, executionListeners());
}
