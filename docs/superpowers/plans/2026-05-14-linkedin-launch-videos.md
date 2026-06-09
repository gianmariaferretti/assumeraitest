# LinkedIn Launch Videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two 15-second, 1080x1350 LinkedIn launch videos for Assumerai: one for candidates and one for hiring teams.

**Architecture:** Create one campaign directory under `videos/assumerai-linkedin-launch/` with shared brand/motion files and two renderable HyperFrames composition roots, `candidate/index.html` and `hiring-teams/index.html`. This keeps the campaign unified while matching the HyperFrames CLI workflow, which renders a directory's `index.html`.

**Tech Stack:** HyperFrames HTML compositions, GSAP 3.14.2 timelines, local PNG assets from `public/`, Windows `cmd /c npx.cmd` commands, and HyperFrames lint/validate/inspect/render checks.

---

## File Structure

- Create: `videos/assumerai-linkedin-launch/DESIGN.md`
  - Owns the approved visual identity: palette, typography, motion rules, and anti-patterns.
- Create: `videos/assumerai-linkedin-launch/README.md`
  - Documents preview, validation, and render commands for both videos.
- Create: `videos/assumerai-linkedin-launch/shared/assumerai-launch.css`
  - Shared 1080x1350 layout, typography, scene, card, CTA, transition overlay, and asset-frame styling.
- Create: `videos/assumerai-linkedin-launch/shared/assumerai-motion.js`
  - Shared GSAP helper functions for scene transitions, gradient sweeps, and finite ambient motion.
- Create: `videos/assumerai-linkedin-launch/assets/`
  - Copied launch assets from `public/` so each HyperFrames composition has stable local relative paths.
- Create: `videos/assumerai-linkedin-launch/candidate/index.html`
  - Standalone HyperFrames composition for the candidate video.
- Create: `videos/assumerai-linkedin-launch/hiring-teams/index.html`
  - Standalone HyperFrames composition for the hiring-team video.
- Create: `videos/assumerai-linkedin-launch/renders/.gitkeep`
  - Keeps the render output directory visible while final MP4s remain generated artifacts.

Do not modify the Next.js website source for this work.

---

### Task 1: Campaign Scaffold And Shared Identity

**Files:**
- Create: `videos/assumerai-linkedin-launch/DESIGN.md`
- Create: `videos/assumerai-linkedin-launch/README.md`
- Create: `videos/assumerai-linkedin-launch/shared/assumerai-launch.css`
- Create: `videos/assumerai-linkedin-launch/shared/assumerai-motion.js`
- Create: `videos/assumerai-linkedin-launch/assets/`
- Create: `videos/assumerai-linkedin-launch/renders/.gitkeep`

- [ ] **Step 1: Confirm runtime commands**

Run from repo root:

```powershell
node --version
cmd /c npx.cmd hyperframes --version
```

Expected:

- Node prints a version at or above `v22`.
- HyperFrames prints a version or downloads through `npx.cmd` and then prints a version.
- If `cmd /c npx.cmd hyperframes --version` fails because network access is blocked, rerun it with escalation. Do not use `npm` directly in PowerShell because this machine blocks `npm.ps1`.

- [ ] **Step 2: Create the campaign directories**

Run:

```powershell
New-Item -ItemType Directory -Force -Path `
  videos\assumerai-linkedin-launch\shared, `
  videos\assumerai-linkedin-launch\assets\cards_for_candidates, `
  videos\assumerai-linkedin-launch\assets\dashboard, `
  videos\assumerai-linkedin-launch\assets\logos, `
  videos\assumerai-linkedin-launch\assets\landing, `
  videos\assumerai-linkedin-launch\candidate, `
  videos\assumerai-linkedin-launch\hiring-teams, `
  videos\assumerai-linkedin-launch\renders
```

Expected: all directories exist.

- [ ] **Step 3: Copy the exact assets**

Run:

