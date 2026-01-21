# frozen_string_literal: true

class MarketingController < ApplicationController
  layout "marketing"

  # Constants (matching ytgify.com/lib/constants.ts)
  CHROME_EXTENSION_URL = "https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje"
  FIREFOX_ADDON_URL = "https://addons.mozilla.org/en-US/firefox/addon/ytgify-for-firefox/"
  DEMO_VIDEO_EMBED_URL = "https://www.youtube.com/embed/hBBr8SluoQ8"
  FORMSPREE_ENDPOINT = "https://formspree.io/f/xnjqpkbv"
  GITHUB_URL = "https://github.com/neonwatty"
  TWITTER_URL = "https://x.com/neonwatty"
  BLOG_URL = "https://neonwatty.com/"

  helper_method :chrome_extension_url, :firefox_addon_url, :demo_video_embed_url,
                :formspree_endpoint, :github_url, :twitter_url, :blog_url

  def landing
    @page_title = "YTgify - Free YouTube to GIF Converter | No Watermark"
    @page_description = "Free YouTube to GIF converter Chrome extension. Create animated GIFs from any YouTube video in seconds - no watermark, no uploads. Convert video to GIF with custom text, FPS control, and multiple resolutions."
  end

  def privacy
    @page_title = "Privacy Policy | YTgify"
    @page_description = "YTgify privacy policy. Learn how we protect your data with our zero-collection model."
  end

  def terms
    @page_title = "Terms of Service | YTgify"
    @page_description = "YTgify terms of service. Review the terms and conditions for using the YTgify browser extension."
  end

  def welcome
    @page_title = "Welcome to YTgify - You're All Set!"
    @page_description = "YTgify is now installed. Learn how to create your first GIF from any YouTube video in seconds."
    @noindex = true # Don't index the welcome page
    @google_ads_conversion = true # Enable conversion tracking
  end

  def share_waitlist
    @page_title = "Join the Waitlist | YTgify"
    @page_description = "GIFs you won't find anywhere else. Made by the YouTube-obsessed. Join the waitlist for YTgify sharing."
    @noindex = true # Don't index the waitlist page
  end

  def share
    @gif = Gif.find_by(id: params[:id])

    if @gif.nil?
      @page_title = "GIF Not Found | YTgify"
      @page_description = "The requested GIF could not be found."
    else
      @page_title = "#{@gif.title || 'Shared GIF'} | YTgify"
      @page_description = @gif.description || "Check out this GIF created with YTgify - the free YouTube to GIF converter."
      @og_image = url_for(@gif.file) if @gif.file.attached?
    end
  end

  private

  def chrome_extension_url
    CHROME_EXTENSION_URL
  end

  def firefox_addon_url
    FIREFOX_ADDON_URL
  end

  def demo_video_embed_url
    DEMO_VIDEO_EMBED_URL
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
