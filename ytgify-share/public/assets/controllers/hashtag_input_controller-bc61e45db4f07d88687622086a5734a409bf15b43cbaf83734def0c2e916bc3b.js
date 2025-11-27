import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container", "input", "hiddenFields", "dropdown"]
  static values = {
    searchUrl: { type: String, default: "/api/v1/hashtags/search" }
  }

  connect() {
    this.maxHashtags = 10
    this.debounceTimeout = null
    this.selectedIndex = -1
    this.suggestions = []

    // Initialize with existing hashtags from the page
    const existingTags = this.containerTarget.querySelectorAll('[data-tag]')
    this.hashtags = Array.from(existingTags).map(el => el.dataset.tag)

    // Close dropdown when clicking outside
    this.boundCloseDropdown = this.closeDropdown.bind(this)
    document.addEventListener('click', this.boundCloseDropdown)
  }

  disconnect() {
    document.removeEventListener('click', this.boundCloseDropdown)
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }
  }

  handleInput(event) {
    const query = event.target.value.trim().replace(/^#/, "")

    // Clear previous timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    // Don't search if empty or already added
    if (!query) {
      this.showTrendingSuggestions()
      return
    }

    // Debounce search for 300ms
    this.debounceTimeout = setTimeout(() => {
      this.searchHashtags(query)
    }, 300)
  }

  handleKeydown(event) {
    const hasDropdown = this.hasDropdownTarget && this.dropdownTarget.children.length > 0

    if (event.key === "ArrowDown" && hasDropdown) {
      event.preventDefault()
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1)
      this.updateSelectedItem()
    } else if (event.key === "ArrowUp" && hasDropdown) {
      event.preventDefault()
      this.selectedIndex = Math.max(this.selectedIndex - 1, -1)
      this.updateSelectedItem()
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (hasDropdown && this.selectedIndex >= 0) {
        this.selectSuggestion(this.suggestions[this.selectedIndex])
      } else {
        this.addHashtag()
      }
    } else if (event.key === "Escape" && hasDropdown) {
      event.preventDefault()
      this.closeDropdown()
    } else if (event.key === "," || event.key === " ") {
      event.preventDefault()
      this.addHashtag()
    } else if (event.key === "Backspace" && this.inputTarget.value === "") {
      this.removeLastHashtag()
    }
  }

  handleFocus() {
    const query = this.inputTarget.value.trim().replace(/^#/, "")
    if (!query) {
      this.showTrendingSuggestions()
    }
  }

  closeDropdown(event) {
    // Don't close if clicking inside the controller element
    if (event && this.element.contains(event.target)) {
      return
    }

    if (this.hasDropdownTarget) {
      this.dropdownTarget.innerHTML = ""
      this.dropdownTarget.style.display = "none"
      this.suggestions = []
      this.selectedIndex = -1
    }
  }

  async searchHashtags(query) {
    try {
      const response = await fetch(`${this.searchUrlValue}?q=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()

      this.suggestions = data.hashtags || []
      this.renderDropdown(query)
    } catch (error) {
      console.error("Error fetching hashtags:", error)
    }
  }

  async showTrendingSuggestions() {
    try {
      const response = await fetch(`${this.searchUrlValue}?limit=10`)
      const data = await response.json()

      this.suggestions = data.hashtags || []
      this.renderDropdown("", true)
    } catch (error) {
      console.error("Error fetching trending hashtags:", error)
    }
  }

  renderDropdown(query = "", isTrending = false) {
    if (!this.hasDropdownTarget) return

    // Filter out already added hashtags
    const filteredSuggestions = this.suggestions.filter(
      hashtag => !this.hashtags.includes(hashtag.name)
    )

    if (filteredSuggestions.length === 0 && !query) {
      this.dropdownTarget.innerHTML = ""
      this.dropdownTarget.style.display = "none"
      return
    }

    let html = ""

    // Show trending header if applicable
    if (isTrending && filteredSuggestions.length > 0) {
      html += `
        <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Trending
        </div>
      `
    }

    // Render suggestions
    filteredSuggestions.forEach((hashtag, index) => {
      const usageText = hashtag.usage_count > 0
        ? `${hashtag.usage_count.toLocaleString()} use${hashtag.usage_count === 1 ? '' : 's'}`
        : 'New'

      html += `
        <button
          type="button"
          data-index="${index}"
          data-action="click->hashtag-input#selectFromDropdown"
          class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between group transition-colors"
        >
          <span class="font-medium text-gray-900">#${this.escapeHtml(hashtag.name)}</span>
          <span class="text-xs text-gray-500">${usageText}</span>
        </button>
      `
    })

    // Add "Create new" option if query exists and not an exact match
    if (query && !filteredSuggestions.some(h => h.name.toLowerCase() === query.toLowerCase())) {
      // Validate the query
      if (/^[a-zA-Z0-9_]+$/.test(query)) {
        html += `
          <button
            type="button"
            data-new-tag="${this.escapeHtml(query)}"
            data-action="click->hashtag-input#createNewTag"
            class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 border-t border-gray-200 transition-colors"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="text-gray-700">Create <strong>#${this.escapeHtml(query)}</strong></span>
          </button>
        `
      }
    }

    this.dropdownTarget.innerHTML = html
    this.dropdownTarget.style.display = html ? "block" : "none"
    this.selectedIndex = -1
  }

  updateSelectedItem() {
    const items = this.dropdownTarget.querySelectorAll('[data-index]')
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('bg-gray-100')
        item.scrollIntoView({ block: 'nearest' })
      } else {
        item.classList.remove('bg-gray-100')
      }
    })
  }

  selectFromDropdown(event) {
    event.preventDefault()
    const index = parseInt(event.currentTarget.dataset.index)
    this.selectSuggestion(this.suggestions[index])
  }

  createNewTag(event) {
    event.preventDefault()
    const tag = event.currentTarget.dataset.newTag
    this.addHashtagByName(tag)
  }

  selectSuggestion(hashtag) {
    if (hashtag && hashtag.name) {
      this.addHashtagByName(hashtag.name)
    }
  }

  addHashtag() {
    const input = this.inputTarget
    let tag = input.value.trim()

    // Remove # if user typed it
    tag = tag.replace(/^#/, "")

    if (tag) {
      this.addHashtagByName(tag)
    }
  }

  addHashtagByName(tag) {
    // Validate tag
    if (!tag) return

    if (this.hashtags.length >= this.maxHashtags) {
      this.showError(`Maximum ${this.maxHashtags} hashtags allowed`)
      return
    }

    if (this.hashtags.includes(tag)) {
      this.showError("Hashtag already added")
      this.inputTarget.value = ""
      this.closeDropdown()
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(tag)) {
      this.showError("Hashtags can only contain letters, numbers, and underscores")
      return
    }

    // Add hashtag
    this.hashtags.push(tag)
    this.renderHashtags()
    this.inputTarget.value = ""
    this.closeDropdown()

    // Show trending suggestions after adding
    this.showTrendingSuggestions()
  }

  removeHashtag(event) {
    const tag = event.currentTarget.dataset.tag
    this.hashtags = this.hashtags.filter(h => h !== tag)
    this.renderHashtags()
  }

  removeLastHashtag() {
    if (this.hashtags.length > 0) {
      this.hashtags.pop()
      this.renderHashtags()
    }
  }

  renderHashtags() {
    // Render visual tags
    this.containerTarget.innerHTML = this.hashtags.map(tag => `
      <div class="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
        <span>#${this.escapeHtml(tag)}</span>
        <button
          type="button"
          data-tag="${this.escapeHtml(tag)}"
          data-action="click->hashtag-input#removeHashtag"
          class="ml-2 text-indigo-600 hover:text-indigo-800 focus:outline-none"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `).join("")

    // Render hidden fields for form submission
    this.hiddenFieldsTarget.innerHTML = this.hashtags.map(tag => `
      <input type="hidden" name="gif[hashtag_names][]" value="${this.escapeHtml(tag)}">
    `).join("")
  }

  showError(message) {
    // Simple alert for now - could be enhanced with inline error display
    alert(message)
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
};
