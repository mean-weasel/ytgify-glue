# Post-MVP Features

**Related:** [Features](03-FEATURES.md) | [Roadmap](05-ROADMAP.md) | [Launch Strategy](08-LAUNCH-STRATEGY.md)

---

## 3.1 Analytics & Insights
- User dashboard showing:
  - Views over time (chart via **Chart.js** + **Stimulus**)
  - Top performing GIFs
  - Audience demographics (if trackable)
  - Referrer sources (Twitter, Reddit, etc.)
- Per-GIF analytics page (server-rendered with charts)

## 3.2 Notifications
**Implementation: ActionCable + Turbo Streams**

- Real-time notifications via **Turbo Streams over ActionCable**
- Notification types:
  - Someone liked your GIF
  - Someone commented on your GIF
  - Someone remixed your GIF
  - Someone followed you
  - Your GIF is trending
- Notification bell icon updates via **Turbo Stream broadcasts**
- Email digests (daily/weekly summary via **ActionMailer**)

## 3.3 Moderation & Safety

### Content Moderation
- User reporting system (modal via **Turbo Frame**)
- Admin review queue (server-rendered with **Turbo Frames** for quick actions)
- Automated NSFW detection (image classification AI via background job)
- Profanity filter for text overlays (server-side validation)
- DMCA takedown process (admin interface)

### Spam Prevention
- Rate limiting via **Rack::Attack** (to prevent abuse)
- CAPTCHA on registration (via **recaptcha** gem)
- Email verification required (Devise confirmable)
- Shadowban/suspend abusive users (admin controls)

## 3.4 Advanced Search & Discovery
**Implementation: PgSearch + Turbo Frames**

- Advanced filters (duration, resolution, FPS, date range)
- Filters update via **Turbo Frames**
- Saved searches (stored in user preferences)
- Search history (stored in session or database)

## 3.5 Gamification
- Achievements/badges (server-rendered, unlocked via background jobs)
- Leaderboards (cached in Redis, updated hourly)
- Progress bars and stats on profile page

## 3.6 Creator Tools
- Bulk upload (multiple file upload via ActiveStorage)
- CSV export of analytics (via background job, email download link)
- API access for automation (extend `/api` endpoints)
- Scheduling posts (via **sidekiq-scheduler**)
- Watermark customization (server-side image processing)
- Team accounts (multiple users manage one brand account)

## 3.7 Advanced Web-Based GIF Editor
**Implementation: Enhanced Stimulus controller**

- Upload existing GIFs from user's device
- Advanced editing tools (trim, crop, speed adjustment)
- Add stickers, emojis, shapes (Canvas API + **Stimulus**)
- Apply filters and effects (CSS filters or Canvas processing)
- Multi-layer text overlays
- Edit your own existing GIFs (reload into editor)
