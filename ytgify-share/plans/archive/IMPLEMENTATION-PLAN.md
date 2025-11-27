# ytgify Implementation Plan
## First Features from 03-FEATURES.md

**Related:** [Features](03-FEATURES.md) | [Current Status](01-CURRENT-STATUS.md) | [Agent Reference](06-AGENT-REFERENCE.md) | [Roadmap](05-ROADMAP.md)

---

## Overview

This plan outlines the step-by-step implementation of the first critical features for ytgify, starting with what's missing from the MVP. Based on [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md), we have:

- ✅ **Backend:** 90% complete (excellent foundation)
- ⚠️ **Frontend:** 40% complete (React, needs features)
- ❌ **Missing:** Social models, feed algorithm, GIF detail page, remix editor

**Estimated Time to MVP:** 3-4 weeks (keeping React architecture)

**Strategy:** Build features in dependency order, using Claude Code agents to explore and plan each step.

---

## Phase 1: Codebase Exploration (Day 1 - Morning)

**Goal:** Understand current implementation patterns before building new features.

### 1.1 Explore Backend Patterns

Use agents to understand existing code structure:

```bash
# Understand overall structure
@agent-Explore "medium: Analyze the overall application structure and tech stack"

# Review models
@agent-Explore "medium: Show me all models, their associations, and database schema"

# Check API patterns
@agent-Explore "quick: Find all API controllers and their endpoints"

# Review background jobs
@agent-Explore "quick: Find existing Sidekiq job patterns and Redis configuration"
```

**Expected Learnings:**
- Model association patterns
- API controller structure (auth, error handling, serialization)
- Background job setup (Sidekiq + Redis)
- Migration patterns (UUIDs, indexes, counter caches)

### 1.2 Explore Frontend Patterns

```bash
# Check React setup
@agent-Explore "medium: Find React components and frontend structure"

# Review API client
@agent-Explore "quick: Locate the API client and how it handles requests"

# Check state management
@agent-Explore "quick: How is authentication state managed in React?"

# Review component patterns
@agent-Explore "quick: Find shadcn/ui components and usage patterns"
```

**Expected Learnings:**
- React component organization
- API client patterns (TypeScript types, error handling)
- Authentication flow (login → token storage → API calls)
- shadcn/ui component usage

### 1.3 Explore Testing Patterns

```bash
# Backend tests
@agent-Explore "quick: Find existing test files and testing patterns"

# Frontend tests (if any)
@agent-Explore "quick: Find frontend test setup (Vitest, React Testing Library)"
```

**Expected Learnings:**
- Test file organization
- Factory/fixture patterns
- Test helpers and utilities

**Deliverable:** Understanding of codebase patterns to follow when building new features.

---

## Phase 2: Social Models (Backend) (Day 1 - Afternoon to Day 2)

**Goal:** Add missing Follow, Collection, and Hashtag models with full test coverage.

**Estimated Time:** 1.5 days

### 2.1 Follow Model

**Before coding:**
```bash
@agent-Explore "quick: Find the Like model to understand association patterns"
@agent-Plan "medium: Design Follow model with follower/following associations and counter caches"
```

**Implementation Steps:**

1. **Create migration** (use agent to verify schema):
   ```ruby
   # db/migrate/YYYYMMDDHHMMSS_create_follows.rb
   class CreateFollows < ActiveRecord::Migration[8.0]
     def change
       create_table :follows do |t|
         t.uuid :follower_id, null: false
         t.uuid :following_id, null: false
         t.timestamps

         add_index :follows, [:follower_id, :following_id], unique: true
         add_index :follows, :following_id
         add_foreign_key :follows, :users, column: :follower_id
         add_foreign_key :follows, :users, column: :following_id
       end

       add_column :users, :follower_count, :integer, default: 0, null: false
       add_column :users, :following_count, :integer, default: 0, null: false
     end
   end
   ```

2. **Create model** (following Like.rb pattern):
   ```ruby
   # app/models/follow.rb
   class Follow < ApplicationRecord
     belongs_to :follower, class_name: 'User', counter_cache: :following_count
     belongs_to :following, class_name: 'User', counter_cache: :follower_count

     validates :follower_id, uniqueness: { scope: :following_id }
     validate :cannot_follow_self

     def self.toggle(follower, following)
       follow = find_by(follower: follower, following: following)
       follow ? follow.destroy : create!(follower: follower, following: following)
     end

     private

     def cannot_follow_self
       errors.add(:follower_id, "cannot follow yourself") if follower_id == following_id
     end
   end
   ```

