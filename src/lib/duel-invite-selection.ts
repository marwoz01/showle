type InviteInput = Pick<HTMLInputElement, "value" | "focus" | "select" | "setSelectionRange">;

export function selectDuelInvite(input: InviteInput | null): boolean {
  if (!input?.value) return false;
  try {
    input.focus({ preventScroll: true });
    input.select();
    // Explicitly select the entire address, including on mobile Safari.
    input.setSelectionRange(0, input.value.length);
    return true;
  } catch {
    return false;
  }
}

export function copySelectedDuelInvite(
  input: (InviteInput & { ownerDocument: Pick<Document, "execCommand"> }) | null,
): boolean {
  if (!selectDuelInvite(input) || !input) return false;
  try {
    // Compatibility fallback only; never request read/paste permission.
    return input.ownerDocument.execCommand("copy") === true;
  } catch {
    return false;
  }
}
