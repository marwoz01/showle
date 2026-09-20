import { notFound } from "next/navigation";
import Preview from "@/app/recommend/watchlist-preview/Preview";
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Preview />;
}