3. **Update User model**:
   ```ruby
   # app/models/user.rb
   has_many :following_relationships, class_name: 'Follow', foreign_key: 'follower_id', dependent: :destroy
   has_many :follower_relationships, class_name: 'Follow', foreign_key: 'following_id', dependent: :destroy
   has_many :following, through: :following_relationships, source: :following
   has_many :followers, through: :follower_relationships, source: :follower

   def following?(user)
     following.include?(user)
   end
   ```

4. **Create API controller**:
   ```bash
   @agent-Explore "quick: Find an existing API controller to understand the pattern"
   @agent-Plan "quick: Design API endpoints for follow/unfollow"
   ```

   ```ruby
   # app/controllers/api/v1/follows_controller.rb
   class Api::V1::FollowsController < ApplicationController
     before_action :authenticate_user!
     before_action :set_user, only: [:create, :destroy]

     def create
       Follow.toggle(current_user, @user)
       render json: { following: current_user.following?(@user), follower_count: @user.follower_count }
     end

     private

     def set_user
       @user = User.find(params[:user_id])
     end
   end
   ```

5. **Write tests**:
   ```bash
   @agent-Explore "quick: Find the Like model test to understand testing patterns"
   ```

   ```ruby
   # test/models/follow_test.rb
   require "test_helper"

   class FollowTest < ActiveSupport::TestCase
     def setup
       @user1 = users(:one)
       @user2 = users(:two)
     end

     test "toggle creates follow if none exists" do
       assert_difference 'Follow.count', 1 do
         Follow.toggle(@user1, @user2)
       end
     end

     test "toggle destroys follow if exists" do
       Follow.create!(follower: @user1, following: @user2)
       assert_difference 'Follow.count', -1 do
         Follow.toggle(@user1, @user2)
       end
     end

     test "cannot follow yourself" do
       follow = Follow.new(follower: @user1, following: @user1)
       assert_not follow.valid?
     end

     test "updates counter caches" do
       assert_difference '@user2.follower_count', 1 do
         Follow.create!(follower: @user1, following: @user2)
       end
     end
   end
   ```

6. **Run tests and migration**:
   ```bash
   rails db:migrate
   rails test test/models/follow_test.rb
   ```

**Deliverable:** Follow model with API, tests, and counter caches.

---

### 2.2 Collection Models

**Before coding:**
```bash
@agent-Plan "medium: Design Collection and CollectionGif models with associations"
```

**Implementation Steps:**

1. **Create migrations**:
   ```ruby
   # db/migrate/YYYYMMDDHHMMSS_create_collections.rb
   class CreateCollections < ActiveRecord::Migration[8.0]
     def change
       create_table :collections, id: :uuid do |t|
         t.uuid :user_id, null: false
         t.string :name, null: false
         t.text :description
         t.boolean :is_public, default: false
         t.integer :gifs_count, default: 0
         t.timestamps

         add_index :collections, :user_id
         add_foreign_key :collections, :users
       end

       create_table :collection_gifs do |t|
         t.uuid :collection_id, null: false
         t.uuid :gif_id, null: false
         t.datetime :added_at, default: -> { 'CURRENT_TIMESTAMP' }

         add_index :collection_gifs, [:collection_id, :gif_id], unique: true
         add_index :collection_gifs, :gif_id
         add_foreign_key :collection_gifs, :collections
         add_foreign_key :collection_gifs, :gifs
       end
     end
   end
   ```

2. **Create models**:
   ```ruby
   # app/models/collection.rb
   class Collection < ApplicationRecord
     belongs_to :user
     has_many :collection_gifs, dependent: :destroy
     has_many :gifs, through: :collection_gifs

     validates :name, presence: true, length: { maximum: 100 }
     validates :description, length: { maximum: 500 }

     scope :public_collections, -> { where(is_public: true) }
     scope :recent, -> { order(created_at: :desc) }
   end

   # app/models/collection_gif.rb
   class CollectionGif < ApplicationRecord
     belongs_to :collection, counter_cache: :gifs_count
     belongs_to :gif

     validates :gif_id, uniqueness: { scope: :collection_id }
   end
   ```

