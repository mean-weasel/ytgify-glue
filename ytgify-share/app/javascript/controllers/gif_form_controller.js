import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="gif-form"
export default class extends Controller {
  static targets = [
    "youtubeUrl",
    "youtubeVideoId",
    "youtubePreview",
    "youtubePreviewContainer",
    "youtubePlaceholder",
    "timestampStart",
    "timestampEnd",
    "duration",
    "privacyOption",
    "submitButton"
  ]

  connect() {
    // Initialize on page load
  }

  // YouTube URL Handling
  parseYoutubeUrl(event) {
    const url = event.target.value.trim()

    if (!url) {
      this.clearYoutubePreview()
      return
    }

    const videoId = this.extractYoutubeVideoId(url)

    if (videoId) {
      // Store the full URL in the hidden field
      this.updateYoutubeVideoId(url)
      this.showYoutubePreview(videoId)
      this.clearErrors()
    } else {
      this.showError("Invalid YouTube URL. Please enter a valid YouTube video URL.")
      this.clearYoutubePreview()
    }
  }

  extractYoutubeVideoId(url) {
    // Handle various YouTube URL formats:
    // - https://www.youtube.com/watch?v=VIDEO_ID
    // - https://youtu.be/VIDEO_ID
    // - https://www.youtube.com/embed/VIDEO_ID
    // - https://www.youtube.com/v/VIDEO_ID

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  updateYoutubeVideoId(url) {
    if (this.hasYoutubeVideoIdTarget) {
      this.youtubeVideoIdTarget.value = url
    }
  }

  showYoutubePreview(videoId) {
    // Hide placeholder, show preview
    if (this.hasYoutubePlaceholderTarget) {
      this.youtubePlaceholderTarget.classList.add("hidden")
    }
    if (this.hasYoutubePreviewContainerTarget) {
      this.youtubePreviewContainerTarget.classList.remove("hidden")
    }

    // Embed YouTube video
    if (this.hasYoutubePreviewTarget) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`
      this.youtubePreviewTarget.innerHTML = `
        <iframe
          src="${embedUrl}"
          class="w-full aspect-video rounded-lg"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      `
    }
  }

  clearYoutubePreview() {
    // Show placeholder, hide preview
    if (this.hasYoutubePlaceholderTarget) {
      this.youtubePlaceholderTarget.classList.remove("hidden")
    }
    if (this.hasYoutubePreviewContainerTarget) {
      this.youtubePreviewContainerTarget.classList.add("hidden")
    }

    // Clear video ID
    if (this.hasYoutubeVideoIdTarget) {
      this.youtubeVideoIdTarget.value = ""
    }
  }

  // Timestamp Handling
  calculateDuration() {
    if (!this.hasTimestampStartTarget || !this.hasTimestampEndTarget || !this.hasDurationTarget) {
      return
    }

    const start = parseFloat(this.timestampStartTarget.value) || 0
    const end = parseFloat(this.timestampEndTarget.value) || 0

    if (start >= 0 && end > start) {
      const duration = end - start
      this.durationTarget.value = duration.toFixed(2)
      this.clearTimestampErrors()
    } else if (end > 0 && end <= start) {
      this.showTimestampError("End time must be greater than start time")
    }
  }

  formatTimestamp(event) {
    const input = event.target
    const value = parseFloat(input.value)

    if (!isNaN(value) && value >= 0) {
      input.value = value.toFixed(2)
      this.calculateDuration()
    }
  }

  showTimestampError(message) {
    // You can implement custom error display here
    console.error(message)
  }

  clearTimestampErrors() {
    // Clear any timestamp-specific errors
  }

  // Privacy Selection
  selectPrivacy(event) {
    // Remove selected state from all options
    this.privacyOptionTargets.forEach(option => {
      option.classList.remove("border-indigo-500", "bg-indigo-50")
      option.classList.add("border-gray-300")
      const radio = option.querySelector('input[type="radio"]')
      if (radio) radio.checked = false
    })

    // Add selected state to clicked option
    const clickedOption = event.currentTarget
    clickedOption.classList.add("border-indigo-500", "bg-indigo-50")
    clickedOption.classList.remove("border-gray-300")

    const radio = clickedOption.querySelector('input[type="radio"]')
    if (radio) radio.checked = true
  }

  // Form Validation
  validateForm(event) {
    let isValid = true
    const errors = []

    // Validate YouTube URL
    if (!this.hasYoutubeVideoIdTarget || !this.youtubeVideoIdTarget.value) {
      errors.push("Please enter a valid YouTube URL")
      isValid = false
    }

    // Validate timestamps
    if (this.hasTimestampStartTarget && this.hasTimestampEndTarget) {
      const start = parseFloat(this.timestampStartTarget.value)
      const end = parseFloat(this.timestampEndTarget.value)

      if (isNaN(start) || start < 0) {
        errors.push("Please enter a valid start time")
        isValid = false
      }

      if (isNaN(end) || end <= start) {
        errors.push("End time must be greater than start time")
        isValid = false
      }
    }

    if (!isValid) {
      event.preventDefault()
      this.showError(errors.join(". "))
      return false
    }

    return true
  }

  // Error Handling
  showError(message) {
    // Create or update error message element
    let errorElement = this.element.querySelector(".gif-form-error")

    if (!errorElement) {
      errorElement = document.createElement("div")
      errorElement.className = "gif-form-error mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
      errorElement.innerHTML = `
        <div class="flex items-start">
          <svg class="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <div class="text-sm text-red-700 gif-form-error-message"></div>
        </div>
      `
      this.element.insertBefore(errorElement, this.element.firstChild)
    }

    const messageElement = errorElement.querySelector(".gif-form-error-message")
    if (messageElement) {
      messageElement.textContent = message
    }

    errorElement.classList.remove("hidden")
  }

  clearErrors() {
    const errorElement = this.element.querySelector(".gif-form-error")
    if (errorElement) {
      errorElement.classList.add("hidden")
    }
  }

  // Form Submission
  handleSubmit(event) {
    if (!this.validateForm(event)) {
      return
    }

    // Disable submit button to prevent double submission
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.textContent = "Creating GIF..."
    }
  }
}
