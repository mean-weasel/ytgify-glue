# Hotwire Implementation Guide

**FINAL DECISION (November 2025): This project uses Rails 8 + Hotwire**

---

## ⚠️ Critical: DO NOT Use React

This document serves as a permanent reminder that **ytgify uses Rails 8 + Hotwire**, not React.

**If you're about to implement a frontend feature:**
- ✅ Use Rails views (ERB templates)
- ✅ Use Turbo Frames for dynamic sections
- ✅ Use Turbo Streams for real-time updates
- ✅ Use Stimulus controllers for JavaScript
- ❌ DO NOT use React
- ❌ DO NOT use Vue
- ❌ DO NOT create a separate frontend app
- ❌ DO NOT use npm/webpack/Vite for frontend

---

## Technology Stack

### Frontend
- **Views:** ERB templates (server-rendered HTML)
- **Interactivity:** Hotwire (Turbo + Stimulus)
- **JavaScript Management:** Importmap-rails (no build step)
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide icons or Font Awesome

### Backend
- **Framework:** Ruby on Rails 8.0.4
- **Mode:** Full Rails (NOT API-only)
- **Database:** PostgreSQL with UUIDs
- **Auth:** Devise (sessions for web, JWT for extension)
- **Jobs:** Sidekiq
- **Storage:** AWS S3 via ActiveStorage
- **Real-time:** Turbo Streams over ActionCable

### Chrome Extension (Separate)
- **Frontend:** Can be React (separate codebase)
- **API:** Uses same Rails API endpoints (JWT auth)
- **Independence:** Extension implementation doesn't affect web app

---

## Hotwire Patterns

### 1. Turbo Frames (Dynamic Page Sections)

Use Turbo Frames to update parts of a page without full reload:

```erb
<!-- app/views/gifs/show.html.erb -->
<div class="gif-detail">
  <h1><%= @gif.title %></h1>

  <!-- Comments section loads independently -->
  <%= turbo_frame_tag "comments" do %>
    <%= render "comments/list", gif: @gif %>
  <% end %>
</div>
```

**When to use:**
- Tab navigation (user profile tabs)
- Infinite scroll (feed pagination)
- Modal dialogs
- Inline editing forms

### 2. Turbo Streams (Real-time Updates)

Use Turbo Streams for real-time changes:

```ruby
# app/models/like.rb
after_create_commit -> { broadcast_like_count }

def broadcast_like_count
  broadcast_update_to(
    "gif_#{gif_id}",
    target: "like_count",
    partial: "likes/count",
    locals: { count: gif.like_count }
  )
end
```

**When to use:**
- Live like counts
- New comments appearing
- Real-time notifications
- Collaborative features

### 3. Stimulus Controllers (JavaScript Sprinkles)

Use Stimulus for targeted JavaScript:

```javascript
// app/javascript/controllers/like_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "count"]

  async toggle(event) {
    event.preventDefault()
    const response = await fetch(this.element.action, {
      method: 'POST',
      headers: { 'X-CSRF-Token': this.csrfToken }
    })
    const data = await response.json()
    this.countTarget.textContent = data.like_count
  }

  get csrfToken() {
    return document.querySelector("[name='csrf-token']").content
  }
}
```

```erb
<!-- app/views/gifs/_like_button.html.erb -->
<div data-controller="like" data-action="submit->like#toggle">
  <form action="<%= like_gif_path(@gif) %>" method="post">
    <button data-like-target="button" class="btn">
      <span data-like-target="count"><%= @gif.like_count %></span> Likes
    </button>
  </form>
</div>
```

**When to use:**
- Form enhancements
- Client-side validation
- Optimistic UI updates
- Keyboard shortcuts
- Drag and drop

---

## Common Implementations

### Feed with Infinite Scroll

```erb
<!-- app/views/home/feed.html.erb -->
<div class="feed">
  <%= turbo_frame_tag "gifs", data: { controller: "infinite-scroll" } do %>
    <%= render @gifs %>

    <% if @gifs.next_page %>
      <%= turbo_frame_tag "page_#{@gifs.next_page}",
          loading: :lazy,
          src: feed_path(page: @gifs.next_page) do %>
        <div class="loading">Loading more...</div>
      <% end %>
    <% end %>
  <% end %>
</div>
```

### Like Button with Optimistic UI

```erb
<!-- app/views/gifs/_gif_card.html.erb -->
<div class="gif-card" id="gif_<%= gif.id %>">
  <img src="<%= gif.thumbnail_url %>" alt="<%= gif.title %>">

  <%= turbo_frame_tag "like_#{gif.id}" do %>
    <%= form_with url: toggle_like_path(gif),
                  data: { turbo_frame: "_top", controller: "like" } do %>
      <button type="submit" class="like-btn">
        ♥ <span data-like-target="count"><%= gif.like_count %></span>
      </button>
    <% end %>
  <% end %>
</div>
```

### Modal Dialog

```erb
<!-- app/views/gifs/_modal.html.erb -->
<%= turbo_frame_tag "modal", target: "_top" do %>
  <div class="modal-backdrop" data-controller="modal">
    <div class="modal-content">
      <%= yield %>
      <button data-action="click->modal#close">Close</button>
    </div>
  </div>
<% end %>
```

```javascript
// app/javascript/controllers/modal_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  close() {
    this.element.remove()
  }

  // Close on backdrop click
  closeOnBackdrop(event) {
    if (event.target === this.element) {
      this.close()
    }
  }
}
```

### Live Comments Section

