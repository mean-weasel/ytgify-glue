// Generated types for YTgify Supabase schema
// Regenerate with: npx supabase gen types typescript --project-id <project-id> > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type GifPrivacy = 'public' | 'unlisted' | 'private'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          website: string | null
          twitter_handle: string | null
          youtube_channel: string | null
          is_verified: boolean
          gifs_count: number
          total_likes_received: number
          follower_count: number
          following_count: number
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          twitter_handle?: string | null
          youtube_channel?: string | null
          is_verified?: boolean
          gifs_count?: number
          total_likes_received?: number
          follower_count?: number
          following_count?: number
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          twitter_handle?: string | null
          youtube_channel?: string | null
          is_verified?: boolean
          gifs_count?: number
          total_likes_received?: number
          follower_count?: number
          following_count?: number
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      gifs: {
        Row: {
          id: string
          user_id: string
          title: string | null
          description: string | null
          file_url: string
          thumbnail_url: string | null
          youtube_video_url: string | null
          youtube_video_title: string | null
          youtube_channel_name: string | null
          youtube_timestamp_start: number | null
          youtube_timestamp_end: number | null
          duration: number | null
          fps: number | null
          width: number | null
          height: number | null
          file_size: number | null
          has_text_overlay: boolean
          text_overlay_data: Json | null
          is_remix: boolean
          parent_gif_id: string | null
          remix_count: number
          privacy: GifPrivacy
          view_count: number
          like_count: number
          comment_count: number
          share_count: number
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          description?: string | null
          file_url: string
          thumbnail_url?: string | null
          youtube_video_url?: string | null
          youtube_video_title?: string | null
          youtube_channel_name?: string | null
          youtube_timestamp_start?: number | null
          youtube_timestamp_end?: number | null
          duration?: number | null
          fps?: number | null
          width?: number | null
          height?: number | null
          file_size?: number | null
          has_text_overlay?: boolean
          text_overlay_data?: Json | null
          is_remix?: boolean
          parent_gif_id?: string | null
          remix_count?: number
          privacy?: GifPrivacy
          view_count?: number
          like_count?: number
          comment_count?: number
          share_count?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          description?: string | null
          file_url?: string
          thumbnail_url?: string | null
          youtube_video_url?: string | null
          youtube_video_title?: string | null
          youtube_channel_name?: string | null
          youtube_timestamp_start?: number | null
          youtube_timestamp_end?: number | null
          duration?: number | null
          fps?: number | null
          width?: number | null
          height?: number | null
          file_size?: number | null
          has_text_overlay?: boolean
          text_overlay_data?: Json | null
          is_remix?: boolean
          parent_gif_id?: string | null
          remix_count?: number
          privacy?: GifPrivacy
          view_count?: number
          like_count?: number
          comment_count?: number
          share_count?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          gif_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gif_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gif_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          gif_id: string
          content: string
          parent_comment_id: string | null
          reply_count: number
          like_count: number
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gif_id: string
          content: string
          parent_comment_id?: string | null
          reply_count?: number
          like_count?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gif_id?: string
          content?: string
          parent_comment_id?: string | null
          reply_count?: number
          like_count?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_public: boolean
          gifs_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_public?: boolean
          gifs_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          gifs_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      collection_gifs: {
        Row: {
          id: string
          collection_id: string
          gif_id: string
          position: number
          added_at: string | null
        }
        Insert: {
          id?: string
          collection_id: string
          gif_id: string
          position?: number
          added_at?: string | null
        }
        Update: {
          id?: string
          collection_id?: string
          gif_id?: string
          position?: number
          added_at?: string | null
        }
      }
      hashtags: {
        Row: {
          id: string
          name: string
          slug: string
          usage_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          usage_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          usage_count?: number
          created_at?: string
        }
      }
      gif_hashtags: {
        Row: {
          id: string
          gif_id: string
          hashtag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          gif_id: string
          hashtag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          gif_id?: string
          hashtag_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string
          notifiable_type: string
          notifiable_id: string
          action: string
          read_at: string | null
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id: string
          notifiable_type: string
          notifiable_id: string
          action: string
          read_at?: string | null
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string
          notifiable_type?: string
          notifiable_id?: string
          action?: string
          read_at?: string | null
          data?: Json | null
          created_at?: string
        }
      }
      view_events: {
        Row: {
          id: string
          viewer_id: string | null
          gif_id: string
          ip_address: string | null
          user_agent: string | null
          referer: string | null
          duration: number | null
          is_unique: boolean
          created_at: string
        }
        Insert: {
          id?: string
          viewer_id?: string | null
          gif_id: string
          ip_address?: string | null
          user_agent?: string | null
          referer?: string | null
          duration?: number | null
          is_unique?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          viewer_id?: string | null
          gif_id?: string
          ip_address?: string | null
          user_agent?: string | null
          referer?: string | null
          duration?: number | null
          is_unique?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gif_privacy: GifPrivacy
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience types
export type User = Tables<'users'>
export type Gif = Tables<'gifs'>
export type Like = Tables<'likes'>
export type Comment = Tables<'comments'>
export type Follow = Tables<'follows'>
export type Collection = Tables<'collections'>
export type CollectionGif = Tables<'collection_gifs'>
export type Hashtag = Tables<'hashtags'>
export type GifHashtag = Tables<'gif_hashtags'>
export type Notification = Tables<'notifications'>
export type ViewEvent = Tables<'view_events'>

// Extended types with relations
export type GifWithUser = Gif & {
  user: User
}

export type GifWithDetails = Gif & {
  user: User
  hashtags?: Hashtag[]
  parent_gif?: Gif | null
  is_liked?: boolean
}

export type CommentWithUser = Comment & {
  user: User
}

export type NotificationWithActorAndNotifiable = Notification & {
  actor: User
}

export type CollectionWithGifs = Collection & {
  gifs: Gif[]
}

export type UserWithStats = User & {
  is_following?: boolean
}

// Feed types
export type FeedItem = GifWithDetails

export interface FeedResponse {
  gifs: FeedItem[]
  nextCursor: string | null
  hasMore: boolean
}
