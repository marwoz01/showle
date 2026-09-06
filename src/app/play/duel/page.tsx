import FrameGame from "@/components/game/FrameGame";
import { parseDuelInvitation } from "@/lib/duel-invite";

export default async function DuelPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const invitation = parseDuelInvitation((await searchParams).code);
  return (
    <FrameGame
      key={invitation.status === "valid" ? invitation.code : invitation.status}
      invitation={invitation}
    />
  );
}
