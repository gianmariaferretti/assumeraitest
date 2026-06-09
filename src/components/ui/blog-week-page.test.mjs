import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const componentPath = path.join(rootDir, "src", "components", "ui", "blog-week-page.tsx");
const routePath = path.join(rootDir, "src", "app", "blog", "page.tsx");
const mainAssetPath = path.join(rootDir, "public", "blog", "candidate-workspace.png");
const portraitAssetPath = path.join(rootDir, "public", "blog", "founder-portrait.png");

test("blog week page follows the provided card layout and Assumerai brand", () => {
  assert.ok(existsSync(componentPath), "expected blog week page component to exist");
  assert.ok(existsSync(routePath), "expected /blog route to exist");
  assert.ok(existsSync(mainAssetPath), "expected generated main editorial image to exist");
  assert.ok(existsSync(portraitAssetPath), "expected generated portrait image to exist");

  const source = readFileSync(componentPath, "utf8");
  const route = readFileSync(routePath, "utf8");

  assert.match(source, /Blogs worth reading/);
  assert.doesNotMatch(source, /Best of the week/);
  assert.match(source, /Assumerai/);
  assert.match(source, /candidate-workspace\.png/);
  assert.match(source, /founder-portrait\.png/);
  assert.match(source, /var\(--font-geist-sans\)/);
  assert.match(source, /#f7c8d9/);
  assert.match(source, /#a8c5f1/);
  assert.match(source, /className="w-full overflow-x-hidden bg-white px-4 pb-12 pt-24/);
  assert.doesNotMatch(source, /bg-\[#111111\]/);
  assert.doesNotMatch(source, /shadow-\[0_28px_80px/);
  assert.match(source, /overflow-x-hidden/);
  assert.match(source, /text-\[clamp\(2\.75rem,7vw,5\.2rem\)\] font-extrabold/);
  assert.match(source, /lg:grid-cols-\[minmax\(0,1\.75fr\)_minmax\(280px,0\.68fr\)\]/);
  assert.match(source, /mt-8 grid min-w-0 gap-5/);
  assert.match(source, /aspect-\[1\.32\/1\]/);
  assert.match(source, /sm:aspect-\[1\.55\/1\]/);
  assert.match(source, /grid w-full min-w-0 gap-5/);
  assert.match(source, /relative w-full min-w-0/);
  assert.match(source, /sticky top-24/);
  assert.doesNotMatch(source, /See all picks/);
  assert.match(route, /BlogWeekPage/);
  assert.match(route, /Blog \| Assumerai/);
});