```powershell
Copy-Item public\cards_for_candidates\postal.png videos\assumerai-linkedin-launch\assets\cards_for_candidates\postal.png
Copy-Item public\cards_for_candidates\interview.png videos\assumerai-linkedin-launch\assets\cards_for_candidates\interview.png
Copy-Item public\cards_for_candidates\scorecard.png videos\assumerai-linkedin-launch\assets\cards_for_candidates\scorecard.png
Copy-Item public\cards_for_candidates\calendar.png videos\assumerai-linkedin-launch\assets\cards_for_candidates\calendar.png
Copy-Item public\dashboard\dashboard_view.png videos\assumerai-linkedin-launch\assets\dashboard\dashboard_view.png
Copy-Item public\dashboard\dashboard_when_i_click_review.png videos\assumerai-linkedin-launch\assets\dashboard\dashboard_when_i_click_review.png
Copy-Item public\dashboard\dashboard_calendar.png videos\assumerai-linkedin-launch\assets\dashboard\dashboard_calendar.png
Copy-Item public\dashboard\dashboard_analytics.png videos\assumerai-linkedin-launch\assets\dashboard\dashboard_analytics.png
Copy-Item public\logos\assumer-logo.png videos\assumerai-linkedin-launch\assets\logos\assumer-logo.png
Copy-Item public\landing\interview-outcomes.png videos\assumerai-linkedin-launch\assets\landing\interview-outcomes.png
New-Item -ItemType File -Force -Path videos\assumerai-linkedin-launch\renders\.gitkeep
```

Expected: each copied file exists in `videos/assumerai-linkedin-launch/assets/`.

- [ ] **Step 4: Write `DESIGN.md`**

Create `videos/assumerai-linkedin-launch/DESIGN.md` with this content:

```markdown
# Smooth Kinetic Assumerai

## Style Prompt

Premium kinetic LinkedIn launch videos for Assumerai. The visual system should feel like the current landing page in motion: clean Geist Sans typography, occasional Instrument Serif softness, white and deep navy surfaces, polished product cards, 8px radii, pill CTAs, subtle shadows, and the rose-lavender-blue brand gradient used as rails and sweeps. The work should be thumb-stopping but never chaotic.

## Colors

- Background light: `#f8fbff`
- Surface white: `#ffffff`
- Deep navy: `#061020`
- Brand navy text: `#0b2146`
- Slate body text: `#64748b`
- Brand rose: `#f7c8d9`
- Brand lavender: `#e0b8e6`
- Brand violet: `#b9b8ee`
- Brand blue: `#a8c5f1`

## Typography

- Primary: `Geist`, `Arial`, sans-serif
- Accent: `Instrument Serif`, `Georgia`, serif
- Headlines: Geist 800-900, tight tracking, 80px minimum in rendered video
- Body and labels: Geist 500-800, 22px minimum for body, 16px minimum for labels
- Accent phrase: Instrument Serif italic only for one short phrase per final or hiring-team scene

## Motion

- Headlines enter 24-56px with `power3.out` or `expo.out`.
- Product frames glide with mild scale and soft settling.
- Gradient rails sweep once per scene.
- Transitions are smooth CSS cover/blur/scale transitions, 0.35-0.6s.
- Every scene has entrance animation. Intermediate scenes do not use exit tweens; transitions handle scene changes.

## What NOT To Do

- No red/yellow maximalist launch palette.
- No chaotic rotations, glitch, VHS, hard shake, or aggressive poster styling.
- No generic blue-purple neon tech gradients.
- No Roboto, Inter, Open Sans, Poppins, or other banned default fonts.
- No full-screen empty gradients without product, type, or structural framing.
```

- [ ] **Step 5: Write the shared CSS**

Create `videos/assumerai-linkedin-launch/shared/assumerai-launch.css` with these required sections:

```css
:root {
  --bg-light: #f8fbff;
  --surface: #ffffff;
  --navy: #061020;
  --brand-navy: #0b2146;
  --slate: #64748b;
  --rose: #f7c8d9;
  --lavender: #e0b8e6;
  --violet: #b9b8ee;
  --blue: #a8c5f1;
  --gradient: linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%);
}

