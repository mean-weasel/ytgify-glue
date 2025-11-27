import { Controller } from "@hotwired/stimulus"
import GIF from "gif.js"
import { parseGIF, decompressFrames } from "gifuct-js"

export default class extends Controller {
  static targets = [
    "canvas",
    "textInput",
    "fontFamily",
    "fontSize",
    "fontSizeDisplay",
    "fontWeight",
    "textColor",
    "outlineColor",
    "outlineWidth",
    "outlineWidthDisplay",
    "quality",
    "qualityDisplay",
    "generateButton",
    "cancelButton",
    "backButton",
    "progressContainer",
    "progressBar",
    "progressText"
  ]

  static values = {
    sourceGifId: String,
    sourceGifUrl: String,
    width: { type: Number, default: 500 },
    height: { type: Number, default: 500 },
    fps: { type: Number, default: 15 }
  }

  connect() {
    console.log("Remix editor connected")

    // Initialize state
    this.frames = []
    this.currentFrame = 0
    this.isGenerating = false
    this.isDragging = false
    this.gif = null
    this.encodingQuality = 10

    // Default text overlay settings
    this.textSettings = {
      text: "",
      fontFamily: "Impact",
      fontSize: 48,
      fontWeight: "bold",
      color: "#ffffff",
      outlineColor: "#000000",
      outlineWidth: 3,
      position: { x: 0.5, y: 0.9 } // Center bottom
    }

    // Load and parse source GIF
    this.parseAndLoadGif()

    // Set up canvas for text dragging
    this.setupCanvasDragging()

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts()
  }

