import MovieChoiceRoom from "@/components/recommend/MovieChoiceRoom";

export default async function TogetherPage({ searchParams }: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { code } = await searchParams;
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  const valid = /^[A-Z0-9]{6}$/.test(normalized);
  return <MovieChoiceRoom key={valid ? normalized : "new"} initialCode={valid ? normalized : null} invalidInvitation={code !== undefined && !valid} />;
}
