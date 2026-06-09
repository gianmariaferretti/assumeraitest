import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const heroPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "hero-isolation-test-section.tsx",
);
const heroCanvasPath = path.join(
  rootDir,
  "src",
  "components",
  "ui",
  "hero-laptop-canvas.tsx",
);

test("hero title reveal eases toward scroll progress on animation frames", () => {
  const source = readFileSync(heroPath, "utf8");

  assert.match(source, /const targetProgressRef = useRef\(0\)/);
  assert.match(source, /const displayedProgressRef = useRef\(0\)/);
  assert.match(source, /const animateHeroProgress = \(timestamp: number\) =>/);
  assert.match(source, /displayedProgressRef\.current = nextDisplayedProgress/);
  assert.match(source, /applyHeroProgress\(nextDisplayedProgress\)/);
  assert.match(source, /transition: "opacity 320ms cubic-bezier/);
  assert.doesNotMatch(source, /applyHeroProgress\(nextProgress\)/);
});

test("home laptop section does not render its old CTA buttons", () => {
  const source = readFileSync(heroPath, "utf8");

  assert.doesNotMatch(source, /t\.common\.takeInterview/);
  assert.doesNotMatch(source, /t\.common\.hiringTeams/);
  assert.doesNotMatch(source, /t\.hero\.freeForCandidates/);
  assert.match(source, /!isHomeMode &&/);
  assert.match(source, /t\.hero\.testRoute/);
});

test("mobile laptop canvas renders at a sharper DPR with antialiasing", () => {
  const source = readFileSync(heroCanvasPath, "utf8");

  assert.match(source, /const MOBILE_CANVAS_DPR: \[number, number\] = \[1\.5, 2\]/);
  assert.match(source, /dpr=\{isMobile \? MOBILE_CANVAS_DPR : DESKTOP_CANVAS_DPR\}/);
  assert.match(source, /antialias: true/);
  assert.doesNotMatch(source, /dpr=\{isMobile \? 1 : \[1, 2\]\}/);
  assert.doesNotMatch(source, /antialias: !isMobile/);
});

test("laptop canvas avoids crashing when WebGL is unavailable or blocked", () => {
  const source = readFileSync(heroCanvasPath, "utf8");

  assert.match(source, /function canCreateWebGLContext/);
  assert.match(source, /getContext\("webgl2"/);
  assert.match(source, /getContext\("webgl"/);
  assert.match(source, /WEBGL_lose_context/);
  assert.match(source, /LaptopCanvasErrorBoundary/);
  assert.match(source, /getDerivedStateFromError/);
  assert.match(source, /componentDidCatch/);
  assert.match(source, /setIsWebGLAvailable\(false\)/);
  assert.match(source, /webglcontextlost/);
  assert.match(source, /preventDefault/);
  assert.doesNotMatch(source, /return \(\s*<Canvas/);
});

test("home hero shell lazy-loads the heavy three canvas bundle", () => {
  const source = readFileSync(heroPath, "utf8");
  const canvasSource = readFileSync(heroCanvasPath, "utf8");

  assert.match(source, /dynamic\(\s*\(\) => import\("@\/components\/ui\/hero-laptop-canvas"\)/);
  assert.match(source, /ssr: false/);
  assert.doesNotMatch(source, /@react-three\/fiber|@react-three\/drei|from "three"|import \* as THREE/);
  assert.match(canvasSource, /@react-three\/fiber/);
  assert.match(canvasSource, /@react-three\/drei/);
  assert.match(canvasSource, /import \* as THREE from "three"/);
});
