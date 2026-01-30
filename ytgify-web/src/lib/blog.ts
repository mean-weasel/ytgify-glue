import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  tags: string[]
  thumbnail?: string
  readTime: number
  content: string
}

function parseFile(filePath: string): BlogPost | null {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(fileContents)
    const slug = path.basename(filePath, '.md')

    return {
      slug,
      title: data.title || '',
      description: data.description || '',
      date: data.date || new Date().toISOString().split('T')[0],
      tags: (data.tags || []).map((t: string) => t.toLowerCase()),
      thumbnail: data.thumbnail,
      readTime: data.readTime || estimateReadTime(content),
      content,
    }
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error)
    return null
  }
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length
  return Math.ceil(words / 200)
}

export async function getAllPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(CONTENT_DIR)) {
    return []
  }

  const files = fs.readdirSync(CONTENT_DIR)
  const posts = files
    .filter((file) => file.endsWith('.md'))
    .map((file) => parseFile(path.join(CONTENT_DIR, file)))
    .filter((post): post is BlogPost => post !== null)

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null
  return parseFile(filePath)
}

export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllPosts()
  return posts.filter((p) => p.tags.includes(tag.toLowerCase()))
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getAllPosts()
  const tagSet = new Set<string>()
  posts.forEach((post) => post.tags.forEach((tag) => tagSet.add(tag)))
  return Array.from(tagSet).sort()
}

export async function getRelatedPosts(currentPost: BlogPost, limit: number = 3): Promise<BlogPost[]> {
  if (!currentPost.tags || currentPost.tags.length === 0) return []

  const posts = await getAllPosts()
  return posts
    .filter((p) => p.slug !== currentPost.slug)
    .filter((p) => p.tags.some((tag) => currentPost.tags.includes(tag)))
    .slice(0, limit)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
