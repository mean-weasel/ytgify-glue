import { Controller } from "@hotwired/stimulus"

// Mobile menu controller for responsive navigation
export default class extends Controller {
  static targets = ["menu", "backdrop"]

  toggle(event) {
    event.preventDefault()
    this.menuTarget.classList.toggle('hidden')
    this.backdropTarget.classList.toggle('hidden')
    // Prevent body scroll when menu open
    document.body.classList.toggle('overflow-hidden')
  }

  close(event) {
    if (event.target === this.backdropTarget) {
      this.toggle(event)
    }
  }

  disconnect() {
    // Clean up: ensure body scroll is restored
    document.body.classList.remove('overflow-hidden')
  }
}
