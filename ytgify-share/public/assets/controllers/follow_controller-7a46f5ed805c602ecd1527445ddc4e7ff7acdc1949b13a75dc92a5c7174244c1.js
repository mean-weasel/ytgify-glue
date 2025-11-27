import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="follow"
export default class extends Controller {
  static values = {
    userId: Number,
    username: String
  }

  connect() {
    // Initialize
  }

  async toggle(event) {
    // Let Turbo handle the request by default - this controller is optional
    // It provides optimistic updates and loading states for better UX

    // Get button element
    const button = this.element.querySelector("button")
    if (!button) return

    // Show loading state
    this.showLoading(button)

    // Turbo will handle the actual request and update
    // We just enhance the UX with loading states
  }

  showLoading(button) {
    const textSpan = button.querySelector(".follow-button-text")
    const loadingSpan = button.querySelector(".follow-button-loading")

    if (textSpan) textSpan.classList.add("hidden")
    if (loadingSpan) loadingSpan.classList.remove("hidden")

    // Disable button
    button.disabled = true
  }

  hideLoading(button) {
    const textSpan = button.querySelector(".follow-button-text")
    const loadingSpan = button.querySelector(".follow-button-loading")

    if (textSpan) textSpan.classList.remove("hidden")
    if (loadingSpan) loadingSpan.classList.add("hidden")

    // Re-enable button
    button.disabled = false
  }

  // Optional: Handle Turbo events for better UX
  turboSubmitEnd(event) {
    const button = this.element.querySelector("button")
    if (button) {
      this.hideLoading(button)
    }
  }

  // Show success animation
  showSuccess(button) {
    button.classList.add("animate-pulse")
    setTimeout(() => {
      button.classList.remove("animate-pulse")
    }, 300)
  }

  get csrfToken() {
    return document.querySelector("[name='csrf-token']")?.content
  }
};
