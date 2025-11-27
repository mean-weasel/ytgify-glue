// Simplified frame extraction that captures frames in real-time without seeking
import { logger } from './logger';
import { createError } from './errors';

export interface SimpleFrameExtractionOptions {
  startTime: number;
  endTime: number;
  frameRate: number;
  quality: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
}

export interface SimpleFrameExtractionResult {
  frames: ImageData[];
  metadata: {
    totalFrames: number;
    actualFrameRate: number;
    dimensions: { width: number; height: number };
    duration: number;
    extractionMethod: 'simple-capture';
    processingTime: number;
  };
}

/**
 * Wait for video to be ready for frame capture at current time
 * Checks both readyState and buffering progress
 */
async function waitForVideoReady(
  videoElement: HTMLVideoElement,
  targetTime: number,
  maxWaitMs = 3000
): Promise<{ ready: boolean; reason?: string }> {
  const startWait = performance.now();
  let lastBufferCheck = 0;
  let stuckCount = 0;
  let lastReadyState = videoElement.readyState;
  let readyStateStuckCount = 0;

  while (performance.now() - startWait < maxWaitMs) {
    const currentReadyState = videoElement.readyState;

    // Detect if readyState is stuck at 0 or 1 (network issue, geo-restriction)
    if (currentReadyState === lastReadyState && currentReadyState < 2) {
      readyStateStuckCount++;
      if (readyStateStuckCount >= 40) {
        // 40 * 25ms = 1000ms
        logger.error(
          `[SimpleFrameExtractor] Video readyState stuck at ${currentReadyState} for 1s`
        );
        return { ready: false, reason: 'readyState_stuck' };
      }
    } else {
      readyStateStuckCount = 0;
    }
    lastReadyState = currentReadyState;

    // Check if we have enough data (HAVE_CURRENT_DATA = 2+)
    if (currentReadyState >= 2) {
      // Verify video has actually buffered this position
      const buffered = videoElement.buffered;
      let isBuffered = false;
      let nearestBufferEnd = 0;

      for (let i = 0; i < buffered.length; i++) {
        const rangeStart = buffered.start(i);
        const rangeEnd = buffered.end(i);

        if (rangeStart <= targetTime && rangeEnd >= targetTime) {
          isBuffered = true;
          break;
        }

        if (rangeEnd > nearestBufferEnd) {
          nearestBufferEnd = rangeEnd;
        }
      }

      if (isBuffered) {
        return { ready: true };
      }

      // Track if buffering is making progress
      if (nearestBufferEnd === lastBufferCheck && nearestBufferEnd < targetTime) {
        stuckCount++;
        if (stuckCount >= 20) {
          // 500ms stuck
          return { ready: false, reason: 'buffer_not_progressing' };
        }
      } else {
        stuckCount = 0;
      }
      lastBufferCheck = nearestBufferEnd;
    }

    const delay = currentReadyState === 0 ? 100 : currentReadyState === 1 ? 50 : 25;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return { ready: false, reason: 'timeout' };
}

export async function extractFramesSimple(
  videoElement: HTMLVideoElement,
  options: SimpleFrameExtractionOptions,
  onProgress?: (progress: { progress: number; message: string; stage: string }) => void
): Promise<SimpleFrameExtractionResult> {
  const startTime = performance.now();

  try {
    logger.info('[SimpleFrameExtractor] Starting simplified frame extraction');

    // Calculate dimensions - use reasonable defaults while maintaining aspect ratio
    const targetHeight = options.maxHeight || 360; // Default 360px height

    // Note: Quality scaling is already applied by the caller when computing targetWidth/targetHeight
    // Do not apply quality scaling here to avoid double-scaling

    // Lock to target height and scale width proportionally (matches ResolutionScaler behavior)
    // This ensures consistent dimensions across upscaling and downscaling
    const scaleFactor = targetHeight / videoElement.videoHeight;
    let width = Math.round(videoElement.videoWidth * scaleFactor);
    let height = targetHeight;

    // Ensure even dimensions for video encoding (round to nearest even number)
    width = Math.round(width / 2) * 2;
    height = Math.round(height / 2) * 2;

    // Create canvas for frame capture
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw createError('video', 'Failed to create canvas context');
    }

    const frames: ImageData[] = [];
    const duration = options.endTime - options.startTime;
    // Calculate frame count based on duration and frame rate
    const requestedFrameCount = Math.ceil(duration * options.frameRate);
    const targetFrameCount = requestedFrameCount; // No artificial limit

    logger.info('[SimpleFrameExtractor] Frame count calculated', {
      requestedFrameCount,
      targetFrameCount,
    });
    const captureInterval = duration / targetFrameCount;

    logger.info('[SimpleFrameExtractor] Capture settings', {
      duration,
      targetFrameCount,
      captureInterval,
      dimensions: { width, height },
    });

    // Store original state
    const originalTime = videoElement.currentTime;
    const wasPlaying = !videoElement.paused;

    // Ultra-simple approach: Just capture frames at current position with small increments
    logger.info('[SimpleFrameExtractor] Using ultra-simple instant capture method');

    // Pause video for stable capture
    videoElement.pause();

    // Move to start position if needed
    if (
      videoElement.currentTime < options.startTime ||
      videoElement.currentTime > options.endTime
    ) {
      videoElement.currentTime = options.startTime;
    }

    // Calculate frame times
    const frameInterval = duration / targetFrameCount;

    // Capture frames by incrementing currentTime
    logger.info('[SimpleFrameExtractor] Starting frame capture loop', { targetFrameCount });
    const TOTAL_WAIT_BUDGET_MS = 120000; // 120s total wait budget
    const waitBudgetStart = performance.now();

    for (let i = 0; i < targetFrameCount; i++) {
      const captureTime = options.startTime + i * frameInterval;

      logger.debug(
        `[SimpleFrameExtractor] Setting video time to ${captureTime.toFixed(2)}s for frame ${i + 1}`
      );
      // Set video to capture time
      videoElement.currentTime = Math.min(captureTime, options.endTime);

      // Wait for video to be ready before capturing frame
      logger.debug(`[SimpleFrameExtractor] Waiting for video to be ready at ${captureTime.toFixed(2)}s`);
      const remainingBudget = TOTAL_WAIT_BUDGET_MS - (performance.now() - waitBudgetStart);
      if (remainingBudget <= 0) {
        logger.error('[SimpleFrameExtractor] Total wait budget exhausted');
        throw createError(
          'video',
          'Video buffering taking too long. Try a shorter clip or better network connection.'
        );
      }

      const maxWait = Math.min(3000, remainingBudget);
      const readyResult = await waitForVideoReady(videoElement, captureTime, maxWait);

      if (!readyResult.ready) {
        logger.error(`[SimpleFrameExtractor] Video not ready after ${maxWait}ms: ${readyResult.reason}`);

        let errorMessage = 'Video failed to buffer properly. ';
        if (readyResult.reason === 'readyState_stuck') {
          errorMessage += 'Network issue or video unavailable. Try reloading the page.';
        } else if (readyResult.reason === 'buffer_not_progressing') {
          errorMessage += 'Buffering stalled. Try a shorter clip or wait for better network.';
        } else {
          errorMessage += 'Try a shorter clip or better network connection.';
        }

        throw createError('video', errorMessage);
      }

      // Capture frame
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(videoElement, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      frames.push(imageData);

      // Report progress
      if (onProgress) {
        const progress = ((i + 1) / targetFrameCount) * 100;
        onProgress({
          progress,
          message: `Captured ${i + 1}/${targetFrameCount} frames`,
          stage: 'extracting',
        });
      }

      logger.info(
        `[SimpleFrameExtractor] Captured frame ${i + 1}/${targetFrameCount} at ${captureTime.toFixed(2)}s`
      );
    }
    logger.info('[SimpleFrameExtractor] Frame capture loop completed', {
      capturedFrames: frames.length,
    });

    // Restore original state
    videoElement.currentTime = originalTime;
    if (wasPlaying) {
      videoElement.play().catch(() => {});
    }

    const processingTime = performance.now() - startTime;

    logger.info('[SimpleFrameExtractor] Extraction complete', {
      framesCaptured: frames.length,
      processingTime,
    });

    return {
      frames,
      metadata: {
        totalFrames: frames.length,
        actualFrameRate: frames.length / duration,
        dimensions: { width, height },
        duration,
        extractionMethod: 'simple-capture',
        processingTime,
      },
    };
  } catch (error) {
    logger.error('[SimpleFrameExtractor] Frame extraction failed', { error });
    throw createError(
      'video',
      `Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