* { box-sizing: border-box; }

html,
body {
  margin: 0;
  width: 1080px;
  height: 1350px;
  overflow: hidden;
  background: var(--bg-light);
  color: var(--brand-navy);
  font-family: "Geist", Arial, sans-serif;
}

[data-composition-id] {
  position: relative;
  width: 1080px;
  height: 1350px;
  overflow: hidden;
  background: var(--bg-light);
}

.scene {
  position: absolute;
  inset: 0;
  width: 1080px;
  height: 1350px;
  overflow: hidden;
  background: var(--bg-light);
}

.scene.is-dark { background: var(--navy); color: #ffffff; }
.scene:not(:first-of-type) { opacity: 0; }

.scene-content {
  position: relative;
  z-index: 3;
  width: 100%;
  height: 100%;
  padding: 92px 78px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 36px;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  font-size: 24px;
  font-weight: 800;
}

.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}

.brand-mark {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  background: var(--gradient);
  box-shadow: 0 18px 40px rgba(168, 197, 241, 0.34);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.brand-mark img {
  width: 58px;
  height: 58px;
  object-fit: contain;
  transform: scale(1.42);
}

.eyebrow {
  font-size: 18px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
  color: #789add;
}

.headline {
  max-width: 850px;
  margin: 0;
  font-size: 112px;
  line-height: 0.9;
  letter-spacing: -0.045em;
  font-weight: 900;
}

.headline .light {
  display: block;
  font-weight: 300;
  letter-spacing: -0.035em;
}

.accent-serif {
  font-family: "Instrument Serif", Georgia, serif;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: #c6d6ff;
}

.microcopy {
  max-width: 700px;
  margin: 0;
  font-size: 32px;
  line-height: 1.18;
  font-weight: 650;
  color: rgba(11, 33, 70, 0.72);
}

.is-dark .microcopy { color: rgba(255, 255, 255, 0.72); }

.gradient-rail {
  width: 420px;
  height: 12px;
  border-radius: 999px;
  background: var(--gradient);
  transform-origin: left center;
}

.product-frame {
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 28px 84px rgba(15, 23, 42, 0.16);
}

.browser-bar {
  height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.browser-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.browser-dot:nth-child(1) { background: var(--rose); }
.browser-dot:nth-child(2) { background: var(--lavender); }
.browser-dot:nth-child(3) { background: var(--blue); }

.product-frame img {
  display: block;
  width: 100%;
  height: auto;
}

.chip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.signal-chip {
  min-height: 138px;
  border-radius: 8px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.signal-chip strong {
  display: block;
  font-size: 26px;
  line-height: 1;
}

.signal-chip span {
  display: block;
  margin-top: 12px;
  font-size: 17px;
  line-height: 1.25;
  color: rgba(255, 255, 255, 0.68);
}

.cta-pill {
  display: inline-flex;
  width: max-content;
  align-items: center;
  justify-content: center;
  min-height: 58px;
  border-radius: 999px;
  padding: 0 28px;
  background: var(--gradient);
  color: var(--navy);
  font-size: 22px;
  font-weight: 850;
  box-shadow: 0 20px 46px rgba(168, 197, 241, 0.28);
}

.transition-cover {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  transform: translateX(-110%);
  background: var(--gradient);
}

.soft-glow {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 999px;
  filter: blur(44px);
  opacity: 0.68;
  background: radial-gradient(circle, rgba(168,197,241,0.58), rgba(224,184,230,0.28) 42%, rgba(248,251,255,0) 72%);
}
```

Expected: no CSS variables are used in shader transitions because this plan uses CSS-only transitions.

- [ ] **Step 6: Write the shared motion helper**

Create `videos/assumerai-linkedin-launch/shared/assumerai-motion.js`:

```js
function introScene(tl, sceneSelector, start) {
  tl.from(`${sceneSelector} .eyebrow`, { y: 22, opacity: 0, duration: 0.38, ease: "power3.out" }, start + 0.18);
  tl.from(`${sceneSelector} .headline`, { y: 48, opacity: 0, duration: 0.58, ease: "expo.out" }, start + 0.3);
  tl.from(`${sceneSelector} .microcopy`, { x: -28, opacity: 0, duration: 0.42, ease: "power2.out" }, start + 0.64);
  tl.from(`${sceneSelector} .gradient-rail`, { scaleX: 0, duration: 0.5, ease: "power3.out" }, start + 0.78);
}

function introProduct(tl, selector, start, vars) {
  tl.from(selector, {
    y: vars && vars.y !== undefined ? vars.y : 42,
    x: vars && vars.x !== undefined ? vars.x : 0,
    scale: vars && vars.scale !== undefined ? vars.scale : 0.96,
    opacity: 0,
    duration: vars && vars.duration ? vars.duration : 0.62,
    ease: vars && vars.ease ? vars.ease : "power3.out",
  }, start);
}

function sweepToScene(tl, coverSelector, outgoingSelector, incomingSelector, start) {
  tl.set(incomingSelector, { opacity: 1 }, start + 0.18);
  tl.fromTo(coverSelector, { xPercent: -110 }, { xPercent: 0, duration: 0.28, ease: "power3.inOut" }, start);
  tl.set(outgoingSelector, { opacity: 0 }, start + 0.29);
  tl.fromTo(coverSelector, { xPercent: 0 }, { xPercent: 110, duration: 0.32, ease: "power3.inOut" }, start + 0.3);
}

function ambientFloat(tl, selector, start, duration, amount) {
  var cycle = 3;
  var repeats = Math.ceil(duration / cycle) - 1;
  tl.to(selector, {
    y: amount,
    duration: cycle / 2,
    repeat: repeats * 2,
    yoyo: true,
    ease: "sine.inOut",
  }, start);
}

window.AssumerMotion = {
  introScene,
  introProduct,
  sweepToScene,
  ambientFloat,
};
```

Expected: no `repeat: -1`; ambient repeat count is finite.

- [ ] **Step 7: Verify scaffold**

Run:

```powershell
Test-Path videos\assumerai-linkedin-launch\DESIGN.md
Test-Path videos\assumerai-linkedin-launch\shared\assumerai-launch.css
Test-Path videos\assumerai-linkedin-launch\shared\assumerai-motion.js
Test-Path videos\assumerai-linkedin-launch\assets\logos\assumer-logo.png
```

Expected: every command prints `True`.

- [ ] **Step 8: Commit scaffold**

Run:

```powershell
git add videos\assumerai-linkedin-launch
git commit -m "Add launch video campaign scaffold"
```

Expected: commit succeeds.

---

### Task 2: Candidate Composition

**Files:**
- Create: `videos/assumerai-linkedin-launch/candidate/index.html`
- Modify: no website source files

- [ ] **Step 1: Create the candidate HTML composition**

Create `videos/assumerai-linkedin-launch/candidate/index.html` as a standalone HyperFrames file. It must include:

- Root div:

```html
<div id="candidate-root" data-composition-id="assumerai-candidate-linkedin" data-width="1080" data-height="1350" data-start="0" data-duration="15">
```

- Four scene containers: `#candidate-s1`, `#candidate-s2`, `#candidate-s3`, `#candidate-s4`.
- One `.transition-cover` element.
- CDN GSAP script: `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`.
- Local shared CSS: `../shared/assumerai-launch.css`.
- Local shared motion JS: `../shared/assumerai-motion.js`.
- Timeline registration:

```js
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
window.__timelines["assumerai-candidate-linkedin"] = tl;
```

Scene copy must be exactly:

- Scene 1 headline: `Stop repeating yourself.`
- Scene 1 microcopy: `One CV. One interview.`
- Scene 2 headline: `Do the work once.`
- Scene 2 microcopy: `CV intake. Adaptive interview. One scorecard.`
- Scene 3 headline: `Get matched to companies that fit.`
- Scene 3 microcopy: `Role context, fit scores, and a real reason every time.`
- Scene 4 headline: `Assumerai`
- Scene 4 microcopy: `Take the interview once.`
- CTA: `Take the interview`

Asset paths must be exactly:

- `../assets/logos/assumer-logo.png`
- `../assets/cards_for_candidates/postal.png`
- `../assets/cards_for_candidates/interview.png`
- `../assets/cards_for_candidates/scorecard.png`
- `../assets/landing/interview-outcomes.png`

- [ ] **Step 2: Add candidate timeline choreography**

Inside the candidate HTML script, after creating `tl`, add this choreography shape:

```js
AssumerMotion.introScene(tl, "#candidate-s1", 0);
tl.from("#candidate-s1 .brand-row", { y: -22, opacity: 0, duration: 0.42, ease: "power2.out" }, 0.16);
tl.to("#candidate-s1 .soft-glow", { scale: 1.08, x: 20, duration: 2.2, ease: "sine.inOut" }, 0.2);

AssumerMotion.sweepToScene(tl, "#candidate-cover", "#candidate-s1", "#candidate-s2", 2.25);
AssumerMotion.introScene(tl, "#candidate-s2", 2.65);
AssumerMotion.introProduct(tl, "#candidate-cv-card", 3.0, { x: -42, y: 28, duration: 0.58, ease: "power3.out" });
AssumerMotion.introProduct(tl, "#candidate-interview-card", 3.26, { y: 44, duration: 0.62, ease: "expo.out" });
AssumerMotion.introProduct(tl, "#candidate-scorecard-card", 3.52, { x: 42, y: 28, duration: 0.58, ease: "power2.out" });
AssumerMotion.ambientFloat(tl, "#candidate-interview-card", 4.2, 2.2, -10);

AssumerMotion.sweepToScene(tl, "#candidate-cover", "#candidate-s2", "#candidate-s3", 6.55);
AssumerMotion.introScene(tl, "#candidate-s3", 6.95);
AssumerMotion.introProduct(tl, "#candidate-outcome-frame", 7.35, { y: 54, scale: 0.95, duration: 0.68, ease: "power3.out" });
tl.from("#candidate-s3 .match-chip", { y: 26, opacity: 0, duration: 0.38, stagger: 0.12, ease: "power2.out" }, 8.08);

AssumerMotion.sweepToScene(tl, "#candidate-cover", "#candidate-s3", "#candidate-s4", 11.55);
AssumerMotion.introScene(tl, "#candidate-s4", 11.95);
tl.from("#candidate-s4 .brand-mark", { scale: 0.8, opacity: 0, duration: 0.46, ease: "back.out(1.4)" }, 12.1);
tl.from("#candidate-s4 .cta-pill", { y: 28, opacity: 0, duration: 0.42, ease: "power3.out" }, 12.7);
tl.to("#candidate-s4", { opacity: 0, duration: 0.55, ease: "sine.inOut" }, 14.35);
```

Expected: scene transitions happen at `2.25`, `6.55`, and `11.55`; only the final scene fades out.

- [ ] **Step 3: Run candidate static checks**

Run:

```powershell
Select-String -Path videos\assumerai-linkedin-launch\candidate\index.html -Pattern 'data-composition-id="assumerai-candidate-linkedin"'
Select-String -Path videos\assumerai-linkedin-launch\candidate\index.html -Pattern 'window.__timelines\["assumerai-candidate-linkedin"\]'
Select-String -Path videos\assumerai-linkedin-launch\candidate\index.html -Pattern 'repeat: -1'
```

Expected:

- First command finds the root composition.
- Second command finds timeline registration.
- Third command finds nothing.

- [ ] **Step 4: Run HyperFrames candidate checks**

Run:

```powershell
Set-Location videos\assumerai-linkedin-launch\candidate
cmd /c npx.cmd hyperframes lint
cmd /c npx.cmd hyperframes validate
cmd /c npx.cmd hyperframes inspect --samples 12
Set-Location ..\..\..
```

Expected: lint and validate pass; inspect reports no text overflow or only intentional decorative overflow marked with `data-layout-ignore`.

- [ ] **Step 5: Commit candidate composition**

Run:

```powershell
git add videos\assumerai-linkedin-launch\candidate\index.html
git commit -m "Add candidate LinkedIn launch composition"
```

Expected: commit succeeds.

---

### Task 3: Hiring-Team Composition

**Files:**
- Create: `videos/assumerai-linkedin-launch/hiring-teams/index.html`
- Modify: no website source files

- [ ] **Step 1: Create the hiring-team HTML composition**

Create `videos/assumerai-linkedin-launch/hiring-teams/index.html` as a standalone HyperFrames file. It must include:

- Root div:

```html
<div id="hiring-root" data-composition-id="assumerai-hiring-teams-linkedin" data-width="1080" data-height="1350" data-start="0" data-duration="15">
```

- Four scene containers: `#hiring-s1`, `#hiring-s2`, `#hiring-s3`, `#hiring-s4`.
- One `.transition-cover` element.
- CDN GSAP script: `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`.
- Local shared CSS: `../shared/assumerai-launch.css`.
- Local shared motion JS: `../shared/assumerai-motion.js`.
- Timeline registration:

```js
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
window.__timelines["assumerai-hiring-teams-linkedin"] = tl;
```

Scene copy must be exactly:

- Scene 1 headline: `Skim 14, not 312.`
- Scene 1 microcopy: `Pre-interviewed. Pre-scored.`
- Scene 2 headline: `Every candidate arrives with signal.`
- Scene 2 microcopy: `Scores tied to transcripts, role fit, and proof points.`
- Scene 3 headline: `Scores. Transcripts. Calendar next steps.`
- Scene 3 microcopy: `Move from review queue to interview slots without the application pile.`
- Scene 4 headline: `Assumerai`
- Scene 4 microcopy: `Hire from evidence, not volume.`
- CTA: `Book a 20-min walkthrough`

Asset paths must be exactly:

- `../assets/logos/assumer-logo.png`
- `../assets/dashboard/dashboard_view.png`
- `../assets/dashboard/dashboard_when_i_click_review.png`
- `../assets/dashboard/dashboard_calendar.png`
- `../assets/dashboard/dashboard_analytics.png`

- [ ] **Step 2: Add hiring-team timeline choreography**

Inside the hiring-team HTML script, after creating `tl`, add this choreography shape:

```js
AssumerMotion.introScene(tl, "#hiring-s1", 0);
tl.from("#hiring-s1 .brand-row", { y: -22, opacity: 0, duration: 0.42, ease: "power2.out" }, 0.16);
tl.to("#hiring-s1 .soft-glow", { scale: 1.1, x: -24, duration: 2.15, ease: "sine.inOut" }, 0.2);

AssumerMotion.sweepToScene(tl, "#hiring-cover", "#hiring-s1", "#hiring-s2", 2.25);
AssumerMotion.introScene(tl, "#hiring-s2", 2.65);
AssumerMotion.introProduct(tl, "#hiring-dashboard-main", 3.05, { y: 54, scale: 0.95, duration: 0.68, ease: "power3.out" });
AssumerMotion.introProduct(tl, "#hiring-review-card", 3.55, { x: 42, y: 28, duration: 0.58, ease: "expo.out" });

AssumerMotion.sweepToScene(tl, "#hiring-cover", "#hiring-s2", "#hiring-s3", 6.55);
AssumerMotion.introScene(tl, "#hiring-s3", 6.95);
tl.from("#hiring-s3 .signal-chip", { y: 30, opacity: 0, duration: 0.42, stagger: 0.14, ease: "power3.out" }, 7.55);
AssumerMotion.introProduct(tl, "#hiring-calendar-frame", 8.18, { y: 44, scale: 0.96, duration: 0.55, ease: "power2.out" });

AssumerMotion.sweepToScene(tl, "#hiring-cover", "#hiring-s3", "#hiring-s4", 11.55);
AssumerMotion.introScene(tl, "#hiring-s4", 11.95);
tl.from("#hiring-s4 .brand-mark", { scale: 0.8, opacity: 0, duration: 0.46, ease: "back.out(1.4)" }, 12.1);
tl.from("#hiring-s4 .cta-pill", { y: 28, opacity: 0, duration: 0.42, ease: "power3.out" }, 12.7);
tl.to("#hiring-s4", { opacity: 0, duration: 0.55, ease: "sine.inOut" }, 14.35);
```

Expected: scene transitions happen at `2.25`, `6.55`, and `11.55`; only the final scene fades out.

- [ ] **Step 3: Run hiring-team static checks**

Run:

```powershell
Select-String -Path videos\assumerai-linkedin-launch\hiring-teams\index.html -Pattern 'data-composition-id="assumerai-hiring-teams-linkedin"'
Select-String -Path videos\assumerai-linkedin-launch\hiring-teams\index.html -Pattern 'window.__timelines\["assumerai-hiring-teams-linkedin"\]'
Select-String -Path videos\assumerai-linkedin-launch\hiring-teams\index.html -Pattern 'repeat: -1'
```

Expected:

- First command finds the root composition.
- Second command finds timeline registration.
- Third command finds nothing.

- [ ] **Step 4: Run HyperFrames hiring-team checks**

Run:

```powershell
Set-Location videos\assumerai-linkedin-launch\hiring-teams
cmd /c npx.cmd hyperframes lint
cmd /c npx.cmd hyperframes validate
cmd /c npx.cmd hyperframes inspect --samples 12
Set-Location ..\..\..
```

Expected: lint and validate pass; inspect reports no text overflow or only intentional decorative overflow marked with `data-layout-ignore`.

- [ ] **Step 5: Commit hiring-team composition**

Run:

```powershell
git add videos\assumerai-linkedin-launch\hiring-teams\index.html
git commit -m "Add hiring-team LinkedIn launch composition"
```

Expected: commit succeeds.

---

### Task 4: Campaign Preview And Render Outputs

**Files:**
- Modify: `videos/assumerai-linkedin-launch/README.md`
- Generated: `videos/assumerai-linkedin-launch/renders/assumerai-candidate-linkedin.mp4`
- Generated: `videos/assumerai-linkedin-launch/renders/assumerai-hiring-teams-linkedin.mp4`

- [ ] **Step 1: Start candidate preview**

Run in a background PowerShell process:

```powershell
Set-Location videos\assumerai-linkedin-launch\candidate
cmd /c npx.cmd hyperframes preview --port 3021
```

Expected: preview URL is `http://localhost:3021/#project/candidate`.

- [ ] **Step 2: Start hiring-team preview**

Run in a second background PowerShell process:

```powershell
Set-Location videos\assumerai-linkedin-launch\hiring-teams
cmd /c npx.cmd hyperframes preview --port 3022
```

Expected: preview URL is `http://localhost:3022/#project/hiring-teams`.

- [ ] **Step 3: Render draft MP4s**

Run:

```powershell
Set-Location videos\assumerai-linkedin-launch\candidate
cmd /c npx.cmd hyperframes render --quality draft --output ..\renders\assumerai-candidate-linkedin-draft.mp4
Set-Location ..\hiring-teams
cmd /c npx.cmd hyperframes render --quality draft --output ..\renders\assumerai-hiring-teams-linkedin-draft.mp4
Set-Location ..\..\..
```

Expected: both draft MP4s exist under `videos/assumerai-linkedin-launch/renders/`.

- [ ] **Step 4: Render standard MP4s after draft review**

Run:

```powershell
Set-Location videos\assumerai-linkedin-launch\candidate
cmd /c npx.cmd hyperframes render --quality standard --output ..\renders\assumerai-candidate-linkedin.mp4
Set-Location ..\hiring-teams
cmd /c npx.cmd hyperframes render --quality standard --output ..\renders\assumerai-hiring-teams-linkedin.mp4
Set-Location ..\..\..
```

Expected: both final MP4s exist under `videos/assumerai-linkedin-launch/renders/`.

- [ ] **Step 5: Update campaign README**

Update `videos/assumerai-linkedin-launch/README.md` with:

````markdown
# Assumerai LinkedIn Launch Videos

Two 15-second 4:5 HyperFrames videos for LinkedIn feed launch posts.

## Compositions

- Candidate: `candidate/index.html`
- Hiring teams: `hiring-teams/index.html`

## Preview

```powershell
Set-Location videos\assumerai-linkedin-launch\candidate
cmd /c npx.cmd hyperframes preview --port 3021
```

Candidate Studio URL: `http://localhost:3021/#project/candidate`

```powershell
Set-Location videos\assumerai-linkedin-launch\hiring-teams
cmd /c npx.cmd hyperframes preview --port 3022
```

Hiring-team Studio URL: `http://localhost:3022/#project/hiring-teams`

## Verify

```powershell
Set-Location videos\assumerai-linkedin-launch\candidate
cmd /c npx.cmd hyperframes lint
cmd /c npx.cmd hyperframes validate
cmd /c npx.cmd hyperframes inspect --samples 12

Set-Location ..\hiring-teams
cmd /c npx.cmd hyperframes lint
cmd /c npx.cmd hyperframes validate
cmd /c npx.cmd hyperframes inspect --samples 12
```

## Render

```powershell
Set-Location videos\assumerai-linkedin-launch\candidate
cmd /c npx.cmd hyperframes render --quality standard --output ..\renders\assumerai-candidate-linkedin.mp4

Set-Location ..\hiring-teams
cmd /c npx.cmd hyperframes render --quality standard --output ..\renders\assumerai-hiring-teams-linkedin.mp4
```
````

Expected: README documents both preview URLs and render paths.

- [ ] **Step 6: Commit preview/render documentation**

Run:

```powershell
git add videos\assumerai-linkedin-launch\README.md videos\assumerai-linkedin-launch\renders\.gitkeep
git commit -m "Document launch video previews and renders"
```

Expected: commit succeeds.

---

### Task 5: Final Verification

**Files:**
- No new source files unless verification finds a specific issue.

- [ ] **Step 1: Run final lint, validate, and inspect**

Run:

```powershell
Set-Location videos\assumerai-linkedin-launch\candidate
cmd /c npx.cmd hyperframes lint
cmd /c npx.cmd hyperframes validate
cmd /c npx.cmd hyperframes inspect --samples 15

Set-Location ..\hiring-teams
cmd /c npx.cmd hyperframes lint
cmd /c npx.cmd hyperframes validate
cmd /c npx.cmd hyperframes inspect --samples 15
Set-Location ..\..\..
```

Expected: all commands pass. If inspect reports an overflow, fix the exact selector in the relevant HTML/CSS and rerun this step.

- [ ] **Step 2: Run animation map**

Run:

```powershell
node C:\Users\kovac\.codex\plugins\cache\openai-curated\hyperframes\08373044\skills\hyperframes\scripts\animation-map.mjs videos\assumerai-linkedin-launch\candidate --out videos\assumerai-linkedin-launch\candidate\.hyperframes\anim-map
node C:\Users\kovac\.codex\plugins\cache\openai-curated\hyperframes\08373044\skills\hyperframes\scripts\animation-map.mjs videos\assumerai-linkedin-launch\hiring-teams --out videos\assumerai-linkedin-launch\hiring-teams\.hyperframes\anim-map
```

Expected:

- Both commands write `animation-map.json`.
- Review flags in each JSON. Fix `collision`, `invisible`, `offscreen`, `paced-fast`, and unintended `dead-zone` flags.

- [ ] **Step 3: Confirm render files**

Run:

```powershell
Get-ChildItem videos\assumerai-linkedin-launch\renders\*.mp4 | Select-Object Name,Length
```

Expected: `assumerai-candidate-linkedin.mp4` and `assumerai-hiring-teams-linkedin.mp4` are present and non-empty.

- [ ] **Step 4: Final git status**

Run:

```powershell
git status --short
```

Expected: no uncommitted source changes except generated MP4s if render artifacts are intentionally left untracked.
