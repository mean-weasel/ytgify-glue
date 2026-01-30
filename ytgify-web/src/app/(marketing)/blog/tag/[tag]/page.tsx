import Link from 'next/link'
import { getAllTags, getPostsByTag, formatDate } from '@/lib/blog'

export async function generateStaticParams() {
  const tags = await getAllTags()
  return tags.map((tag) => ({
    tag: tag,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  return {
    title: `Posts tagged "${tag}" - YTgify Blog`,
    description: `Blog posts about ${tag}`,
  }
}

function TagBadge({ tag, active = false }: { tag: string; active?: boolean }) {
  return (
    <Link
      href={`/blog/tag/${tag}`}
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
        active
          ? 'border-[#E91E8C] bg-[#E91E8C]/20 text-[#E91E8C]'
          : 'border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff] hover:bg-[#58a6ff]/20'
      }`}
    >
      {tag}
    </Link>
  )
}

function BlogCard({ post }: { post: { slug: string; title: string; description: string; date: string; readTime: number; tags: string[] } }) {
  return (
    <article className="group bg-[#111111] rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#E91E8C]/50 transition-all duration-300 p-4">
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
    </article>
  )
}

export default async function BlogTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const posts = await getPostsByTag(tag)

  return (
    <div className="min-h-screen bg-[#0a0a0a] grid-pattern">
      <article className="max-w-[800px] mx-auto px-6 sm:px-12 pt-12 pb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[#a0a0a0] hover:text-white transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
          </svg>
          Back to Blog
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Posts tagged &ldquo;{tag}&rdquo;
          </h1>
          <p className="text-[#a0a0a0] text-lg">
            {posts.length} post{posts.length === 1 ? '' : 's'} found
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#606060] text-lg mb-4">
              No posts found with this tag.
            </p>
            <Link href="/blog" className="text-[#E91E8C] hover:underline">
              View all posts
            </Link>
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
