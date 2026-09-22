export async function profileMutation(path: string, body: unknown, method = "PATCH"): Promise<void> {
  const response = await fetch(path, {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("profile_update_failed");
}
