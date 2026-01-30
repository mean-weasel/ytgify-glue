import Link from 'next/link'

export const metadata = {
  title: 'Blog - YTgify',
  description: 'Tips, tutorials, and updates about creating GIFs from YouTube videos.',
}

// Placeholder blog posts - these would come from a CMS or markdown files
const BLOG_POSTS = [
  {
    slug: 'how-to-create-perfect-gifs',
    title: 'How to Create Perfect GIFs from YouTube Videos',
    description: 'Learn the best practices for creating high-quality GIFs that look great everywhere.',
    date: '2025-01-15',
    readTime: 5,
    tags: ['tutorial', 'tips'],
  },
  {
    slug: 'new-text-overlay-feature',
    title: 'New Feature: Add Text Overlays to Your GIFs',
    description: 'Introducing our new text overlay feature - add captions, memes, and more to your GIFs.',
    date: '2025-01-10',
    readTime: 3,
    tags: ['feature', 'update'],
  },
  {
    slug: 'ytgify-launch',
    title: 'Introducing YTgify: Free YouTube to GIF Converter',
    description: 'We\'re excited to launch YTgify, the easiest way to create GIFs from YouTube videos.',
    date: '2025-01-01',
    readTime: 2,
    tags: ['announcement'],
  },
]

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogPage() {
  return (
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
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Blog
        </h1>
        <p className="text-[#a0a0a0]">
          Tips, tutorials, and updates about creating GIFs from YouTube videos.
        </p>
      </header>

      <div className="space-y-8">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.slug}
            className="border-b border-gray-800 pb-8 last:border-0"
          >
            <div className="flex items-center gap-3 text-sm text-[#606060] mb-3">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span className="text-gray-700">·</span>
              <span>{post.readTime} min read</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2 hover:text-pink-400 transition-colors">
              <Link href={`/blog/${post.slug}`}>
                {post.title}
              </Link>
            </h2>

            <p className="text-[#a0a0a0] mb-4">
              {post.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* Empty state for when there are no posts */}
      {BLOG_POSTS.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#a0a0a0]">No blog posts yet. Check back soon!</p>
        </div>
      )}
    </article>
  )
}
