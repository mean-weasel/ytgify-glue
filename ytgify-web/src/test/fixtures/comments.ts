import { alice, bob } from './users'
import { aliceGif1, bobGif1 } from './gifs'

export interface TestComment {
  id: string
  user_id: string
  gif_id: string
  content: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export const aliceCommentOnBobGif: TestComment = {
  id: '30000000-0000-0000-0000-000000000001',
  user_id: alice.id,
  gif_id: bobGif1.id,
  content: 'Great GIF, Bob!',
  deleted_at: null,
  created_at: '2024-01-20T10:00:00Z',
  updated_at: '2024-01-20T10:00:00Z',
}

export const bobCommentOnAliceGif: TestComment = {
  id: '30000000-0000-0000-0000-000000000002',
  user_id: bob.id,
  gif_id: aliceGif1.id,
  content: 'Nice one, Alice!',
  deleted_at: null,
  created_at: '2024-01-21T10:00:00Z',
  updated_at: '2024-01-21T10:00:00Z',
}

export const deletedComment: TestComment = {
  id: '30000000-0000-0000-0000-000000000003',
  user_id: alice.id,
  gif_id: bobGif1.id,
  content: 'This comment was deleted',
  deleted_at: '2024-01-22T10:00:00Z',
  created_at: '2024-01-21T12:00:00Z',
  updated_at: '2024-01-22T10:00:00Z',
}

export const nonExistentCommentId = '30000000-0000-0000-0000-999999999999'

export const testComments = [aliceCommentOnBobGif, bobCommentOnAliceGif, deletedComment]