  disconnect() {
    if (this.gif) {
      this.gif.abort()
    }
    // Remove keyboard listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler)
    }
  }

  // ========== GIF LOADING & PARSING ==========

  async parseAndLoadGif() {
    try {
      // Parse GIF frames
      this.gifData = await this.parseGifFrames(this.sourceGifUrlValue)

      // Create canvas from first frame for preview
      this.sourceImage = await this.createImageFromFrame(this.gifData.frames[0])
      this.renderPreview()

      console.log(`Loaded source GIF: ${this.gifData.frames.length} frames`)
    } catch (error) {
      console.error('Error loading GIF:', error)
      this.showError('Failed to load source GIF')
    }
  }

  async parseGifFrames(gifUrl) {
    try {
      // Fetch GIF as ArrayBuffer
      const response = await fetch(gifUrl, { mode: 'cors' })
      const arrayBuffer = await response.arrayBuffer()

      // Parse GIF structure
      const gif = parseGIF(arrayBuffer)
      const frames = decompressFrames(gif, true)

      console.log(`Parsed ${frames.length} frames from GIF`)

      return {
        frames: frames,
        width: gif.lsd.width,
        height: gif.lsd.height
      }
    } catch (error) {
      console.error('Failed to parse GIF:', error)
      throw new Error('Could not parse source GIF')
    }
  }

  createImageFromFrame(frameData) {
    return new Promise((resolve, reject) => {
      // Create ImageData from frame
      const imageData = new ImageData(
        new Uint8ClampedArray(frameData.patch),
        frameData.dims.width,
        frameData.dims.height
      )

      // Create temporary canvas
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frameData.dims.width
      tempCanvas.height = frameData.dims.height
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.putImageData(imageData, 0, 0)

      // Convert to Image
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = tempCanvas.toDataURL()
    })
  }

  // ========== TEXT OVERLAY ==========

  updateText(event) {
    this.textSettings.text = event.target.value
    this.renderPreview()
  }

  updateFontFamily(event) {
    this.textSettings.fontFamily = event.target.value
    this.renderPreview()
  }

  updateFontSize(event) {
    this.textSettings.fontSize = parseInt(event.target.value)
    if (this.hasFontSizeDisplayTarget) {
      this.fontSizeDisplayTarget.textContent = this.textSettings.fontSize
    }
    this.renderPreview()
  }

  updateFontWeight(event) {
    this.textSettings.fontWeight = event.target.value
    this.renderPreview()
  }

  updateTextColor(event) {
    this.textSettings.color = event.target.value
    this.renderPreview()
  }

  updateOutlineColor(event) {
    this.textSettings.outlineColor = event.target.value
    this.renderPreview()
  }

  updateOutlineWidth(event) {
    this.textSettings.outlineWidth = parseInt(event.target.value)
    if (this.hasOutlineWidthDisplayTarget) {
      this.outlineWidthDisplayTarget.textContent = this.textSettings.outlineWidth
    }
    this.renderPreview()
  }

  setPositionPreset(event) {
    event.preventDefault()
    const preset = event.currentTarget.getAttribute('data-position')

    const positions = {
      "top": { x: 0.5, y: 0.15 },
      "center": { x: 0.5, y: 0.5 },
      "bottom": { x: 0.5, y: 0.85 }
    }

    if (positions[preset]) {
      this.textSettings.position = positions[preset]
      this.renderPreview()
    }
  }

  updateQuality(event) {
    this.encodingQuality = parseInt(event.target.value)
    if (this.hasQualityDisplayTarget) {
      this.qualityDisplayTarget.textContent = this.encodingQuality
    }
    this.updateQualityButtonStyles()
  }

  setQualityPreset(event) {
    event.preventDefault()
    const quality = parseInt(event.currentTarget.getAttribute('data-quality'))
    this.encodingQuality = quality

    if (this.hasQualityTarget) {
      this.qualityTarget.value = quality
    }
    if (this.hasQualityDisplayTarget) {
      this.qualityDisplayTarget.textContent = quality
    }
    this.updateQualityButtonStyles()
  }

  updateQualityButtonStyles() {
    // Update button styles based on selected quality
    const buttons = this.element.querySelectorAll('[data-quality]')
    buttons.forEach(button => {
      const buttonQuality = parseInt(button.getAttribute('data-quality'))
      if (buttonQuality === this.encodingQuality) {
        button.className = "flex-1 px-3 py-2 text-sm border-2 border-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
      } else {
        button.className = "flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      }
    })
  }

  // ========== CANVAS RENDERING ==========

  renderPreview() {
    if (!this.hasCanvasTarget || !this.sourceImage) return

    const canvas = this.canvasTarget
    const ctx = canvas.getContext('2d')

    // Set canvas size
    canvas.width = this.widthValue
    canvas.height = this.heightValue

    // Draw source image
    ctx.drawImage(this.sourceImage, 0, 0, canvas.width, canvas.height)

    // Draw text overlay if present
    if (this.textSettings.text) {
      this.drawTextOverlay(ctx)
    }
  }

  drawTextOverlay(ctx) {
    const { text, fontFamily, fontSize, fontWeight, color, outlineColor, outlineWidth, position } = this.textSettings

    // Calculate absolute position
    const x = position.x * this.widthValue
    const y = position.y * this.heightValue

    // Set font
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw outline
    if (outlineWidth > 0) {
      ctx.strokeStyle = outlineColor
      ctx.lineWidth = outlineWidth * 2
      ctx.lineJoin = 'round'
      ctx.strokeText(text, x, y)
    }

    // Draw fill
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  }

  async renderFrameWithText(frameData) {
    // Create canvas for this frame
    const canvas = document.createElement('canvas')
    canvas.width = this.widthValue
    canvas.height = this.heightValue
    const ctx = canvas.getContext('2d')

    // Draw frame image
    const frameImage = await this.createImageFromFrame(frameData)
    ctx.drawImage(frameImage, 0, 0, this.widthValue, this.heightValue)

    // Draw text overlay (reuse existing method)
    if (this.textSettings.text.trim()) {
      this.drawTextOverlay(ctx)
    }

    return canvas
  }

  // ========== CANVAS DRAGGING ==========

  setupCanvasDragging() {
    if (!this.hasCanvasTarget) return

    this.canvasTarget.addEventListener('mousedown', this.startDrag.bind(this))
    this.canvasTarget.addEventListener('mousemove', this.drag.bind(this))
    this.canvasTarget.addEventListener('mouseup', this.endDrag.bind(this))
    this.canvasTarget.addEventListener('mouseleave', this.endDrag.bind(this))

    // Touch events
    this.canvasTarget.addEventListener('touchstart', this.startDrag.bind(this))
    this.canvasTarget.addEventListener('touchmove', this.drag.bind(this))
    this.canvasTarget.addEventListener('touchend', this.endDrag.bind(this))
  }

  startDrag(event) {
    event.preventDefault()
    this.isDragging = true
    this.canvasTarget.style.cursor = 'move'
  }

  drag(event) {
    if (!this.isDragging) return

    event.preventDefault()

    const rect = this.canvasTarget.getBoundingClientRect()
    let clientX, clientY

    if (event.type.startsWith('touch')) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }

    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height

    this.textSettings.position = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y))
    }

    this.renderPreview()
  }

  endDrag(event) {
    this.isDragging = false
    this.canvasTarget.style.cursor = 'default'
  }

  // ========== KEYBOARD SHORTCUTS ==========

  setupKeyboardShortcuts() {
    this.keyboardHandler = (event) => {
      // ESC to cancel encoding
      if (event.key === 'Escape' && this.isGenerating) {
        event.preventDefault()
        this.cancelEncoding()
      }
    }
    document.addEventListener('keydown', this.keyboardHandler)
  }

  // ========== GIF GENERATION ==========

  async generateRemix(event) {
    event.preventDefault()

    if (this.isGenerating) {
      console.log("Already generating...")
      return
    }

    if (!this.textSettings.text || this.textSettings.text.trim() === "") {
      this.showError("Please enter text for the overlay")
      return
    }

    this.isGenerating = true
    this.showProgress(0, "Preparing to encode...")
    this.disableControls()
    this.showCancelButton()

    try {
      // Determine optimal worker count (2-4 based on CPU cores)
      const workerCount = Math.min(Math.max(navigator.hardwareConcurrency || 2, 2), 4)
      console.log(`Using ${workerCount} workers for encoding`)

      // Initialize GIF encoder with selected quality
      this.gif = new GIF({
        workers: workerCount,
        quality: this.encodingQuality,
        workerScript: '/javascripts/gif.worker.js',
        width: this.widthValue,
        height: this.heightValue,
        repeat: 0  // Loop forever
      })

      // Track progress
      this.gif.on('progress', (progress) => {
        // Frame rendering is 0-30%, encoding is 30-100%
        const totalProgress = 0.3 + (progress * 0.7)
        const percent = Math.round(totalProgress * 100)
        const qualityText = this.encodingQuality <= 5 ? "high quality" : this.encodingQuality <= 15 ? "balanced" : "fast"
        this.showProgress(totalProgress, `Encoding (${qualityText}): ${percent}%`)
      })

      // Render each frame with text overlay
      const frameCount = this.gifData.frames.length
      console.log(`Rendering ${frameCount} frames with quality ${this.encodingQuality}...`)
      this.showProgress(0, `Rendering ${frameCount} frames...`)

      for (let i = 0; i < frameCount; i++) {
        const frameCanvas = await this.renderFrameWithText(this.gifData.frames[i])
        const delay = this.gifData.frames[i].delay || 100  // Default 100ms

        this.gif.addFrame(frameCanvas, { delay: delay, copy: true })

        // Update progress for frame rendering (0-30%)
        const frameProgress = (i + 1) / frameCount * 0.3
        this.showProgress(frameProgress, `Rendering frames: ${i + 1}/${frameCount}`)

        // Check if cancelled
        if (!this.isGenerating) {
          console.log('Encoding cancelled by user')
          return
        }
      }

      console.log('All frames rendered, starting encoding...')
      this.showProgress(0.3, `Encoding ${frameCount} frames...`)

      // Render to blob
      this.gif.on('finished', async (blob) => {
        if (!this.isGenerating) {
          console.log('Encoding was cancelled, not uploading')
          return
        }

        const sizeMB = (blob.size / 1024 / 1024).toFixed(2)
        console.log(`Generated GIF blob: ${blob.size} bytes (${sizeMB} MB)`)
        try {
          await this.uploadRemix(blob)
        } catch (error) {
          console.error("Upload error:", error)
          this.showError("Failed to upload remix: " + error.message)
          this.isGenerating = false
          this.enableControls()
          this.hideCancelButton()
          this.hideProgress()
        }
      })

      this.gif.render()

    } catch (error) {
      console.error("Error generating GIF:", error)
      this.showError("Failed to generate remix: " + error.message)
      this.isGenerating = false
      this.enableControls()
      this.hideCancelButton()
      this.hideProgress()
    }
  }

  cancelEncoding() {
    if (!this.isGenerating) return

    const confirmed = confirm('Are you sure you want to cancel encoding? All progress will be lost.')
    if (!confirmed) return

    console.log('Cancelling encoding...')

    // Abort the GIF encoding
    if (this.gif) {
      this.gif.abort()
      this.gif = null
    }

    // Reset state
    this.isGenerating = false
    this.enableControls()
    this.hideCancelButton()
    this.hideProgress()

    this.showError('Encoding cancelled')
  }

  async uploadRemix(blob) {
    const sizeMB = (blob.size / 1024 / 1024).toFixed(2)
    this.showProgress(0.95, `Uploading ${sizeMB} MB...`)

    try {
      // Create form data
      const formData = new FormData()

      // Add GIF file
      const filename = `remix_${this.sourceGifIdValue}_${Date.now()}.gif`
      formData.append('remix[file]', blob, filename)

      // Add text overlay data
      formData.append('remix[text_overlay_data][text]', this.textSettings.text)
      formData.append('remix[text_overlay_data][font_family]', this.textSettings.fontFamily)
      formData.append('remix[text_overlay_data][font_size]', this.textSettings.fontSize)
      formData.append('remix[text_overlay_data][font_weight]', this.textSettings.fontWeight)
      formData.append('remix[text_overlay_data][color]', this.textSettings.color)
      formData.append('remix[text_overlay_data][outline_color]', this.textSettings.outlineColor)
      formData.append('remix[text_overlay_data][outline_width]', this.textSettings.outlineWidth)
      formData.append('remix[text_overlay_data][position][x]', this.textSettings.position.x)
      formData.append('remix[text_overlay_data][position][y]', this.textSettings.position.y)

      // Add title (default)
      const title = `Remix of ${this.sourceGifIdValue}`
      formData.append('remix[title]', title)

      // Add CSRF token
      const csrfToken = document.querySelector("[name='csrf-token']").content

      // Upload via fetch
      const response = await fetch(`/gifs/${this.sourceGifIdValue}/create_remix`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Accept': 'application/json'
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.errors || 'Upload failed')
      }

      const data = await response.json()

      this.showProgress(1, "Complete!")

      // Redirect to new GIF
      setTimeout(() => {
        window.location.href = data.url
      }, 500)

    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  // ========== UI HELPERS ==========

  showProgress(progress, text) {
    if (this.hasProgressContainerTarget) {
      this.progressContainerTarget.classList.remove('hidden')
    }

    if (this.hasProgressBarTarget) {
      const percentage = Math.round(progress * 100)
      this.progressBarTarget.style.width = `${percentage}%`
    }

    if (this.hasProgressTextTarget) {
      this.progressTextTarget.textContent = text
    }
  }

  hideProgress() {
    if (this.hasProgressContainerTarget) {
      this.progressContainerTarget.classList.add('hidden')
    }
  }

  showCancelButton() {
    if (this.hasCancelButtonTarget) {
      this.cancelButtonTarget.classList.remove('hidden')
    }
    if (this.hasBackButtonTarget) {
      this.backButtonTarget.classList.add('hidden')
    }
  }

  hideCancelButton() {
    if (this.hasCancelButtonTarget) {
      this.cancelButtonTarget.classList.add('hidden')
    }
    if (this.hasBackButtonTarget) {
      this.backButtonTarget.classList.remove('hidden')
    }
  }

  disableControls() {
    if (this.hasGenerateButtonTarget) {
      this.generateButtonTarget.disabled = true
      this.generateButtonTarget.textContent = "Generating..."
      this.generateButtonTarget.classList.add('opacity-50', 'cursor-not-allowed')
    }

    // Disable all inputs except cancel button
    this.element.querySelectorAll('input, select, button').forEach(el => {
      if (el !== this.generateButtonTarget && el !== this.cancelButtonTarget) {
        el.disabled = true
        el.classList.add('opacity-50', 'cursor-not-allowed')
      }
    })
  }

  enableControls() {
    if (this.hasGenerateButtonTarget) {
      this.generateButtonTarget.disabled = false
      this.generateButtonTarget.textContent = "Generate Remix"
      this.generateButtonTarget.classList.remove('opacity-50', 'cursor-not-allowed')
    }

    this.element.querySelectorAll('input, select, button').forEach(el => {
      el.disabled = false
      el.classList.remove('opacity-50', 'cursor-not-allowed')
    })
  }

  showError(message) {
    // Create error alert
    const alert = document.createElement('div')
    alert.className = 'bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4'
    alert.innerHTML = `
      <div class="flex items-start">
        <svg class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <div>${message}</div>
      </div>
    `

    this.element.insertBefore(alert, this.element.firstChild)

    // Remove after 5 seconds
    setTimeout(() => alert.remove(), 5000)
  }
};
