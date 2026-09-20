import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => publicPageMetadata("/play/practice");
export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
