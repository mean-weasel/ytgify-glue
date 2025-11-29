import { Controller } from "@hotwired/stimulus"

// Scroll to top button controller
// Shows a floating button when user scrolls down, smoothly scrolls to top on click
export default class extends Controller {
  static targets = ["button"]

  connect() {
    this.handleScroll = this.handleScroll.bind(this)
    window.addEventListener("scroll", this.handleScroll, { passive: true })
    this.handleScroll()
  }

  disconnect() {
    window.removeEventListener("scroll", this.handleScroll)
  }

  handleScroll() {
    if (window.scrollY > 300) {
      this.buttonTarget.classList.remove("hidden", "opacity-0")
      this.buttonTarget.classList.add("opacity-100")
    } else {
      this.buttonTarget.classList.add("opacity-0")
      setTimeout(() => {
        if (window.scrollY <= 300) {
          this.buttonTarget.classList.add("hidden")
        }
      }, 300)
    }
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
  }
}
