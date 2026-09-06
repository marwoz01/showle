import { describe, expect, it } from "vitest";
import { readJsonBody } from "@/lib/request-body";

function streamed(chunks: Uint8Array[], headers?: Record<string, string>) {
  return new Request("http://localhost", {
    method: "POST", headers,
    body: new ReadableStream({ start(controller) { chunks.forEach((chunk) => controller.enqueue(chunk)); controller.close(); } }),
    duplex: "half",
  } as RequestInit);
}
const bytes = (text: string) => new TextEncoder().encode(text);
describe("bounded JSON body reader", () => {
  it("accepts valid JSON split across chunks and UTF-8 characters", async () => {
    const value = bytes('{"text":"żółć"}');
    expect(await readJsonBody(streamed([value.slice(0, 10), value.slice(10)]), value.length)).toEqual({ text: "żółć" });
  });
  it.each([undefined, { "Content-Length": "1" }])("enforces bytes across chunks without trusting length headers", async (headers) => {
    await expect(readJsonBody(streamed([bytes('"'), bytes("ż".repeat(10)), bytes('"')], headers), 20))
      .rejects.toMatchObject({ status: 413 });
  });
  it.each([bytes("{broken"), new Uint8Array([0xff]), bytes("")])("rejects malformed JSON or UTF-8 %#", async (value) => {
    await expect(readJsonBody(streamed([value]), 30)).rejects.toMatchObject({ status: 400 });
  });
  it("rejects a missing body", async () => {
    await expect(readJsonBody(new Request("http://localhost"), 30)).rejects.toMatchObject({ status: 400 });
  });
});
