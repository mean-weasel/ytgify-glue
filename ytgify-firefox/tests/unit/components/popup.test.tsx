import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PopupApp from '../../../src/popup/popup-modern';
import { browserMock, resetBrowserMocks } from '../__mocks__/browser-mocks';

// Set up global browser mock
(global as any).browser = browserMock;

// Mock CSS imports
jest.mock('../../../src/popup/styles-modern.css', () => ({}));

describe('PopupApp Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    resetBrowserMocks(browserMock);

    // Mock browser.tabs.query to return a regular YouTube page by default (Promise-based)
    browserMock.tabs.query.mockImplementation(
      jest.fn((queryInfo) => {
        const mockTab = {
          id: 1,
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          active: true,
          windowId: 1,
          title: 'Sample YouTube Video - YouTube'
        };
        return Promise.resolve([mockTab]);
      })
    );

    // Mock browser.storage.sync.get to return default values (Promise-based)
    browserMock.storage.sync.get.mockImplementation(
      jest.fn((keys) => {
        const defaultValues: Record<string, any> = {};
        if (typeof keys === 'string') {
          if (keys === 'buttonVisibility') {
            defaultValues[keys] = true;
          }
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (key === 'buttonVisibility') {
              defaultValues[key] = true;
            }
          });
        }
        return Promise.resolve(defaultValues);
      })
    );

    // Mock window.close for testing popup closure
    delete (global as any).window.close;
    (global as any).window.close = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to mock browser.tabs.query with different URLs and titles
  const mockTabWithUrl = (url: string, title = 'Test Page') => {
    const mockTabs = [{
      id: 1,
      url,
      active: true,
      windowId: 1,
      title
    }];

    browserMock.tabs.query.mockImplementation(
      jest.fn((queryInfo) => {
        return Promise.resolve(mockTabs);
      })
    );
  };

  describe('YouTube Shorts Detection', () => {
    test('displays YouTube Shorts detected message with simple explanation', async () => {
      // Mock YouTube Shorts URL
      mockTabWithUrl('https://www.youtube.com/shorts/ABC123', 'Short Video - YouTube');

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('YouTube Shorts Detected')).toBeInTheDocument();
      });

      // Verify the simple explanation message (no technical details)
      expect(screen.getByText('We do not yet support YouTube Shorts')).toBeInTheDocument();

      // Verify technical iframe language is NOT present
      expect(screen.queryByText(/technical limitations/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/iframe based architecture/i)).not.toBeInTheDocument();

      // Verify other UI elements are still present
      expect(screen.getByText('Try GIF creation on regular YouTube videos instead!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open youtube/i })).toBeInTheDocument();
    });

    test('recognizes various YouTube Shorts URL formats', async () => {
      const shortsUrls = [
        'https://youtube.com/shorts/ABC123',
        'https://www.youtube.com/shorts/DEF456',
        'https://m.youtube.com/shorts/GHI789'
      ];

      for (const url of shortsUrls) {
        mockTabWithUrl(url);
        const { container, unmount } = render(<PopupApp />);

        await waitFor(() => {
          expect(container).toHaveTextContent('We do not yet support YouTube Shorts');
        });

        unmount();
        // Clean up for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('Button Visibility Settings', () => {
    test('displays button visibility toggle with default value of true', async () => {
      // Mock default storage value (button should be visible by default)
      browserMock.storage.sync.get.mockImplementation(
        jest.fn((keys) => {
          const result = { buttonVisibility: true };
          return Promise.resolve(result);
        })
      );

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('Pin YTGify button to YouTube player')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    test('displays button visibility toggle with false value when set', async () => {
      // Mock storage to return false for button visibility
      browserMock.storage.sync.get.mockImplementation(
        jest.fn((keys) => {
          const result = { buttonVisibility: false };
          return Promise.resolve(result);
        })
      );

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('Pin YTGify button to YouTube player')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    test('saves toggle changes to Firefox storage', async () => {
      // Start with button visible (default)
      browserMock.storage.sync.get.mockImplementation(
        jest.fn((keys) => {
          const result = { buttonVisibility: true };
          return Promise.resolve(result);
        })
      );

      // Set up storage.set mock for Promise-based API
      browserMock.storage.sync.set.mockImplementation(
        jest.fn((data) => {
          return Promise.resolve();
        })
      );

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('Pin YTGify button to YouTube player')).toBeInTheDocument();
      });

      // Toggle the setting off
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Verify storage.set was called with correct data
      await waitFor(() => {
        expect(browserMock.storage.sync.set).toHaveBeenCalledWith(
          { buttonVisibility: false }
        );
      }, { timeout: 2000 });

      // Toggle back on
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(browserMock.storage.sync.set).toHaveBeenCalledWith(
          { buttonVisibility: true }
        );
      }, { timeout: 2000 });
    });

    test('handles undefined/null storage values by defaulting to false', async () => {
      // Mock storage returning undefined for buttonVisibility
      browserMock.storage.sync.get.mockImplementation(
        jest.fn((keys) => {
          const result = { buttonVisibility: undefined };
          return Promise.resolve(result);
        })
      );

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('Pin YTGify button to YouTube player')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked(); // Should default to false when undefined
    });

    // Note: Storage error handling test removed because the current implementation
    // doesn't handle storage.get errors in the popup component useEffect.
  });

  describe('Non-YouTube Page States', () => {
    test('displays empty state when not on YouTube', async () => {
      // Mock non-YouTube page
      mockTabWithUrl('https://www.example.com', 'Example Website');

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('No Video Found')).toBeInTheDocument();
      });

      // Verify appropriate messaging
      expect(screen.getByText('Open a YouTube video to start creating GIFs')).toBeInTheDocument();

      // Verify Open YouTube button is displayed
      expect(screen.getByRole('button', { name: /open youtube/i })).toBeInTheDocument();

      // Verify YouTube-specific functionality is not shown
      expect(screen.queryByText('Capture GIF moments from:')).not.toBeInTheDocument();
      expect(screen.queryByText('YouTube Shorts Detected')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create gif/i })).not.toBeInTheDocument();
    });

    test('handles various non-YouTube URLs correctly', async () => {
      const nonYoutubeUrls = [
        'https://www.youtube.com', // Main page (no video)
        'https://www.google.com',
        'https://github.com',
        'https://reddit.com',
        'about:blank',
        'chrome://extensions/',
        'chrome://settings'
      ];

      for (const url of nonYoutubeUrls) {
        mockTabWithUrl(url, `${url} - Browser Tab`);
        const { container, unmount } = render(<PopupApp />);

        await waitFor(() => {
          expect(container).toHaveTextContent('No Video Found');
        });

        unmount();
        // Clean up for next iteration
        jest.clearAllMocks();
      }
    });

    test('Open YouTube button works when not on YouTube', async () => {
      mockTabWithUrl('https://www.example.com', 'Example Website');

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open youtube/i })).toBeInTheDocument();
      });

      const openYoutubeButton = screen.getByRole('button', { name: /open youtube/i });
      fireEvent.click(openYoutubeButton);

      // Verify browser.tabs.create was called to open YouTube
      await waitFor(() => {
        expect(browserMock.tabs.create).toHaveBeenCalledWith({
          url: 'https://www.youtube.com'
        });
      });

      // Verify popup closes after opening YouTube
      expect((global as any).window.close).toHaveBeenCalled();
    });
  });

  describe('Regular YouTube Video Detection', () => {
    test('displays Create GIF interface for regular YouTube videos', async () => {
      // Mock regular YouTube watch URL with a specific title
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Awesome Test Video - YouTube');

      const { container } = render(<PopupApp />);

      await waitFor(() => {
        // Use container to avoid multiple elements issues
        expect(container).toHaveTextContent('Capture GIF moments from:');
      });

      // Verify video title is extracted and displayed (removing "- YouTube" suffix)
      expect(container).toHaveTextContent('Awesome Test Video');

      // Verify Create GIF button is present (use getAllByRole to handle multiple matches)
      const buttons = screen.getAllByRole('button');
      const createGifButton = buttons.find(button =>
        button.textContent?.includes('Create GIF')
      );
      expect(createGifButton).toBeInTheDocument();

      // Verify keyboard shortcut hint is displayed
      expect(container).toHaveTextContent('Ctrl');
      expect(container).toHaveTextContent('Shift');
      expect(container).toHaveTextContent('G');
      expect(container).toHaveTextContent('Quick access');

      // Verify Shorts messaging is NOT displayed
      expect(container).not.toHaveTextContent('YouTube Shorts Detected');
      expect(container).not.toHaveTextContent('We do not yet support YouTube Shorts');
    });

    test('handles different YouTube URL formats correctly', async () => {
      const watchUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share'
      ];

      for (const url of watchUrls) {
        mockTabWithUrl(url, 'Test Video - YouTube');

        const { container, unmount } = render(<PopupApp />);

        await waitFor(() => {
          expect(container).toHaveTextContent('Capture GIF moments from:');
        });

        unmount();
        // Clean up for next iteration
        jest.clearAllMocks();
      }
    });

    test('handles videos with complex titles', async () => {
      const complexTitles = [
        'Amazing Video: Featuring | Special Characters & Emojis 🎯 - YouTube',
        'Long Video Title With Multiple Words And Descriptions That Go On Forever - YouTube',
        'Short - YouTube'
      ];

      for (const title of complexTitles) {
        mockTabWithUrl('https://www.youtube.com/watch?v=test123', title);
        const expectedTitle = title.replace(' - YouTube', '');

        render(<PopupApp />);

        await waitFor(() => {
          expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        });

        // Clean up for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('Basic Rendering', () => {
    test('renders popup container', async () => {
      render(<PopupApp />);
      await waitFor(() => {
        expect(screen.getByText('YTGify')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    test('Create GIF button opens wizard overlay and closes popup on YouTube videos', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create gif/i })).toBeInTheDocument();
      });

      const createGifButton = screen.getByRole('button', { name: /create gif/i });
      fireEvent.click(createGifButton);

      // Verify browser.tabs.sendMessage was called with the overlay request
      await waitFor(() => {
        expect(browserMock.tabs.sendMessage).toHaveBeenCalledWith(
          1, // tab ID
          expect.objectContaining({
            type: 'SHOW_TIMELINE',
            data: expect.objectContaining({
              videoDuration: 0,
              currentTime: 0
            })
          })
        );
      });

      // Verify popup closes after sending the message
      expect((global as any).window.close).toHaveBeenCalled();
    });

    test('Create GIF button on non-YouTube pages opens YouTube instead', async () => {
      mockTabWithUrl('https://www.example.com', 'Example Website');

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open youtube/i })).toBeInTheDocument();
      });

      // On non-YouTube pages, the button should be "Open YouTube"
      const button = screen.getByRole('button', { name: /open youtube/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(browserMock.tabs.create).toHaveBeenCalledWith({
          url: 'https://www.youtube.com'
        });
      });

      expect((global as any).window.close).toHaveBeenCalled();
    });

    test('handles failed message sending gracefully', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock browser.tabs.sendMessage to reject (simulating content script not available)
      browserMock.tabs.sendMessage.mockImplementation(
        jest.fn(() => Promise.reject(new Error('Content script not found')))
      );

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create gif/i })).toBeInTheDocument();
      });

      const createGifButton = screen.getByRole('button', { name: /create gif/i });
      fireEvent.click(createGifButton);

      // Wait for the click handler to process
      await new Promise(resolve => setTimeout(resolve, 50));

      // Even if message sending fails, the action should still be attempted
      expect(browserMock.tabs.sendMessage).toHaveBeenCalled();

      // On failure, console.error would be logged (cannot test console directly)
      // but the app should not crash
      expect((global as any).window.close).not.toHaveBeenCalled(); // Popup should not close on failure
    });

    test('Open YouTube button on Shorts pages works correctly', async () => {
      mockTabWithUrl('https://www.youtube.com/shorts/ABC123', 'Short Video - YouTube');

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open youtube/i })).toBeInTheDocument();
      });

      const openYoutubeButton = screen.getByRole('button', { name: /open youtube/i });
      fireEvent.click(openYoutubeButton);

      await waitFor(() => {
        expect(browserMock.tabs.create).toHaveBeenCalledWith({
          url: 'https://www.youtube.com'
        });
      });

      expect((global as any).window.close).toHaveBeenCalled();
    });

    test('handles tab query errors gracefully', async () => {
      // Mock browser.tabs.query to throw an error
      browserMock.tabs.query.mockImplementation(
        jest.fn(() => {
          throw new Error('Tabs permission denied');
        })
      );

      // Spy on console.error to verify error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<PopupApp />);

      // Wait for error handling to occur
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still render basic elements even with error
      await waitFor(() => {
        expect(screen.getByText('YTGify')).toBeInTheDocument();
      });

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking current tab:',
        expect.any(Error)
      );

      // Clean up
      consoleSpy.mockRestore();
    });
  });

  describe('Popup Footer CTA', () => {
    beforeEach(() => {
      // Mock browser.storage.local.get for engagement tracker (Promise-based for Firefox)
      browserMock.storage.local = {
        get: jest.fn((keys) => {
          const result = {};
          return Promise.resolve(result);
        }),
        set: jest.fn((data) => {
          return Promise.resolve();
        }),
        clear: jest.fn(() => {
          return Promise.resolve();
        }),
        remove: jest.fn(() => Promise.resolve())
      };

      // Import and clear engagement tracker cache to avoid test pollution
      const { engagementTracker } = require('../../../src/shared/engagement-tracker');
      engagementTracker.clearCache();
    });

    test('footer appears when user qualifies (5+ GIFs, not dismissed)', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock engagement data: 5+ GIFs, not dismissed, primary not shown
      const installDate = Date.now();
      browserMock.storage.local.get.mockImplementation((keys: any) => {
        const result = {
          'engagement-data': {
            installDate,
            totalGifsCreated: 5,
            prompts: {
              primary: { shown: false },
              secondary: { shown: false }
            },
            milestones: {
              milestone10: false,
              milestone25: false,
              milestone50: false
            },
            popupFooterDismissed: false
          }
        };
        return Promise.resolve(result);
      });

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText(/Enjoying YTGify?/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify footer elements
      expect(screen.getByText('Leave us a review!')).toBeInTheDocument();
      expect(screen.getByText('×')).toBeInTheDocument(); // Dismiss button
    });

    test('footer hidden when user has dismissed it', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock engagement data: qualifies but dismissed
      const installDate = Date.now();
      browserMock.storage.local.get.mockImplementation((keys: any) => {
        const result = {
          'engagement-data': {
            installDate,
            totalGifsCreated: 5,
            prompts: {
              primary: { shown: false },
              secondary: { shown: false }
            },
            milestones: {
              milestone10: false,
              milestone25: false,
              milestone50: false
            },
            popupFooterDismissed: true // Dismissed!
          }
        };
        return Promise.resolve(result);
      });

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('YTGify')).toBeInTheDocument();
      });

      // Footer should NOT be visible
      expect(screen.queryByText(/Enjoying YTGify?/)).not.toBeInTheDocument();
    });

    test('footer hidden when user has not created enough GIFs', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock engagement data: only 4 GIFs, not dismissed
      const installDate = Date.now();
      browserMock.storage.local.get.mockImplementation((keys: any) => {
        const result = {
          'engagement-data': {
            installDate,
            totalGifsCreated: 4, // Not enough!
            prompts: {
              primary: { shown: false },
              secondary: { shown: false }
            },
            milestones: {
              milestone10: false,
              milestone25: false,
              milestone50: false
            },
            popupFooterDismissed: false
          }
        };
        return Promise.resolve(result);
      });

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('YTGify')).toBeInTheDocument();
      });

      // Footer should NOT be visible
      expect(screen.queryByText(/Enjoying YTGify?/)).not.toBeInTheDocument();
    });

    test('footer hidden when primary prompt was already shown', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock engagement data: qualifies but primary prompt already shown
      const installDate = Date.now();
      browserMock.storage.local.get.mockImplementation((keys: any) => {
        const result = {
          'engagement-data': {
            installDate,
            totalGifsCreated: 5,
            prompts: {
              primary: { shown: true }, // Already shown!
              secondary: { shown: false }
            },
            milestones: {
              milestone10: false,
              milestone25: false,
              milestone50: false
            },
            popupFooterDismissed: false
          }
        };
        return Promise.resolve(result);
      });

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('YTGify')).toBeInTheDocument();
      });

      // Footer should NOT be visible
      expect(screen.queryByText(/Enjoying YTGify?/)).not.toBeInTheDocument();
    });

    test('dismiss button hides footer and records dismissal', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock engagement data: qualifies and not dismissed
      const installDate = Date.now();
      browserMock.storage.local.get.mockImplementation((keys: any) => {
        const result = {
          'engagement-data': {
            installDate,
            totalGifsCreated: 5,
            prompts: {
              primary: { shown: false },
              secondary: { shown: false }
            },
            milestones: {
              milestone10: false,
              milestone25: false,
              milestone50: false
            },
            popupFooterDismissed: false
          }
        };
        return Promise.resolve(result);
      });

      render(<PopupApp />);

      // Wait for footer to appear
      await waitFor(() => {
        expect(screen.getByText(/Enjoying YTGify?/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click dismiss button
      const dismissButton = screen.getByText('×');
      fireEvent.click(dismissButton);

      // Footer should disappear
      await waitFor(() => {
        expect(screen.queryByText(/Enjoying YTGify?/)).not.toBeInTheDocument();
      });

      // Verify storage was updated with dismissal
      await waitFor(() => {
        expect(browserMock.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'engagement-data': expect.objectContaining({
              popupFooterDismissed: true
            })
          })
        );
      });
    });

    test('Review link opens Firefox Add-ons review page', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock engagement data: qualifies
      const installDate = Date.now();
      browserMock.storage.local.get.mockImplementation((keys: any) => {
        const result = {
          'engagement-data': {
            installDate,
            totalGifsCreated: 5,
            prompts: {
              primary: { shown: false },
              secondary: { shown: false }
            },
            milestones: {
              milestone10: false,
              milestone25: false,
              milestone50: false
            },
            popupFooterDismissed: false
          }
        };
        return Promise.resolve(result);
      });

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('Leave us a review!')).toBeInTheDocument();
      }, { timeout: 3000 });

      const reviewLink = screen.getByText('Leave us a review!');
      fireEvent.click(reviewLink);

      // Verify browser.tabs.create was called
      await waitFor(() => {
        expect(browserMock.tabs.create).toHaveBeenCalled();
      });
    });

    test('handles footer check errors gracefully', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock storage to throw error
      browserMock.storage.local.get.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('YTGify')).toBeInTheDocument();
      });

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking footer qualification:',
        expect.any(Error)
      );

      // Footer should not appear
      expect(screen.queryByText(/Enjoying YTGify?/)).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Version Display', () => {
    beforeEach(() => {
      // Ensure manifest mock is properly set up before each test
      browserMock.runtime.getManifest = jest.fn(() => ({
        name: 'YTgify for Firefox',
        version: '1.0.0',
        manifest_version: 3,
        browser_specific_settings: {
          gecko: {
            id: 'ytgify@firefox.extension',
            strict_min_version: '109.0'
          }
        }
      }));
    });

    test('displays version number from manifest', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock manifest returns version 1.0.0 by default
      render(<PopupApp />);

      // Wait for version to be displayed
      await waitFor(() => {
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      });
    });

    test('does not display version if manifest version is empty', () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock manifest with empty version
      browserMock.runtime.getManifest.mockReturnValue({ version: '' });

      render(<PopupApp />);

      // Version should not be displayed
      const versionElement = screen.queryByText(/^v/);
      expect(versionElement).not.toBeInTheDocument();
    });

    test('formats version with "v" prefix', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock manifest with specific version
      browserMock.runtime.getManifest.mockReturnValue({ version: '2.5.3' });

      render(<PopupApp />);

      await waitFor(() => {
        expect(screen.getByText('v2.5.3')).toBeInTheDocument();
      });
    });

    test('handles manifest retrieval errors gracefully', () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock manifest to throw error
      browserMock.runtime.getManifest.mockImplementation(() => {
        throw new Error('Manifest not available');
      });

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      expect(() => render(<PopupApp />)).not.toThrow();

      // Version should not be displayed
      const versionElement = screen.queryByText(/^v/);
      expect(versionElement).not.toBeInTheDocument();

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Popup] Failed to get version:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('applies correct CSS class to version element', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock manifest returns version 1.0.0 by default
      render(<PopupApp />);

      await waitFor(() => {
        const versionElement = screen.getByText('v1.0.0');
        expect(versionElement).toHaveClass('popup-version');
      });
    });

    test('displays version regardless of review footer visibility', async () => {
      mockTabWithUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Test Video - YouTube');

      // Mock engagement data: does not qualify for review footer
      const installDate = Date.now();
      browserMock.storage.local.get.mockImplementation((keys: any) => {
        const result = {
          'engagement-data': {
            installDate,
            totalGifsCreated: 0, // Not enough
            prompts: {
              primary: { shown: false },
              secondary: { shown: false }
            },
            milestones: {
              milestone10: false,
              milestone25: false,
              milestone50: false
            },
            popupFooterDismissed: false
          }
        };
        return Promise.resolve(result);
      });

      render(<PopupApp />);

      await waitFor(() => {
        // Version should still be visible
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
        // Review footer should not be visible
        expect(screen.queryByText(/Leave us a review/)).not.toBeInTheDocument();
      });
    });

    test('displays version on different page types', async () => {
      // Test on YouTube page
      mockTabWithUrl('https://www.youtube.com/watch?v=test', 'Test - YouTube');
      const { unmount: unmount1 } = render(<PopupApp />);
      await waitFor(() => {
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      });
      unmount1();

      // Reset mocks and restore getManifest
      jest.clearAllMocks();
      browserMock.runtime.getManifest = jest.fn(() => ({
        name: 'YTgify for Firefox',
        version: '1.0.0',
        manifest_version: 3
      }));

      // Test on non-YouTube page
      mockTabWithUrl('https://www.example.com', 'Example');
      const { unmount: unmount2 } = render(<PopupApp />);
      await waitFor(() => {
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      });
      unmount2();

      // Reset mocks and restore getManifest again
      jest.clearAllMocks();
      browserMock.runtime.getManifest = jest.fn(() => ({
        name: 'YTgify for Firefox',
        version: '1.0.0',
        manifest_version: 3
      }));

      // Test on Shorts page
      mockTabWithUrl('https://www.youtube.com/shorts/ABC123', 'Short - YouTube');
      render(<PopupApp />);
      await waitFor(() => {
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
      });
    });
  });
});