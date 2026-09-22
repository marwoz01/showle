import { describe, expect, it, vi } from "vitest";
import { createAccountLocaleWriter } from "@/lib/account-locale-writer";

function fixture() {
  const pending: { resolve: () => void; reject: (error: unknown) => void }[] = [];
  const write = vi.fn(() => new Promise<void>((resolve, reject) => pending.push({ resolve, reject })));
  const writer = createAccountLocaleWriter(write);
  const release = writer.activate("user_a");
  return { writer, write, pending, release };
}

describe("serialized account locale changes", () => {
  it("waits for an older write before sending the latest language, preventing completion-order inversion", async () => {
    const { writer, write, pending } = fixture();
    const first = writer.save("user_a", "en");
    const latest = writer.save("user_a", "pl");
    expect(write.mock.calls).toEqual([["user_a", "en"]]);
    pending[0].resolve();
    expect(await first).toBe(false);
    expect(write.mock.calls).toEqual([["user_a", "en"], ["user_a", "pl"]]);
    pending[1].resolve();
    expect(await latest).toBe(true);
  });

  it("shares one request for settings and its synchronous locale-change event", async () => {
    const { writer, write, pending } = fixture();
    const event = writer.save("user_a", "en");
    const settings = writer.save("user_a", "en");
    expect(settings).toBe(event);
    expect(write).toHaveBeenCalledTimes(1);
    pending[0].resolve();
    expect(await settings).toBe(true);
  });

  it("reasserts an explicit later choice because another tab or an uncertain failed request may have changed the server", async () => {
    const { writer, write, pending } = fixture();
    const first = writer.save("user_a", "en");
    pending[0].resolve();
    await first;
    const reasserted = writer.save("user_a", "en");
    expect(write).toHaveBeenCalledTimes(2);
    pending[1].resolve();
    expect(await reasserted).toBe(true);
  });

  it("drops an intermediate choice when the user returns to the language already being saved", async () => {
    const { writer, write, pending } = fixture();
    const first = writer.save("user_a", "en");
    const superseded = writer.save("user_a", "pl");
    const latest = writer.save("user_a", "en");
    expect(await superseded).toBe(false);
    expect(latest).toBe(first);
    pending[0].resolve();
    expect(await latest).toBe(true);
    expect(write.mock.calls).toEqual([["user_a", "en"]]);
  });

  it("discards queued work on account change and never writes an old account's queued preference under the new session", async () => {
    const { writer, write, pending, release } = fixture();
    const inFlight = writer.save("user_a", "en");
    const oldQueued = writer.save("user_a", "pl");
    release();
    expect(await oldQueued).toBe(false);
    expect(await writer.save("user_a", "en")).toBe(false);
    writer.activate("user_b");
    const newAccount = writer.save("user_b", "pl");
    pending[0].resolve();
    expect(await inFlight).toBe(false);
    expect(write.mock.calls).toEqual([["user_a", "en"], ["user_b", "pl"]]);
    pending[1].resolve();
    expect(await newAccount).toBe(true);
  });

  it("continues with the latest choice after an older failure and reports failure of the final write", async () => {
    const { writer, write, pending } = fixture();
    const old = writer.save("user_a", "en");
    const latest = writer.save("user_a", "pl");
    pending[0].reject(new Error("older write failed"));
    expect(await old).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
    const rejected = expect(latest).rejects.toThrow("latest write failed");
    pending[1].reject(new Error("latest write failed"));
    await rejected;
    const retry = writer.save("user_a", "pl");
    expect(write).toHaveBeenCalledTimes(3);
    pending[2].resolve();
    expect(await retry).toBe(true);
  });
});
