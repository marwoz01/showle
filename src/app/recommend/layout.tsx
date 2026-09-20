import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => publicPageMetadata("/recommend");
export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
