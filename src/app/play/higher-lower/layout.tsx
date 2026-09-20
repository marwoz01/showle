import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => publicPageMetadata("/play/higher-lower");
export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
