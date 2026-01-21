# frozen_string_literal: true

class BlogController < ApplicationController
  layout "marketing"

  # Constants (matching ytgify.com/lib/constants.ts)
  CHROME_EXTENSION_URL = "https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje"
  FIREFOX_ADDON_URL = "https://addons.mozilla.org/en-US/firefox/addon/ytgify-for-firefox/"
  FORMSPREE_ENDPOINT = "https://formspree.io/f/xnjqpkbv"
  GITHUB_URL = "https://github.com/neonwatty"
  TWITTER_URL = "https://x.com/neonwatty"
  BLOG_URL = "https://neonwatty.com/"

  helper_method :chrome_extension_url, :firefox_addon_url, :formspree_endpoint,
                :github_url, :twitter_url, :blog_url

  def index
    @page_title = "Blog | YTgify"
    @page_description = "Tips, tutorials, and updates about creating GIFs from YouTube videos with YTgify."
    @posts = BlogService.all_posts
  end

  def show
    @post = BlogService.find_by_slug(params[:slug])

    if @post.nil?
      redirect_to blog_path, alert: "Blog post not found"
      return
    end

    @page_title = "#{@post[:title]} | YTgify Blog"
    @page_description = @post[:description]
    @related_posts = BlogService.related_posts(@post, limit: 3)
  end

  def tag
    @tag = params[:tag]
    @page_title = "Posts tagged '#{@tag}' | YTgify Blog"
    @page_description = "All blog posts tagged with #{@tag}"
    @posts = BlogService.posts_by_tag(@tag)

    if @posts.empty?
      redirect_to blog_path, alert: "No posts found with tag '#{@tag}'"
    end
  end

  private

  def chrome_extension_url
    CHROME_EXTENSION_URL
  end

  def firefox_addon_url
    FIREFOX_ADDON_URL
  end

  def formspree_endpoint
    FORMSPREE_ENDPOINT
  end

  def github_url
    GITHUB_URL
  end

  def twitter_url
    TWITTER_URL
  end

  def blog_url
    BLOG_URL
  end
end
