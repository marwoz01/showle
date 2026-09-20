export function legalIdentity() {
  const controller = process.env.SHOWLE_DATA_CONTROLLER?.trim();
  const email = process.env.SHOWLE_CONTACT_EMAIL?.trim();
  if (!controller || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { controller, email };
}
