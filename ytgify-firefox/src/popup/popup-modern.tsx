import React from 'react';
import { ShowTimelineRequest } from '@/types';
import { engagementTracker } from '@/shared/engagement-tracker';
import { feedbackTracker } from '@/shared/feedback-tracker';
import { openExternalLink, getReviewLink, LINKS } from '@/constants/links';
import { EXTERNAL_SURVEY_URL } from '@/constants/features';

const PopupApp: React.FC = () => {
  const [isYouTubePage, setIsYouTubePage] = React.useState(false);
  const [isShortsPage, setIsShortsPage] = React.useState(false);
  const [videoTitle, setVideoTitle] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showButton, setShowButton] = React.useState(false);
  const [showFooter, setShowFooter] = React.useState(false);
  const [version, setVersion] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'main' | 'support'>('main');
  const [showFeedbackPrompt, setShowFeedbackPrompt] = React.useState(false);

  // Load button visibility setting
  React.useEffect(() => {
    browser.storage.sync.get(['buttonVisibility']).then((result) => {
      // Default to false if not set
      setShowButton(result.buttonVisibility === true);
    });
  }, []);

  // Check if current tab is YouTube
  React.useEffect(() => {
    const checkCurrentTab = async () => {
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (!currentTab || !currentTab.url) return;

        const isYoutubeWatch = currentTab.url.includes('youtube.com/watch');
        const isYoutubeShorts = currentTab.url.includes('youtube.com/shorts');
        const isYoutubePage = isYoutubeWatch || isYoutubeShorts;

        setIsYouTubePage(isYoutubePage);
        setIsShortsPage(isYoutubeShorts);

        if ((isYoutubeWatch || isYoutubeShorts) && currentTab.title) {
          // Extract video title from tab title (removes " - YouTube" suffix)
          const title = currentTab.title.replace(' - YouTube', '');
          setVideoTitle(title);
        }
      } catch (error) {
        console.error('Error checking current tab:', error);
      }
    };

    checkCurrentTab();
  }, []);

  // Check footer qualification on mount
  React.useEffect(() => {
    const checkFooter = async () => {
      try {
        const stats = await engagementTracker.getEngagementStats();
        const qualifies = await engagementTracker.shouldShowPrompt();
        const dismissed = stats.popupFooterDismissed;
        setShowFooter(qualifies && !dismissed);
      } catch (error) {
        console.error('Error checking footer qualification:', error);
      }
    };
    checkFooter();
  }, []);

  // Load extension version from manifest
  React.useEffect(() => {
    try {
      const manifest = browser.runtime.getManifest();
      if (manifest?.version) {
        setVersion(manifest.version);
      }
    } catch (error) {
      console.error('[Popup] Failed to get version:', error);
      setVersion('');
    }
  }, []);

  // Check time-based feedback prompt
  React.useEffect(() => {
    const checkTimeFeedback = async () => {
      try {
        const shouldShow = await feedbackTracker.shouldShowTimeFeedback();
        setShowFeedbackPrompt(shouldShow);
      } catch (error) {
        console.error('Error checking time feedback:', error);
      }
    };
    checkTimeFeedback();
  }, []);

  // Handle toggle change
  const handleToggleChange = (checked: boolean) => {
    setShowButton(checked);
    // Save to browser storage
    browser.storage.sync.set({ buttonVisibility: checked });
  };

  // Handle footer actions
  const handleReview = () => {
    openExternalLink(getReviewLink());
  };

  const handleDismissFooter = async () => {
    await engagementTracker.recordDismissal('popup-footer');
    setShowFooter(false);
  };

  const handleJoinDiscord = () => {
    openExternalLink(LINKS.DISCORD_INVITE);
  };

  const handleSurveyClick = async () => {
    await feedbackTracker.recordSurveyClicked();
    openExternalLink(EXTERNAL_SURVEY_URL);
  };

  const handleFeedbackDismiss = async () => {
    await feedbackTracker.recordFeedbackShown('time');
    setShowFeedbackPrompt(false);
  };

  const handleCreateGif = async () => {
    if (!isYouTubePage) {
      // Open YouTube in new tab
      browser.tabs.create({ url: 'https://www.youtube.com' });
      window.close();
      return;
    }

    if (isShortsPage) {
      // Show shorts-specific feedback
      return;
    }

    setIsLoading(true);

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab?.id) {
        // Send message to content script to show the overlay wizard
        const message: ShowTimelineRequest = {
          type: 'SHOW_TIMELINE',
          data: {
            videoDuration: 0, // Will be filled by content script
            currentTime: 0    // Will be filled by content script
          }
        };
        
        await browser.tabs.sendMessage(currentTab.id, message);
        // Close popup after triggering overlay
        window.close();
      }
    } catch (error) {
      console.error('Failed to show overlay:', error);
      setIsLoading(false);
    }
  };

  // Main minimal launcher view
  return (
    <div className="popup-modern" style={{ width: '360px' }}>
      {/* Simple Header */}
      <div className="popup-header">
        <div className="popup-logo-container">
          <img
            src="icons/icon.svg"
            alt="YTGify Logo"
            className="popup-logo-svg"
            style={{ width: '48px', height: '48px' }}
          />
          <div>
            <h1 className="popup-logo-title">YTGify</h1>
            <p className="popup-logo-subtitle">GIF your favorite YouTube moments</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="popup-tabs">
        <button
          className={`popup-tab ${activeTab === 'main' ? 'popup-tab--active' : ''}`}
          onClick={() => setActiveTab('main')}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Create
        </button>
        <button
          className={`popup-tab ${activeTab === 'support' ? 'popup-tab--active' : ''}`}
          onClick={() => setActiveTab('support')}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Support
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'main' ? (
        <>
          {/* Settings Section */}
          <div className="popup-settings">
            <div className="settings-item">
              <label className="settings-label">
                <span className="settings-text">Pin YTGify button to YouTube player</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showButton}
                    onChange={(e) => handleToggleChange(e.target.checked)}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </div>

          {/* Main Content */}
          <div className="popup-main">
            {isShortsPage ? (
          <div className="popup-shorts-state">
            <div className="status-text">
              <p className="status-title">YouTube Shorts Detected</p>
              <p className="status-subtitle">We do not yet support YouTube Shorts</p>
            </div>

            {/* Info Icon */}
            <div className="status-icon-container">
              <div className="status-icon info-icon">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Info message */}
            <div className="info-message">
              <p className="info-text">Try GIF creation on regular YouTube videos instead!</p>
            </div>

            {/* Open YouTube Button */}
            <button
              onClick={() => {
                browser.tabs.create({ url: 'https://www.youtube.com' });
                window.close();
              }}
              className="youtube-button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              <span>Open YouTube</span>
            </button>
          </div>
        ) : isYouTubePage ? (
          <div className="popup-ready-state">
            <div className="status-text">
              <p className="status-title">Capture GIF moments from:</p>
              {videoTitle && (
                <p className="video-title">
                  {videoTitle}
                </p>
              )}
            </div>

            {/* Create GIF Button */}
            <button
              onClick={handleCreateGif}
              disabled={isLoading}
              className="create-button"
            >
              {isLoading ? (
                <>
                  <div className="button-spinner"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Create GIF</span>
                </>
              )}
            </button>

            {/* Keyboard shortcut hint */}
            <div className="quick-tip">
              <span className="shortcut-key">Ctrl</span>
              <span className="shortcut-plus">+</span>
              <span className="shortcut-key">Shift</span>
              <span className="shortcut-plus">+</span>
              <span className="shortcut-key">G</span>
              <span className="shortcut-text">Quick access</span>
            </div>

          </div>
            ) : (
            <div className="popup-empty-state">
                {/* Empty State Icon */}
                <div className="status-icon-container">
                  <div className="status-icon empty-icon">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div className="status-text">
                  <p className="status-title">No Video Found</p>
                  <p className="status-subtitle">
                    Open a YouTube video to start creating GIFs
                  </p>
                </div>

                {/* Open YouTube Button */}
                <button
                  onClick={handleCreateGif}
                  className="youtube-button"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                  <span>Open YouTube</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Support Tab */
        <div className="popup-support">
          <div className="support-section">
            <h3 className="support-title">Get Help & Connect</h3>

            {/* Discord Button */}
            <button
              onClick={handleJoinDiscord}
              className="support-btn support-btn--discord"
            >
              <svg width="20" height="20" viewBox="0 0 71 55" fill="currentColor">
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"/>
              </svg>
              <span>Join Discord</span>
            </button>
            <p className="support-subtitle">Report bugs and get help</p>

            {/* Survey Button */}
            <button
              onClick={handleSurveyClick}
              className="support-btn support-btn--survey"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Take Survey</span>
            </button>
            <p className="support-subtitle">Help us improve YTGify</p>

            {/* Review Button */}
            <button
              onClick={handleReview}
              className="support-btn support-btn--review"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>Leave a Review</span>
            </button>
            <p className="support-subtitle">Rate us on Firefox Add-ons</p>
          </div>

          {/* Feedback Prompt */}
          {showFeedbackPrompt && (
            <div className="feedback-prompt">
              <p>We&apos;d love to hear your thoughts!</p>
              <div className="feedback-prompt-actions">
                <button onClick={handleSurveyClick} className="feedback-prompt-btn">
                  Take Survey
                </button>
                <button onClick={handleFeedbackDismiss} className="feedback-prompt-dismiss">
                  Maybe Later
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer CTA */}
      {showFooter && activeTab === 'main' && (
        <div className="popup-footer">
          <span>Enjoying YTGify? </span>
          <a onClick={handleReview}>Leave us a review!</a>
          <button className="dismiss-btn" onClick={handleDismissFooter}>×</button>
        </div>
      )}

      {/* Version Display - Always Visible */}
      {version && (
        <div className="popup-version">
          v{version}
        </div>
      )}

    </div>
  );
};

export default PopupApp;