3. **Update associations**:
   ```ruby
   # app/models/user.rb
   has_many :collections, dependent: :destroy

   # app/models/gif.rb
   has_many :collection_gifs, dependent: :destroy
   has_many :collections, through: :collection_gifs
   ```

4. **Create API controllers**:
   ```ruby
   # app/controllers/api/v1/collections_controller.rb
   class Api::V1::CollectionsController < ApplicationController
     before_action :authenticate_user!, except: [:index, :show]
     before_action :set_collection, only: [:show, :update, :destroy, :add_gif, :remove_gif]
     before_action :authorize_collection!, only: [:update, :destroy, :add_gif, :remove_gif]

     def index
       @collections = if params[:user_id]
         user = User.find(params[:user_id])
         user == current_user ? user.collections : user.collections.public_collections
       else
         current_user.collections
       end
       render json: @collections
     end

     def create
       @collection = current_user.collections.build(collection_params)
       if @collection.save
         render json: @collection, status: :created
       else
         render json: { errors: @collection.errors }, status: :unprocessable_entity
       end
     end

     def add_gif
       gif = Gif.find(params[:gif_id])
       @collection.gifs << gif unless @collection.gifs.include?(gif)
       render json: @collection
     end

     def remove_gif
       @collection.gifs.delete(params[:gif_id])
       render json: @collection
     end

     private

     def set_collection
       @collection = Collection.find(params[:id])
     end

     def authorize_collection!
       unless @collection.user == current_user
         render json: { error: 'Unauthorized' }, status: :forbidden
       end
     end

     def collection_params
       params.require(:collection).permit(:name, :description, :is_public)
     end
   end
   ```

5. **Write tests** (following existing patterns)

6. **Run tests and migration**

**Deliverable:** Collection models with full CRUD API and tests.

---

### 2.3 Hashtag Models

**Before coding:**
```bash
@agent-Plan "medium: Design Hashtag and GifHashtag models with trending support"
```

**Implementation Steps:**

1. **Create migrations**:
   ```ruby
   # db/migrate/YYYYMMDDHHMMSS_create_hashtags.rb
   class CreateHashtags < ActiveRecord::Migration[8.0]
     def change
       create_table :hashtags do |t|
         t.string :tag, null: false
         t.integer :usage_count, default: 0
         t.timestamps

         add_index :hashtags, :tag, unique: true
         add_index :hashtags, :usage_count
       end

       create_table :gif_hashtags do |t|
         t.uuid :gif_id, null: false
         t.bigint :hashtag_id, null: false

         add_index :gif_hashtags, [:gif_id, :hashtag_id], unique: true
         add_index :gif_hashtags, :hashtag_id
         add_foreign_key :gif_hashtags, :gifs
         add_foreign_key :gif_hashtags, :hashtags
       end
     end
   end
   ```

2. **Create models**:
   ```ruby
   # app/models/hashtag.rb
   class Hashtag < ApplicationRecord
     has_many :gif_hashtags, dependent: :destroy
     has_many :gifs, through: :gif_hashtags

     validates :tag, presence: true, uniqueness: { case_sensitive: false }
     validates :tag, format: { with: /\A[a-z0-9_]+\z/i }

     before_validation :normalize_tag

     scope :trending, -> { order(usage_count: :desc).limit(20) }
     scope :recent, -> { order(created_at: :desc) }

     def self.find_or_create_by_tags(tag_array)
       tag_array.map do |tag|
         find_or_create_by(tag: tag.downcase.strip)
       end
     end

     private

     def normalize_tag
       self.tag = tag.downcase.strip if tag.present?
     end
   end

   # app/models/gif_hashtag.rb
   class GifHashtag < ApplicationRecord
     belongs_to :gif
     belongs_to :hashtag, counter_cache: :usage_count

     validates :gif_id, uniqueness: { scope: :hashtag_id }
   end
   ```

