"use client";

import Link from "next/link";
import { UserRound } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import SocialActions from "@/components/profile/social/SocialActions";
import type { SocialPerson } from "@/types/social";

export default function SocialPersonCard({ person, onChanged }: { person: SocialPerson; onChanged: (next: SocialPerson) => void }) {
  const { t } = useTranslation();
  const canView = person.isPublic || person.relationship.isSelf || person.relationship.friendship === "friends";
  return <article className="space-y-4 rounded-xl border border-white/8 bg-white/3 p-4">
    <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-purple/15 text-accent-purple">
      {person.avatarUrl ? (
        // Avatars come from the verified account identity.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" width={44} height={44} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : <UserRound size={20} />}
    </div><div className="min-w-0 flex-1"><h3 className="break-words font-display font-semibold">{person.displayName}</h3>{!person.isPublic && <p className="mt-1 text-xs text-muted">{t.social.private}</p>}{person.bio && <p className="mt-1 line-clamp-2 break-words text-sm text-muted">{person.bio}</p>}</div></div>
    {canView && <Link href={`/u/${person.publicSlug}`} className="inline-flex min-h-9 items-center text-sm font-medium text-accent-purple hover:underline">{t.social.view}</Link>}
    <SocialActions person={person} onChanged={onChanged} />
  </article>;
}
