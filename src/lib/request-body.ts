export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 413, message: string) {
    super(message);
  }
}

// Count the stream itself: Content-Length is optional and caller-controlled.
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400, "invalid_json");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new RequestBodyError(413, "body_too_large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400, "invalid_json");
  } finally {
    reader.releaseLock();
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
