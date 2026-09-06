"use client";
import { normalizeDisplayText } from "@/lib/typography";

import Image from "next/image";
import { User } from "@/components/ui/icons";
import { CastMember } from "@/types";

interface CastListProps {
  cast: CastMember[];
  label: string;
}

export default function CastList({ cast, label }: CastListProps) {
  if (cast.length === 0) return null;

  return (
    <>
      <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </h4>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,145px),1fr))] gap-x-4 gap-y-3">
        {cast.map((member) => (
          <div key={member.name} className="flex min-h-12 min-w-0 items-center gap-2.5">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/5">
              {member.profilePath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w185${member.profilePath}`}
                  alt={normalizeDisplayText(member.name)}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted/60">
                  <User size={18} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p title={normalizeDisplayText(member.name)} className="line-clamp-2 text-xs font-semibold text-foreground">
                {normalizeDisplayText(member.name)}
              </p>
              {member.character && (
                <p title={normalizeDisplayText(member.character)} className="truncate text-[10px] text-muted">
                  {normalizeDisplayText(member.character)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
