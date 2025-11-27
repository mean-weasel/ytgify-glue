import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["message"]

  connect() {
    // Auto-dismiss flash messages after 5 seconds
    this.timeout = setTimeout(() => {
      this.close()
    }, 5000)
  }

  close() {
    this.messageTargets.forEach(message => {
      message.classList.add("animate-fade-out")
      setTimeout(() => {
        message.remove()
      }, 300)
    })
    clearTimeout(this.timeout)
  }

  disconnect() {
    clearTimeout(this.timeout)
  }
}
