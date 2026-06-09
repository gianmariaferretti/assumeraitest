import { notFound } from "next/navigation";
import ProductDetailPage from "@/components/ui/product-detail-page";
import { isProductSlug, productSlugs } from "@/lib/product-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return productSlugs.map((slug) => ({ slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isProductSlug(slug)) {
    notFound();
  }

  return <ProductDetailPage slug={slug} />;
}
