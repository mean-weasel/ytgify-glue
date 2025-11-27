# Design & User Experience

**Related:** [Features](03-FEATURES.md) | [Architecture](04-ARCHITECTURE.md)

---

## 4.1 Landing Page (Logged Out)
**Implementation: Server-rendered marketing page**

- Hero section: "Turn YouTube moments into shareable GIFs"
- How it works (3 steps with animations via **Stimulus**)
- Featured GIFs (trending/curated, lazy-loaded via **Turbo Frames**)
- CTA: "Get Started" (install extension + sign up)
- Fast initial load (server-rendered HTML, minimal JavaScript)

## 4.2 Onboarding Flow
**Implementation: Multi-step form via Turbo Frames**

1. User installs extension
2. Extension prompts signup/login (redirect to web app)
3. Welcome tour (step-by-step guide via **Stimulus controller**)
4. Suggest following popular creators (via **Turbo Frame**)

## 4.3 Mobile Experience
- Responsive Tailwind CSS (mobile-first)
- Turbo works great on mobile browsers (no special config)
- Touch-friendly UI (large tap targets, swipe gestures via **Stimulus**)
- No extension on mobile, but can:
  - Browse feed, view GIFs, like, comment, share
  - Manage library, follow creators
  - Remix GIFs (Canvas editor works on mobile)
- Optimized GIF loading (ActiveStorage variants)
