import { FeedbackData } from '@/types/storage';
import { engagementTracker } from './engagement-tracker';

const STORAGE_KEY = 'feedback-data';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Time-based feedback thresholds
const TIME_FEEDBACK_DELAY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after install
const POST_SUCCESS_MIN_GIFS = 3; // Minimum GIFs before showing post-success
const POST_SUCCESS_PROBABILITY = 0.15; // 15% chance after qualifying

class FeedbackTracker {
  private cache: FeedbackData | null = null;
  private cacheTimestamp = 0;

  private isCacheValid(): boolean {
    return this.cache !== null && Date.now() - this.cacheTimestamp < CACHE_TTL;
  }

  private async getStorageData(): Promise<FeedbackData> {
    if (this.isCacheValid()) {
      return this.cache!;
    }

    const result = await browser.storage.local.get(STORAGE_KEY);
    const data = result[STORAGE_KEY] as FeedbackData | undefined;

    if (!data) {
      return this.getDefaultData();
    }

    this.cache = data;
    this.cacheTimestamp = Date.now();
    return data;
  }

  private async setStorageData(data: FeedbackData): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEY]: data });
    this.cache = data;
    this.cacheTimestamp = Date.now();
  }

  private getDefaultData(): FeedbackData {
    return {
      feedbackShown: {},
      surveyClicked: false,
      permanentlyDismissed: false,
    };
  }

  /**
   * Check if we should show milestone-based feedback
   */
  async shouldShowMilestoneFeedback(
    count: 10 | 25 | 50
  ): Promise<boolean> {
    const data = await this.getStorageData();

    // Don't show if permanently dismissed
    if (data.permanentlyDismissed) return false;

    const engagement = await engagementTracker.getEngagementStats();

    // Check if at exact milestone count
    if (engagement.totalGifsCreated !== count) {
      return false;
    }

    // Check if already shown for this milestone
    const key = `milestone${count}` as keyof typeof data.feedbackShown;
    return !data.feedbackShown[key];
  }

  /**
   * Check if we should show time-based feedback (7 days after install)
   */
  async shouldShowTimeFeedback(): Promise<boolean> {
    const data = await this.getStorageData();

    // Don't show if permanently dismissed
    if (data.permanentlyDismissed) return false;

    const engagement = await engagementTracker.getEngagementStats();

    // Already shown time-based feedback
    if (data.feedbackShown.timeBased) {
      return false;
    }

    // Check if 7 days have passed since install
    const daysSinceInstall = Date.now() - engagement.installDate;
    if (daysSinceInstall < TIME_FEEDBACK_DELAY_MS) {
      return false;
    }

    // Must have created at least 1 GIF
    return engagement.totalGifsCreated >= 1;
  }

  /**
   * Check if we should show post-success feedback modal
   * Shows with 15% probability after user has created 3+ GIFs
   */
  async shouldShowPostSuccessFeedback(): Promise<boolean> {
    const data = await this.getStorageData();

    // Don't show if permanently dismissed
    if (data.permanentlyDismissed) return false;

    const engagement = await engagementTracker.getEngagementStats();

    // Already shown post-success recently (within 24 hours)
    if (data.feedbackShown.postSuccess) {
      const hoursSinceShown =
        (Date.now() - data.feedbackShown.postSuccess) / (1000 * 60 * 60);
      if (hoursSinceShown < 24) {
        return false;
      }
    }

    // Need minimum GIF count
    if (engagement.totalGifsCreated < POST_SUCCESS_MIN_GIFS) {
      return false;
    }

    // Random probability check
    return Math.random() < POST_SUCCESS_PROBABILITY;
  }

  /**
   * Record that feedback was shown for a specific trigger
   */
  async recordFeedbackShown(
    trigger: 'milestone' | 'time' | 'post-success',
    milestoneCount?: 10 | 25 | 50
  ): Promise<void> {
    const data = await this.getStorageData();

    if (trigger === 'milestone' && milestoneCount) {
      const key = `milestone${milestoneCount}` as keyof typeof data.feedbackShown;
      data.feedbackShown[key] = Date.now();
    } else if (trigger === 'time') {
      data.feedbackShown.timeBased = Date.now();
    } else if (trigger === 'post-success') {
      data.feedbackShown.postSuccess = Date.now();
    }

    await this.setStorageData(data);
  }

  /**
   * Record that user clicked survey link
   */
  async recordSurveyClicked(): Promise<void> {
    const data = await this.getStorageData();
    data.surveyClicked = true;
    data.surveyClickedAt = Date.now();
    await this.setStorageData(data);
  }

  /**
   * Record that user permanently dismissed feedback prompts
   */
  async recordPermanentDismiss(): Promise<void> {
    const data = await this.getStorageData();
    data.permanentlyDismissed = true;
    await this.setStorageData(data);
  }

  /**
   * Get all feedback data
   */
  async getFeedbackStats(): Promise<FeedbackData> {
    return this.getStorageData();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Reset feedback data
   */
  async reset(): Promise<void> {
    const defaultData = this.getDefaultData();
    await this.setStorageData(defaultData);
  }
}

// Singleton instance
export const feedbackTracker = new FeedbackTracker();