3. **Update Gif model**:
   ```ruby
   # app/models/gif.rb
   has_many :gif_hashtags, dependent: :destroy
   has_many :hashtags, through: :gif_hashtags

   def tag_list=(tags)
     self.hashtags = Hashtag.find_or_create_by_tags(tags)
   end

   def tag_list
     hashtags.pluck(:tag)
   end
   ```

4. **Create API endpoints**:
   ```ruby
   # app/controllers/api/v1/hashtags_controller.rb
   class Api::V1::HashtagsController < ApplicationController
     def index
       @hashtags = Hashtag.trending
       render json: @hashtags
     end

     def autocomplete
       @hashtags = Hashtag.where("tag LIKE ?", "#{params[:q]}%").limit(10)
       render json: @hashtags.pluck(:tag)
     end

     def show
       @hashtag = Hashtag.find_by!(tag: params[:id].downcase)
       @gifs = @hashtag.gifs.public_only.recent.page(params[:page])
       render json: @gifs
     end
   end
   ```

5. **Update routes**:
   ```ruby
   # config/routes.rb
   namespace :api do
     namespace :v1 do
       resources :hashtags, only: [:index, :show] do
         collection do
           get 'autocomplete'
         end
       end
     end
   end
   ```

6. **Write tests and migrate**

**Deliverable:** Hashtag system with trending, autocomplete, and GIF association.

---

## Phase 3: Feed Algorithm & Trending (Day 3)

**Goal:** Implement algorithmic feed with trending, recent, and recommended GIFs.

**Estimated Time:** 1 day

### 3.1 Trending Score Calculation

**Before coding:**
```bash
@agent-Explore "quick: Locate the Gif model and its engagement counter columns"
@agent-Plan "medium: Design trending score calculation job with Redis caching strategy"
```

**Implementation Steps:**

1. **Add trending_score method to Gif model**:
   ```ruby
   # app/models/gif.rb
   def trending_score
     engagement = (like_count * 3 + comment_count * 5 + remix_count * 10 + share_count * 7)
     age_in_hours = ((Time.current - created_at) / 1.hour).to_f
     return 0 if age_in_hours < 1
     engagement / (age_in_hours ** 1.5)
   end

   scope :trending, -> {
     # Redis cache key
     cache_key = "trending_gif_ids:#{Date.current}"

     gif_ids = Rails.cache.fetch(cache_key, expires_in: 15.minutes) do
       # Calculate trending for recent GIFs only (last 7 days)
       where('created_at > ?', 7.days.ago)
         .public_only
         .not_deleted
         .to_a
         .sort_by(&:trending_score)
         .reverse
         .take(100)
         .map(&:id)
     end

     where(id: gif_ids).order(Arel.sql("array_position(ARRAY[#{gif_ids.join(',')}]::uuid[], id::uuid)"))
   }
   ```

2. **Create Sidekiq job for periodic recalculation**:
   ```ruby
   # app/jobs/recalculate_trending_job.rb
   class RecalculateTrendingJob < ApplicationJob
     queue_as :low_priority

     def perform
       # Force cache refresh by deleting old cache
       Rails.cache.delete("trending_gif_ids:#{Date.current}")

       # Trigger recalculation
       Gif.trending.to_a

       Rails.logger.info "Trending scores recalculated at #{Time.current}"
     end
   end
   ```

3. **Schedule job with sidekiq-cron**:
   ```ruby
   # config/initializers/sidekiq.rb
   require 'sidekiq-cron'

   Sidekiq::Cron::Job.create(
     name: 'Recalculate trending - every 15 minutes',
     cron: '*/15 * * * *',
     class: 'RecalculateTrendingJob'
   )
   ```

**Deliverable:** Trending algorithm with Redis caching and automatic updates.

### 3.2 Feed Algorithm

**Before coding:**
```bash
@agent-Plan "medium: Design feed algorithm with trending, recent, and recommended GIFs"
```

**Implementation Steps:**

1. **Add feed scopes to Gif model**:
   ```ruby
   # app/models/gif.rb
   scope :recent, -> { order(created_at: :desc) }
   scope :popular, -> { order(like_count: :desc, created_at: :desc) }
   scope :most_remixed, -> { where('remix_count > 0').order(remix_count: :desc) }

   def self.feed_for(user, algorithm: :trending, page: 1, per_page: 20)
     gifs = case algorithm.to_sym
     when :trending
       trending
     when :recent
       recent
     when :popular
       popular
     when :following
       user ? from_following(user) : recent
     else
       trending
     end

     gifs.public_only.not_deleted.page(page).per(per_page)
   end

   def self.from_following(user)
     where(user_id: user.following_ids).recent
   end
   ```

