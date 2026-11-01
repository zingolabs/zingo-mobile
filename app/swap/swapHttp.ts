export type SwapHttpResponse = {
  ok: boolean;
  status: number;
  text: string;
  /** The `Retry-After` header, when the response carried one. */
  retryAfter?: string | null;
};

/**
 * One HTTP request for the swap layer.
 *
 * The deadline is an `AbortController`, so a provider that stops answering
 * fails inside `timeoutMs` as a network error instead of holding a quote open.
 * Answers with the status, the body and `Retry-After`, which are the parts of
 * a response the callers read.
 */
export async function swapHttpRequest(args: {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs: number;
}): Promise<SwapHttpResponse> {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const response = await fetch(args.url, {
      method: args.method,
      headers: args.headers,
      body: args.body,
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
      retryAfter: response.headers.get('retry-after'),
    };
  } finally {
    clearTimeout(deadline);
  }
}
