import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedbackModal from '../../../src/content/overlay-wizard/components/FeedbackModal';
import { browserMock, resetBrowserMocks } from '../__mocks__/browser-mocks';

// Set up global browser mock
(global as any).browser = browserMock;

// Mock the CSS file
jest.mock('../../../src/content/wizard-styles.css', () => ({}));

// Mock features module
jest.mock('../../../src/constants/features', () => ({
  EXTERNAL_SURVEY_URL: 'https://forms.gle/mock-survey-id',
}));

// Mock links module
const mockOpenExternalLink = jest.fn();
jest.mock('../../../src/constants/links', () => ({
  openExternalLink: (url: string) => mockOpenExternalLink(url),
}));

// Mock feedback tracker
const mockRecordSurveyClicked = jest.fn().mockResolvedValue(undefined);
const mockRecordPermanentDismiss = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../src/shared/feedback-tracker', () => ({
  feedbackTracker: {
    recordSurveyClicked: () => mockRecordSurveyClicked(),
    recordPermanentDismiss: () => mockRecordPermanentDismiss(),
  },
}));

describe('FeedbackModal Component', () => {
  const defaultProps = {
    onClose: jest.fn(),
    onPermanentDismiss: jest.fn(),
  };

  beforeEach(() => {
    resetBrowserMocks(browserMock);
    jest.clearAllMocks();
  });

  describe('Header and Content', () => {
    it('should render header text', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByText('Help us improve YTGify')).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByText('Your feedback helps shape future features')).toBeInTheDocument();
    });
  });

  describe('Take Survey Button', () => {
    it('should render Take Survey button', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByText('Take Survey')).toBeInTheDocument();
    });

    it('should open external URL when clicking Take Survey', async () => {
      render(<FeedbackModal {...defaultProps} />);

      const surveyButton = screen.getByText('Take Survey');
      fireEvent.click(surveyButton);

      await waitFor(() => {
        expect(mockOpenExternalLink).toHaveBeenCalledWith('https://forms.gle/mock-survey-id');
      });
    });

    it('should record survey click and close modal when clicking Take Survey', async () => {
      const onClose = jest.fn();
      render(<FeedbackModal {...defaultProps} onClose={onClose} />);

      const surveyButton = screen.getByText('Take Survey');
      fireEvent.click(surveyButton);

      await waitFor(() => {
        expect(mockRecordSurveyClicked).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Dont Show Again Button', () => {
    it('should render Dont show again button', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByText("Don't show again")).toBeInTheDocument();
    });

    it('should record permanent dismiss when clicking Dont show again', async () => {
      const onPermanentDismiss = jest.fn();
      render(<FeedbackModal {...defaultProps} onPermanentDismiss={onPermanentDismiss} />);

      const dismissButton = screen.getByText("Don't show again");
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockRecordPermanentDismiss).toHaveBeenCalled();
        expect(onPermanentDismiss).toHaveBeenCalled();
      });
    });
  });

  describe('Close Button', () => {
    it('should render close button', () => {
      render(<FeedbackModal {...defaultProps} />);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('should call onClose when clicking close button', () => {
      const onClose = jest.fn();
      render(<FeedbackModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible close button', () => {
      render(<FeedbackModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('should have proper button types', () => {
      render(<FeedbackModal {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});
