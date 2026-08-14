import { describe, expect, it } from 'vitest';
import { floatingFeedbackBottom } from './FeedbackButton';

describe('floating feedback button layout', () => {
  it('moves above the chat composer on desktop and mobile', () => {
    expect(floatingFeedbackBottom(true)).toBe('88px');
    expect(floatingFeedbackBottom(true, true)).toBe('80px');
  });

  it('keeps the existing page-corner offsets outside chats', () => {
    expect(floatingFeedbackBottom(false)).toBe('24px');
    expect(floatingFeedbackBottom(false, true)).toBe('16px');
  });
});
