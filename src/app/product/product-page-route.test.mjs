import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const pagePath = path.join(rootDir, "src", "app", "product", "[slug]", "page.tsx");
const companiesAliasPath = path.join(rootDir, "src", "app", "product", "companies", "page.tsx");
const productPagesPath = path.join(rootDir, "src", "lib", "product-pages.ts");

test("product pages are statically generated through a dynamic app route", () => {
  assert.equal(existsSync(pagePath), true);

  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /generateStaticParams/);
  assert.match(source, /params: Promise<\{ slug: string \}>/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, /ProductDetailPage/);
});

test("/product/companies aliases the hiring teams product page", () => {
  assert.equal(existsSync(companiesAliasPath), true);

  const source = readFileSync(companiesAliasPath, "utf8");

  assert.match(source, /ProductDetailPage/);
  assert.match(source, /slug="hiring-teams"/);
});

test("product data exposes only the remaining product surfaces", () => {
  assert.equal(existsSync(productPagesPath), true);

  const source = readFileSync(productPagesPath, "utf8");

  for (const slug of ["candidates", "hiring-teams", "pricing"]) {
    assert.match(source, new RegExp(`"${slug}"`));
  }

  assert.doesNotMatch(source, /"interview"/);
  assert.doesNotMatch(source, /\/product\/interview/);
  assert.match(source, /export const productSlugs/);
  assert.match(source, /export type ProductSlug/);
});
