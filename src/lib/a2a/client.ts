import { z } from "zod";
import {
  AgentCard,
  AgentCardSchema,
  INTERRUPTED_STATES,
  isMessage,
  isTask,
  isTextPart,
  Message,
  MessageSendParams,
  Part,
  SendResult,
  SendResultSchema,
  Task,
  TaskSchema,
  TERMINAL_STATES,
} from "./schemas";
import { createAuthFetch, OAuthConfig } from "./auth";
import { A2AError } from "./errors";

export { A2AError } from "./errors";
export { A2AAuthError } from "./auth";

export class A2ACardFetchError extends A2AError {
  constructor(public readonly url: string, public readonly status: number) {
    super(`Failed to fetch Agent Card from ${url}: HTTP ${status}`);
    this.name = "A2ACardFetchError";
  }
}

export class A2ARpcError extends A2AError {
  constructor(
    public readonly code: number,
    public readonly rpcMessage: string,
    public readonly data?: unknown,
  ) {
    super(`JSON-RPC error ${code}: ${rpcMessage}`);
    this.name = "A2ARpcError";
  }
}

export class A2APollingTimeoutError extends A2AError {
  constructor(public readonly taskId: string, public readonly attempts: number) {
    super(`Polling timed out after ${attempts} attempts for task ${taskId}`);
    this.name = "A2APollingTimeoutError";
  }
}

export class A2AValidationError extends A2AError {
  constructor(public readonly issues: z.ZodIssue[]) {
    super("Schema validation failed: " + issues.map((i) => i.message).join("; "));
    this.name = "A2AValidationError";
  }
}

export interface A2AClientOptions {
  agentUrl: string;
  agentCardPath?: string;
  fetchImpl?: typeof fetch;
  sendMethod?: string;
  polling?: {
    intervalMs?: number;
    maxAttempts?: number;
    backoff?: "none" | "exponential";
  };
  oauth?: OAuthConfig;
}

interface ResolvedPollingOptions {
  intervalMs: number;
  maxAttempts: number;
  backoff: "none" | "exponential";
}

function isJsonRpcError(
  value: unknown,
): value is { error: { code: number; message: string; data?: unknown } } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as Record<string, unknown>)["error"] === "object" &&
    (value as Record<string, unknown>)["error"] !== null
  );
}

export class A2AClient {
  private readonly agentUrl: string;
  private readonly agentCardPath: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sendMethod: string;
  private readonly pollingOptions: ResolvedPollingOptions;
  private agentCardCache: AgentCard | null = null;

  constructor(options: A2AClientOptions) {
    this.agentUrl = options.agentUrl.replace(/\/$/, "");
    this.agentCardPath = options.agentCardPath ?? ".well-known/agent.json";
    const resolvedFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.fetchImpl = options.oauth
      ? createAuthFetch(options.oauth, resolvedFetch)
      : resolvedFetch;
    this.sendMethod = options.sendMethod ?? "message/send";
    this.pollingOptions = {
      intervalMs: options.polling?.intervalMs ?? 1500,
      maxAttempts: options.polling?.maxAttempts ?? 40,
      backoff: options.polling?.backoff ?? "exponential",
    };
  }

  async getAgentCard(forceRefresh = false): Promise<AgentCard> {
    if (this.agentCardCache !== null && !forceRefresh) {
      return this.agentCardCache;
    }
    const card = await this._fetchAgentCard();
    this.agentCardCache = card;
    return card;
  }

  async sendMessage(
    text: string,
    options?: {
      contextId?: string;
      parts?: Part[];
      attachments?: Array<{ type: string; category: string; fileName: string; ID: string }>;
    },
  ): Promise<SendResult> {
    let messageText = text;
    if (options?.attachments?.length) {
      const refs = options.attachments.map((a) => `${a.fileName} : ${a.ID}`).join("\n");
      messageText = messageText ? `${messageText}\n${refs}` : refs;
    }

    const textParts: Part[] = messageText ? [{ kind: "text", text: messageText }] : [];
    const message: Message = {
      messageId: crypto.randomUUID(),
      role: "user",
      parts: [...textParts, ...(options?.parts ?? [])],
      ...(options?.contextId !== undefined ? { contextId: options.contextId } : {}),
      ...(options?.attachments?.length
        ? { metadata: { attachments: options.attachments } }
        : {}),
    };
    const params = { message };

    const result = await this.sendRaw(params);
    if (isTask(result)) {
      const { state } = result.status;
      if (state === "submitted" || state === "working") {
        return this.waitForTask(result.id);
      }
    }
    return result;
  }

