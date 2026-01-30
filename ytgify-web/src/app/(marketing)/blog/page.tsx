import Link from 'next/link'
import { getAllPosts, formatDate } from '@/lib/blog'

export const metadata = {
  title: 'Blog - YTgify',
  description: 'Tips, tutorials, and guides for creating GIFs from YouTube videos.',
}

function TagBadge({ tag }: { tag: string }) {
  return (
    <Link
      href={`/blog/tag/${tag}`}
      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff] hover:bg-[#58a6ff]/20 transition-all duration-200"
    >
      {tag}
    </Link>
  )
}

function BlogCard({ post }: { post: { slug: string; title: string; description: string; date: string; readTime: number; tags: string[]; thumbnail?: string } }) {
  return (
    <article className="group bg-[#111111] rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#E91E8C]/50 transition-all duration-300">
      <Link href={`/blog/${post.slug}`}>
        <div className="aspect-video overflow-hidden bg-gray-900">
          {post.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <Link href={`/blog/${post.slug}`}>
          <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-[#E91E8C] transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>
        <p className="text-[#808080] text-sm mb-3 line-clamp-2">
          {post.description}
        </p>
        <div className="flex items-center gap-4 text-xs text-[#606060]">
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {post.readTime} min read
          </span>
          <span>{formatDate(post.date)}</span>
        </div>
      </div>
    </article>
  )
}

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <div className="min-h-screen bg-[#0a0a0a] grid-pattern">
      <article className="max-w-[800px] mx-auto px-6 sm:px-12 pt-12 pb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#a0a0a0] hover:text-white transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
          </svg>
          Back to Home
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Blog</h1>
          <p className="text-[#a0a0a0] text-lg">
            Tips, tutorials, and guides for creating GIFs from YouTube videos.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#606060] text-lg">
              No blog posts yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </article>
    </div>
  )
}