2. **Create Feed API endpoint**:
   ```ruby
   # app/controllers/api/v1/feed_controller.rb
   class Api::V1::FeedController < ApplicationController
     skip_before_action :authenticate_user!, only: [:index]

     def index
       @gifs = Gif.feed_for(
         current_user,
         algorithm: params[:algorithm] || :trending,
         page: params[:page] || 1,
         per_page: params[:per_page] || 20
       )

       render json: {
         gifs: @gifs,
         meta: {
           current_page: @gifs.current_page,
           total_pages: @gifs.total_pages,
           total_count: @gifs.total_count
         }
       }
     end
   end
   ```

3. **Add routes**:
   ```ruby
   # config/routes.rb
   namespace :api do
     namespace :v1 do
       resource :feed, only: [:index]
     end
   end
   ```

4. **Write tests**

**Deliverable:** Working feed algorithm with multiple sorting options and pagination.

---

## Phase 4: GIF Detail Page (React) (Day 4)

**Goal:** Build complete GIF detail page with comments, likes, and metadata.

**Estimated Time:** 1 day

### 4.1 Plan Component Structure

**Before coding:**
```bash
@agent-Explore "medium: Find existing React page components to understand structure"
@agent-Plan "medium: Design GIF detail page component hierarchy"
```

**Component Breakdown:**
- `GifDetailPage.tsx` (main page)
  - `GifPlayer.tsx` (GIF display)
  - `GifMetadata.tsx` (title, description, stats)
  - `GifActions.tsx` (like, share, remix buttons)
  - `CommentsSection.tsx` (comments list + form)
  - `RelatedGifs.tsx` (recommendations)

### 4.2 Implementation Steps

1. **Create API endpoint for GIF details**:
   ```ruby
   # app/controllers/api/v1/gifs_controller.rb
   def show
     @gif = Gif.not_deleted.find(params[:id])

     # Increment view count asynchronously
     GifViewCountJob.perform_later(@gif.id)

     render json: {
       gif: GifSerializer.new(@gif).serializable_hash,
       comments: @gif.comments.includes(:user).recent.limit(20),
       related: @gif.related_gifs.limit(6)
     }
   end
   ```

2. **Add related_gifs method to Gif model**:
   ```ruby
   # app/models/gif.rb
   def related_gifs
     # Same creator, or same source video, or similar hashtags
     Gif.where(user_id: user_id)
       .or(Gif.where(youtube_video_url: youtube_video_url))
       .where.not(id: id)
       .public_only
       .not_deleted
       .limit(6)
   end
   ```

3. **Create React components**:
   ```bash
   @agent-Explore "quick: Find existing API hooks to understand data fetching patterns"
   ```

   ```typescript
   // app/frontend/pages/GifDetail.tsx
   import { useParams } from 'react-router-dom';
   import { useQuery } from '@tanstack/react-query';
   import { api } from '@/lib/api';
   import { GifPlayer } from '@/components/gif/GifPlayer';
   import { GifMetadata } from '@/components/gif/GifMetadata';
   import { GifActions } from '@/components/gif/GifActions';
   import { CommentsSection } from '@/components/comments/CommentsSection';
   import { RelatedGifs } from '@/components/gif/RelatedGifs';

   export function GifDetailPage() {
     const { id } = useParams();
     const { data, isLoading } = useQuery({
       queryKey: ['gif', id],
       queryFn: () => api.gifs.getById(id!)
     });

     if (isLoading) return <div>Loading...</div>;
     if (!data) return <div>GIF not found</div>;

     return (
       <div className="container mx-auto px-4 py-8">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2">
             <GifPlayer gif={data.gif} />
             <GifActions gif={data.gif} />
             <CommentsSection gifId={data.gif.id} comments={data.comments} />
           </div>
           <div>
             <GifMetadata gif={data.gif} />
             <RelatedGifs gifs={data.related} />
           </div>
         </div>
       </div>
     );
   }
   ```

