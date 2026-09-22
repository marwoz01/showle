"use client";

import Image from "next/image";
import { Film } from "@/components/ui/icons";
import type { ProfileMovie } from "@/types/profile";

export default function ProfileMovieGrid({ movies }: { movies: ProfileMovie[] }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
    {movies.map((movie) => <article key={movie.id} className="min-w-0">
      <div className="relative mb-3 aspect-2/3 overflow-hidden rounded-xl border border-white/8 bg-white/3">
        {movie.posterPath ? <Image src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt="" fill sizes="(max-width: 640px) 42vw, 210px" className="object-cover" />
          : <div className="flex h-full items-center justify-center text-muted"><Film size={32} /></div>}
      </div>
      <h3 className="text-sm font-semibold leading-snug text-foreground">{movie.title}</h3>
      {movie.year > 0 && <p className="mt-1 text-xs text-muted">{movie.year}</p>}
    </article>)}
  </div>;
}
