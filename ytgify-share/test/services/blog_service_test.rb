# frozen_string_literal: true

require "test_helper"

class BlogServiceTest < ActiveSupport::TestCase
  def setup
    @content_dir = BlogService::CONTENT_DIR

    # Store original files to restore later
    @original_files = Dir.glob(@content_dir.join("*.md")).map do |f|
      [f, File.read(f)]
    end.to_h

    # Create test blog posts
    create_test_post("test-post-one", {
      title: "Test Post One",
      description: "First test post",
      date: "2025-01-15",
      tags: ["tutorial", "testing"],
      thumbnail: "test/image.png",
      readTime: 3
    }, "This is the content of test post one.\n\n## Heading\n\nSome text.")

    create_test_post("test-post-two", {
      title: "Test Post Two",
      description: "Second test post",
      date: "2025-01-10",
      tags: ["tutorial", "guide"],
      thumbnail: "test/image2.png",
      readTime: 5
    }, "Content of test post two with **bold** and *italic*.")

    create_test_post("test-post-three", {
      title: "Test Post Three",
      description: "Third test post",
      date: "2025-01-20",
      tags: ["news"],
      thumbnail: "test/image3.png",
      readTime: 2
    }, "Latest news content.")
  end

  def teardown
    # Remove test posts
    %w[test-post-one test-post-two test-post-three test-malformed test-no-frontmatter test-code-blocks].each do |slug|
      file = @content_dir.join("#{slug}.md")
      File.delete(file) if File.exist?(file)
    end
  end

  # ========== all_posts tests ==========

  test "all_posts returns all valid blog posts" do
    posts = BlogService.all_posts
    slugs = posts.map { |p| p[:slug] }

    assert_includes slugs, "test-post-one"
    assert_includes slugs, "test-post-two"
    assert_includes slugs, "test-post-three"
  end

  test "all_posts returns posts sorted by date descending" do
    posts = BlogService.all_posts
    test_posts = posts.select { |p| p[:slug].start_with?("test-post-") }

    # test-post-three (Jan 20) should come before test-post-one (Jan 15) before test-post-two (Jan 10)
    dates = test_posts.map { |p| p[:date] }
    assert_equal dates, dates.sort.reverse, "Posts should be sorted by date descending"
  end

  test "all_posts includes expected fields" do
    posts = BlogService.all_posts
    post = posts.find { |p| p[:slug] == "test-post-one" }

    assert_not_nil post
    assert_equal "Test Post One", post[:title]
    assert_equal "First test post", post[:description]
    assert_equal Date.parse("2025-01-15"), post[:date]
    assert_equal ["tutorial", "testing"], post[:tags]
    assert_equal "test/image.png", post[:thumbnail]
    assert_equal 3, post[:read_time]
    assert_includes post[:content], "This is the content"
    assert_includes post[:html_content], "<h2"
  end

  test "all_posts skips files without frontmatter" do
    # Create a file without frontmatter
    File.write(@content_dir.join("test-no-frontmatter.md"), "Just some content without frontmatter")

    posts = BlogService.all_posts
    slugs = posts.map { |p| p[:slug] }

    assert_not_includes slugs, "test-no-frontmatter"
  end

  test "all_posts handles malformed frontmatter gracefully" do
    # Create a file with malformed YAML
    File.write(@content_dir.join("test-malformed.md"), "---\ntitle: [unclosed bracket\n---\nContent")

    # Should not raise, should skip the malformed post
    posts = BlogService.all_posts
    slugs = posts.map { |p| p[:slug] }

    assert_not_includes slugs, "test-malformed"
  end

  # ========== find_by_slug tests ==========

  test "find_by_slug returns post for valid slug" do
    post = BlogService.find_by_slug("test-post-one")

    assert_not_nil post
    assert_equal "test-post-one", post[:slug]
    assert_equal "Test Post One", post[:title]
  end

  test "find_by_slug returns nil for non-existent slug" do
    post = BlogService.find_by_slug("non-existent-post")

    assert_nil post
  end

  test "find_by_slug returns nil for empty slug" do
    post = BlogService.find_by_slug("")

    assert_nil post
  end

  test "find_by_slug includes html_content" do
    post = BlogService.find_by_slug("test-post-one")

    assert_not_nil post[:html_content]
    assert_includes post[:html_content], "<h2"
  end

  # ========== posts_by_tag tests ==========

  test "posts_by_tag returns posts with matching tag" do
    posts = BlogService.posts_by_tag("tutorial")
    slugs = posts.map { |p| p[:slug] }

    assert_includes slugs, "test-post-one"
    assert_includes slugs, "test-post-two"
    assert_not_includes slugs, "test-post-three"
  end

  test "posts_by_tag is case-insensitive" do
    posts_lower = BlogService.posts_by_tag("tutorial")
    posts_upper = BlogService.posts_by_tag("TUTORIAL")
    posts_mixed = BlogService.posts_by_tag("Tutorial")

    assert_equal posts_lower.map { |p| p[:slug] }.sort, posts_upper.map { |p| p[:slug] }.sort
    assert_equal posts_lower.map { |p| p[:slug] }.sort, posts_mixed.map { |p| p[:slug] }.sort
  end

  test "posts_by_tag returns empty array for non-existent tag" do
    posts = BlogService.posts_by_tag("nonexistenttag")

    assert_empty posts
  end

  test "posts_by_tag returns posts sorted by date" do
    posts = BlogService.posts_by_tag("tutorial")
    dates = posts.map { |p| p[:date] }

    assert_equal dates, dates.sort.reverse
  end

  # ========== related_posts tests ==========

  test "related_posts returns posts with shared tags" do
    current_post = BlogService.find_by_slug("test-post-one")
    related = BlogService.related_posts(current_post)
    slugs = related.map { |p| p[:slug] }

    # test-post-two shares "tutorial" tag with test-post-one
    assert_includes slugs, "test-post-two"
  end

  test "related_posts excludes current post" do
    current_post = BlogService.find_by_slug("test-post-one")
    related = BlogService.related_posts(current_post)
    slugs = related.map { |p| p[:slug] }

    assert_not_includes slugs, "test-post-one"
  end

  test "related_posts respects limit parameter" do
    current_post = BlogService.find_by_slug("test-post-one")
    related = BlogService.related_posts(current_post, limit: 1)

    assert_equal 1, related.length
  end

  test "related_posts returns empty array when post has no tags" do
    post_without_tags = {
      slug: "no-tags",
      title: "No Tags Post",
      tags: []
    }
    related = BlogService.related_posts(post_without_tags)

    assert_empty related
  end

  test "related_posts returns empty array when tags is nil" do
    post_nil_tags = {
      slug: "nil-tags",
      title: "Nil Tags Post",
      tags: nil
    }
    related = BlogService.related_posts(post_nil_tags)

    assert_empty related
  end

  # ========== render_markdown tests ==========

  test "render_markdown converts headers" do
    html = BlogService.render_markdown("# Header 1\n## Header 2\n### Header 3")

    assert_includes html, "<h1"
    assert_includes html, "<h2"
    assert_includes html, "<h3"
  end

  test "render_markdown converts bold and italic" do
    html = BlogService.render_markdown("**bold** and *italic*")

    assert_includes html, "<strong>bold</strong>"
    assert_includes html, "<em>italic</em>"
  end

  test "render_markdown converts links" do
    html = BlogService.render_markdown("[link text](https://example.com)")

    assert_includes html, '<a href="https://example.com"'
    assert_includes html, "link text"
  end

  test "render_markdown converts lists" do
    html = BlogService.render_markdown("- item 1\n- item 2\n- item 3")

    assert_includes html, "<ul>"
    assert_includes html, "<li>"
  end

  test "render_markdown converts numbered lists" do
    html = BlogService.render_markdown("1. first\n2. second\n3. third")

    assert_includes html, "<ol>"
    assert_includes html, "<li>"
  end

  test "render_markdown converts tables" do
    markdown = "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |"
    html = BlogService.render_markdown(markdown)

    assert_includes html, "<table>"
    assert_includes html, "<th>"
    assert_includes html, "<td>"
  end

  test "render_markdown converts fenced code blocks with syntax highlighting" do
    create_test_post("test-code-blocks", {
      title: "Code Blocks Test",
      description: "Testing code blocks",
      date: "2025-01-01",
      tags: ["test"]
    }, "```ruby\ndef hello\n  puts 'world'\nend\n```")

    post = BlogService.find_by_slug("test-code-blocks")

    assert_includes post[:html_content], "highlight"
    assert_includes post[:html_content], "language-ruby"
  end

  test "render_markdown handles code blocks with unknown language" do
    html = BlogService.render_markdown("```unknownlang\nsome code\n```")

    assert_includes html, "<pre"
    assert_includes html, "<code"
  end

  test "render_markdown converts strikethrough" do
    html = BlogService.render_markdown("~~deleted~~")

    assert_includes html, "<del>"
  end

  test "render_markdown returns empty string for nil content" do
    html = BlogService.render_markdown(nil)

    assert_equal "", html
  end

  test "render_markdown returns empty string for blank content" do
    html = BlogService.render_markdown("")

    assert_equal "", html
  end

  test "render_markdown autolinks URLs" do
    html = BlogService.render_markdown("Visit https://example.com for more")

    assert_includes html, '<a href="https://example.com"'
  end

  # ========== date parsing tests ==========

  test "parse_file handles Date object in frontmatter" do
    # YAML.safe_load with permitted_classes: [Date] should parse dates
    post = BlogService.find_by_slug("test-post-one")

    assert_instance_of Date, post[:date]
  end

  test "parse_file handles string date in frontmatter" do
    post = BlogService.find_by_slug("test-post-one")

    assert_equal Date.parse("2025-01-15"), post[:date]
  end

  test "parse_file uses today for missing date" do
    create_test_post("test-no-date", {
      title: "No Date Post",
      description: "Post without date"
    }, "Content without date in frontmatter")

    post = BlogService.find_by_slug("test-no-date")

    assert_equal Date.today, post[:date]

    # Cleanup
    File.delete(@content_dir.join("test-no-date.md"))
  end

  # ========== read_time tests ==========

  test "read_time uses frontmatter value when provided" do
    post = BlogService.find_by_slug("test-post-one")

    assert_equal 3, post[:read_time]
  end

  test "read_time estimates from content when not in frontmatter" do
    # Create post without readTime, with ~400 words (should be 2 min at 200 wpm)
    words = "word " * 400
    create_test_post("test-no-readtime", {
      title: "No Read Time",
      description: "Test"
    }, words)

    post = BlogService.find_by_slug("test-no-readtime")

    assert_equal 2, post[:read_time]

    # Cleanup
    File.delete(@content_dir.join("test-no-readtime.md"))
  end

  # ========== tags normalization tests ==========

  test "tags are normalized to lowercase" do
    create_test_post("test-uppercase-tags", {
      title: "Uppercase Tags",
      description: "Test",
      date: "2025-01-01",
      tags: ["Tutorial", "GUIDE", "MixedCase"]
    }, "Content")

    post = BlogService.find_by_slug("test-uppercase-tags")

    assert_equal ["tutorial", "guide", "mixedcase"], post[:tags]

    # Cleanup
    File.delete(@content_dir.join("test-uppercase-tags.md"))
  end

  test "handles posts with no tags" do
    create_test_post("test-empty-tags", {
      title: "Empty Tags",
      description: "Test",
      date: "2025-01-01",
      tags: []
    }, "Content")

    post = BlogService.find_by_slug("test-empty-tags")

    assert_equal [], post[:tags]

    # Cleanup
    File.delete(@content_dir.join("test-empty-tags.md"))
  end

  private

  def create_test_post(slug, frontmatter, content)
    yaml = frontmatter.transform_keys(&:to_s).to_yaml
    post_content = "#{yaml}---\n\n#{content}"
    File.write(@content_dir.join("#{slug}.md"), post_content)
  end
end
