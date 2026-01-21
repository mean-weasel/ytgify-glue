import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["slides", "dot"]

  connect() {
    this.currentIndex = 0
    this.totalSlides = 3
    this.autoplayInterval = setInterval(() => this.next(), 4000)
  }

  disconnect() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval)
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.totalSlides
    this.updateSlide()
  }

  goToSlide(event) {
    const index = parseInt(event.currentTarget.dataset.index)
    this.currentIndex = index
    this.updateSlide()

    // Reset autoplay timer
    clearInterval(this.autoplayInterval)
    this.autoplayInterval = setInterval(() => this.next(), 4000)
  }

  updateSlide() {
    // Move slides
    const offset = -this.currentIndex * 100
    this.slidesTarget.style.transform = `translateX(${offset}%)`

    // Update dots
    this.dotTargets.forEach((dot, index) => {
      if (index === this.currentIndex) {
        dot.classList.remove("bg-white/40")
        dot.classList.add("bg-white")
      } else {
        dot.classList.remove("bg-white")
        dot.classList.add("bg-white/40")
      }
    })
  }
}
