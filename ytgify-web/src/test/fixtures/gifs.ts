import { alice, bob } from './users'

export interface TestGif {
  id: string
  user_id: string
  title: string
  description: string | null
  file_url: string
  thumbnail_url: string | null
  width: number
  height: number
  duration: number
  file_size: number
  privacy: 'public' | 'unlisted' | 'private'
  source_url: string | null
  source_title: string | null
  likes_count: number
  comments_count: number
  views_count: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export const aliceGif1: TestGif = {
  id: '10000000-0000-0000-0000-000000000001',
  user_id: alice.id,
  title: 'Alice First GIF',
  description: 'A test GIF from Alice',
  file_url: 'https://storage.example.com/gifs/alice-1.gif',
  thumbnail_url: 'https://storage.example.com/thumbs/alice-1.jpg',
  width: 480,
  height: 320,
  duration: 3.5,
  file_size: 1024000,
  privacy: 'public',
  source_url: 'https://youtube.com/watch?v=test1',
  source_title: 'Test Video 1',
  likes_count: 10,
  comments_count: 5,
  views_count: 100,
  deleted_at: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const aliceGif2: TestGif = {
  id: '10000000-0000-0000-0000-000000000002',
  user_id: alice.id,
  title: 'Alice Second GIF',
  description: null,
  file_url: 'https://storage.example.com/gifs/alice-2.gif',
  thumbnail_url: null,
  width: 640,
  height: 480,
  duration: 5.0,
  file_size: 2048000,
  privacy: 'public',
  source_url: null,
  source_title: null,
  likes_count: 5,
  comments_count: 2,
  views_count: 50,
  deleted_at: null,
  created_at: '2024-01-16T10:00:00Z',
  updated_at: '2024-01-16T10:00:00Z',
}

export const alicePrivateGif: TestGif = {
  id: '10000000-0000-0000-0000-000000000003',
  user_id: alice.id,
  title: 'Alice Private GIF',
  description: 'This is private',
  file_url: 'https://storage.example.com/gifs/alice-private.gif',
  thumbnail_url: null,
  width: 480,
  height: 320,
  duration: 2.0,
  file_size: 512000,
  privacy: 'private',
  source_url: null,
  source_title: null,
  likes_count: 0,
  comments_count: 0,
  views_count: 5,
  deleted_at: null,
  created_at: '2024-01-17T10:00:00Z',
  updated_at: '2024-01-17T10:00:00Z',
}

export const bobGif1: TestGif = {
  id: '10000000-0000-0000-0000-000000000004',
  user_id: bob.id,
  title: 'Bob Awesome GIF',
  description: 'An awesome GIF from Bob',
  file_url: 'https://storage.example.com/gifs/bob-1.gif',
  thumbnail_url: 'https://storage.example.com/thumbs/bob-1.jpg',
  width: 720,
  height: 480,
  duration: 4.0,
  file_size: 1536000,
  privacy: 'public',
  source_url: 'https://youtube.com/watch?v=test2',
  source_title: 'Test Video 2',
  likes_count: 25,
  comments_count: 10,
  views_count: 500,
  deleted_at: null,
  created_at: '2024-01-18T10:00:00Z',
  updated_at: '2024-01-18T10:00:00Z',
}

export const deletedGif: TestGif = {
  id: '10000000-0000-0000-0000-000000000005',
  user_id: alice.id,
  title: 'Deleted GIF',
  description: 'This GIF was deleted',
  file_url: 'https://storage.example.com/gifs/deleted.gif',
  thumbnail_url: null,
  width: 480,
  height: 320,
  duration: 1.0,
  file_size: 256000,
  privacy: 'public',
  source_url: null,
  source_title: null,
  likes_count: 0,
  comments_count: 0,
  views_count: 10,
  deleted_at: '2024-01-20T10:00:00Z',
  created_at: '2024-01-19T10:00:00Z',
  updated_at: '2024-01-20T10:00:00Z',
}

// Non-existent GIF ID for testing 404s
export const nonExistentGifId = '10000000-0000-0000-0000-999999999999'

// All test GIFs
export const testGifs = [aliceGif1, aliceGif2, alicePrivateGif, bobGif1, deletedGif]

// Public GIFs only (for feed tests)
export const publicGifs = [aliceGif1, aliceGif2, bobGif1]
