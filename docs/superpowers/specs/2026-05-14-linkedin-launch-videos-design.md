# LinkedIn Launch Videos Design

## Goal

Create two product-launch videos for Assumerai, each optimized for LinkedIn feed placement in a 4:5 format and capped at 15 seconds. One video speaks to candidates and one speaks to hiring teams. Both should feel like one campaign: smooth, professional, premium kinetic, and clearly derived from the current landing page rather than generic launch graphics.

## Approved Direction

Use a refined version of "Kinetic Launch Type": thumb-stopping typography and fast comprehension, but with the landing page's calm polish. The videos should not feel chaotic, loud, or maximalist. They should feel like the Assumerai website in motion.

Core references from the landing page:

- Typeface system: Geist Sans for the main launch type, with Instrument Serif used sparingly for soft emphasis.
- Palette: white and misty off-white surfaces, slate/navy anchors, and the brand gradient from rose to lavender to blue.
- Brand gradient: `#f7c8d9 -> #e0b8e6 -> #b9b8ee -> #a8c5f1`.
- Dark anchor colors: `#061020`, `#0b2146`, and slate text tones.
- UI language: 8px product cards, polished browser/dashboard frames, pill CTAs, subtle shadows, restrained glassy highlights.
- Motion language: smooth glides, gentle parallax, soft settles, premium product-frame movement.

## Shared Format

- Aspect ratio: 4:5 LinkedIn feed.
- Resolution target: 1080x1350.
- Duration: 15 seconds each.
- Audio: no audio track in the first version. The videos must work silently with on-screen text.
- Captions: no spoken narration in the first version. Text is built into the composition.
- CTA style: pill button mirroring the landing page.

## Candidate Video

Narrative: job hunting asks candidates to repeat the same proof too many times. Assumerai turns that into one CV, one calm adaptive interview, and matches that come to the candidate.

Storyboard:

1. 0.0-2.4s: Hook
   Text: "Stop repeating yourself."
   Supporting microcopy: "One CV. One interview."
   Visual: Large Geist type slides into a white/off-white canvas. A soft gradient rail sweeps once under the headline.

2. 2.4-6.8s: Product proof
   Text: "Do the work once."
   Visual: Candidate product cards glide in: CV intake, adaptive interview, scorecard. Use `public/cards_for_candidates/postal.png`, `interview.png`, and `scorecard.png` with polished frames and subtle depth.

3. 6.8-11.8s: Outcome
   Text: "Get matched to companies that fit."
   Visual: Match cards and scorecard-style UI elements move into a calm dashboard composition. Avoid clutter; show only 2-3 elements at a time.

4. 11.8-15.0s: CTA
   Text: "Assumerai"
   Supporting line: "Take the interview once."
   CTA: "Take the interview"
   Visual: Logo/gradient mark, clean pill CTA, final gradient sweep.

## Hiring-Team Video

Narrative: hiring teams do not need more application volume. They need fewer, better, pre-interviewed candidates with evidence.

Storyboard:

1. 0.0-2.4s: Hook
   Text: "Skim 14, not 312."
   Supporting microcopy: "Pre-interviewed. Pre-scored."
   Visual: Large dark-navy kinetic type over a premium dark surface with a soft pastel glow.

2. 2.4-6.8s: Product proof
   Text: "Every candidate arrives with signal."
   Visual: Dashboard frame glides in using existing `public/dashboard/dashboard_view.png` and `dashboard_when_i_click_review.png` assets.

3. 6.8-11.8s: Workflow
   Text: "Scores. Transcripts. Calendar next steps."
   Visual: Three compact UI chips or panels animate in sequence, matching the dashboard section's product-card style.

4. 11.8-15.0s: CTA
   Text: "Assumerai"
   Supporting line: "Hire from evidence, not volume."
   CTA: "Book a 20-min walkthrough"
   Visual: Brand gradient pill CTA, dark premium background, final product frame holds until end.

## Visual Identity

The campaign should use a custom "Smooth Kinetic Assumerai" identity:

- Backgrounds alternate between white/off-white and deep navy, matching the landing page's white product sections and dark CTA/hero surfaces.
- Type is oversized and kinetic, but it lands on a clean grid. No chaotic rotations, red/yellow hype palette, glitch effects, or aggressive poster styling.
- Gradient accents are used as rails, top borders, sweep lines, and CTA fills rather than excessive full-screen gradients.
- Product screenshots should be framed in browser/dashboard shells with 8px radius and soft shadows.
- Final frames should be simple enough to read in a LinkedIn feed without sound.

## Motion

Motion should be smooth, confident, and polished:

- Headlines enter with `power3.out` or `expo.out`, moving 24-56px and settling softly.
- Product frames glide horizontally or vertically with mild scale, never bouncing harshly.
- Gradient rails sweep once per scene as a brand signature.
- Scene transitions should be smooth wipes, soft cover transitions, or scale/blur transitions. No jump cuts.
- Every scene gets entrance animation. Intermediate scenes should rely on transitions instead of exit animations.

## Assets

Use existing project assets first:

- Logo: `public/logos/assumer-logo.png`.
- Candidate product visuals: `public/cards_for_candidates/postal.png`, `calendar.png`, `studio.png`, `interview.png`, `scorecard.png`.
- Candidate outcome visual: `public/landing/interview-outcomes.png`.
- Hiring dashboard visuals: `public/dashboard/dashboard_view.png`, `dashboard_when_i_click_review.png`, `dashboard_calendar.png`, `dashboard_analytics.png`.

Do not generate new imagery unless an existing asset is insufficient for a specific frame.

## Technical Shape

Create one HyperFrames project dedicated to the launch videos, with two compositions: one candidate composition and one hiring-team composition.

Each composition should:

- Declare 1080x1350 dimensions.
- Use deterministic GSAP timelines.
- Register timelines synchronously through `window.__timelines`.
- Use `data-duration="15"` for each root composition.
- Use local assets copied or referenced in a stable way.
- Include a project `DESIGN.md` that captures this visual identity before composition HTML is written.

## Verification

Before delivery:

- Run HyperFrames lint and validation.
- Run visual inspect for layout overflow and contrast.
- Review at least candidate and hiring-team hero frames, middle frames, and final CTA frames.
- Render draft MP4s first, then final standard-quality MP4s after layout issues are clean.

## Out of Scope

- Voiceover and synced narration.
- A long investor explainer version.
- A 9:16 Reels/TikTok adaptation.
- New website implementation changes.
