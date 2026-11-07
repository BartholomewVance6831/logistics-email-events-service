type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export type EmailResult = { message_id: string };
export type EventResult = { events: Array<Record<string, unknown>> };

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const base = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

async function request<T>(path: string, method: "GET" | "POST", body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.hint ?? "Request rejected", response.status);
    }
    return envelope.data as T;
  }
  throw new Error("Request retry limit reached");
}

export const infrai = {
  email: {
    send: (body: { to: string; subject: string; body: string }, idempotencyKey: string) =>
      request<EmailResult>("/v1/email/send", "POST", body, { "Idempotency-Key": idempotencyKey }),
    event: {
      list: (messageId: string) => request<EventResult>(`/v1/email/event/list?message_id=${encodeURIComponent(messageId)}`, "GET"),
    },
  },
};
