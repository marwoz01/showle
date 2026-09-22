import PublicProfileView from "@/components/profile/public/PublicProfileView";

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProfileView key={slug} slug={slug} />;
}
