/**
 * gifski-wasm encoder implementation - highest quality GIF encoder
 * Uses advanced temporal dithering and cross-frame palette optimization
 */

import encode, { init as initGifski } from 'gifski-wasm';
import {
  AbstractEncoder,
  EncodingOptions,
  EncodingResult,
  EncodingProgress,
  FrameData,
} from './abstract-encoder';

let gifskiInitialized = false;

export class GifskiEncoder extends AbstractEncoder {
  get name(): string {
    return 'gifski';
  }

  get supportedFormats(): Array<'gif' | 'mp4'> {
    return ['gif'];
  }

  get characteristics() {
    return {
      speed: 'slow' as const,
      quality: 'high' as const,
      memoryUsage: 'high' as const,
      browserSupport: 'good' as const,
    };
  }

  isAvailable(): boolean {
    try {
      // Check if gifski-wasm encode function is available
      return typeof encode === 'function';
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('gifski-wasm library is not available');
    }

    // Explicitly initialize WASM module in Firefox extension context
    if (!gifskiInitialized) {
      try {
        let wasmInput: Parameters<typeof initGifski>[0];

        try {
          const chromeApi = (globalThis as typeof globalThis & { chrome?: typeof browser }).chrome;
          if (typeof browser !== 'undefined' && browser.runtime?.getURL) {
            const wasmUrl = browser.runtime.getURL('pkg/gifski_wasm_bg.wasm');
            console.debug('[gifski] Fetching WASM from', wasmUrl);
            const response = await fetch(wasmUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch gifski wasm: ${response.status} ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            console.debug('[gifski] WASM header bytes', Array.from(new Uint8Array(buffer.slice(0, 4))));
            wasmInput = buffer;
          } else if (chromeApi?.runtime?.getURL) {
            const wasmUrl = chromeApi.runtime.getURL('pkg/gifski_wasm_bg.wasm');
            console.debug('[gifski] Fetching WASM from', wasmUrl);
            const response = await fetch(wasmUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch gifski wasm: ${response.status} ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            console.debug('[gifski] WASM header bytes', Array.from(new Uint8Array(buffer.slice(0, 4))));
            wasmInput = buffer;
          }
        } catch (fetchError) {
          console.warn('[gifski] Falling back to default WASM init', fetchError);
        }

        await initGifski(wasmInput);
        gifskiInitialized = true;
      } catch (error) {
        console.error('Failed to initialize gifski WASM:', error);
        throw new Error(`gifski WASM initialization failed: ${error}`);
      }
    }
  }

  async encode(
    frames: FrameData[],
    options: EncodingOptions,
    onProgress?: (progress: EncodingProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<EncodingResult> {
    if (this.isEncoding) {
      throw new Error('Encoding already in progress');
    }

    this.isEncoding = true;
    this.progressCallback = onProgress;
    this.abortController = abortSignal ? new AbortController() : null;
    this.startTime = performance.now();
    this.frameCount = frames.length;

    try {
      return await this.performEncoding(frames, options, abortSignal);
    } finally {
      this.cleanup();
    }
  }

  private async performEncoding(
    frames: FrameData[],
    options: EncodingOptions,
    abortSignal?: AbortSignal
  ): Promise<EncodingResult> {
    this.reportProgress('preparing', 0, 'Initializing gifski encoder');

    if (abortSignal?.aborted) {
      throw new Error('Encoding cancelled');
    }

    // Convert frames to ImageData array (gifski expects this format)
    const imageDataFrames: ImageData[] = frames.map((frame) => frame.imageData);

    this.reportProgress('preparing', 20, 'Preparing frames for encoding');

    // Map quality to gifski settings
    const qualitySettings = this.mapQualityToGifski(options.quality);

    this.reportProgress('encoding', 30, 'Encoding GIF with gifski');

    // Calculate frame durations from delays if available
    // gifski expects durations in milliseconds
    const fallbackFrameRate = Math.max(1, options.frameRate || 1);
    const defaultFrameDuration = 1000 / fallbackFrameRate;
    const rawDurations = frames.map((frame) =>
      typeof frame.delay === 'number' ? frame.delay : defaultFrameDuration
    );
    const firstDuration = rawDurations[0] ?? defaultFrameDuration;
    const hasCustomDurations = rawDurations.some(
      (duration) => Math.abs(duration - firstDuration) > 0.5
    );
    const normalizedDurations = rawDurations.map((duration) =>
      Math.max(2, Math.round(duration))
    );

    const baseEncodeOptions: {
      frames: ImageData[];
      width: number;
      height: number;
      quality?: number;
      repeat?: number;
    } = {
      frames: imageDataFrames,
      width: options.width,
      height: options.height,
      ...(qualitySettings.quality ? { quality: qualitySettings.quality } : {})
    };

    if (options.loop === false) {
      baseEncodeOptions.repeat = 1;
    }

    // Encode using gifski-wasm with error handling
    let gifData: Uint8Array;
    try {
      console.log('[gifski] Starting encode with', {
        frameCount: imageDataFrames.length,
        width: options.width,
        height: options.height,
        useFrameDurations: hasCustomDurations,
        frameDurations: hasCustomDurations ? normalizedDurations.slice(0, 3) : undefined,
        fps: hasCustomDurations ? undefined : fallbackFrameRate,
        quality: qualitySettings.quality
      });

      gifData = await encode(
        hasCustomDurations
          ? {
              ...baseEncodeOptions,
              frameDurations: normalizedDurations
            }
          : {
              ...baseEncodeOptions,
              fps: fallbackFrameRate
            }
      );

      console.log('[gifski] Encode complete, buffer size:', gifData.byteLength);
    } catch (error) {
      console.error('[gifski] Encode failed:', error);
      throw new Error(`gifski encoding failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (abortSignal?.aborted) {
      throw new Error('Encoding cancelled');
    }

    this.reportProgress('finalizing', 90, 'Finalizing GIF');

    // Convert Uint8Array to Blob (ensure it's a standard Uint8Array)
    const gifBuffer = new Uint8Array(gifData);
    const blob = new Blob([gifBuffer], { type: 'image/gif' });
    const encodingTime = performance.now() - this.startTime;

    this.reportProgress('completed', 100, 'Encoding complete');

    return {
      blob,
      metadata: {
        width: options.width,
        height: options.height,
        frameCount: frames.length,
        fileSize: blob.size,
        encodingTime,
        averageFrameTime: encodingTime / frames.length,
        format: 'gif' as const,
        encoder: this.name,
      },
      performance: {
        success: true,
        efficiency: Math.min(1, 10000 / encodingTime), // gifski is slower but higher quality
        recommendations: encodingTime > 10000
          ? ['gifski provides highest quality but is slower - encoding time is expected']
          : [],
        peakMemoryUsage: frames.length * options.width * options.height * 4,
      },
    };
  }

  private mapQualityToGifski(
    quality: 'low' | 'medium' | 'high' | number
  ): { quality?: number } {
    if (typeof quality === 'number') {
      // If numeric quality provided, map to gifski quality (1-100)
      return { quality: Math.min(100, Math.max(1, quality)) };
    }

    switch (quality) {
      case 'low':
        return { quality: 80 };
      case 'medium':
        return { quality: 90 };
      case 'high':
        return { quality: 100 }; // Maximum quality
      default:
        return { quality: 90 };
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.cleanup();
  }
}
