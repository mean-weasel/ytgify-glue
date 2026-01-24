require "application_system_test_case"

class SmokeTest < ApplicationSystemTestCase
  test "can visit home feed page" do
    visit root_path

    # Should see feed content or empty state
    # The page should load without errors
    assert @page.url.include?(@test_server_url)
    assert_page_has_text "Popular GIFs from the ytgify community"

    take_screenshot("smoke-test-home-feed")
  end

  test "can visit trending page" do
    visit trending_path

    # Should see trending content or empty state
    # The page should load without errors
    assert @page.url.include?("#{@test_server_url}/trending")
    assert_page_has_text "Trending"

    take_screenshot("smoke-test-trending")
  end

  test "can see e2e test GIF on home page" do
    gif = gifs(:e2e_public_gif)

    visit root_path

    # Should see the GIF title on the feed
    assert_page_has_text gif.title

    take_screenshot("smoke-test-e2e-gif")
  end
end
