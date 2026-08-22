import { getMockSummary } from '@/features/progress/mock-data';
import { formatHeaderDate, formatNumber, homeMessage } from './home-copy';

const TODAY = new Date(2026, 7, 22); // Saturday 22 August 2026

describe('formatNumber', () => {
  it('groups thousands the way the design shows them', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(580)).toBe('580');
    expect(formatNumber(8420)).toBe('8,420');
    expect(formatNumber(248_320)).toBe('248,320');
  });
});

describe('formatHeaderDate', () => {
  it('renders the design\'s "SAT 22 AUG" form', () => {
    expect(formatHeaderDate(TODAY)).toBe('SAT 22 AUG');
  });
});

describe('homeMessage', () => {
  it('welcomes a user with no history at all', () => {
    const message = homeMessage(getMockSummary('new-user', TODAY));

    expect(message.text).toBe('Your year starts today.');
    expect(message.isCelebration).toBe(false);
  });

  it('encourages a low-progress day without nagging', () => {
    const message = homeMessage(getMockSummary('low-progress', TODAY));

    expect(message.text).toBe('Nice start. A walk after lunch would do it.');
    expect(message.isCelebration).toBe(false);
  });

  it('names exactly what is left when the goal is nearly met', () => {
    const message = homeMessage(getMockSummary('almost-complete', TODAY));

    expect(message.text).toBe(
      '580 steps to go. A short walk would complete today.',
    );
    expect(message.isCelebration).toBe(false);
  });

  it('celebrates a completed goal and names the streak', () => {
    const message = homeMessage(getMockSummary('goal-complete', TODAY));

    expect(message.text).toBe('Goal complete. 19 days strong.');
    expect(message.isCelebration).toBe(true);
  });
});

describe('getMockSummary', () => {
  it('drives the three Home states from the design\'s numbers', () => {
    expect(getMockSummary('low-progress', TODAY).today.steps).toBe(2140);
    expect(getMockSummary('almost-complete', TODAY).today.steps).toBe(7420);
    expect(getMockSummary('goal-complete', TODAY).today.steps).toBe(8420);
  });

  it('marks exactly one day as today, and none of the future ones', () => {
    const summary = getMockSummary('goal-complete', new Date(2026, 7, 19));
    const today = summary.recentDays.filter(day => day.isToday);
    const future = summary.recentDays.filter(day => !day.hasData);

    expect(today).toHaveLength(1);
    expect(today[0].steps).toBe(8420);
    // Wednesday: Thursday through Saturday have not happened yet.
    expect(future).toHaveLength(3);
  });

  it('is deterministic, so the mini map is stable across renders', () => {
    expect(getMockSummary('dense-history', TODAY).recentDays).toEqual(
      getMockSummary('dense-history', TODAY).recentDays,
    );
  });

  it('gives a new user no history to show', () => {
    const summary = getMockSummary('new-user', TODAY);

    expect(summary.recentDays.every(day => !day.hasData || day.isToday)).toBe(true);
    expect(summary.streak).toBe(0);
  });
});
