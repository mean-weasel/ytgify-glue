import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "success"]

  static values = {
    title: { type: String, default: "Install YTgify on Desktop" },
    text: { type: String, default: "Reminder: Install YTgify - the free YouTube to GIF converter. No watermark, works inside YouTube." },
    url: { type: String, default: "https://ytgify.com" }
  }

  async share() {
    const shareData = {
      title: this.titleValue,
      text: this.textValue,
      url: this.urlValue
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        this.showSuccess()
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.fallbackToEmail()
        }
      }
    } else {
      this.fallbackToEmail()
    }
  }

  showSuccess() {
    if (this.hasButtonTarget) {
      this.buttonTarget.classList.add("hidden")
    }
    if (this.hasSuccessTarget) {
      this.successTarget.classList.remove("hidden")
    }
  }

  fallbackToEmail() {
    const chromeUrl = "https://chromewebstore.google.com/detail/ytgify/dnljofakogbecppbkmnoffppkfdmpfje"
    const firefoxUrl = "https://addons.mozilla.org/en-US/firefox/addon/ytgify-for-firefox/"

    const subject = encodeURIComponent("Reminder: Install YTgify on Desktop")
    const body = encodeURIComponent(
      `Hey future me!\n\n` +
      `Remember to install YTgify - the free YouTube to GIF converter.\n\n` +
      `Website: https://ytgify.com\n` +
      `Chrome: ${chromeUrl}\n` +
      `Firefox: ${firefoxUrl}\n\n` +
      `Features:\n` +
      `- No watermark\n` +
      `- Works right inside YouTube\n` +
      `- Custom text overlays\n` +
      `- Takes 30 seconds to create your first GIF`
    )

    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }
}
