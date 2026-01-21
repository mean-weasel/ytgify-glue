# frozen_string_literal: true

require "yaml"

class BlogService
  CONTENT_DIR = Rails.root.join("content", "blog")

  class << self
    def all_posts
      posts = []

      Dir.glob(CONTENT_DIR.join("*.md")).each do |file|
        post = parse_file(file)
        posts << post if post
      end

      posts.sort_by { |p| p[:date] }.reverse
    end

    def find_by_slug(slug)
      file_path = CONTENT_DIR.join("#{slug}.md")
      return nil unless File.exist?(file_path)

      parse_file(file_path)
    end

    def posts_by_tag(tag)
      all_posts.select { |p| p[:tags]&.include?(tag.downcase) }
    end

    def related_posts(current_post, limit: 3)
      return [] if current_post[:tags].blank?

      all_posts
        .reject { |p| p[:slug] == current_post[:slug] }
        .select { |p| (p[:tags] & current_post[:tags]).any? }
        .first(limit)
    end

    def render_markdown(content)
      return "" if content.blank?

      renderer = RougeRenderer.new(
        hard_wrap: true,
        with_toc_data: true
      )

      markdown = Redcarpet::Markdown.new(
        renderer,
        autolink: true,
        tables: true,
        fenced_code_blocks: true,
        strikethrough: true,
        superscript: true,
        underline: true,
        highlight: true,
        footnotes: true,
        space_after_headers: true
      )

      markdown.render(content).html_safe
    end

    private

    def parse_file(file_path)
      content = File.read(file_path)
      return nil unless content.start_with?("---")

      # Split frontmatter and content
      parts = content.split(/^---\s*$/, 3)
      return nil if parts.length < 3

      frontmatter = YAML.safe_load(parts[1], permitted_classes: [ Date, Time ])
      body = parts[2].strip

      slug = File.basename(file_path, ".md")

      {
        slug: slug,
        title: frontmatter["title"],
        description: frontmatter["description"],
        date: parse_date(frontmatter["date"]),
        tags: Array(frontmatter["tags"]).map(&:downcase),
        thumbnail: frontmatter["thumbnail"],
        read_time: frontmatter["readTime"] || estimate_read_time(body),
        content: body,
        html_content: render_markdown(body)
      }
    rescue => e
      Rails.logger.error "Error parsing blog post #{file_path}: #{e.message}"
      nil
    end

    def parse_date(date_value)
      case date_value
      when Date, Time
        date_value.to_date
      when String
        Date.parse(date_value)
      else
        Date.today
      end
    rescue
      Date.today
    end

    def estimate_read_time(content)
      words = content.split.size
      (words / 200.0).ceil
    end
  end

  # Custom renderer with Rouge syntax highlighting
  class RougeRenderer < Redcarpet::Render::HTML
    def block_code(code, language)
      language ||= "text"

      begin
        lexer = Rouge::Lexer.find(language) || Rouge::Lexers::PlainText.new
        formatter = Rouge::Formatters::HTML.new
        highlighted = formatter.format(lexer.lex(code))

        %(<pre class="highlight"><code class="language-#{language}">#{highlighted}</code></pre>)
      rescue
        %(<pre><code class="language-#{language}">#{ERB::Util.html_escape(code)}</code></pre>)
      end
    end
  end
end