4. **Implement Like button with optimistic updates**:
   ```typescript
   // app/frontend/components/gif/LikeButton.tsx
   import { useMutation, useQueryClient } from '@tanstack/react-query';
   import { api } from '@/lib/api';
   import { Heart } from 'lucide-react';
   import { Button } from '@/components/ui/button';

   export function LikeButton({ gif }) {
     const queryClient = useQueryClient();

     const likeMutation = useMutation({
       mutationFn: () => api.likes.toggle(gif.id),
       onMutate: async () => {
         // Optimistic update
         await queryClient.cancelQueries(['gif', gif.id]);
         const previous = queryClient.getQueryData(['gif', gif.id]);

         queryClient.setQueryData(['gif', gif.id], (old) => ({
           ...old,
           gif: {
             ...old.gif,
             liked_by_current_user: !old.gif.liked_by_current_user,
             like_count: old.gif.liked_by_current_user
               ? old.gif.like_count - 1
               : old.gif.like_count + 1
           }
         }));

         return { previous };
       },
       onError: (err, variables, context) => {
         // Rollback on error
         queryClient.setQueryData(['gif', gif.id], context.previous);
       }
     });

     return (
       <Button
         variant={gif.liked_by_current_user ? "default" : "outline"}
         onClick={() => likeMutation.mutate()}
       >
         <Heart className={gif.liked_by_current_user ? "fill-current" : ""} />
         {gif.like_count}
       </Button>
     );
   }
   ```

5. **Add route**:
   ```typescript
   // app/frontend/App.tsx
   <Route path="/g/:id" element={<GifDetailPage />} />
   ```

6. **Write component tests** (if using Vitest)

**Deliverable:** Complete GIF detail page with likes, comments, and related GIFs.

---

## Phase 5: Complete Feed Page (Day 5)

**Goal:** Connect Feed page to real data with infinite scroll.

**Estimated Time:** 1 day

### 5.1 Implementation Steps

**Before coding:**
```bash
@agent-Explore "quick: Find the current Feed.tsx stub"
@agent-Plan "medium: Design Feed page with infinite scroll and filter tabs"
```

1. **Update Feed page**:
   ```typescript
   // app/frontend/pages/Feed.tsx
   import { useState } from 'react';
   import { useInfiniteQuery } from '@tanstack/react-query';
   import { api } from '@/lib/api';
   import { GifGrid } from '@/components/gif/GifGrid';
   import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
   import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

   type Algorithm = 'trending' | 'recent' | 'popular' | 'following';

   export function FeedPage() {
     const [algorithm, setAlgorithm] = useState<Algorithm>('trending');

     const {
       data,
       fetchNextPage,
       hasNextPage,
       isFetchingNextPage,
       isLoading
     } = useInfiniteQuery({
       queryKey: ['feed', algorithm],
       queryFn: ({ pageParam = 1 }) =>
         api.feed.get({ algorithm, page: pageParam }),
       getNextPageParam: (lastPage) =>
         lastPage.meta.current_page < lastPage.meta.total_pages
           ? lastPage.meta.current_page + 1
           : undefined
     });

     const { ref } = useIntersectionObserver({
       onIntersect: fetchNextPage,
       enabled: hasNextPage
     });

     const gifs = data?.pages.flatMap(page => page.gifs) ?? [];

     return (
       <div className="container mx-auto px-4 py-8">
         <Tabs value={algorithm} onValueChange={(v) => setAlgorithm(v as Algorithm)}>
           <TabsList>
             <TabsTrigger value="trending">Trending</TabsTrigger>
             <TabsTrigger value="recent">Recent</TabsTrigger>
             <TabsTrigger value="popular">Popular</TabsTrigger>
             <TabsTrigger value="following">Following</TabsTrigger>
           </TabsList>
         </Tabs>

         <GifGrid gifs={gifs} isLoading={isLoading} />

         {/* Infinite scroll trigger */}
         <div ref={ref} className="h-10">
           {isFetchingNextPage && <div>Loading more...</div>}
         </div>
       </div>
     );
   }
   ```

