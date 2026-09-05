"use client";

import Image from "next/image";
import { User } from "lucide-react";
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 2xl:grid-cols-4">
        {cast.map((member) => (
          <div key={member.name} className="flex items-center gap-2.5">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/5">
              {member.profilePath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w185${member.profilePath}`}
                  alt={member.name}
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
              <p className="truncate text-xs font-semibold text-foreground">
                {member.name}
              </p>
              {member.character && (
                <p className="truncate text-[10px] text-muted">
                  {member.character}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
