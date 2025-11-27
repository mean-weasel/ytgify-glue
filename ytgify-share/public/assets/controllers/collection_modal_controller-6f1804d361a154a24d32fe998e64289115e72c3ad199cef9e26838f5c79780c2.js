import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["modal"]

  connect() {
    // Bind keyup to window for this specific modal instance
    this.boundHandleKeyup = this.handleKeyup.bind(this)
  }

  disconnect() {
    document.body.classList.remove("overflow-hidden")
  }

  show() {
    this.modalTarget.classList.remove("hidden")
    document.body.classList.add("overflow-hidden")
    window.addEventListener("keyup", this.boundHandleKeyup)
  }

  hide() {
    this.modalTarget.classList.add("hidden")
    document.body.classList.remove("overflow-hidden")
    window.removeEventListener("keyup", this.boundHandleKeyup)
  }

  // Hide when clicking outside the modal content
  clickOutside(event) {
    if (event.target === this.modalTarget) {
      this.hide()
    }
  }

  // Handle ESC key
  handleKeyup(event) {
    if (event.key === "Escape") {
      this.hide()
    }
  }
};