2. **Create IntersectionObserver hook**:
   ```typescript
   // app/frontend/hooks/useIntersectionObserver.ts
   import { useEffect, useRef } from 'react';

   export function useIntersectionObserver({
     onIntersect,
     enabled = true,
     threshold = 0.1
   }: {
     onIntersect: () => void;
     enabled?: boolean;
     threshold?: number;
   }) {
     const ref = useRef<HTMLDivElement>(null);

     useEffect(() => {
       if (!enabled) return;

       const observer = new IntersectionObserver(
         (entries) => {
           if (entries[0].isIntersecting) {
             onIntersect();
           }
         },
         { threshold }
       );

       const current = ref.current;
       if (current) observer.observe(current);

       return () => {
         if (current) observer.unobserve(current);
       };
     }, [enabled, onIntersect, threshold]);

     return { ref };
   }
   ```

3. **Create GifGrid component**:
   ```typescript
   // app/frontend/components/gif/GifGrid.tsx
   import { Link } from 'react-router-dom';
   import { Card } from '@/components/ui/card';

   export function GifGrid({ gifs, isLoading }) {
     if (isLoading) {
       return <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {[...Array(12)].map((_, i) => (
           <Card key={i} className="h-64 animate-pulse bg-gray-200" />
         ))}
       </div>;
     }

     return (
       <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {gifs.map((gif) => (
           <Link key={gif.id} to={`/g/${gif.id}`}>
             <Card className="overflow-hidden hover:shadow-lg transition-shadow">
               <img
                 src={gif.thumbnail_url}
                 alt={gif.title}
                 className="w-full h-48 object-cover"
               />
               <div className="p-3">
                 <h3 className="font-semibold truncate">{gif.title}</h3>
                 <p className="text-sm text-gray-600">
                   {gif.like_count} likes · {gif.view_count} views
                 </p>
               </div>
             </Card>
           </Link>
         ))}
       </div>
     );
   }
   ```

**Deliverable:** Working feed page with infinite scroll and algorithm switching.

---

## Phase 6: Collections UI (Day 6)

**Goal:** Build UI for creating and managing collections.

**Estimated Time:** 1 day

### 6.1 Implementation Steps

1. **Create Collections page**:
   ```typescript
   // app/frontend/pages/Collections.tsx
   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
   import { api } from '@/lib/api';
   import { Button } from '@/components/ui/button';
   import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
   import { CreateCollectionForm } from '@/components/collections/CreateCollectionForm';
   import { CollectionCard } from '@/components/collections/CollectionCard';

   export function CollectionsPage() {
     const { data: collections } = useQuery({
       queryKey: ['collections'],
       queryFn: api.collections.getAll
     });

     return (
       <div className="container mx-auto px-4 py-8">
         <div className="flex justify-between items-center mb-6">
           <h1 className="text-3xl font-bold">My Collections</h1>
           <Dialog>
             <DialogTrigger asChild>
               <Button>New Collection</Button>
             </DialogTrigger>
             <DialogContent>
               <CreateCollectionForm />
             </DialogContent>
           </Dialog>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {collections?.map(collection => (
             <CollectionCard key={collection.id} collection={collection} />
           ))}
         </div>
       </div>
     );
   }
   ```

2. **Add "Save to Collection" button on GIF pages**:
   ```typescript
   // app/frontend/components/gif/SaveToCollectionButton.tsx
   import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
   import { Button } from '@/components/ui/button';
   import { Checkbox } from '@/components/ui/checkbox';
   import { useQuery, useMutation } from '@tanstack/react-query';

   export function SaveToCollectionButton({ gifId }) {
     const { data: collections } = useQuery({
       queryKey: ['collections'],
       queryFn: api.collections.getAll
     });

     const addToCollectionMutation = useMutation({
       mutationFn: ({ collectionId, gifId }) =>
         api.collections.addGif(collectionId, gifId)
     });

     return (
       <Dialog>
         <DialogTrigger asChild>
           <Button variant="outline">Save to Collection</Button>
         </DialogTrigger>
         <DialogContent>
           <h3 className="font-semibold mb-4">Save to Collection</h3>
           <div className="space-y-2">
             {collections?.map(collection => (
               <label key={collection.id} className="flex items-center space-x-2">
                 <Checkbox
                   checked={collection.gif_ids?.includes(gifId)}
                   onCheckedChange={(checked) => {
                     if (checked) {
                       addToCollectionMutation.mutate({
                         collectionId: collection.id,
                         gifId
                       });
                     }
                   }}
                 />
                 <span>{collection.name}</span>
               </label>
             ))}
           </div>
         </DialogContent>
       </Dialog>
     );
   }
   ```

