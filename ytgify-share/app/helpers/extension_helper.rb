# frozen_string_literal: true

module ExtensionHelper
  CHROME_EXTENSION_URL = "https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje"
  FIREFOX_ADDON_URL = "https://addons.mozilla.org/en-US/firefox/addon/ytgify-for-firefox/"

  def chrome_extension_url
    CHROME_EXTENSION_URL
  end

  def firefox_addon_url
    FIREFOX_ADDON_URL
  end

  def extension_badge_partial(browser)
    case browser.to_s.downcase
    when "chrome"
      "marketing/shared/chrome_store_badge"
    when "firefox"
      "marketing/shared/firefox_store_badge"
    else
      raise ArgumentError, "Unknown browser: #{browser}. Use 'chrome' or 'firefox'."
    end
  end
end
