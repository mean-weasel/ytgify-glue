import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["desktop", "mobile", "loading"]

  connect() {
    this.detectDevice()
  }

  detectDevice() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches ||
                     /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    // Hide loading
    if (this.hasLoadingTarget) {
      this.loadingTarget.classList.add("hidden")
    }

    // Show appropriate content
    if (isMobile) {
      if (this.hasMobileTarget) {
        this.mobileTarget.classList.remove("hidden")
      }
    } else {
      if (this.hasDesktopTarget) {
        this.desktopTarget.classList.remove("hidden")
      }
    }
  }
}
