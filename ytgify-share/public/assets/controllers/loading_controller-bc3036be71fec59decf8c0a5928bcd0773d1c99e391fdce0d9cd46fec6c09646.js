import { Controller } from "@hotwired/stimulus"

// Loading states for async operations
export default class extends Controller {
  static targets = ["spinner", "content"]

  connect() {
    // Show spinner when Turbo frame starts loading
    document.addEventListener("turbo:frame-load", this.showLoading.bind(this))

    // Hide spinner when loaded
    document.addEventListener("turbo:frame-render", this.hideLoading.bind(this))

    // Handle submit button loading states
    document.addEventListener("turbo:submit-start", this.handleSubmitStart.bind(this))
    document.addEventListener("turbo:submit-end", this.handleSubmitEnd.bind(this))
  }

  disconnect() {
    document.removeEventListener("turbo:frame-load", this.showLoading)
    document.removeEventListener("turbo:frame-render", this.hideLoading)
    document.removeEventListener("turbo:submit-start", this.handleSubmitStart)
    document.removeEventListener("turbo:submit-end", this.handleSubmitEnd)
  }

  showLoading(event) {
    if (this.hasSpinnerTarget) {
      this.spinnerTarget.classList.remove('hidden')
    }
    if (this.hasContentTarget) {
      this.contentTarget.classList.add('opacity-50', 'pointer-events-none')
    }
  }

  hideLoading(event) {
    if (this.hasSpinnerTarget) {
      this.spinnerTarget.classList.add('hidden')
    }
    if (this.hasContentTarget) {
      this.contentTarget.classList.remove('opacity-50', 'pointer-events-none')
    }
  }

  handleSubmitStart(event) {
    const submitButton = event.detail.formSubmission.submitter
    if (submitButton) {
      submitButton.disabled = true
      submitButton.classList.add('opacity-75', 'cursor-not-allowed')

      // Store original text
      submitButton.dataset.originalText = submitButton.innerHTML

      // Add loading spinner
      submitButton.innerHTML = `
        <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `
    }
  }

  handleSubmitEnd(event) {
    const submitButton = event.detail.formSubmission.submitter
    if (submitButton && submitButton.dataset.originalText) {
      submitButton.disabled = false
      submitButton.classList.remove('opacity-75', 'cursor-not-allowed')
      submitButton.innerHTML = submitButton.dataset.originalText
      delete submitButton.dataset.originalText
    }
  }
};
