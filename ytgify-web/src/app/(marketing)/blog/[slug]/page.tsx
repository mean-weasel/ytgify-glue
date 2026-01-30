import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug, getRelatedPosts, formatDate } from '@/lib/blog'

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Post Not Found' }

  return {
    title: `${post.title} - YTgify Blog`,
    description: post.description,
  }
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

function BlogCard({ post }: { post: { slug: string; title: string; description: string; date: string; readTime: number; tags: string[] } }) {
  return (
    <article className="group bg-[#111111] rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#E91E8C]/50 transition-all duration-300 p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {post.tags.slice(0, 2).map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
      <Link href={`/blog/${post.slug}`}>
        <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#E91E8C] transition-colors line-clamp-2">
          {post.title}
        </h3>
      </Link>
      <div className="flex items-center gap-4 text-xs text-[#606060]">
        <span>{post.readTime} min read</span>
        <span>{formatDate(post.date)}</span>
      </div>
    </article>
  )
}

// Simple markdown to HTML converter (basic implementation)
function markdownToHtml(content: string): string {
  let html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mt-8 mb-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mt-10 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#58a6ff] hover:text-[#79c0ff] underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-pink-300">$1</code>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="border-gray-700 my-8">')
    // Tables
    .replace(/^\|(.+)\|$/gim, (match) => {
      const cells = match.slice(1, -1).split('|').map(cell => cell.trim())
      if (cells.every(cell => cell.match(/^-+$/))) {
        return '' // Skip separator rows
      }
      const isHeader = match.includes('---')
      const cellTag = isHeader ? 'th' : 'td'
      const cellClass = isHeader ? 'bg-[#1f2937] font-semibold' : ''
      return `<tr>${cells.map(cell => `<${cellTag} class="border border-gray-700 px-3 py-2 ${cellClass}">${cell}</${cellTag}>`).join('')}</tr>`
    })

  // Process lists
  const lines = html.split('\n')
  let inList = false
  let listType = ''
  const processedLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const unorderedMatch = line.match(/^- (.+)$/)
    const orderedMatch = line.match(/^(\d+)\. (.+)$/)

    if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(`</${listType}>`)
        processedLines.push('<ul class="list-disc list-inside space-y-2 my-4 text-gray-300">')
        inList = true
        listType = 'ul'
      }
      processedLines.push(`<li>${unorderedMatch[1]}</li>`)
    } else if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(`</${listType}>`)
        processedLines.push('<ol class="list-decimal list-inside space-y-2 my-4 text-gray-300">')
        inList = true
        listType = 'ol'
      }
      processedLines.push(`<li>${orderedMatch[2]}</li>`)
    } else {
      if (inList) {
        processedLines.push(`</${listType}>`)
        inList = false
        listType = ''
      }
      // Paragraphs
      if (line.trim() && !line.startsWith('<')) {
        processedLines.push(`<p class="my-4 text-gray-300 leading-relaxed">${line}</p>`)
      } else {
        processedLines.push(line)
      }
    }
  }
  if (inList) processedLines.push(`</${listType}>`)

  // Wrap tables
  html = processedLines.join('\n')
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="w-full border-collapse my-6">$&</table>')

  return html
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = await getRelatedPosts(post, 2)
  const htmlContent = markdownToHtml(post.content)

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

        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[#606060]">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {post.readTime} min read
            </span>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              {formatDate(post.date)}
            </span>
          </div>
        </header>

        {post.thumbnail && (
          <div className="mb-8 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.thumbnail} alt={post.title} className="w-full h-auto" />
          </div>
        )}

        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-8 border-t border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-6">Related Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.map((relatedPost) => (
                <BlogCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
