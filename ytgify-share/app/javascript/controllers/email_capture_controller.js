import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form", "email", "button", "buttonText", "spinner", "success", "error"]

  async submit(event) {
    event.preventDefault()

    const email = this.emailTarget.value.trim()
    if (!email) return

    // Show loading state
    this.buttonTarget.disabled = true
    this.emailTarget.disabled = true
    this.buttonTextTarget.textContent = "Subscribing..."
    this.spinnerTarget.classList.remove("hidden")
    this.errorTarget.classList.add("hidden")

    try {
      const response = await fetch(this.formTarget.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          email: email,
          _source: this.formTarget.querySelector('[name="_source"]')?.value || "website"
        })
      })

      if (response.ok) {
        // Show success state
        this.formTarget.classList.add("hidden")
        this.successTarget.classList.remove("hidden")
      } else {
        throw new Error("Failed to subscribe")
      }
    } catch (error) {
      // Show error state
      this.buttonTarget.disabled = false
      this.emailTarget.disabled = false
      this.buttonTextTarget.textContent = this.buttonTarget.dataset.originalText || "Get Updates"
      this.spinnerTarget.classList.add("hidden")
      this.errorTarget.classList.remove("hidden")
    }
  }
}
