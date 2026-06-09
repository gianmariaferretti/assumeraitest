# Blog Page Design

## Goal

Create a responsive `/blog` page that closely follows the provided editorial layout while using Assumerai's brand name, typography, pastel brand colors, and job-market content.

## Visual Direction

The page uses a completely white background instead of an isolated rounded shell. Inside the page, the top row has a giant `Blogs worth reading` heading and a compact `See all posts` link. The content below follows the screenshot's structure: one oversized feature card on the left, and a narrower right column with a pastel ad card above a portrait pick card.

The large feature card uses a generated workplace image, white text chips, a date badge, a topic pill, and a circular arrow action in the lower-right corner. The right ad card uses Assumerai's pink-lavender-blue brand gradient and a small plus action. The bottom portrait card uses a generated editorial portrait with only the small numeric badge over the image.

## Responsive Behavior

Desktop uses a two-column grid: `minmax(0, 1.75fr)` for the feature card and `minmax(280px, 0.68fr)` for the right rail. On tablets and mobile, the layout becomes a single column. Aspect ratios are fixed per card so text overlays and buttons do not resize the cards unexpectedly.

## Content

Main feature:

- Date: May 12, 2026
- Topic: Hiring signal
- Title: Stop rewriting yourself for every company

Ad card:

- Label: ADS
- Brand message: Become an Assumerai member
- Headline: Real talk in a corporate world

Portrait pick:

- Overlay: numeric badge only

## Implementation

- Add `src/app/blog/page.tsx` for metadata and route exposure.
- Add `src/components/ui/blog-week-page.tsx` for the UI.
- Save generated images as `public/blog/candidate-workspace.png` and `public/blog/founder-portrait.png`.
- Add a source-level test for the route, component, brand color usage, generated assets, and responsive grid/aspect classes.

## Verification

Run the blog page test, ESLint on touched files, TypeScript, and browser screenshots at desktop and mobile widths.
