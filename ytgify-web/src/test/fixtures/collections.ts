import { alice, bob } from './users'

export interface TestCollection {
  id: string
  user_id: string
  name: string
  description: string | null
  privacy: 'public' | 'private'
  created_at: string
  updated_at: string
}

export const aliceCollection1: TestCollection = {
  id: '20000000-0000-0000-0000-000000000001',
  user_id: alice.id,
  name: 'My Favorites',
  description: 'My favorite GIFs',
  privacy: 'public',
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-10T10:00:00Z',
}

export const alicePrivateCollection: TestCollection = {
  id: '20000000-0000-0000-0000-000000000002',
  user_id: alice.id,
  name: 'Private Collection',
  description: 'My private GIFs',
  privacy: 'private',
  created_at: '2024-01-11T10:00:00Z',
  updated_at: '2024-01-11T10:00:00Z',
}

export const bobCollection1: TestCollection = {
  id: '20000000-0000-0000-0000-000000000003',
  user_id: bob.id,
  name: 'Bob Best GIFs',
  description: null,
  privacy: 'public',
  created_at: '2024-01-12T10:00:00Z',
  updated_at: '2024-01-12T10:00:00Z',
}

export const nonExistentCollectionId = '20000000-0000-0000-0000-999999999999'

export const testCollections = [aliceCollection1, alicePrivateCollection, bobCollection1]
