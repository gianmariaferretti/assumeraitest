# Contact And Team Page Design

## Goal

Create one combined Assumerai contact and team page, available as a real route, that matches the provided reference composition while using the landing page's typography, color system, logo, and tone.

## Research Summary

- 21st.dev inspiration: premium contact sections commonly use split layouts, oversized direct headings, form-first interaction, and supporting trust/social context.
- Contact page best practices: make the form easy to scan, include direct alternate contact details, set response expectations, keep labels visible, and provide trust cues close to the submit action.
- Team page best practices: show people as approachable and credible, keep bios concise, and make the team section feel like proof of the company's human point of view.

## Design

The page uses a two-column hero. The left side is a pale orbit panel with generated circular portraits, soft orbital arcs, social/contact links, and the Assumerai logo mark. The right side is a rounded pastel brand-gradient contact surface with a compact form, a black primary submit button, privacy agreement, and a small row of customer/company trust labels styled to fit Assumerai rather than the reference's neon green.

The team section lives below the hero on the same page. It uses the same generated portrait language until real photos arrive, with four concise founder/operator profile cards and a short statement about why Assumerai exists.

## Content

Primary page title: "Contact us"

Subcopy: "Reach out and we'll get in touch within 24 hours."

Team heading: "Our team"

Team subcopy: "Built by people who have sat on both sides of the hiring table."

The form is presentation-only for now. It uses accessible labels, required fields, and a disabled-free submit button but does not submit data to a backend.

## Implementation Boundaries

- Create `src/app/contact/page.tsx` for the route.
- Create `src/components/ui/contact-team-page.tsx` for the UI.
- Add `contactTeam` translations to `src/lib/i18n.tsx` for English, Italian, and French.
- Update header/footer company links to point to `/contact`.
- Copy the generated orbit portrait asset into `public/contact/team-orbit.png`.
- Add source-level tests mirroring the repo's existing test style.

## Verification

Run the new page tests, ESLint on touched files, TypeScript with `tsc --noEmit`, and a local browser pass at `/contact`.
