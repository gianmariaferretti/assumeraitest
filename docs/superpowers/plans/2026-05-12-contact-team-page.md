# Contact Team Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a combined Contact Us and Our Team page that follows the supplied visual reference while matching the Assumerai landing page brand.

**Architecture:** Add a dedicated App Router route at `/contact` that renders a focused client component. Keep content localized through the existing `useI18n` system, keep the generated portrait asset in `public`, and update existing layout links to the new route.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, `next/image`, `lucide-react`, Node test runner source tests.

---

### Task 1: Source Tests

**Files:**
- Create: `src/app/contact/page.test.mjs`
- Create: `src/components/ui/contact-team-page.test.mjs`

- [ ] **Step 1: Write route test**

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const pagePath = path.join(rootDir, "src", "app", "contact", "page.tsx");

test("contact route renders the combined contact and team page", () => {
  assert.ok(existsSync(pagePath), "expected /contact page to exist");
  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /ContactTeamPage/);
  assert.match(source, /metadata/);
});
```

- [ ] **Step 2: Write component/link/i18n test**

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const componentPath = path.join(rootDir, "src", "components", "ui", "contact-team-page.tsx");
const i18nPath = path.join(rootDir, "src", "lib", "i18n.tsx");
const headerPath = path.join(rootDir, "src", "components", "layout", "header.tsx");
const footerPath = path.join(rootDir, "src", "components", "layout", "footer.tsx");
const assetPath = path.join(rootDir, "public", "contact", "team-orbit.png");

test("contact team page follows the approved reference structure", () => {
  assert.ok(existsSync(componentPath), "expected contact team component to exist");
  assert.ok(existsSync(assetPath), "expected generated portrait orbit asset to exist");

  const source = readFileSync(componentPath, "utf8");
  const translations = readFileSync(i18nPath, "utf8");
  const header = readFileSync(headerPath, "utf8");
  const footer = readFileSync(footerPath, "utf8");

  assert.match(source, /useI18n/);
  assert.match(source, /team-orbit\.png/);
  assert.match(source, /var\(--font-geist-sans\)/);
  assert.match(source, /var\(--font-instrument-serif\)/);
  assert.match(source, /linear-gradient\(110deg, #f7c8d9/);
  assert.match(source, /Contact us/);
  assert.match(source, /Our team/);
  assert.match(translations, /contactTeam/);
  assert.match(translations, /Reach out and we'll get in touch within 24 hours/);
  assert.match(translations, /Built by people who have sat on both sides of the hiring table/);
  assert.match(header, /href: "\/contact"/);
  assert.match(footer, /href: "\/contact"/);
});
```

- [ ] **Step 3: Run tests to verify red**

Run: `node --test src/app/contact/page.test.mjs src/components/ui/contact-team-page.test.mjs`

Expected: fails because the route, component, and asset do not exist yet.

### Task 2: Asset

**Files:**
- Create: `public/contact/team-orbit.png`

- [ ] **Step 1: Copy generated asset into the project**

Copy the selected generated image from `C:\Users\kovac\.codex\generated_images\019e1ca9-b705-7413-8bf8-5223d30c1615` to `public/contact/team-orbit.png`.

### Task 3: Page And Component

**Files:**
- Create: `src/app/contact/page.tsx`
- Create: `src/components/ui/contact-team-page.tsx`
- Modify: `src/lib/i18n.tsx`

- [ ] **Step 1: Implement route**

Create a metadata-exporting App Router page that returns `<ContactTeamPage />`.

- [ ] **Step 2: Implement component**

Build the split contact hero, accessible form fields, generated portrait image panel, and below-hero team section using the existing landing page fonts and gradient.

- [ ] **Step 3: Add translations**

Add `contactTeam` content to English, Italian, and French translation objects with matching structure.

- [ ] **Step 4: Run tests to verify green**

Run: `node --test src/app/contact/page.test.mjs src/components/ui/contact-team-page.test.mjs`

Expected: pass.

### Task 4: Navigation And Verification

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/footer.tsx`

- [ ] **Step 1: Update links**

Add a header company/contact link to `/contact` and change footer Company contact/about links to `/contact` or `/contact#team`.

- [ ] **Step 2: Run source tests**

Run: `node --test src/app/contact/page.test.mjs src/components/ui/contact-team-page.test.mjs`

Expected: pass.

- [ ] **Step 3: Run lint and type checks**

Run: `.\\node_modules\\.bin\\eslint.cmd src\\app\\contact\\page.tsx src\\components\\ui\\contact-team-page.tsx src\\components\\layout\\header.tsx src\\components\\layout\\footer.tsx src\\lib\\i18n.tsx`

Run: `.\\node_modules\\.bin\\tsc.cmd --noEmit --pretty false --incremental false`

Expected: both exit 0.

- [ ] **Step 4: Browser verify**

Start or reuse the local Next dev server, open `/contact`, and verify the layout renders on desktop and mobile widths without overlap.
