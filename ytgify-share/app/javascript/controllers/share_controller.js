import { Controller } from "@hotwired/stimulus"

// Share controller for GIF sharing functionality
// Handles native share API (mobile) with fallback to clipboard copy
export default class extends Controller {
  static values = {
    url: String,
    title: String
  }

  async share(event) {
    event.preventDefault()

    const shareData = {
      title: this.titleValue || "Check out this GIF!",
      url: this.urlValue || window.location.href
    }

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        // User cancelled or error - fall back to clipboard
        if (err.name !== 'AbortError') {
          console.log('Share failed, falling back to clipboard')
        }
      }
    }

    // Fall back to clipboard copy
    try {
      await navigator.clipboard.writeText(shareData.url)
      this.showToast("Link copied to clipboard!")
    } catch (err) {
      // Fallback for older browsers
      this.fallbackCopy(shareData.url)
    }
  }

  fallbackCopy(text) {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    document.body.appendChild(textArea)
    textArea.select()

    try {
      document.execCommand('copy')
      this.showToast("Link copied to clipboard!")
    } catch (err) {
      this.showToast("Failed to copy link", "error")
    }

    document.body.removeChild(textArea)
  }

  showToast(message, type = "success") {
    // Create toast element
    const toast = document.createElement("div")
    toast.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-slide-in ${
      type === "success"
        ? "bg-green-50 border border-green-200 text-green-800"
        : "bg-red-50 border border-red-200 text-red-800"
    }`
    toast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          ${type === "success"
            ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>'
            : '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>'
          }
        </svg>
        <span>${message}</span>
      </div>
    `

    document.body.appendChild(toast)

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove("animate-slide-in")
      toast.classList.add("animate-fade-out")
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }
}
