import Head from "next/head";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";

type AgentState = "ready" | "working" | "busy" | "waiting" | "error";

type BridgeAction = "runOfficeJs" | "runOfficeJsBatch";

interface BridgeStatusResponse {
  hasSignal?: boolean;
  state?: AgentState;
  headline?: string;
  detail?: string;
  updatedAt?: number | null;
}

interface StatusView {
  state: AgentState;
  label: string;
  headline: string;
  detail: string;
  hasSignal: boolean;
}

interface BridgeRequest {
  id: string;
  action: BridgeAction;
  args?: {
    code?: string;
    args?: unknown;
    commands?: Array<{
      code?: string;
      args?: unknown;
    }>;
  };
}

interface BridgeNextResponse {
  ok?: boolean;
  request?: BridgeRequest | null;
}

const statusViews: Record<AgentState, Omit<StatusView, "state" | "hasSignal">> = {
  ready: {
    label: "Ready",
    headline: "Done",
    detail: "PowerPoint returned a result.",
  },
  working: {
    label: "Working",
    headline: "Working",
    detail: "PowerPoint is executing the command.",
  },
  busy: {
    label: "Busy",
    headline: "Busy",
    detail: "PowerPoint is executing the batch.",
  },
  waiting: {
    label: "Waiting",
    headline: "Waiting",
    detail: "Standing by.",
  },
  error: {
    label: "Error",
    headline: "Failed",
    detail: "The command failed.",
  },
};

const fallbackStatus: StatusView = {
  state: "waiting",
  hasSignal: false,
  ...statusViews.waiting,
};

function normalizeStatus(data: BridgeStatusResponse | null): StatusView {
  if (!data?.state || !statusViews[data.state]) {
    return fallbackStatus;
  }

  const view = statusViews[data.state];

  return {
    state: data.state,
    label: view.label,
    headline: data.headline || view.headline,
    detail: data.detail || view.detail,
    hasSignal: Boolean(data.hasSignal),
  };
}

function getRuntime(name: "Office" | "PowerPoint") {
  return (window as unknown as Record<string, unknown>)[name];
}

function waitForOfficeRuntime() {
  const office = getRuntime("Office") as { onReady?: () => Promise<unknown> } | undefined;

  if (!office?.onReady) {
    return Promise.resolve();
  }

  return Promise.race([
    office.onReady().then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1_500)),
  ]);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown command error.");
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomBatchPauseMs() {
  return Math.floor(Math.random() * 500);
}

function stripDataUriPrefix(value: unknown) {
  return String(value || "").replace(/^data:[^;]+;base64,/, "");
}

function setSelectedData(data: string, coercionType: unknown, options?: Record<string, unknown>) {
  const office = getRuntime("Office") as
    | {
        context?: {
          document?: {
            setSelectedDataAsync?: (data: string, options: Record<string, unknown>, callback: (result: unknown) => void) => void;
          };
        };
        AsyncResultStatus?: { Failed?: string };
      }
    | undefined;

  return new Promise((resolve, reject) => {
    const setSelectedDataAsync = office?.context?.document?.setSelectedDataAsync;

    if (!setSelectedDataAsync) {
      reject(new Error("Office.context.document.setSelectedDataAsync is not available."));
      return;
    }

    const merged = { ...(options || {}), coercionType };

    setSelectedDataAsync(data, merged, (asyncResult: unknown) => {
      const result = asyncResult as { status?: string; error?: { message?: string } };

      if (result.status === office?.AsyncResultStatus?.Failed) {
        reject(new Error(result.error?.message || "setSelectedDataAsync failed."));
      } else {
        resolve({ ok: true });
      }
    });
  });
}

function bridgeHelpers() {
  const office = getRuntime("Office") as
    | {
        CoercionType?: {
          Image?: unknown;
          XmlSvg?: unknown;
        };
      }
    | undefined;

  return {
    stripDataUriPrefix,
    setSelectedImage: (base64: unknown, options?: Record<string, unknown>) =>
      setSelectedData(stripDataUriPrefix(base64), office?.CoercionType?.Image, options),
    setSelectedSvg: (svgXml: unknown, options?: Record<string, unknown>) =>
      setSelectedData(String(svgXml || ""), office?.CoercionType?.XmlSvg, options),
  };
}

async function runOfficeJs(args: BridgeRequest["args"]) {
  const code = String(args?.code || "");

  if (!code) {
    throw new Error("Command is missing code.");
  }

  await waitForOfficeRuntime();

  const fn = new Function("PowerPoint", "Office", "args", "helpers", code);
  return fn(getRuntime("PowerPoint"), getRuntime("Office"), args?.args || {}, bridgeHelpers());
}

