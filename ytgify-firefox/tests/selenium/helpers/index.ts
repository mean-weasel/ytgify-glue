/**
 * Selenium Test Helpers - Consolidated Exports
 * Import all helpers from a single location
 */

// Mock server
export {
  MockYouTubeServer,
  getMockServer,
  clearMockServer,
  type MockServerConfig,
  type VideoConfig,
} from './mock-server';

// Mock videos
export {
  MOCK_VIDEOS,
  getMockVideoUrl,
  getMockVideoByDuration,
  getTimeoutForVideo as getMockVideoTimeout,
  DEFAULT_MOCK_VIDEO,
  getRequiredVideoFiles,
  getVideoDimensions,
  mockVideoToTestVideo,
  getAvailableMockVideoKeys,
  getVideoFilePath,
  type MockVideo,
  type TestVideoMetadata,
} from './mock-videos';

// GIF validator (mock E2E)
export {
  extractGifMetadata as extractGifMetadataFromUrl,
  extractGifMetadataFromBuffer,
  urlToBuffer,
  validateResolution as validateMockResolution,
  validateFrameRate as validateMockFrameRate,
  validateDuration as validateMockDuration,
  validateFileSize as validateMockFileSize,
  validateGifFromUrl,
  validateGifComplete as validateMockGifComplete,
  validateAspectRatio as validateMockAspectRatio,
  validateTextOverlay as validateMockTextOverlay,
  RESOLUTION_SPECS as MOCK_RESOLUTION_SPECS,
  type GifMetadata as MockGifMetadata,
  type ResolutionSpec as MockResolutionSpec,
} from './gif-validator-mock';

// Extension helpers
export {
  getExtensionId,
  waitForExtensionReady,
  isExtensionInjected,
  takeScreenshot,
  handleYouTubeCookieConsent,
  validateGifFile,
  waitForElementSmart,
  waitForCondition,
  waitForGifButton,
  cleanupOldArtifacts,
  waitForVideoReady,
  getVideoMetadata,
} from './extension-helpers';