  async waitForTask(taskId: string): Promise<Task> {
    let attempt = 0;
    for (;;) {
      const task = await this.getTask(taskId);
      const { state } = task.status;
      if (TERMINAL_STATES.has(state) || INTERRUPTED_STATES.has(state)) {
        return task;
      }
      if (attempt >= this.pollingOptions.maxAttempts) {
        throw new A2APollingTimeoutError(taskId, attempt);
      }
      const factor =
        this.pollingOptions.backoff === "exponential"
          ? Math.min(Math.pow(2, attempt), 32)
          : 1;
      await this._sleep(this.pollingOptions.intervalMs * factor);
      attempt++;
    }
  }

  async getTask(taskId: string): Promise<Task> {
    return this._sendJsonRpc("tasks/get", { id: taskId }, TaskSchema);
  }

  async sendRaw(params: MessageSendParams | Record<string, unknown>): Promise<SendResult> {
    return this._sendJsonRpc(this.sendMethod, params, SendResultSchema);
  }

  extractText(result: SendResult): string[] {
    if (isMessage(result)) {
      return result.parts.filter(isTextPart).map((p) => p.text);
    }
    return (result.artifacts ?? [])
      .flatMap((artifact) => artifact.parts)
      .filter(isTextPart)
      .map((part) => part.text);
  }

  async ask(text: string): Promise<string[]> {
    const result = await this.sendMessage(text);
    return this.extractText(result);
  }

  private async _fetchAgentCard(): Promise<AgentCard> {
    const base = this.agentUrl;
    const pathsToTry: string[] = [this.agentCardPath];
    if (this.agentCardPath !== ".well-known/agent.json") {
      pathsToTry.push(".well-known/agent.json");
    }

    for (const path of pathsToTry) {
      const url = `${base}/${path}`;
      let res: Response;
      try {
        res = await this.fetchImpl(url, { headers: { Accept: "application/json" } });
      } catch (err) {
        throw new A2AError(`Network error fetching agent card from ${url}`, err);
      }
      if (res.status === 404) continue;
      if (!res.ok) throw new A2ACardFetchError(url, res.status);

      let raw: unknown;
      try {
        raw = await res.json();
      } catch (err) {
        throw new A2AError(`Failed to parse agent card JSON from ${url}`, err);
      }

      const result = AgentCardSchema.safeParse(raw);
      if (!result.success) throw new A2AValidationError(result.error.issues);
      return result.data;
    }

    throw new A2ACardFetchError(`${base}/${this.agentCardPath}`, 404);
  }

  private async _sendJsonRpc<T>(
    method: string,
    params: unknown,
    resultSchema: z.ZodType<T>,
  ): Promise<T> {
    const card = await this.getAgentCard();
    const body = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params,
    };

    let res: Response;
    try {
      res = await this.fetchImpl(card.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new A2AError(`Network error calling ${method}`, err);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      if (!res.ok) {
        throw new A2AError(`HTTP ${res.status} from ${card.url} (${method})`);
      }
      throw new A2AError("Failed to parse JSON-RPC response");
    }

    if (isJsonRpcError(json)) {
      const { code, message: msg, data } = json.error;
      throw new A2ARpcError(Number(code), msg, data);
    }

    if (!res.ok) {
      throw new A2AError(`HTTP ${res.status} from ${card.url} (${method})`);
    }

    if (typeof json !== "object" || json === null || !("result" in json)) {
      throw new A2AError(
        "Invalid JSON-RPC response: missing both 'result' and 'error' fields",
      );
    }

    const parsed = resultSchema.safeParse((json as { result: unknown })["result"]);
    if (!parsed.success) {
      throw new A2AValidationError(parsed.error.issues);
    }
    return parsed.data;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