```ruby
# app/controllers/comments_controller.rb
def create
  @comment = @gif.comments.build(comment_params)
  @comment.user = current_user

  if @comment.save
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to @gif }
    end
  end
end
```

```erb
<!-- app/views/comments/create.turbo_stream.erb -->
<%= turbo_stream.prepend "comments", partial: "comments/comment",
                         locals: { comment: @comment } %>
<%= turbo_stream.update "comment_count", @gif.comments_count %>
<%= turbo_stream.replace "comment_form",
                         partial: "comments/form",
                         locals: { gif: @gif } %>
```

---

## SEO Advantages

### Server-Rendered HTML
Every page is fully rendered HTML from the start:
```erb
<!-- app/views/gifs/show.html.erb -->
<head>
  <title><%= @gif.title %> - ytgify</title>
  <meta property="og:title" content="<%= @gif.title %>">
  <meta property="og:image" content="<%= @gif.thumbnail_url %>">
  <meta property="og:description" content="<%= @gif.description %>">
  <meta name="twitter:card" content="player">
</head>
```

✅ **Benefits:**
- Google can index all content immediately
- Social media previews work perfectly
- No SEO hacks or workarounds needed
- Better Core Web Vitals scores

---

## Development Workflow

### 1. Start Development Server

```bash
# Runs Rails server + Tailwind watcher
bin/dev
```

### 2. Generate Controllers & Views

```bash
# Generate controller with views
rails g controller Home feed trending

# Generate resource with full CRUD
rails g scaffold Post title:string content:text
```

### 3. Add Stimulus Controller

```bash
# Generate Stimulus controller
rails g stimulus modal
```

### 4. Run Tests

```bash
# Run all tests
rails test

# Run specific test
rails test test/controllers/gifs_controller_test.rb
```

---

## Migration from React (What We Avoided)

We **did NOT** have an existing React frontend, despite what some plan documents suggested.

**What we had:**
- ✅ Rails 8 API-only backend
- ✅ 107 passing backend tests
- ✅ All models and API endpoints
- ❌ NO React frontend code
- ❌ NO existing views

**What we did:**
1. Changed `config.api_only = false`
2. Added Hotwire gems (turbo-rails, stimulus-rails)
3. Added Tailwind CSS
4. Created basic layout
5. Ready to build views

**Time saved:** ~6-8 weeks (would have taken to refactor from React)

---

## When to Use Plain JavaScript

For complex, widget-like features that need heavy client-side logic:

**GIF Remix Editor** (Canvas manipulation):
```javascript
// app/javascript/controllers/gif_editor_controller.js
import { Controller } from "@hotwired/stimulus"
import GIF from "gif.js"

export default class extends Controller {
  static targets = ["canvas", "text", "preview"]

  connect() {
    this.canvas = this.canvasTarget.getContext('2d')
    this.loadGif()
  }

  addText() {
    // Canvas text overlay logic
    this.canvas.fillText(this.textTarget.value, 50, 50)
    this.updatePreview()
  }

  async saveGif() {
    // Generate GIF with GIF.js library
    const gif = new GIF({
      workers: 2,
      quality: 10
    })

    // ... GIF generation logic

    gif.render()
  }
}
```

**But the HTML is still server-rendered:**
```erb
<!-- app/views/gifs/remix.html.erb -->
<div data-controller="gif-editor">
  <canvas data-gif-editor-target="canvas"></canvas>
  <input type="text" data-gif-editor-target="text"
         data-action="input->gif-editor#addText">
  <button data-action="click->gif-editor#saveGif">Save Remix</button>
</div>
```

---

## Testing Strategy

### Controller Tests (Integration)

```ruby
# test/controllers/gifs_controller_test.rb
class GifsControllerTest < ActionDispatch::IntegrationTest
  test "should get feed" do
    get feed_path
    assert_response :success
    assert_select "turbo-frame#gifs"
  end

  test "should like gif via turbo stream" do
    post like_gif_path(@gif), as: :turbo_stream
    assert_turbo_stream action: :update, target: "like_count"
  end
end
```

### System Tests (E2E with Stimulus)

```ruby
# test/system/feed_test.rb
class FeedTest < ApplicationSystemTestCase
  test "infinite scroll loads more gifs" do
    visit feed_path

    # Scroll to bottom triggers lazy load
    execute_script "window.scrollTo(0, document.body.scrollHeight)"

    assert_selector ".gif-card", count: 40 # 20 initial + 20 loaded
  end
end
```

---

## Resources

### Official Documentation
- [Turbo Handbook](https://turbo.hotwired.dev/)
- [Stimulus Handbook](https://stimulus.hotwired.dev/)
- [Rails Guides](https://guides.rubyonrails.org/)
- [Tailwind CSS](https://tailwindcss.com/)

### Learning Resources
- [GoRails Hotwire Screencasts](https://gorails.com/series/hotwire-rails)
- [Hotwire Examples](https://github.com/thoughtbot/hotwire-example-template)
- [Tailwind UI Components](https://tailwindui.com/)

---

## Summary

✅ **DO:**
- Use ERB templates for views
- Use Turbo Frames for dynamic sections
- Use Turbo Streams for real-time updates
- Use Stimulus for JavaScript enhancements
- Use Tailwind for styling
- Keep API endpoints for Chrome extension

❌ **DO NOT:**
- Use React, Vue, or other frontend frameworks
- Create separate frontend build process
- Use npm/webpack/Vite for frontend
- Build API-only endpoints for web views (use server-rendered HTML)

**Remember:** The Chrome extension can still use React! It's a separate codebase that consumes the same API endpoints. The web app is Hotwire-only.