**Deliverable:** Collections management UI with create/delete/add/remove functionality.

---

## Phase 7: Follow System UI (Day 7)

**Goal:** Add follow buttons and following feed.

**Estimated Time:** 0.5 days

### 7.1 Implementation Steps

1. **Create FollowButton component**:
   ```typescript
   // app/frontend/components/user/FollowButton.tsx
   import { useMutation, useQueryClient } from '@tanstack/react-query';
   import { api } from '@/lib/api';
   import { Button } from '@/components/ui/button';

   export function FollowButton({ user, isFollowing }) {
     const queryClient = useQueryClient();

     const followMutation = useMutation({
       mutationFn: () => api.follows.toggle(user.id),
       onSuccess: () => {
         queryClient.invalidateQueries(['user', user.id]);
       }
     });

     return (
       <Button
         variant={isFollowing ? "outline" : "default"}
         onClick={() => followMutation.mutate()}
       >
         {isFollowing ? 'Unfollow' : 'Follow'}
       </Button>
     );
   }
   ```

2. **Add to user profiles and GIF detail pages**

3. **Update Feed page to include "Following" tab** (already done in Phase 5)

**Deliverable:** Follow/unfollow functionality across the app.

---

## Phase 8: Remix Editor (Days 8-10)

**Goal:** Build Canvas-based remix editor with GIF.js.

**Estimated Time:** 3 days

### 8.1 Research Phase

**Before coding:**
```bash
@agent-Explore "very thorough: Find all GIF processing code, file upload handling, and JavaScript libraries"
@agent-Plan "very thorough: Design comprehensive remix editor implementation with Canvas API, GIF.js integration, and S3 upload flow"
```

### 8.2 Implementation Steps

1. **Install GIF.js**:
   ```bash
   npm install gif.js
   npm install --save-dev @types/gif.js
   ```

2. **Create RemixEditor component** (full implementation in separate doc due to complexity)

3. **Add remix route**:
   ```typescript
   <Route path="/g/:id/remix" element={<RemixEditorPage />} />
   ```

4. **Test with real GIFs**

**Deliverable:** Working remix editor that creates new GIFs with text overlays.

---

## Summary Timeline

| Phase | Days | Deliverable |
|-------|------|-------------|
| **Phase 1** | 0.5 | Codebase exploration complete |
| **Phase 2** | 1.5 | Follow, Collection, Hashtag models + APIs + tests |
| **Phase 3** | 1 | Feed algorithm + trending system |
| **Phase 4** | 1 | GIF detail page (React) |
| **Phase 5** | 1 | Complete Feed page with infinite scroll |
| **Phase 6** | 1 | Collections UI |
| **Phase 7** | 0.5 | Follow system UI |
| **Phase 8** | 3 | Remix editor |
| **Total** | **10 days** | **MVP Complete** |

---

## Daily Checklist

Each day, follow this workflow:

1. ✅ **Morning:** Review plan, run agent exploration commands
2. ✅ **Implement:** Build feature following discovered patterns
3. ✅ **Test:** Write and run tests (backend + frontend)
4. ✅ **Commit:** Create git commit with clear message
5. ✅ **Document:** Update [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md) with progress

---

## Using Agents Throughout

**Every feature should start with:**
```bash
@agent-Explore "Find existing patterns for [feature area]"
@agent-Plan "Design [new feature] following existing patterns"
```

**During implementation:**
```bash
@agent-Explore "Find [specific file/code] related to [issue]"
```

**After implementation:**
```bash
@agent-Plan "Create testing strategy for [feature]"
```

**Full agent guide:** [06-AGENT-REFERENCE.md](06-AGENT-REFERENCE.md)

---

## Next Steps

**Ready to start?**

1. Begin with Phase 1: Codebase exploration
2. Use the agent commands provided
3. Follow the implementation steps for Phase 2
4. Update this plan as you discover new patterns
5. Track progress in [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md)

**Let's build! 🚀**
