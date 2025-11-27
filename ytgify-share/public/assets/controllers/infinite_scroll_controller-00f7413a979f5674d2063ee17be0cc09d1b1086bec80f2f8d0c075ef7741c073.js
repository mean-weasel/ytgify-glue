import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["trigger"]

  connect() {
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersect(entries),
      {
        threshold: 0.1,
        rootMargin: "100px"
      }
    )

    if (this.hasTriggerTarget) {
      this.observer.observe(this.triggerTarget)
    }
  }

  handleIntersect(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Turbo Frame will automatically load when visible
        // We just need to observe it
        console.log("Loading next page...")
      }
    })
  }

  triggerTargetConnected(element) {
    this.observer.observe(element)
  }

  triggerTargetDisconnected(element) {
    this.observer.unobserve(element)
  }

  disconnect() {
    this.observer.disconnect()
  }
};
