"use client";

import { useState } from "react";
import { User } from "@/components/ui/icons";

export default function SidebarAvatar({ imageUrl }: { imageUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-purple/20 text-accent-purple">
    {imageUrl && !failed ? (
      // Clerk already serves the user's avatar at an optimized image URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" width={32} height={32} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
    ) : <User size={16} />}
  </span>;
}
