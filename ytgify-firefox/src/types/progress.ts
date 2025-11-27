/**
 * Progress tracking types for GIF creation
 */

/**
 * Buffering status during frame capture
 * Tracks real-time progress of video frame extraction
 */
export interface BufferingStatus {
  /** Whether video is currently buffering (waiting for data) */
  isBuffering: boolean;
  /** Number of frames captured so far */
  currentFrame: number;
  /** Total number of frames to capture */
  totalFrames: number;
  /** Percentage of video buffered (0-100) */
  bufferedPercentage: number;
  /** Estimated seconds remaining until completion */
  estimatedTimeRemaining: number;
}

/**
 * Stage progress information for GIF creation wizard
 * Emitted during processing to update UI
 */
export interface StageProgressInfo {
  /** Current processing stage identifier */
  stage: string;
  /** Stage number (1-based) */
  stageNumber: number;
  /** Total number of stages */
  totalStages: number;
  /** Human-readable stage name (optional for backward compatibility) */
  stageName?: string;
  /** Current status message */
  message: string;
  /** Overall progress percentage (0-100) */
  progress: number;
  /** Encoder being used (e.g., 'gifenc', 'gif.js') */
  encoder?: string;
  /** Real-time buffering status during frame capture */
  bufferingStatus?: BufferingStatus;
}
