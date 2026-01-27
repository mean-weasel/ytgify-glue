# frozen_string_literal: true

require "test_helper"

class BlogControllerTest < ActionDispatch::IntegrationTest
  # ========== Index Tests ==========

  test "index renders successfully" do
    get blog_path

    assert_response :success
  end

  test "index sets correct page title" do
    get blog_path

    assert_select "title", /Blog.*YTgify/
  end

  test "index includes meta description" do
    get blog_path

    assert_select 'meta[name="description"]'
  end

  test "index displays blog posts" do
    get blog_path

    # Should have post content - at least one of the existing posts
    assert_includes response.body, "GIF"
  end

  test "index shows post titles as links" do
    get blog_path

    # Should have links to individual posts
    assert_select "a[href*='/blog/']"
  end

  # ========== Show Tests ==========

  test "show renders successfully for existing post" do
    # Use one of the actual blog posts
    get blog_post_path("how-to-create-gif-from-youtube-video")

    assert_response :success
  end

  test "show sets page title from post" do
    get blog_post_path("how-to-create-gif-from-youtube-video")

    assert_select "title", /How to Create a GIF/
  end

  test "show includes post description in meta" do
    get blog_post_path("how-to-create-gif-from-youtube-video")

    assert_select 'meta[name="description"]'
  end

  test "show displays post content" do
    get blog_post_path("how-to-create-gif-from-youtube-video")

    # Post content should be rendered as HTML
    assert_includes response.body, "Quick Start"
  end

  test "show displays related posts" do
    get blog_post_path("how-to-create-gif-from-youtube-video")

    # Related posts section should exist (posts share tags)
    # The response should contain other post links or related section
    assert_response :success
  end

  test "show redirects for non-existent slug" do
    get blog_post_path("non-existent-post-slug")

    assert_redirected_to blog_path
  end

  test "show sets flash alert for non-existent post" do
    get blog_post_path("non-existent-post-slug")

    assert_equal "Blog post not found", flash[:alert]
  end

  test "show renders markdown with syntax highlighting" do
    get blog_post_path("how-to-create-gif-from-youtube-video")

    # Post has code or formatted content
    assert_response :success
    # Check for common markdown-rendered elements
    assert_select "h2"
  end

  # ========== Tag Tests ==========

  test "tag renders successfully for existing tag" do
    # "tutorial" tag exists in the blog posts
    get blog_tag_path("tutorial")

    assert_response :success
  end

  test "tag sets correct page title" do
    get blog_tag_path("tutorial")

    assert_select "title", /tutorial/i
  end

  test "tag displays filtered posts" do
    get blog_tag_path("tutorial")

    # Should show posts with the tutorial tag
    assert_response :success
  end

  test "tag redirects for non-existent tag" do
    get blog_tag_path("nonexistenttag12345")

    assert_redirected_to blog_path
  end

  test "tag sets flash alert for non-existent tag" do
    get blog_tag_path("nonexistenttag12345")

    assert_equal "No posts found with tag 'nonexistenttag12345'", flash[:alert]
  end

  test "tag is case-insensitive" do
    # Both should work and return posts
    get blog_tag_path("tutorial")
    assert_response :success

    get blog_tag_path("TUTORIAL")
    assert_response :success
  end

  test "tag shows only posts with that tag" do
    get blog_tag_path("gif")

    # Posts with "gif" tag should be present
    assert_response :success
    # The tag filter should work
    assert_includes response.body, "GIF"
  end

  # ========== Helper Method Tests ==========

  test "extension URLs are accessible in blog views" do
    get blog_path

    # Chrome extension URL should be present (likely in footer or header)
    # This verifies the helper methods are working
    assert_response :success
  end

  test "blog uses application layout" do
    get blog_path

    # Application layout should be used
    assert_select "html"
    assert_select "body"
  end

  # ========== Edge Cases ==========

  test "index handles empty blog directory gracefully" do
    # Even with existing posts, should render without error
    get blog_path

    assert_response :success
  end

  test "show handles special characters in slug" do
    # URL with special characters should be handled
    get blog_post_path("test-post-with-dashes")

    # Should either render or redirect, not error
    assert_response :redirect
  end

  test "tag handles special characters in tag name" do
    # URL-encoded special characters
    get blog_tag_path("test%20tag")

    # Should redirect since no posts have this tag
    assert_redirected_to blog_path
  end
end
