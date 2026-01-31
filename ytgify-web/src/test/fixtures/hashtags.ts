export interface TestHashtag {
  id: string
  name: string
  gifs_count: number
  created_at: string
  updated_at: string
}

export const funnyHashtag: TestHashtag = {
  id: '40000000-0000-0000-0000-000000000001',
  name: 'funny',
  gifs_count: 100,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const catsHashtag: TestHashtag = {
  id: '40000000-0000-0000-0000-000000000002',
  name: 'cats',
  gifs_count: 75,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-16T10:00:00Z',
}

export const dogsHashtag: TestHashtag = {
  id: '40000000-0000-0000-0000-000000000003',
  name: 'dogs',
  gifs_count: 50,
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-17T10:00:00Z',
}

export const reactionsHashtag: TestHashtag = {
  id: '40000000-0000-0000-0000-000000000004',
  name: 'reactions',
  gifs_count: 200,
  created_at: '2024-01-04T00:00:00Z',
  updated_at: '2024-01-18T10:00:00Z',
}

export const emptyHashtag: TestHashtag = {
  id: '40000000-0000-0000-0000-000000000005',
  name: 'emptyhashtag',
  gifs_count: 0,
  created_at: '2024-01-05T00:00:00Z',
  updated_at: '2024-01-05T00:00:00Z',
}

export const nonExistentHashtagName = 'nonexistenthashtag'

export const testHashtags = [funnyHashtag, catsHashtag, dogsHashtag, reactionsHashtag, emptyHashtag]

// Trending hashtags (ordered by gifs_count)
export const trendingHashtags = [reactionsHashtag, funnyHashtag, catsHashtag, dogsHashtag]