async function runOfficeJsBatch(args: BridgeRequest["args"]) {
  const commands = args?.commands;

  if (!Array.isArray(commands) || commands.length === 0) {
    throw new Error("Batch is missing commands.");
  }

  const results = [];

  for (let index = 0; index < commands.length; index += 1) {
    try {
      results.push(await runOfficeJs(commands[index]));

      if (index < commands.length - 1) {
        await wait(randomBatchPauseMs());
      }
    } catch (error) {
      throw new Error(`Batch command ${index + 1} failed: ${getErrorMessage(error)}`);
    }
  }

  return results;
}

async function runBridgeRequest(request: BridgeRequest) {
  if (request.action === "runOfficeJs") {
    return runOfficeJs(request.args);
  }

  if (request.action === "runOfficeJsBatch") {
    return runOfficeJsBatch(request.args);
  }

  throw new Error(`Unknown bridge action: ${request.action}`);
}

export default function Taskpane() {
  const [bridgeStatus, setBridgeStatus] = useState<StatusView>(fallbackStatus);

  const statusClassName = useMemo(
    () => `status-player status-player-${bridgeStatus.state} ${bridgeStatus.hasSignal ? "is-live" : "is-idle"}`,
    [bridgeStatus],
  );

  useEffect(() => {
    let cancelled = false;
    let latestUpdatedAt = 0;
    let activeRequest: AbortController | null = null;

    async function waitForStatus() {
      while (!cancelled) {
        try {
          activeRequest = new AbortController();
          const response = await fetch(`/api/bridge/status?since=${latestUpdatedAt}`, {
            cache: "no-store",
            signal: activeRequest.signal,
          });
          activeRequest = null;

          if (!response.ok) {
            throw new Error(`status ${response.status}`);
          }

          const data = (await response.json()) as BridgeStatusResponse;

          if (!cancelled) {
            latestUpdatedAt = typeof data.updatedAt === "number" ? data.updatedAt : latestUpdatedAt;
            setBridgeStatus(normalizeStatus(data));
          }
        } catch {
          if (!cancelled) {
            setBridgeStatus(fallbackStatus);
          }

          if (cancelled) {
            return;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        }
      }
    }

    waitForStatus();

    return () => {
      cancelled = true;
      activeRequest?.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let activeRequest: AbortController | null = null;

    async function respond(body: Record<string, unknown>) {
      await fetch("/api/bridge/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }

    async function ack(id: string) {
      await fetch("/api/bridge/ack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
    }

    async function waitForCommand() {
      while (!cancelled) {
        try {
          activeRequest = new AbortController();
          const response = await fetch("/api/bridge/next", {
            cache: "no-store",
            signal: activeRequest.signal,
          });
          activeRequest = null;

          if (!response.ok) {
            throw new Error(`next ${response.status}`);
          }

          const data = (await response.json()) as BridgeNextResponse;

          if (!data.request) {
            continue;
          }

          try {
            await ack(data.request.id);
            const result = await runBridgeRequest(data.request);
            await respond({
              id: data.request.id,
              ok: true,
              result: await Promise.resolve(result),
            });
          } catch (error) {
            await respond({
              id: data.request.id,
              ok: false,
              error: getErrorMessage(error),
            });
          }
        } catch {
          if (cancelled) {
            return;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        }
      }
    }

    waitForCommand();

    return () => {
      cancelled = true;
      activeRequest?.abort();
    };
  }, []);

  return (
    <>
      <Head>
        <title>PowerPoint Status</title>
      </Head>
      <Script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" strategy="afterInteractive" />

      <main className="status-page">
        <section className={statusClassName} aria-live="polite">
          <div className="status-orbit" aria-hidden="true" />
          <div className="status-core" aria-hidden="true" />
          <div className="status-vignette" aria-hidden="true" />
          <div className="status-scan" aria-hidden="true" />

          <div className="status-chip">
            <span className="status-dot" />
            <span>{bridgeStatus.label}</span>
          </div>

          <div className="status-copy">
            <p className="status-eyebrow">{bridgeStatus.hasSignal ? "Agent signal" : "No signal"}</p>
            <h1>{bridgeStatus.headline}</h1>
            <p>{bridgeStatus.detail}</p>
          </div>
        </section>
      </main>
    </>
  );
}
