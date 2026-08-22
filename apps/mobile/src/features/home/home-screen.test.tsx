import type { ScenarioId } from '@/features/progress/mock-data';
import * as React from 'react';

import { cleanup, render, screen } from '@/lib/test-utils';
import { HomeScreen } from './home-screen';
import { useHomeScenario } from './use-home-scenario';

afterEach(cleanup);

function renderHome(scenario: ScenarioId) {
  useHomeScenario.setState({ scenario, variant: 'refined-grid' });

  return render(<HomeScreen />);
}

describe('homeScreen', () => {
  it('renders the low-progress state', () => {
    renderHome('low-progress');

    expect(screen.getByText('2,140')).toBeOnTheScreen();
    expect(screen.getByText('Steps · Goal 8,000')).toBeOnTheScreen();
    expect(
      screen.getByText('Nice start. A walk after lunch would do it.'),
    ).toBeOnTheScreen();
  });

  it('renders the almost-complete state, naming the steps left', () => {
    renderHome('almost-complete');

    expect(screen.getByText('7,420')).toBeOnTheScreen();
    expect(
      screen.getByText('580 steps to go. A short walk would complete today.'),
    ).toBeOnTheScreen();
  });

  it('renders the goal-complete state with the grown streak', () => {
    renderHome('goal-complete');

    expect(screen.getByText('8,420')).toBeOnTheScreen();
    expect(screen.getByText('Goal complete. 19 days strong.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Current streak, 19 days')).toBeOnTheScreen();
  });

  // Every state exposes the same landmarks; only the numbers differ. That is
  // the point of the milestone: one Home, driven by data.
  it.each(['low-progress', 'almost-complete', 'goal-complete'])(
    'uses one layout for the %s state',
    (scenario) => {
      renderHome(scenario as ScenarioId);

      expect(screen.getByText('Today')).toBeOnTheScreen();
      expect(screen.getByText('Last 5 weeks')).toBeOnTheScreen();
      expect(screen.getByLabelText('Daily goal progress')).toBeOnTheScreen();
      expect(screen.getByText('Day streak')).toBeOnTheScreen();
    },
  );

  it('greets a brand-new user instead of showing an empty streak', () => {
    renderHome('new-user');

    expect(screen.getByText('Your year starts today.')).toBeOnTheScreen();
    expect(screen.getByText('Day 1')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'One cell per day. The first one fills as soon as your steps sync.',
      ),
    ).toBeOnTheScreen();
  });

  it('reports goal progress to assistive tech, not just in colour', () => {
    renderHome('almost-complete');

    const gauge = screen.getByLabelText('Daily goal progress');
    expect(gauge.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 93 });
  });
});
