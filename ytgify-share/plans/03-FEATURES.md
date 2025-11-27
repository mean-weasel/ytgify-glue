# MVP Features Specification

**Related:** [Overview](00-OVERVIEW.md) | [Current Status](01-CURRENT-STATUS.md) | [Architecture](04-ARCHITECTURE.md) | [Roadmap](05-ROADMAP.md)

---

## Table of Contents

- [1.1 User Authentication & Accounts](#11-user-authentication--accounts)
- [1.2 GIF Upload & Storage](#12-gif-upload--storage)
- [1.3 Discovery & Feed](#13-discovery--feed)
- [1.4 Social Features](#14-social-features)
- [1.5 Remix Functionality](#15-remix-functionality)
- [1.6 GIF Detail Page](#16-gif-detail-page)
- [1.7 User Library & Organization](#17-user-library--organization)
- [1.8 Sharing & Embeds](#18-sharing--embeds)

---

### 1.1 User Authentication & Accounts

#### Registration & Login
- Email/password authentication via **Devise**
- Social login options (Google, GitHub - optional via OmniAuth)
- Email verification
- Password reset flow
- Session management:
  - **Web users:** Session cookies via Devise
  - **Extension users:** JWT tokens (access + refresh) via devise-jwt

#### Extension Integration
**The web app handles ALL authentication - the extension redirects users here.**

**Auth flow for extension users:**
1. User clicks "Sign in at ytgify.com" button in extension
2. Opens ytgify.com/login (or /signup for new users)
3. User completes signup/login on web app
4. After successful auth, web app:
   - Stores session in cookie (for web browsing)
   - Displays JWT token for extension (copy to clipboard or auto-message)
   - Signals to extension that auth is complete:
     - **Option A:** Use shared cookie domain (extension reads via `chrome.cookies` API)
     - **Option B:** Use `postMessage` to communicate back to extension
     - **Option C:** Extension polls `/api/auth/me` endpoint
5. Extension detects auth and stores token in extension storage
6. User can now upload GIFs from YouTube

**Implementation considerations:**
- Login/signup pages detect `?source=extension` query param
- Show extension-specific messaging: "Sign in to save your YouTube GIFs"
- After auth: "Success! Return to YouTube and start saving GIFs"
- Provide extension download link on auth pages if not detected
- Use **Turbo Frames** for inline error messages during auth

#### User Profiles
- Public profile page (`ytgify.com/@username`)
- **Server-rendered with Turbo Frames** for tab navigation
- Profile components:
  - Avatar upload (via ActiveStorage with direct S3 uploads)
  - Display name
  - Bio (short description)
  - Links (website, Twitter, YouTube, etc.)
  - Join date
  - Stats: Total GIFs, total likes received, followers
- Profile tabs loaded via **Turbo Frames:**
  - GIFs (grid view)
  - Liked GIFs
  - Collections (if public)
  - About

#### Privacy & Settings
- Account settings page
- **Turbo Frames** for different settings sections (avoid full page reloads)
- User preferences:
  - Default privacy for new uploads (public/unlisted/private) - **synced to extension**
  - Default upload behavior (show options vs. quick save)
  - Recently used tags (for quick selection)
- Notification preferences
- Email preferences
- Account deletion with confirmation modal (**Stimulus controller**)

---

### 1.2 GIF Upload & Storage

#### Upload from Extension
- **API endpoint** to receive GIF uploads from Chrome extension (unchanged from original plan)
- Accept multipart form data:
  - Base GIF file
  - Final GIF file (with text overlay, if any)
  - Metadata JSON including:
    - Video/GIF technical data
    - Text overlay configuration
    - **User-selected privacy level** (public/unlisted/private)
    - **User-selected tags** (array of tag strings)
    - Optional title/description overrides

#### Server-Side Processing
- Validate file format and size via **ActiveStorage validations**
- Generate thumbnail (first frame or middle frame) via **ActiveJob + image_processing gem**
- Extract GIF properties (dimensions, frame count, file size)
- Optional: Re-encode for consistency/compression
- Store files in **AWS S3** via **ActiveStorage**
- Generate unique shareable ID (UUID)

#### Metadata Storage (Database)
**GIFs Table (ActiveRecord model):**
```ruby
# app/models/gif.rb
class Gif < ApplicationRecord
  belongs_to :user
  belongs_to :parent_gif, class_name: 'Gif', optional: true
  has_many :remix_gifs, class_name: 'Gif', foreign_key: 'parent_gif_id'
  has_many :likes, dependent: :destroy
  has_many :comments, dependent: :destroy
  has_many_attached :files # ActiveStorage: base_gif, final_gif, thumbnail

  # Fields:
  # - id (UUID)
  # - user_id (foreign key)
  # - title
  # - description
  # - youtube_video_url
  # - youtube_video_title
  # - youtube_channel_name
  # - youtube_timestamp_start
  # - youtube_timestamp_end
  # - duration (decimal)
  # - fps (integer)
  # - resolution_width
  # - resolution_height
  # - file_size
  # - has_text_overlay (boolean)
  # - text_overlay_data (jsonb)
  # - is_remix (boolean)
  # - parent_gif_id (foreign key, nullable)
  # - remix_count (counter_cache)
  # - privacy (enum: public, unlisted, private)
  # - view_count (default: 0)
  # - like_count (counter_cache)
  # - comment_count (counter_cache)
  # - share_count (default: 0)
  # - created_at, updated_at, deleted_at
end
```

**text_overlay_data JSON structure:**
```json
{
  "content": "text string",
  "font_family": "Arial",
  "font_size": 48,
  "font_weight": "bold",
  "color": "#FFFFFF",
  "outline_color": "#000000",
  "outline_width": 2,
  "position": { "x": 50, "y": 90 },
  "shadow": { "blur": 2, "offset_x": 1, "offset_y": 1 }
}
```

---

### 1.3 Discovery & Feed

#### Home Feed
**Implementation: Server-rendered ERB with Turbo Frames**

**🤖 Before implementing, use agents:**
```
@agent-Explore "medium: Find existing controller pagination patterns and view structures"
@agent-Plan "medium: Design feed algorithm with trending, recent, and recommended GIFs using existing Gif model scopes"
@agent-Plan "medium: Create infinite scroll implementation with Turbo Frames and IntersectionObserver"
```

- Algorithmic feed showing:
  - Trending GIFs (high engagement recently)
  - Recent uploads from followed users
  - Recommended based on user's likes/tags
- **Infinite scroll pagination** via **Stimulus controller**:
  - Detects scroll position using IntersectionObserver
  - Triggers **Turbo Frame** request for next page
  - Appends new GIFs to existing grid
- Filter options: Today, This Week, This Month, All Time
  - Filters update via **Turbo Frames** (no full page reload)

**Example Turbo Frame structure:**
```erb
<!-- app/views/gifs/index.html.erb -->
<%= turbo_frame_tag "gifs_feed" do %>
  <div class="gif-grid" data-controller="infinite-scroll">
    <%= render @gifs %>
    <%= turbo_frame_tag "gifs_feed",
        src: gifs_path(page: @next_page),
        loading: :lazy if @next_page %>
  </div>
<% end %>
```

#### Explore Page
**Implementation: Server-rendered with Turbo Frame filtering**

- Category browsing:
  - Reactions, Memes, Sports, Gaming, TV & Movies, Music, Animals, Misc
  - Category tabs loaded via **Turbo Frames**
- Search functionality:
  - Search by GIF title, YouTube video title, creator username, hashtags
  - **PgSearch** gem for PostgreSQL full-text search
  - Search results update via **Turbo Frames** (instant filtering)
- Sort by: Recent, Most Viewed, Most Liked, Most Remixed
  - Sorting triggers **Turbo Frame** reload with new query params

#### Trending Algorithm
**Implementation: Sidekiq scheduled job + Redis caching**

**🤖 Before implementing, use agents:**
```
@agent-Explore "quick: Find existing Sidekiq job patterns and Redis configuration"
@agent-Explore "quick: Locate the Gif model and its engagement counter columns"
@agent-Plan "medium: Design trending score calculation job with Redis caching strategy"
```

Basic scoring formula:
```ruby
# app/models/gif.rb
def trending_score
  engagement = (like_count * 3 + comment_count * 5 + remix_count * 10 + share_count * 7)
  age_in_hours = ((Time.current - created_at) / 1.hour).to_f
  engagement / (age_in_hours ** 1.5)
end
```
- Decay over time (older = lower score)
- Weight remixes heavily (encourages creative reuse)
- Recalculate periodically (every 15-60 minutes via **sidekiq-cron**)
- Cache trending GIF IDs in **Redis** for fast retrieval

**🤖 After implementing:**
```
@agent-Plan "quick: Create monitoring strategy for trending algorithm performance"
```

---

### 1.4 Social Features

#### Engagement Actions

**Likes**
**Implementation: Turbo Streams for optimistic updates**

- Users can like GIFs
- Heart icon, toggle on/off
- Display like count
- "Liked by you and X others"
- **Turbo Stream response** updates:
  - Like button state (filled/unfilled heart)
  - Like count
  - Likes list preview

**Example Stimulus controller:**
```javascript
// app/javascript/controllers/like_button_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "count"]

  toggle(event) {
    // Optimistic UI update
    this.buttonTarget.classList.toggle("liked")

    // Turbo will handle the actual server request
    // Server responds with Turbo Stream to confirm/rollback
  }
}
```

**Comments**
**Implementation: Turbo Frames + Turbo Streams**

- Threaded commenting on GIFs
- Markdown support (via **redcarpet** or **kramdown** gem)
- Edit/delete your own comments (inline via **Turbo Frames**)
- Sort by: Newest, Oldest, Top (most liked)
  - Sorting triggers **Turbo Frame** reload
- New comments append via **Turbo Stream broadcasts** (real-time for all viewers)
- Comment notifications (via **ActionCable** + Turbo Streams)

**Shares**
- Copy share link button (**Stimulus controller** for clipboard API)
- Share to Twitter/X (pre-filled tweet with GIF)
- Share to Reddit (open submission page)
- Share to Discord/Slack (copy embed code)
- Track share count (increment on click via AJAX)

**Collections/Saves**
- Users can save others' GIFs to personal collections
- Add to collection via modal (**Turbo Frame**)
- Collections are private by default (can make public)
- Name collections ("Reaction GIFs", "Office Memes", etc.)
- Browse your collections (grid view with **Turbo Frames** for pagination)

#### Follow System
- Follow other creators (button via **Turbo Stream** response)
- Following feed (see only followed users' GIFs)
- Follower/following counts on profiles (updated via **counter_cache**)
- Notifications when followed users post (via **ActionCable** + Turbo Streams)

#### Hashtags
- Add hashtags to GIFs (#mondaymood, #reaction, etc.)
- Click hashtag to see all GIFs with that tag (server-rendered page)
- Trending hashtags (most used this week) - cached in **Redis**
- Auto-suggest popular hashtags while typing (via **Stimulus controller** + AJAX to `/api/tags/autocomplete`)

---

### 1.5 Remix Functionality

#### Remix Discovery
- "Remix" button on every public GIF
- Shows remix count: "12 remixes"
- View all remixes of a GIF (gallery view via **Turbo Frame**)
- Remix chain visualization:
  - Original GIF → Remix 1, Remix 2, Remix 3...
  - Tree view if remixes are themselves remixed (server-rendered, possibly with D3.js via **Stimulus**)

#### Remix Creation Flow (Web-Based)

**All remixing happens directly in the web app - no extension required.**

**Implementation: Stimulus controller + HTML5 Canvas + GIF.js library**

**🤖 Before implementing, use agents:**
```
@agent-Explore "very thorough: Find all GIF processing code, file upload handling, and JavaScript libraries"
@agent-Plan "very thorough: Design comprehensive remix editor implementation with Canvas API, GIF.js integration, and S3 upload flow"
```

**Steps:**

1. User clicks "Remix" button on any public GIF
2. Opens in-browser GIF editor modal/page (via **Turbo Frame** or full page)
3. Loads base GIF from S3 via ActiveStorage URL
4. **Stimulus controller** manages Canvas-based text overlay editor:
   - Text input field (real-time preview)
   - Font selection (family, size, weight)
   - Color pickers (text color, outline color)
   - Position controls (drag to position or preset locations)
   - Live preview as user types/adjusts
5. User adds their custom text overlay
6. Click "Save Remix"
7. **Client-side GIF generation:**
   - Use **GIF.js** or **gifshot** library (bundled via Vite Rails)
   - Composite text onto base GIF frames in browser
   - Generate new GIF blob
8. Upload new GIF via **ActiveStorage direct upload** to S3:
   - JavaScript uploads blob to S3
   - Callback creates new Gif record with metadata:
     - `is_remix: true`
     - `parent_gif_id: <original_gif_id>`
     - Text overlay configuration (saved to `text_overlay_data`)
9. Redirect to new GIF's detail page via **Turbo navigation**

**🤖 During implementation:**
```
@agent-Explore "Find Vite Rails configuration for adding JavaScript libraries"
@agent-Explore "Locate existing Stimulus controllers to understand the pattern"
@agent-Plan "Create testing strategy for Canvas-based remix editor"
```

**Alternative: Server-side rendering (if client-side is too slow):**
- Send text overlay config + base GIF ID to backend
- Rails job uses **MiniMagick** or **vips** to render GIF server-side
- Respond with **Turbo Stream** to update UI with progress/completion

**Example Stimulus controller structure:**
```javascript
// app/javascript/controllers/gif_editor_controller.js
import { Controller } from "@hotwired/stimulus"
import GIF from "gif.js" // or gifshot

export default class extends Controller {
  static targets = ["canvas", "textInput", "preview"]

  connect() {
    this.loadBaseGif()
    this.setupCanvas()
  }

  updateTextOverlay() {
    // Redraw canvas with new text
  }

  async saveRemix() {
    // Generate GIF blob
    // Upload to S3 via ActiveStorage
    // Submit form to create Gif record
  }
}
```

#### Remix Metadata
- `is_remix: true`
- `parent_gif_id: <original_id>`
- Display attribution: "Remixed from @original_creator"
- Link to original GIF
- Original creator gets notification (via **Turbo Stream** to notification bell)

#### Remix Permissions
- All public GIFs are remixable by default
- Option to disable remixes (per-GIF setting in edit form)
- Private GIFs cannot be remixed

---

### 1.6 GIF Detail Page

**URL Structure:** `ytgify.com/g/<gif_id>` or `ytgify.com/@username/<slug>`

**Implementation: Server-rendered ERB with Turbo Frames for interactive sections**

#### Page Components
- Large GIF preview (auto-play loop)
- Engagement buttons (like, comment, share, remix)
  - Like button: **Stimulus controller** + **Turbo Stream** response
  - Share button: **Stimulus controller** for clipboard/social sharing
- Metadata sidebar:
  - Creator (avatar + username)
  - Upload date
  - View count, like count (updated via **Turbo Stream** broadcasts)
  - Source: YouTube video title + link
  - Timestamp (e.g., "0:45 - 0:52")
  - Tags/hashtags (clickable, server-rendered links)
  - Privacy level (if owner)
- Comments section below (**Turbo Frame** for pagination + **Turbo Stream** for new comments)
- Related GIFs (same creator, same source video, similar tags) - **Turbo Frame** for lazy loading
- Remix gallery (**Turbo Frame** for modal or expandable section)
- Lineage (if this is a remix, show parent) - breadcrumb navigation

#### Actions
- Copy link (**Stimulus controller** for clipboard API)
- Download GIF (direct link to S3 file)
- Report (inappropriate content) - modal via **Turbo Frame**
- Delete (if owner) - confirmation via **Stimulus controller**, then **Turbo Stream** redirect
- **Edit metadata (if owner):**
  - Inline editing via **Turbo Frames**
  - Change privacy level (dropdown)
  - Edit tags (auto-suggest via **Stimulus** + AJAX)
  - Edit title/description
  - All edits submit via **Turbo** (no full page reload)

#### SEO Optimization
- Server-rendered HTML (fully indexable by Google)
- Open Graph meta tags for social sharing
- Schema.org JSON-LD for rich snippets
- Sitemap generation for all public GIFs

---

### 1.7 User Library & Organization

#### My GIFs Page
**Implementation: Server-rendered with Turbo Frames for filtering**

- Grid view of all user's uploaded GIFs
- Filter by:
  - Privacy level (public, unlisted, private)
  - Date range (date pickers via **Stimulus**)
  - Source (which YouTube videos)
  - Has text overlay / no text
  - Is remix / original creation
- Sort by: Recent, Most viewed, Most liked
- Filters/sorts update via **Turbo Frames** (instant filtering, no page reload)
- Bulk actions:
  - Select multiple → delete, change privacy, add tags
  - **Stimulus controller** manages checkbox selection
  - Bulk action form submits via **Turbo Stream** for success/error messages
- Search within your library (via **PgSearch**)

#### Collections
**Implementation: CRUD via Turbo Frames**

- Create named collections ("Funny Reactions", "Product Demos", etc.)
  - Modal via **Turbo Frame**
- Add GIFs to multiple collections
  - Checkbox form via **Turbo Frame** modal
  - Submit via **Turbo Stream** response
- Public collections can be shared (toggle via inline edit)
- Collection pages show all GIFs in grid (with **Turbo Frame** pagination)

#### Tags
- Add/edit tags on your GIFs (individual or bulk edit)
- Auto-suggest from popular/trending tags (via **Stimulus** + AJAX to `/api/tags/autocomplete`)
- Show recently used tags for quick selection (stored in `users.preferences` JSONB column)
- Filter your library by tag (via **Turbo Frames**)
- Browse all GIFs by tag across platform (server-rendered page)
- Tag management:
  - Rename tags across all your GIFs (bulk update form)
  - Merge duplicate tags (admin interface)
  - Delete unused tags (soft delete)

---

### 1.8 Sharing & Embeds

#### Shareable Links
- Clean URLs: `ytgify.com/g/abc123`
- Unlisted GIFs: require full URL (not discoverable via search/feed)
- Private GIFs: only accessible to owner (403 error for others)

#### Open Graph / Meta Tags
**Implementation: Server-rendered in layout**

- Proper OG tags for rich previews on social media
- Twitter Card support (auto-play GIF in tweet)
- Discord/Slack embed support
- Thumbnail, title, description dynamically generated per GIF

```erb
<!-- app/views/gifs/show.html.erb -->
<% content_for :meta_tags do %>
  <%= tag.meta property: "og:title", content: @gif.title %>
  <%= tag.meta property: "og:image", content: url_for(@gif.thumbnail) %>
  <%= tag.meta property: "og:url", content: gif_url(@gif) %>
  <%= tag.meta name: "twitter:card", content: "player" %>
  <%= tag.meta name: "twitter:player", content: url_for(@gif.final_gif) %>
<% end %>
```

#### Embed Codes
- `<iframe>` embed option (copy button via **Stimulus**)
- Direct GIF URL for use in Discord/Slack/etc.
- Copy buttons for each format (**Stimulus controller** for clipboard API)

---

**Next Steps:**
- Review [04-ARCHITECTURE.md](04-ARCHITECTURE.md) for technical implementation details
- Check [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md) to see which features are already implemented
- Use [05-ROADMAP.md](05-ROADMAP.md) for development timeline
