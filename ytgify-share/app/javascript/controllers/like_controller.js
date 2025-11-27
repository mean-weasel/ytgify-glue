import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "count", "icon"]

  async toggle(event) {
    event.preventDefault()

    const form = this.element
    const url = form.action
    const method = form.method || "POST"

    // Optimistic UI update
    const currentCount = parseInt(this.countTarget.textContent)
    const isLiked = this.iconTarget.classList.contains("fill-current")

    if (isLiked) {
      // Unlike
      this.iconTarget.classList.remove("fill-current", "text-red-500")
      this.countTarget.textContent = currentCount - 1
    } else {
      // Like
      this.iconTarget.classList.add("fill-current", "text-red-500")
      this.countTarget.textContent = currentCount + 1

      // Add animation
      this.iconTarget.classList.add("animate-pulse")
      setTimeout(() => {
        this.iconTarget.classList.remove("animate-pulse")
      }, 500)
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "X-CSRF-Token": this.csrfToken,
          "Accept": "application/json"
        }
      })

      if (!response.ok) {
        // Revert optimistic update on error
        if (isLiked) {
          this.iconTarget.classList.add("fill-current", "text-red-500")
          this.countTarget.textContent = currentCount
        } else {
          this.iconTarget.classList.remove("fill-current", "text-red-500")
          this.countTarget.textContent = currentCount
        }
      } else {
        // Update with actual count from server
        const data = await response.json()
        if (data.like_count !== undefined) {
          this.countTarget.textContent = data.like_count
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      // Revert on error
      if (isLiked) {
        this.iconTarget.classList.add("fill-current", "text-red-500")
        this.countTarget.textContent = currentCount
      } else {
        this.iconTarget.classList.remove("fill-current", "text-red-500")
        this.countTarget.textContent = currentCount
      }
    }
  }

  get csrfToken() {
    return document.querySelector("[name='csrf-token']").content
  }
}
